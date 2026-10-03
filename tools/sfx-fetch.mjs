#!/usr/bin/env node
/**
 * Dựng lại `assets/sfx/` từ catalog `sfx.json`, và ĐO lại mỗi tiếng.
 *
 *   node tools/sfx-fetch.mjs              # tải cái còn thiếu từ R2 + đo cái đang có
 *   node tools/sfx-fetch.mjs --prepare    # CHỦ BUCKET: dựng media/files/sfx/ từ nguồn gốc
 *   node tools/sfx-fetch.mjs --measure    # chỉ đo, không chạm mạng
 *   node tools/sfx-fetch.mjs --write      # ghi số đo ngược vào sfx.json
 *   node tools/sfx-fetch.mjs --only tick,snap --force
 *
 * Vì sao cần: `assets/sfx/*.wav` không vào git (.gitignore chặn), nên `sfx.json` là NGUỒN SỰ THẬT
 * duy nhất để dựng lại bộ tiếng trên một máy khác. Trước đây việc đó là "curl bằng tay theo link
 * trong catalog"; một máy mới thiếu file thì `sfx-mix` chết giữa chừng.
 *
 * Ba số đo ghi vào catalog, và `sfx-mix.mjs` dùng cả ba:
 *   `seconds`   độ dài — để gate biết hai tiếng có chồng nhau không.
 *   `rmsDb`     mức RMS trung bình cả file — để mọi tiếng quy về cùng một mức trước khi áp gain của
 *               lớp; không có nó thì một tiếng thu to sẽ hét lên giữa các tiếng khác. Dùng RMS chứ
 *               KHÔNG dùng `lufs` cho việc này: cửa sổ tích phân của EBU R128 là 400ms, nên một
 *               tiếng "tách" 0,23s trả về −70 LUFS — số vô nghĩa. `lufs` vẫn ghi để tham chiếu.
 *   `peakAtMs`  đỉnh tiếng nằm ở đâu kể từ đầu file. Đây là thứ THAY cho hằng `LEAD_FRAMES = 6`
 *               dùng chung cho mọi tiếng: một cú whoosh có đỉnh ở giữa (≈300ms), một tiếng "tách"
 *               có đỉnh ngay đầu (≈5ms). Căn cùng một lead cho cả hai thì một cái lệch.
 *
 * Chuẩn hoá theo `visual-assets.md §5`: cắt lặng đầu (không cắt thì mốc căn giờ lệch đúng bằng
 * khoảng lặng), 48 kHz stereo. `startSec` cắt TỪ đâu, `trimSec` cắt dài bao nhiêu kể từ đó: một bản thu
 * dài có tiếng phòng ở đầu thì `silenceremove` không cứu được, vì tiếng phòng vẫn trên ngưỡng −50 dB
 * (đo thật trên `chisel`: nhát đầu ở 430 ms, 420 ms trước đó là tiếng phòng ở ~−50 dBFS). KHÔNG `loudnorm` — `sfx-mix` tự bù theo `lufs` đo được, nên một bản
 * loudnorm hoá lại chỉ làm mất dynamic của chính tiếng đó. Tiếng nền (`layer: "ambience"`) KHÔNG cắt
 * lặng đầu: cắt là hỏng vòng lặp.
 *
 * Idempotent: chạy lại không tải lại file đã có, không đổi số đo nếu nguồn không đổi.
 * Exit: 0 xanh · 1 có tiếng không dựng được · 2 sai cách gọi.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(REPO, 'sfx.json');
const DIR = path.join(REPO, 'assets/sfx');
/** Nơi chủ bucket đặt bản đã chuẩn hoá cho `npm run media` đẩy lên R2. */
const STAGE = path.join(REPO, 'media/files/sfx');
const MANIFEST = path.join(REPO, 'media/manifest.json');

