#!/usr/bin/env node
/**
 * ElevenLabs TTS for lesson-video cues → one continuous master voice.wav + frame-accurate voice.cues.json.
 *
 *   node tts.mjs check                                   verify API key + voice id (no audio billed)
 *   node tts.mjs generate --cues <cues.js> [options]     synthesize every cue, assemble the master
 *
 * Options for generate:
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
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
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
  model: process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5',
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
const SAMPLES_PER_FRAME = sampleRate / FPS;

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
const need = (...names) => {
  for (const n of names) if (!cfg[n]) fail(`missing ${n === 'key' ? 'ELEVENLABS_API_KEY' : 'ELEVENLABS_VOICE_ID'} — copy .env.example to .env and fill it in`);
};
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

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
  if (!cfg.voice) return console.log('! ELEVENLABS_VOICE_ID is empty');
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
  const src = fs.readFileSync(file, 'utf8');
  // cues.js is a dependency-free ES module; import it from source without needing "type": "module".
  const mod = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
  const cues = mod.CUES || mod.default;
  if (!Array.isArray(cues) || !cues.every((c) => c.text || c.silent)) fail(`${file} must export CUES = [{ n, text, … }]`);
  // Optional per cue: `voice` = delivery direction for the TTS only (eleven_v3 audio tags such as
  // '[curious]'; never shown or captioned) · `silent` = seconds of silence instead of speech (text '') ·
  // `pauseAfter` = seconds of silence after this cue (overrides --pause).
  return cues.map((c, i) => ({
    n: c.n ?? i + 1,
    text: c.text.trim(),
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
function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Leading/trailing near-silence in samples (16-bit mono), so boundaries follow the speech itself. */
function speechBounds(pcm, threshold = 100) {
  const n = pcm.length / 2;
  let a = 0;
  let b = n;
  while (a < n && Math.abs(pcm.readInt16LE(a * 2)) < threshold) a++;
  while (b > a && Math.abs(pcm.readInt16LE((b - 1) * 2)) < threshold) b--;
  return { a, b };
}

async function generate() {
  if (!args.cues) fail('--cues <path/to/cues.js> is required');
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

  // eleven_v3 takes audio tags but no request stitching (previous_text / next_text → HTTP 400).
  const v3 = /^eleven_v3/.test(cfg.model);
  const spoken = (j) => (cues[j] && cues[j].text ? ttsText(cues[j].text, pronounce) : undefined);
  const items = cues.map((c, i) => {
    const text = c.silent ? '' : `${v3 && c.voice ? `${c.voice} ` : ''}${ttsText(c.text, pronounce)}`;
    const body = {
      text,
      model_id: cfg.model,
      language_code: cfg.language || undefined,
      voice_settings: cfg.settings,
      previous_text: v3 ? undefined : spoken(i - 1),
      next_text: v3 ? undefined : spoken(i + 1),
    };
    const hash = c.silent ? `silent-${c.silent}-${sampleRate}` : sha256(JSON.stringify({ voice: cfg.voice, format: cfg.format, mock, ...body }));
    return { ...c, ttsText: text, body, hash, cache: path.join(cacheDir, `${hash}.pcm`) };
  });

  const chars = items.reduce((s, c) => s + [...c.ttsText].length, 0);
  if (args['dry-run']) {
    for (const c of items) {
      const cached = fs.existsSync(c.cache) ? 'cached' : 'new';
      console.log(`câu ${String(c.n).padStart(2, '0')} · ${[...c.ttsText].length} ký tự · ${cached}${c.ttsText !== c.text ? ' · có thay cách đọc' : ''}\n  ${c.ttsText}`);
    }
    const billable = items.filter((c) => !fs.existsSync(c.cache)).reduce((s, c) => s + [...c.ttsText].length, 0);
    console.log(`\n${items.length} câu · ${chars} ký tự · sẽ tính phí khoảng ${billable} ký tự (phần chưa cache) · model ${cfg.model} · ${cfg.format}`);
    return;
  }

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const c of items) {
    const selected = !only || only.has(c.n);
    if (fs.existsSync(c.cache) && !(selected && args.force)) continue;
    if (!selected) fail(`câu ${c.n} is not cached and not in --only; synthesize it first`);
    let pcm;
    if (c.silent) {
      pcm = Buffer.alloc(Math.round(c.silent * sampleRate) * 2);
    } else if (mock) {
      const syllables = c.ttsText.split(/\s+/).length;
      pcm = Buffer.alloc(Math.round((syllables / 3) * sampleRate) * 2); // silent placeholder, 3 syllables/s
    } else {
      process.stdout.write(`câu ${String(c.n).padStart(2, '0')} → ElevenLabs … `);
      const res = await api(`/v1/text-to-speech/${cfg.voice}`, { method: 'POST', body: c.body, query: { output_format: cfg.format } });
      pcm = Buffer.from(await res.arrayBuffer());
      console.log(`${(pcm.length / 2 / sampleRate).toFixed(2)} s`);
    }
    fs.writeFileSync(c.cache, pcm);
  }

  // Assemble: every cue starts on a frame boundary; its segment = speech + pause, padded to whole frames.
  const pauseSamples = Math.round(pause * sampleRate);
  const parts = [];
  const manifest = [];
  let frame = 0;
  for (const c of items) {
    const raw = fs.readFileSync(c.cache);
    const { a, b } = mock || c.silent ? { a: 0, b: raw.length / 2 } : speechBounds(raw);
    const lead = Math.min(a, Math.round(0.05 * sampleRate)); // keep ≤ 50 ms of the generator's own lead-in
    const tail = Math.min(raw.length / 2 - b, Math.round(0.08 * sampleRate)); // keep ≤ 80 ms of decay after the last word
    const speech = raw.subarray((a - lead) * 2, (b + tail) * 2);
    const speechSamples = speech.length / 2;
    const after = c.silent ? 0 : c.pauseAfter != null ? Math.round(c.pauseAfter * sampleRate) : pauseSamples;
    const frames = Math.ceil((speechSamples + after) / SAMPLES_PER_FRAME);
    const segment = Buffer.alloc(frames * SAMPLES_PER_FRAME * 2);
    speech.copy(segment, 0);
    parts.push(segment);
    manifest.push({
      n: c.n,
      startFrame: frame,
      endFrame: frame + frames,
      durationInFrames: frames,
      speechFrames: c.silent ? 0 : Math.ceil(speechSamples / SAMPLES_PER_FRAME),
      authoredFrames: c.authoredFrames,
      seconds: +(frame / FPS).toFixed(3),
      speechDurationSeconds: +(speechSamples / sampleRate).toFixed(3),
      text: c.text,
      textSha256: sha256(c.text),
      ttsText: c.ttsText,
      ttsTextSha256: sha256(c.ttsText),
      cache: path.basename(c.cache),
    });
    frame += frames;
  }
  const master = wav(Buffer.concat(parts));
  fs.writeFileSync(path.join(outDir, 'voice.wav'), master);
  const receipt = {
    schema: 'vinuni-tts-elevenlabs/1',
    generator: mock ? 'mock (silent placeholder)' : 'elevenlabs',
    voiceId: cfg.voice || null,
    model: cfg.model,
    language: cfg.language,
    outputFormat: cfg.format,
    voiceSettings: cfg.settings,
    fps: FPS,
    sampleRate,
    pauseSeconds: pause,
    cuesSource: cuesFile,
    cuesSha256: sha256(fs.readFileSync(cuesFile, 'utf8')),
    durationInFrames: frame,
    audioDurationSeconds: +((master.length - 44) / 2 / sampleRate).toFixed(3),
    masterSha256: sha256(master),
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
