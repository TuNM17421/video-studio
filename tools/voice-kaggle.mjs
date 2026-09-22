#!/usr/bin/env node
/**
 * Dựng kernel Kaggle sinh giọng cả video bằng OmniVoice — đường model local, chạy trên GPU T4 của Kaggle.
 *
 *   node tools/voice-kaggle.mjs --cues <video dir>/cues.js --out <thư mục kernel> [--voice <giọng|file>] [--speaker "Tú=<giọng|file>"]…
 *
 *   --cues     cues.js của video (lời đọc lấy nguyên văn từ đây)
 *   --voice    giọng cho video một người dẫn: tên/id trong voices.json, hoặc đường dẫn một file mẫu
 *   --speaker  đổi giọng cho riêng một nhân vật (khai được nhiều lần) — như omnivoice-generate.mjs
 *   --slug     tên kernel (mặc định theo mã video: vs-<id>-voice)
 *   --out      nơi ghi run.py + kernel-metadata.json
 *   --json     in một dòng JSON kết quả (Video Studio đọc cái này)
 *
 * Phân vai dùng đúng castLocal() của model local: video hội thoại ra mỗi nhân vật một giọng trong cùng một
 * kernel, mặc định là giọng voices.json đã gán cho nhân vật. Giọng trong danh mục được kernel tải thẳng từ
 * kho media công khai; chỉ mẫu do người dùng đưa vào mới phải nhúng vào run.py (đổi về FLAC 24 kHz mono).
 *
 * Cần KAGGLE_USERNAME trong môi trường để ghi `id` của kernel. Đẩy lên và tải kết quả là việc của Studio
 * (hoặc chạy tay: kaggle kernels push -p <out> --accelerator NvidiaTeslaT4).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildRunPy, kernelMetadata, kernelSlug, MAX_EMBED_BYTES } from './lib/kaggle.mjs';
import { mediaUrl } from './lib/media.mjs';
import { castLocal, resolveRefs } from './lib/omnivoice.mjs';
import { cueKey } from './lib/voice-files.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 || !argv[i + 1] || argv[i + 1].startsWith('--') ? fallback : argv[i + 1];
};
const values = (name) => argv.flatMap((a, i) => (a === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith('--') ? [argv[i + 1]] : []));
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const note = (m) => console.error(`  ${m}`);

const cuesPath = value('cues', null);
const outDir = value('out', null);
if (!cuesPath || !outDir) fail('usage: node tools/voice-kaggle.mjs --cues <video dir>/cues.js --out <thư mục kernel> [--voice <giọng>] [--speaker "Tên=giọng"]');
if (!fs.existsSync(cuesPath)) fail(`Không thấy ${cuesPath}.`);
const owner = String(process.env.KAGGLE_USERNAME || '').trim();
if (!/^[A-Za-z0-9_-]{2,64}$/.test(owner)) fail('Thiếu KAGGLE_USERNAME hợp lệ — cần nó để đặt id của kernel.');

const videoId = path.basename(path.dirname(path.resolve(cuesPath)));
const slug = value('slug', kernelSlug(videoId));

const { CUES = [] } = await import(`${pathToFileURL(path.resolve(cuesPath)).href}?t=${Date.now()}`);
const speakerMap = Object.fromEntries(values('speaker').map((pair) => {
  const at = pair.indexOf('=');
  if (at < 1) fail(`--speaker phải viết dạng "Tên nhân vật=giọng" (nhận được "${pair}").`);
  return [pair.slice(0, at).trim(), pair.slice(at + 1).trim()];
}));
const cast = castLocal(CUES, { voice: value('voice', '').trim(), speakers: speakerMap });
if (!cast.rows.length) fail('cues.js không có câu nào cần đọc.');
if (!cast.ok) fail(`Chưa sinh được:\n  ${cast.problems.join('\n  ')}`);
await resolveRefs(cast.roles, note);
const broken = cast.roles.filter((r) => r.error);
const roleLabel = (r) => (r.speaker ? r.name : 'Người dẫn');
if (broken.length) fail(`Chưa lấy được mẫu giọng:\n  ${broken.map((r) => `${roleLabel(r)}: ${r.error}`).join('\n  ')}`);

const require = createRequire(import.meta.url);
const FFMPEG = process.env.FFMPEG || (() => {
  try { const b = require('ffmpeg-static'); if (b && fs.existsSync(b)) return b; } catch {}
  return 'ffmpeg';
})();

/** File mẫu trên máy → FLAC 24 kHz mono (tần số OmniVoice sinh ra): không mất gì, mà nhỏ đủ để nhúng. */
function embed(file) {
  const res = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '24000', '-sample_fmt', 's16', '-f', 'flac', '-'], { maxBuffer: 256 * 1024 * 1024 });
  if (res.status !== 0 || !res.stdout?.length) fail(`ffmpeg không đọc được ${path.basename(file)}: ${String(res.stderr || '').trim().split('\n').pop()}`);
  return res.stdout;
}

