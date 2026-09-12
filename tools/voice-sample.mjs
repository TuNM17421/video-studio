#!/usr/bin/env node
/**
 * Read one short paragraph in several ElevenLabs voices and save each as its own WAV — reference samples
 * for choosing a narrator, or the ~10 s template a local voice model needs to clone from.
 *
 *   node tools/voice-sample.mjs --text "…" [options] "Tên giọng=<voice id>" …
 *
 *   --text <câu>        the line every voice reads (or --text-file <đường dẫn>)
 *   --out <thư mục>     where the WAVs land (default voice/samples)
 *   --model <id>        ELEVENLABS_MODEL_ID by default
 *   --dry-run           print the voices, the text and the character cost; send nothing
 *
 * Unlike tts.mjs this makes no master and no cues: one request per voice, one file per voice, no trimming
 * or frame alignment, so what you hear is exactly what the API returned. Settings and the key come from
 * tts-elevenlabs/.env. Every request is billed, so run --dry-run first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wav } from './lib/voice-audio.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.elevenlabs.io';

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// ── arguments ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 ? undefined : argv[i + 1];
};
const dryRun = argv.includes('--dry-run');
const voices = argv.filter((a) => a.includes('=') && !a.startsWith('--')).map((a) => {
  const [name, id] = a.split('=');
  if (!name.trim() || !/^[A-Za-z0-9]{15,}$/.test(id.trim())) fail(`"${a}" không phải dạng «Tên giọng=<voice id>».`);
  return { name: name.trim(), id: id.trim() };
});
if (!voices.length) fail('Chưa cho giọng nào. Thêm một hoặc nhiều tham số dạng "Nhật Phong=6adFm46eyy74snVn6YrT".');

const textFile = flag('text-file');
const text = (textFile ? fs.readFileSync(path.resolve(ROOT, textFile), 'utf8') : flag('text') || '').trim();
if (!text) fail('Chưa có lời đọc. Dùng --text "…" hoặc --text-file <đường dẫn>.');

const outDir = path.resolve(ROOT, flag('out') || 'voice/samples');

// ── config ────────────────────────────────────────────────────────────────────
for (const line of fs.readFileSync(path.join(ROOT, 'tts-elevenlabs/.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m || line.trim().startsWith('#')) continue;
  if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const cfg = {
  key: process.env.ELEVENLABS_API_KEY || '',
  model: flag('model') || process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5',
  language: process.env.ELEVENLABS_LANGUAGE === 'auto' ? '' : process.env.ELEVENLABS_LANGUAGE || 'vi',
  format: process.env.ELEVENLABS_OUTPUT_FORMAT || 'pcm_24000',
  settings: {
    stability: Number(process.env.ELEVENLABS_STABILITY ?? 0.5),
    similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY ?? 0.75),
    style: Number(process.env.ELEVENLABS_STYLE ?? 0),
    use_speaker_boost: (process.env.ELEVENLABS_SPEAKER_BOOST ?? 'true') !== 'false',
    speed: Number(process.env.ELEVENLABS_SPEED ?? 1),
  },
};
if (!cfg.key) fail('Thiếu ELEVENLABS_API_KEY trong tts-elevenlabs/.env.');
const sampleRate = Number((cfg.format.match(/^pcm_(\d+)$/) || [])[1]);
if (!sampleRate) fail(`ELEVENLABS_OUTPUT_FORMAT phải là dạng pcm_<tần số> (đang là ${cfg.format}) để ghi thẳng ra WAV.`);

/** Diacritics out, spaces to dashes: a file name that survives every shell and file system. */
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

// ── run ───────────────────────────────────────────────────────────────────────
console.log(`\nLời đọc (${text.length} ký tự · khoảng ${(text.length / 18.3).toFixed(1)} giây):\n  ${text}\n`);
console.log(`Model ${cfg.model} · ngôn ngữ ${cfg.language || 'auto'} · tốc độ ${cfg.settings.speed} · ${cfg.format}`);
console.log(`Ra thư mục ${path.relative(ROOT, outDir)}/\n`);
for (const v of voices) console.log(`  ${v.name.padEnd(14)} ${v.id}  →  ${slug(v.name)}.wav`);
console.log(`\nTổng ${voices.length} yêu cầu · ${text.length * voices.length} ký tự sẽ bị tính phí.`);

if (dryRun) {
  console.log('\n(dry-run) chưa gửi gì. Bỏ --dry-run để chạy thật.\n');
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
const done = [];
for (const v of voices) {
  process.stdout.write(`\n♪ ${v.name} … `);
  const res = await fetch(`${API}/v1/text-to-speech/${v.id}?output_format=${cfg.format}`, {
    method: 'POST',
    headers: { 'xi-api-key': cfg.key, 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: cfg.model, language_code: cfg.language || undefined, voice_settings: cfg.settings }),
  }).catch((e) => fail(`không gọi được ElevenLabs (${e.message}) — kiểm tra mạng.`));

  if (!res.ok) {
    // A wrong voice id fails here without being billed; say which one, the rest still run.
    console.log(`LỖI HTTP ${res.status}`);
    console.log(`  ${(await res.text()).slice(0, 300)}`);
    continue;
  }
  const pcm = Buffer.from(await res.arrayBuffer());
  const file = path.join(outDir, `${slug(v.name)}.wav`);
  fs.writeFileSync(file, wav(pcm, sampleRate));
  const seconds = pcm.length / 2 / sampleRate;
  done.push({ ...v, seconds, file });
  console.log(`${seconds.toFixed(1)} giây · ${path.relative(ROOT, file)}`);
}

if (!done.length) fail('Không giọng nào đọc được.');
console.log(`\n✓ ${done.length}/${voices.length} giọng đã lưu vào ${path.relative(ROOT, outDir)}/\n`);
