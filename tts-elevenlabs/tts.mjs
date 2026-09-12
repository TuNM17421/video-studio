#!/usr/bin/env node
/**
 * ElevenLabs TTS for lesson-video cues → one continuous master voice.wav + frame-accurate voice.cues.json.
 *
 *   node tts.mjs check                                   verify API key + voice id (no audio billed)
 *   node tts.mjs generate --cues <cues.js> [options]     synthesize every cue, assemble the master
 *
 * Options for generate:
 *   --voice <id|tên>     who reads it — an ElevenLabs id or a name from voices.json
 *   --out <dir>          output folder (default out/<name of the cues folder>)
 *   --only 3,7           synthesize only these cues (others must be cached, or the run stops)
 *   --pause <seconds>    silence after each cue (default 1.0 — the script's "1 giây nghỉ")
 *   --pronounce <json>   { "chữ gốc": "cách đọc" } replacements applied to the TTS text only
 *   --dry-run            print what would be sent and the character count; no request
 *   --mock               no request: silent placeholder audio of the estimated length (tests the pipeline)
 *   --force              ignore the cache for the selected cues
 *
 * Settings come from .env (see .env.example). One request per cue, with previous_text / next_text so the
 * prosody runs on across cues; results are cached by a hash of everything that shapes the audio, so a
 * re-run never re-bills an unchanged cue. The locked narration is never modified: its hash and the TTS
 * text hash are both recorded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assemble, FPS, sha256 } from '../tools/lib/voice-audio.mjs';
import { castSpeaker, defaultVoice, resolveVoice, speedFor } from '../tools/lib/voices.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = 'https://api.elevenlabs.io';

// ── config ────────────────────────────────────────────────────────────────────
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnv(path.join(HERE, '.env'));

const cfg = {
  key: process.env.ELEVENLABS_API_KEY || '',
  voice: process.env.ELEVENLABS_VOICE_ID || '',
  // turbo_v2_5 is deprecated and functionally identical to flash_v2_5; both carry Vietnamese, which
  // eleven_multilingual_v2 (the API's own default) does not — so model_id is always sent explicitly.
  model: process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5',
  language: process.env.ELEVENLABS_LANGUAGE === 'auto' ? '' : process.env.ELEVENLABS_LANGUAGE || 'vi', // 'auto' = no language_code (lets eleven_v3 read English terms in English)
  format: process.env.ELEVENLABS_OUTPUT_FORMAT || 'pcm_24000',
  settings: {
    stability: Number(process.env.ELEVENLABS_STABILITY ?? 0.5),
    similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY ?? 0.75),
    style: Number(process.env.ELEVENLABS_STYLE ?? 0),
    use_speaker_boost: (process.env.ELEVENLABS_SPEAKER_BOOST ?? 'true') !== 'false',
    speed: Number(process.env.ELEVENLABS_SPEED ?? 1),
  },
};
const sampleRate = Number((cfg.format.match(/^pcm_(\d+)$/) || [])[1]);
if (!sampleRate) fail(`ELEVENLABS_OUTPUT_FORMAT must be a pcm_<rate> format (got ${cfg.format}) — the master is assembled from raw PCM.`);
if (sampleRate % FPS) fail(`sample rate ${sampleRate} is not a whole number of samples per frame at ${FPS} fps`);

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
const need = (...names) => {
  for (const n of names) {
    if (cfg[n]) continue;
    if (n === 'key') fail('missing ELEVENLABS_API_KEY — copy .env.example to .env and fill it in');
    fail('no voice — pass --voice <id|tên>, or mark one "default" in voices.json');
  }
};

// ── args ──────────────────────────────────────────────────────────────────────
const [cmd, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (!a.startsWith('--')) continue;
  const next = rest[i + 1];
  if (next === undefined || next.startsWith('--')) args[a.slice(2)] = true;
  else args[a.slice(2)] = rest[++i];
}

// ── voice ─────────────────────────────────────────────────────────────────────
// Who reads it, in order: --voice (an id or a name in voices.json) → ELEVENLABS_VOICE_ID (how Video Studio
// passes each video's own choice) → the catalog default. Whichever wins is printed, so no run is silent
// about the narrator it picked.
{
  const asked = typeof args.voice === 'string' ? args.voice : '';
  if (asked && !resolveVoice(asked)) fail(`--voice "${asked}" is neither a voice id nor a name in voices.json`);
  const chosen = resolveVoice(asked) || resolveVoice(cfg.voice) || defaultVoice();
  cfg.voiceFrom = asked ? '--voice' : (cfg.voice ? 'ELEVENLABS_VOICE_ID' : 'voices.json (mặc định)');
  cfg.voiceName = chosen && !chosen.unknown ? chosen.name : '';
  cfg.voice = chosen ? chosen.id : '';
}

// ── API ───────────────────────────────────────────────────────────────────────
async function api(pathname, { method = 'GET', body, query } = {}) {
  const url = new URL(pathname, API);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { 'xi-api-key': cfg.key, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${url.pathname} → HTTP ${res.status} ${text.slice(0, 300)}`);
  }
  return res;
}

async function check() {
  need('key');
  // Scoped keys may lack user_read / voices_read; that is fine for text-to-speech.
  const scoped = (e) => /HTTP 401/.test(e.message) && /missing_permissions/.test(e.message);
  try {
    const user = await (await api('/v1/user/subscription')).json();
    console.log(`✓ key ok · tier ${user.tier} · characters ${user.character_count} / ${user.character_limit}`);
  } catch (e) {
    if (!scoped(e)) throw e;
    console.log('· key is scoped without user_read — quota not shown (fine for TTS)');
  }
  if (!cfg.voice) return console.log('! no voice — pass --voice, set ELEVENLABS_VOICE_ID, or mark one "default" in voices.json');
  console.log(`· voice ${cfg.voiceName || cfg.voice} (${cfg.voice}) ← ${cfg.voiceFrom}`);
  try {
    const voice = await (await api(`/v1/voices/${cfg.voice}`)).json();
    console.log(`✓ voice ${voice.name} (${cfg.voice}) · model ${cfg.model} · language ${cfg.language} · ${cfg.format}`);
  } catch (e) {
    if (!scoped(e)) throw e;
    console.log(`· key is scoped without voices_read — voice ${cfg.voice} will be verified by the first TTS request`);
  }
}

// ── cues ──────────────────────────────────────────────────────────────────────
async function loadCues(file) {
  // cues.js is an ES module (the design-system package is "type": "module"); it may import
  // lib/speech.js and its video's voice.js, so load it from disk rather than from a data: URL.
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  const cues = mod.CUES || mod.default;
  if (!Array.isArray(cues) || !cues.every((c) => c.text || c.silent)) fail(`${file} must export CUES = [{ n, text, … }]`);
  // Optional per cue: `speaker` = which voice in voices.json says it (dialogue) · `delivery` = the reading
  // pace preset · `voice` = delivery direction for the TTS only (eleven_v3 audio tags such as '[curious]';
  // never shown or captioned) · `silent` = seconds of silence instead of speech (text '') ·
  // `pauseAfter` = seconds of silence after this cue (overrides --pause).
  return cues.map((c, i) => ({
    n: c.n ?? i + 1,
    text: c.text.trim(),
    speaker: c.speaker || '',
    delivery: c.delivery || '',
    voice: c.voice || '',
    silent: c.silent || 0,
    pauseAfter: c.pauseAfter,
    authoredFrames: c.end != null ? c.end - c.start : null,
  }));
}

function ttsText(text, pronounce) {
  let out = text;
  for (const [from, to] of Object.entries(pronounce)) {
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'gu'), to);
  }
  return out;
}

// ── audio ─────────────────────────────────────────────────────────────────────

/** Fake character timings for --mock: one word every 1/3 s, like the placeholder audio. */
function mockAlignment(text) {
  const characters = [...text];
  let word = -1;
  const start = characters.map((ch, i) => {
    if (ch.trim() && (i === 0 || !characters[i - 1].trim())) word++;
    return Math.max(0, word) / 3;
  });
  return { characters, start };
}

