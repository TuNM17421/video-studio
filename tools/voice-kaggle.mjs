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
 *   --backend  `omnivoice` (mặc định) | `zerotts[:<giọng>]`. ZeroTTS KHÔNG clone và không dùng GPU —
 *              nó là một tool riêng (`tools/voice-zerotts.mjs`) đọc `voice-batch.jsonl`, nên cờ này
 *              chỉ CHUYỂN TIẾP sang đó; phải kèm `--batch <voice-batch.jsonl>` (chỗ duy nhất đã áp
 *              pronounce.json — sinh batch từ cues.js thẳng ở đây sẽ nuốt mất pronounce, FM-19).
 *   --push     đẩy kernel lên Kaggle bằng CLI, chờ status, rồi tải `out/` về `<out>/results`.
 *              MẶC ĐỊNH LÀ KHÔNG: Studio push. Agent chỉ được dùng cờ này khi REQUEST/brief cho phép.
 *   --timeout  số phút chờ kernel chạy xong khi có `--push` (mặc định 45)
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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildRunPy, kaggleStatus, kernelMetadata, kernelSlug, MAX_EMBED_BYTES } from './lib/kaggle.mjs';
import { resolveBackend } from './lib/voice-backends.mjs';
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

const USAGE = `Dựng kernel Kaggle sinh giọng cả video bằng OmniVoice (GPU T4).

  node tools/voice-kaggle.mjs --cues <video dir>/cues.js --out <thư mục kernel>
                              [--voice <giọng|file>] [--speaker "Tên=giọng"]… [--slug <tên>]
                              [--backend omnivoice|zerotts[:<giọng>] --batch <voice-batch.jsonl>]
                              [--push [--timeout 45]] [--json]

  --cues     cues.js của video (lời đọc lấy nguyên văn từ đây)
  --out      nơi ghi run.py + kernel-metadata.json
  --voice    giọng cho video một người dẫn: tên/id trong voices.json, hoặc file mẫu
  --speaker  đổi giọng cho riêng một nhân vật (khai được nhiều lần)
  --slug     tên kernel (mặc định vs-<id>-voice)
  --backend  omnivoice (mặc định) | zerotts[:<giọng>] → chuyển tiếp sang tools/voice-zerotts.mjs
  --batch    voice-batch.jsonl (bắt buộc khi --backend zerotts)
  --push     đẩy kernel + chờ status + tải out/ về <out>/results. Mặc định Studio push; agent chỉ
             dùng cờ này khi REQUEST/brief cho phép.
  --timeout  số phút chờ khi --push (mặc định 45)
  --json     in một dòng JSON kết quả`;
if (flag('help') || argv.includes('-h')) { console.log(USAGE); process.exit(0); }

const cuesPath = value('cues', null);
const outDir = value('out', null);
if (!cuesPath || !outDir) fail(USAGE);
if (!fs.existsSync(cuesPath)) fail(`Không thấy ${cuesPath}.`);

/*
 * ── Backend ───────────────────────────────────────────────────────────────────────────────────
 * Tool này LÀ đường OmniVoice (clone giọng, GPU T4). `--backend zerotts` không đổi cách tool này
 * chạy — nó chuyển tiếp sang `tools/voice-zerotts.mjs` (8 giọng dựng sẵn, KHÔNG clone, kernel CPU).
 * Vào bằng `voice-batch.jsonl` chứ không bằng cues.js: đó là file duy nhất đã áp pronounce.json.
 */