/** Trả URL công khai của một asset key từ media/manifest.json, hoặc null nếu key chưa có. */
function mediaUrl(key) {
  if (!key || !fs.existsSync(MANIFEST)) return null;
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const base = (process.env.MEDIA_BASE || m.base || '').replace(/\/+$/, '');
  if (!base || !m.assets?.[key]) return null;
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Dựng lại assets/sfx/ từ sfx.json và đo lại mỗi tiếng.

  node tools/sfx-fetch.mjs [--measure] [--write] [--only a,b] [--json] [--prepare [dir]]

  --measure  chỉ đo file đang có, không tải gì
  --write    ghi seconds/lufs/peak/peakAtMs ngược vào sfx.json
  --only     giới hạn theo danh sách id
  --prepare  CHỦ BUCKET: nguồn gốc → chuẩn hoá → media/files/sfx/ (rồi 'npm run media').
             'dir' là nơi giữ bản thô; không có thì tải theo link 'download' trong sfx.json

exit 0 xanh · 1 có tiếng thiếu file và không tải được · 2 sai cách gọi`);
  process.exit(0);
}
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const k = argv[i].slice(2);
  const next = argv[i + 1];
  if (next && !next.startsWith('--')) { flags[k] = next; i++; } else flags[k] = true;
}

let FFMPEG = process.env.FFMPEG;
if (!FFMPEG) { try { FFMPEG = createRequire(import.meta.url)('ffmpeg-static'); } catch { FFMPEG = 'ffmpeg'; } }
const ff = (args) => spawnSync(FFMPEG, args, { encoding: 'utf8' });

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const only = typeof flags.only === 'string' ? new Set(flags.only.split(',').map((s) => s.trim())) : null;
const list = catalog.sfx.filter((s) => !only || only.has(s.id));
if (!list.length) { console.error('✗ --only không khớp id nào trong sfx.json'); process.exit(2); }

/**
 * Đỉnh tiếng nằm ở mili-giây nào. Decode mono 8 kHz s16le rồi quét |mẫu| lớn nhất: 8 kHz là thừa
 * chính xác cho một mốc tính bằng frame (1 frame = 33 ms) và giữ bộ nhớ nhỏ cho file nền 30 giây.
 */
function measurePeakAtMs(file) {
  const r = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout?.length) return null;
  const buf = r.stdout;
  let best = 0;
  let at = 0;
  for (let i = 0; i + 1 < buf.length; i += 2) {
    const v = Math.abs(buf.readInt16LE(i));
    if (v > best) { best = v; at = i / 2; }
  }
  return Math.round((at / 8000) * 1000);
}

function measure(file) {
  const eb = ff(['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr || '';
  const sum = eb.slice(eb.indexOf('Summary:'));
  const lufs = Number(sum.match(/I:\s*([-\d.]+) LUFS/)?.[1]);
  const peak = Number(sum.match(/Peak:\s*([-\d.]+) dBFS/)?.[1]);
  const vd = ff(['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']).stderr || '';
  const rmsDb = Number(vd.match(/mean_volume:\s*([-\d.]+) dB/)?.[1]);
  const probe = ff(['-hide_banner', '-i', file, '-f', 'null', '-']).stderr || '';
  const d = probe.match(/time=(\d+):(\d+):([\d.]+)/g)?.pop()?.match(/time=(\d+):(\d+):([\d.]+)/);
  const seconds = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : null;
  return {
    seconds: seconds == null ? null : Math.round(seconds * 100) / 100,
    lufs: Number.isFinite(lufs) ? Math.round(lufs * 10) / 10 : null,
    rmsDb: Number.isFinite(rmsDb) ? Math.round(rmsDb * 10) / 10 : null,
    peak: Number.isFinite(peak) ? Math.round(peak * 10) / 10 : null,
    peakAtMs: measurePeakAtMs(file),
  };
}

/**
 * CHỦ BUCKET, một lần cho mỗi tiếng: nguồn gốc (`entry.download`, hoặc một file thô dưới `--prepare <dir>`)
 * → chuẩn hoá → `media/files/sfx/<file>`, để `npm run media` đẩy lên R2.
 *
 * Chuẩn hoá nằm ở ĐÂY chứ không ở đường tải: R2 giữ đúng cái video dùng, nên (1) trình duyệt phát thẳng
 * được để nghe thử, (2) số đo trong catalog mô tả đúng bytes trên bucket, và (3) không máy nào chạy lại
 * chuỗi cắt một lần nữa. Chạy lại `startSec`/`trimSec` trên một file đã cắt là CẮT PHÁ: `chisel` khai
 * `startSec: 0.42` mà clip chỉ còn 0,5 s thì lần hai lấy mất 420/500 ms.
 */
async function prepare(entry, rawDir) {
  const local = rawDir ? [path.join(rawDir, `${entry.id}.src`), path.join(rawDir, entry.file), path.join(rawDir, `${entry.id}.mp3`)].find((f) => fs.existsSync(f)) : null;
  let src = local;
  let tmp = null;
  if (!src) {
    if (!entry.download) return `thiếu link \`download\` trong sfx.json và không có bản thô trong --prepare`;
    tmp = path.join(os.tmpdir(), `sfx-${entry.id}-${process.pid}.src`);
    try {
      const res = await fetch(entry.download);
      if (!res.ok) return `HTTP ${res.status} khi tải bản gốc`;
      fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    } catch (e) { return `không tải được bản gốc: ${e.message}`; }
    src = tmp;
  }
  // Tiếng nền phải giữ nguyên đầu file để vòng lặp không bị gãy; tiếng điểm thì cắt lặng đầu.
  const chain = [];
  // `startSec` chạy TRƯỚC mọi thứ: nó định nghĩa đâu là đầu file, nên `trimSec` bên dưới vẫn là ĐỘ DÀI.
  if (entry.startSec) chain.push(`atrim=start=${entry.startSec}`, 'asetpts=PTS-STARTPTS');
  if (entry.layer !== 'ambience') chain.push('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0:detection=peak');
  // `trimSec`: nhiều bản thu Pixabay là MỘT FILE NHIỀU LẦN lấy (con dấu đóng 5 nhát, kéo cắt 12
  // giây). Giữ nguyên thì một cú nhấn hoá thành một tràng. Cắt về đúng lần đầu + fade 60ms chống
  // click. Số `trimSec` chọn từ đường bao RMS 50ms của chính file, không ước.
  if (entry.trimSec) chain.push(`atrim=0:${entry.trimSec}`, `afade=t=out:st=${Math.max(0, entry.trimSec - 0.06)}:d=0.06`);
  fs.mkdirSync(STAGE, { recursive: true });
  const out = path.join(STAGE, entry.file);
  const r = ff(['-y', '-v', 'error', '-i', src, ...(chain.length ? ['-af', chain.join(',')] : []), '-ar', '48000', '-ac', '2', out]);
  if (tmp) fs.rmSync(tmp, { force: true });
  if (r.status !== 0) return `ffmpeg lỗi khi chuẩn hoá: ${(r.stderr || '').trim().slice(0, 200)}`;
  // Dựng sẵn luôn bản dùng được dưới assets/sfx/ để không phải tải lại từ R2 ngay sau khi chuẩn hoá.
  fs.mkdirSync(DIR, { recursive: true });
  fs.copyFileSync(out, path.join(DIR, entry.file));
  return null;
}