/** Độ dài mẫu, chỉ để lời báo lỗi nói bằng giây thay vì bằng byte. */
function seconds(file) {
  const res = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 256 * 1024 * 1024 });
  return res.status === 0 ? Math.round(res.stdout.length / 16000) : null;
}

// Mỗi mẫu một khoá, hai vai chung một mẫu thì chung một khoá.
const refs = {};
const refKeyOf = new Map();
let embedded = 0;
let embeddedSeconds = 0;
for (const role of cast.roles) {
  const id = role.source === 'file' ? `f:${role.file}` : `v:${role.voiceId}`;
  if (refKeyOf.has(id)) continue;
  const key = `r${refKeyOf.size + 1}`;
  refKeyOf.set(id, key);
  if (role.source === 'file') {
    const flac = embed(role.file).toString('base64');
    embedded += flac.length;
    embeddedSeconds += seconds(role.file) ?? 0;
    // Tính gộp: mọi mẫu từ file đi chung một run.py, nên giới hạn là của tổng chứ không của từng mẫu.
    if (embedded > MAX_EMBED_BYTES) {
      fail(`Mẫu giọng từ file trên máy dài quá (${embeddedSeconds} giây tính cả ${path.basename(role.file)}) — Kaggle không nhận kernel lớn như vậy. Tổng các mẫu từ file nên dưới ~25 giây: cắt ngắn mẫu, hoặc dùng giọng trong danh mục cho một vai.`);
    }
    refs[key] = { flac };
  } else {
    const url = mediaUrl(role.voice?.sample);
    if (!url) fail(`Giọng "${role.voiceName}" chưa có mẫu trên kho media (media/manifest.json).`);
    refs[key] = { url };
  }
}

// Tên file do cueKey đặt — giống hệt model local, để bước nhập ghép đúng câu.
const key = cueKey(CUES);
const rows = cast.rows.map((row) => {
  const role = cast.roles[row.role];
  return {
    id: key(row.n),
    text: row.text,
    ref: refKeyOf.get(role.source === 'file' ? `f:${role.file}` : `v:${role.voiceId}`),
    ref_text: role.ref.text,
    language_id: 'vi',
    ...(row.speed !== 1 ? { speed: row.speed } : {}),
  };
});

const out = path.resolve(outDir);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const metadata = kernelMetadata({ owner, slug });
fs.writeFileSync(path.join(out, 'kernel-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'run.py'), buildRunPy({ refs, rows }));

const result = {
  ref: metadata.id,
  dir: out,
  cues: rows.length,
  bytes: fs.statSync(path.join(out, 'run.py')).size,
  voice: cast.roles.map((r) => `${roleLabel(r)}: ${r.voiceName}`).join(' · '),
  roles: cast.roles.map((r) => ({ name: roleLabel(r), voice: r.voiceName, source: r.source, cues: r.cues.length })),
};
if (flag('json')) console.log(JSON.stringify(result));
else {
  console.log(`✓ ${rows.length} câu · ${cast.roles.length} giọng → ${out} (${Math.round(result.bytes / 1024)} KB)`);
  for (const r of result.roles) console.log(`  ${r.name} → ${r.voice} · ${r.cues} câu`);
  console.log(`kaggle kernels push -p ${JSON.stringify(out)} --accelerator NvidiaTeslaT4`);
  console.log(`kaggle kernels output ${metadata.id} -p <thư mục>`);
}