/**
 * Per-cue word starts from the cached character timestamps: words = [[charIndex, frame], …], frames
 * counted from the start of the cue's segment in the master (the kept lead-in is `offsetSeconds`).
 * charIndex points into alignText (the aligned string; only stored when it differs from ttsText).
 */
function wordTimings(c, offsetSeconds) {
  if (c.silent || !fs.existsSync(c.align)) return {};
  const { characters, start } = JSON.parse(fs.readFileSync(c.align, 'utf8'));
  const alignText = characters.join('');
  const words = [];
  characters.forEach((ch, i) => {
    if (!ch.trim() || (i > 0 && characters[i - 1].trim())) return;
    words.push([i, Math.max(0, Math.round((start[i] - offsetSeconds) * FPS))]);
  });
  return { words, ...(alignText !== c.ttsText ? { alignText } : {}) };
}

async function generate() {
  if (!args.cues) fail('--cues <path/to/cues.js> is required');
  // --json puts a single machine-readable object on stdout for Video Studio to parse; every human-facing
  // line must stay out of it, so it goes to stderr instead of corrupting the payload.
  const note = (...a) => (args.json ? console.error(...a) : console.log(...a));
  const cuesFile = path.resolve(args.cues);
  const cues = await loadCues(cuesFile);
  const name = path.basename(path.dirname(cuesFile));
  const outDir = path.resolve(args.out || path.join(HERE, 'out', name));
  const cacheDir = path.join(HERE, 'cache');
  const pause = Number(args.pause ?? 1);
  const pronounce = args.pronounce ? JSON.parse(fs.readFileSync(path.resolve(args.pronounce), 'utf8')) : {};
  const only = args.only ? new Set(String(args.only).split(',').map(Number)) : null;
  const mock = Boolean(args.mock);
  if (!args['dry-run'] && !mock) need('key', 'voice');
  if (cfg.voice) note(`voice ${cfg.voiceName || cfg.voice} (${cfg.voice}) ← ${cfg.voiceFrom}`);

  // eleven_v3 takes audio tags but no request stitching (previous_text / next_text → HTTP 400).
  const v3 = /^eleven_v3/.test(cfg.model);

  /**
   * Who reads each câu. `speaker` (a name or id in voices.json) casts dialogue; without it the whole video
   * is the one voice chosen for the run. Unknown names stop the run here, before anything is billed.
   * Note `c.voice` is not this — it has always been an eleven_v3 audio tag such as `[curious]`.
   */
  const cast = cues.map((c) => {
    if (!c.speaker) return { voice: { id: cfg.voice, name: cfg.voiceName || cfg.voice, speed: 1 }, speed: cfg.settings.speed };
    let voice;
    try {
      voice = castSpeaker(c.speaker);
    } catch (e) {
      fail(`câu ${c.n}: ${e.message}`);
    }
    let paced;
    try {
      paced = speedFor(voice, c.delivery);
    } catch (e) {
      fail(`câu ${c.n}: ${e.message}`);
    }
    if (paced.clamped) note(`! câu ${c.n}: tốc độ ${paced.wanted} ngoài khoảng API nhận, dùng ${paced.speed}`);
    return { voice, speed: paced.speed };
  });
  const dialogue = cues.some((c) => c.speaker);

  // Prosody carries across câu through previous_text / next_text — but only within one speaker's run.
  // Feeding a character the line another character is about to say bends their delivery toward it.
  const spoken = (j, i) => {
    const c = cues[j];
    if (!c || !c.text) return undefined;
    if (cast[j].voice.id !== cast[i].voice.id) return undefined;
    return ttsText(c.text, pronounce);
  };
  const items = cues.map((c, i) => {
    const text = c.silent ? '' : `${v3 && c.voice ? `${c.voice} ` : ''}${ttsText(c.text, pronounce)}`;
    const body = {
      text,
      model_id: cfg.model,
      language_code: cfg.language || undefined,
      voice_settings: { ...cfg.settings, speed: cast[i].speed },
      previous_text: v3 ? undefined : spoken(i - 1, i),
      next_text: v3 ? undefined : spoken(i + 1, i),
    };
    const hash = c.silent ? `silent-${c.silent}-${sampleRate}` : sha256(JSON.stringify({ voice: cast[i].voice.id, format: cfg.format, mock, ...body }));
    return { ...c, voiceId: cast[i].voice.id, speakerName: cast[i].voice.name, speed: cast[i].speed, ttsText: text, body, hash, cache: path.join(cacheDir, `${hash}.pcm`), align: path.join(cacheDir, `${hash}.align.json`) };
  });

  if (dialogue) {
    const roles = new Map();
    for (const c of items) roles.set(c.speakerName, (roles.get(c.speakerName) || 0) + 1);
    note(`hội thoại · ${roles.size} nhân vật: ${[...roles].map(([n, k]) => `${n} (${k} câu)`).join(' · ')}`);
  }

  const chars = items.reduce((s, c) => s + [...c.ttsText].length, 0);
  if (args['dry-run'] && args.json) {
    // Machine-readable summary (the studio web shows it before asking to spend credit).
    const rows = items.map((c) => ({ n: c.n, chars: [...c.ttsText].length, cached: fs.existsSync(c.cache), silent: Boolean(c.silent), text: c.ttsText, speaker: c.speaker ? c.speakerName : null, speed: c.speed }));
    const billable = rows.filter((r) => !r.cached).reduce((sum, r) => sum + r.chars, 0);
    console.log(JSON.stringify({ model: cfg.model, format: cfg.format, voice: cfg.voice || null, cues: rows, chars, billable, toGenerate: rows.filter((r) => !r.cached && !r.silent).length }));
    return;
  }
  if (args['dry-run']) {
    for (const c of items) {
      const cached = fs.existsSync(c.cache) ? 'cached' : 'new';
      const who = c.speaker ? ` · ${c.speakerName}${c.delivery ? ` (${c.delivery}, ×${c.speed})` : ''}` : '';
      console.log(`câu ${String(c.n).padStart(2, '0')}${who} · ${[...c.ttsText].length} ký tự · ${cached}${c.ttsText !== c.text ? ' · có thay cách đọc' : ''}\n  ${c.ttsText}`);
    }
    const billable = items.filter((c) => !fs.existsSync(c.cache)).reduce((s, c) => s + [...c.ttsText].length, 0);
    console.log(`\n${items.length} câu · ${chars} ký tự · sẽ tính phí khoảng ${billable} ký tự (phần chưa cache) · model ${cfg.model} · ${cfg.format}`);
    return;
  }

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const c of items) {
    const selected = !only || only.has(c.n);
    // A cue voiced before with-timestamps existed has audio but no word marks, and the beats that
    // need them fall back to a syllable estimate — so a cache hit requires both files, not just audio.
    const cached = fs.existsSync(c.cache) && (c.silent || fs.existsSync(c.align));
    if (cached && !(selected && args.force)) continue;
    if (!selected) fail(`câu ${c.n} is not cached and not in --only; synthesize it first`);
    let pcm;
    let alignment = null;
    if (c.silent) {
      pcm = Buffer.alloc(Math.round(c.silent * sampleRate) * 2);
    } else if (mock) {
      const words = c.ttsText.split(/\s+/).filter(Boolean);
      pcm = Buffer.alloc(Math.round((words.length / 3) * sampleRate) * 2); // silent placeholder, 3 syllables/s
      alignment = mockAlignment(c.ttsText);
    } else {
      process.stdout.write(`câu ${String(c.n).padStart(2, '0')}${c.speaker ? ` · ${c.speakerName}` : ''} → ElevenLabs … `);
      // with-timestamps: same audio as /text-to-speech plus the start time of every character.
      const res = await api(`/v1/text-to-speech/${c.voiceId}/with-timestamps`, { method: 'POST', body: c.body, query: { output_format: cfg.format } });
      const json = await res.json();
      pcm = Buffer.from(json.audio_base64, 'base64');
      alignment = json.alignment
        ? { characters: json.alignment.characters, start: json.alignment.character_start_times_seconds }
        : null;
      console.log(`${(pcm.length / 2 / sampleRate).toFixed(2)} s${alignment ? '' : ' · no timestamps'}`);
    }
    fs.writeFileSync(c.cache, pcm);
    if (alignment) fs.writeFileSync(c.align, JSON.stringify(alignment));
  }

  // Assemble: every cue starts on a frame boundary; its segment = speech + pause, padded to whole frames.
  const built = assemble({
    items: items.map((c) => ({
      n: c.n,
      text: c.text,
      ttsText: c.ttsText,
      pcm: fs.readFileSync(c.cache),
      silent: c.silent,
      pauseAfter: c.pauseAfter,
      authoredFrames: c.authoredFrames,
      // Scenes read `speaker` back from voice.cues.json to place the right dialogue card.
      extra: { cache: path.basename(c.cache), ...(c.speaker ? { speaker: c.speakerName, voiceId: c.voiceId, delivery: c.delivery || null, speed: c.speed } : {}) },
      align: c.align,
    })),
    sampleRate,
    pause,
    trim: !mock,
    onSegment: (c, offsetSeconds) => wordTimings(c, offsetSeconds),
  });
  const manifest = built.cues;
  const frame = built.durationInFrames;
  fs.writeFileSync(path.join(outDir, 'voice.wav'), built.wav);
  const receipt = {
    schema: 'vinuni-tts-elevenlabs/1',
    generator: mock ? 'mock (silent placeholder)' : 'elevenlabs',
    voiceId: cfg.voice || null,
    cast: dialogue ? [...new Map(items.filter((c) => c.speaker).map((c) => [c.voiceId, c.speakerName]))].map(([id, name]) => ({ id, name })) : null,
    model: cfg.model,
    language: cfg.language,
    outputFormat: cfg.format,
    voiceSettings: cfg.settings,
    fps: FPS,
    sampleRate,
    pauseSeconds: pause,
    cuesSource: path.relative(path.resolve(HERE, '..'), cuesFile).split(path.sep).join('/'), // repo-relative
    cuesSha256: sha256(fs.readFileSync(cuesFile, 'utf8')),
    durationInFrames: frame,
    audioDurationSeconds: built.audioDurationSeconds,
    masterSha256: sha256(built.wav),
    cues: manifest,
  };
  fs.writeFileSync(path.join(outDir, 'voice.cues.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`\n✓ ${path.relative(process.cwd(), outDir)}/voice.wav · ${receipt.audioDurationSeconds} s · ${frame} frames`);
  console.log(`✓ voice.cues.json · ${manifest.length} câu`);
  console.log('  thời lượng đo (frame): ' + manifest.map((m) => m.durationInFrames).join(', '));
  if (mock) console.log('  (mock — âm thanh im lặng, chỉ để thử quy trình)');
}

try {
  if (cmd === 'check') await check();
  else if (cmd === 'generate') await generate();
  else {
    console.log('usage: node tts.mjs check | node tts.mjs generate --cues <cues.js> [--out dir] [--only 3,7] [--pause 1] [--pronounce p.json] [--dry-run | --mock] [--force]');
    process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  fail(e.message);
}