/**
 * MỌI MÁY: tải bản đã chuẩn hoá từ R2 về `assets/sfx/`. Không xử lý gì thêm — bytes trên bucket là bản
 * chốt, và `sfx.json` đo trên chính bytes đó.
 */
async function download(entry) {
  const url = mediaUrl(entry.media);
  if (!url) {
    const hint = entry.media
      ? `key "${entry.media}" chưa có trong media/manifest.json — chủ bucket chạy \`sfx-fetch --prepare\` rồi \`npm run media\``
      : `thiếu trường "media" trong sfx.json cho id "${entry.id}" — cần upload lên R2 và thêm key`;
    return hint;
  }
  fs.mkdirSync(DIR, { recursive: true });
  const out = path.join(DIR, entry.file);
  try {
    const res = await fetch(url);
    if (!res.ok) return `HTTP ${res.status} khi tải từ R2 — kiểm tra media/manifest.json và bucket`;
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  } catch (e) { return `không tải được từ R2: ${e.message}`; }
  return null;
}

const rows = [];
const problems = [];
for (const entry of list) {
  const file = path.join(DIR, entry.file);
  let note = 'có sẵn';
  if (flags.force && !flags.measure) fs.rmSync(file, { force: true });
  if (flags.prepare) {
    const err = await prepare(entry, typeof flags.prepare === 'string' ? path.resolve(String(flags.prepare)) : null);
    if (err) { problems.push(`${entry.id}: ${err}`); continue; }
    note = 'đã chuẩn hoá';
  } else if (!fs.existsSync(file)) {
    if (flags.measure) { problems.push(`${entry.id}: thiếu ${entry.file} (đang ở chế độ --measure, không tải)`); continue; }
    const err = await download(entry);
    if (err) { problems.push(`${entry.id}: ${err}`); continue; }
    note = 'vừa tải';
  }
  const m = measure(file);
  rows.push({ id: entry.id, layer: entry.layer || '—', note, ...m });
  if (flags.write) Object.assign(entry, m);
}

if (flags.write && !problems.length) {
  fs.writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`→ đã ghi số đo vào ${path.relative(REPO, CATALOG)}`);
}

if (flags.json) console.log(JSON.stringify({ rows, problems }, null, 2));
else {
  console.log('id            lớp         giây   LUFS    RMS    peak   đỉnh(ms)');
  for (const r of rows) {
    console.log(`${r.id.padEnd(13)} ${String(r.layer).padEnd(11)} ${String(r.seconds).padStart(5)}  ${String(r.lufs).padStart(6)} ${String(r.rmsDb).padStart(6)} ${String(r.peak).padStart(6)}  ${String(r.peakAtMs).padStart(7)}  ${r.note}`);
  }
  for (const p of problems) console.error(`✗ ${p}`);
  if (!problems.length) console.log(`\n✓ ${rows.length}/${list.length} tiếng dựng được và đo xong.`);
}
process.exit(problems.length ? 1 : 0);