let chosen;
try { chosen = resolveBackend(value('backend', null), { fallback: 'omnivoice' }); }
catch (e) { fail(e.message); }
if (chosen.backend.id !== 'omnivoice') {
  const batch = value('batch', null);
  const voiceArgs = chosen.voice ? ['--voice', chosen.voice] : [];
  if (!batch) {
    fail([
      `backend "${chosen.spec}" chạy bằng tools/voice-zerotts.mjs, không bằng kernel OmniVoice.`,
      '  Hai bước:',
      `    node tools/voice-export.mjs ${path.dirname(cuesPath)} --out <thư mục voice-script> --backend ${chosen.spec} --pronounce <projects/<id>/pronounce.json>`,
      `    node tools/voice-kaggle.mjs --cues ${cuesPath} --out ${outDir} --backend ${chosen.spec} --batch <thư mục voice-script>/voice-batch.jsonl`,
    ].join('\n'));
  }
  const res = spawnSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), 'voice-zerotts.mjs'), '--batch', batch, '--out', outDir, ...voiceArgs], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}
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
/*
 * ── `--push` ──────────────────────────────────────────────────────────────────────────────────
 * Mặc định của nhà vẫn là **Studio push**; cờ này là đường cho agent khi REQUEST/brief cho phép rõ.
 * Ba bước bằng đúng CLI in ra ở nhánh không-push: `push` → chờ `status` → `output`. Chờ bằng poll vì
 * Kaggle không có webhook; 20 giây một nhịp là đủ thưa để không bị chặn.
 */
if (flag('push')) {
  const kg = kaggleStatus();
  if (!kg.installed) fail('không thấy CLI `kaggle` — chạy `npm run setup:kaggle` trước, hoặc bỏ --push và để Studio đẩy.');
  const run = (args) => spawnSync(kg.bin, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  console.error(`→ kaggle kernels push -p ${out}`);
  const pushed = run(['kernels', 'push', '-p', out, '--accelerator', 'NvidiaTeslaT4']);
  if (pushed.status !== 0) fail(`push hỏng: ${String(pushed.stderr || pushed.stdout || '').trim().split('\n').pop()}`);
  console.error(`  ${String(pushed.stdout || '').trim()}`);
  const minutes = Number(value('timeout', '45'));
  const deadline = Date.now() + minutes * 60_000;
  let state = 'queued';
  while (Date.now() < deadline) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20_000);
    const st = run(['kernels', 'status', metadata.id]);
    const text = `${st.stdout || ''}${st.stderr || ''}`;
    state = (text.match(/status\s+"?([a-z]+)"?/i) || [])[1]?.toLowerCase() || state;
    console.error(`  status: ${state}`);
    if (state === 'complete') break;
    if (state === 'error' || state === 'cancelacknowledged') fail(`kernel dừng ở trạng thái "${state}" — xem log trên kaggle.com/${metadata.id}`);
  }
  if (state !== 'complete') fail(`quá ${minutes} phút mà kernel chưa xong (trạng thái cuối "${state}") — tăng --timeout hoặc tải tay bằng \`kaggle kernels output ${metadata.id}\`.`);
  const dest = path.join(out, 'results');
  fs.mkdirSync(dest, { recursive: true });
  const got = run(['kernels', 'output', metadata.id, '-p', dest]);
  if (got.status !== 0) fail(`tải output hỏng: ${String(got.stderr || got.stdout || '').trim().split('\n').pop()}`);
  const wavs = fs.existsSync(path.join(dest, 'out')) ? fs.readdirSync(path.join(dest, 'out')).filter((f) => f.endsWith('.wav')).length : 0;
  result.pushed = { kernel: metadata.id, state, results: dest, wav: wavs };
  console.error(`✓ tải về ${wavs} file .wav → ${dest}`);
}

if (flag('json')) console.log(JSON.stringify(result));
else {
  console.log(`✓ ${rows.length} câu · ${cast.roles.length} giọng → ${out} (${Math.round(result.bytes / 1024)} KB)`);
  for (const r of result.roles) console.log(`  ${r.name} → ${r.voice} · ${r.cues} câu`);
  console.log(`kaggle kernels push -p ${JSON.stringify(out)} --accelerator NvidiaTeslaT4`);
  console.log(`kaggle kernels output ${metadata.id} -p <thư mục>`);
}
