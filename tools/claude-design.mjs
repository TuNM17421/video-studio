#!/usr/bin/env node
/**
 * Sinh bản brief gửi sang Claude Design cho một video — lời đọc, thời lượng đo thật của từng câu, chữ phải
 * hiện trên màn hình, và phần riêng của style.
 *
 *   node tools/claude-design.mjs prompt <video dir> [--style lesson-lab] [--format 9x16]
 *        [--modules dialogue,quiz,mascot,images] [--out file.md]
 *   node tools/claude-design.mjs import <video dir> --from <thư mục tải về> [--format 9x16] [--scan]
 *
 * --format là khổ hình của video (mặc định 16x9): brief nói đúng cỡ khung và cách bày, phép soát lúc nhập đòi
 * trang khai `window.vkFormat` cho khổ dọc. --modules là các năng lực đã bật ở bước Kế hoạch; không truyền thì
 * brief chỉ nói những gì đọc được từ chính các câu (người nói, khoảng chờ quiz). Ảnh tư liệu đã duyệt đọc từ
 * `images.js` của video, và lúc nhập thư mục `img/` của video được chép theo trang.
 *
 * Thời lượng lấy từ `voice/out/<id>/voice.cues.json` khi đã thu giọng; chưa thu thì lấy `seconds` ước trong
 * cues.js và brief tự nói rõ đó là ước. Phần riêng của style đọc từ `styles/<id>.claude-design.md` — thêm một
 * style là thêm một file, không sửa code. Không có file đó thì brief vẫn chạy, chỉ thiếu phần style.
 *
 * In ra stdout, hoặc ghi vào --out. Không đụng gì tới video.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPrompt, bundleFrames, inspectBundle } from './lib/claude-design.mjs';
import { FORMATS } from '../vinuni-lesson-video-ds/lib/tokens.js';

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 ? null : argv[i + 1];
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));

const [command, dirArg] = positional;
if (!['prompt', 'import'].includes(command) || !dirArg) {
  fail([
    'dùng:',
    '  node tools/claude-design.mjs prompt <video dir> [--style lesson-lab] [--format 9x16] [--modules a,b] [--out file.md]',
    '  node tools/claude-design.mjs import <video dir> --from <thư mục tải về> [--format 9x16] [--scan]',
  ].join('\n'));
}

const videoDir = path.resolve(dirArg);
const cuesFile = path.join(videoDir, 'cues.js');
if (!fs.existsSync(cuesFile)) fail(`không thấy ${path.relative(process.cwd(), cuesFile)}`);

const id = path.basename(videoDir);
// Khổ lạ phải dừng ở đây: rơi lặng lẽ về 16:9 là đúng cái lỗi brief từng mắc — bảo dựng ngang cho một video dọc.
const formatId = flag('format') || '16x9';
const format = FORMATS[formatId];
if (!format) fail(`không có khổ hình ${formatId} — chọn một trong: ${Object.keys(FORMATS).join(', ')}`);
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

if (command === 'import') {
  const from = flag('from');
  if (!from) fail('thiếu --from <thư mục tải về từ Claude Design>');
  const src = path.resolve(from);
  if (!fs.existsSync(src)) fail(`không thấy thư mục ${from}`);

  const files = fs.readdirSync(src, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
  const page = files.find((f) => /\.html$/i.test(f));
  const pageHtml = page ? fs.readFileSync(path.join(src, page), 'utf8') : '';
  const scripts = files.filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(src, f), 'utf8'));
  const report = inspectBundle({ files, page, pageHtml, scripts, format });

  // Tổng frame: bên kia khai bao nhiêu, bên này đo được bao nhiêu. Lệch là cảnh trôi so với lời.
  const theirs = bundleFrames(scripts);
  const ours = (() => {
    const voice = [
      path.join(repoRoot, 'voice/out', id, 'voice.cues.json'),
      path.join(repoRoot, 'tts-elevenlabs/out', id, 'voice.cues.json'),
    ].find((f) => fs.existsSync(f));
    if (!voice) return null;
    const parsed = JSON.parse(fs.readFileSync(voice, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : parsed.cues;
    return list.reduce((sum, c) => sum + (c.durationInFrames || 0), 0);
  })();
  if (theirs !== null && ours !== null) {
    report.checks.push({
      name: 'tổng frame khớp giọng', ok: theirs === ours,
      detail: theirs === ours ? `${ours} frame` : `bên kia ${theirs}, giọng bên này ${ours} — cảnh sẽ trôi so với lời`,
      level: theirs === ours ? 'ok' : 'problem',
    });
    if (theirs !== ours) report.ok = false;
  } else {
    report.checks.push({ name: 'tổng frame khớp giọng', ok: true, detail: 'không đọc được tổng frame bên kia — render sẽ tự đối chiếu với giọng', level: 'warning' });
  }

  // Trang nạp `../../_ds_bundle.js` và `../../_vendor/react.js` — hai thứ chỉ có trong ds-bundle, do
  // /design-sync sinh ra. Máy chưa sync thì chép xong vẫn ra trang trắng, nên nói trước.
  const rootNeeds = ['_ds_bundle.js', '_vendor/react.js', '_vendor/react-dom.js', 'styles.css'];
  const rootMissing = rootNeeds.filter((f) => !fs.existsSync(path.join(repoRoot, 'ds-bundle', f)));
  report.checks.push({
    name: 'ds-bundle sẵn sàng', ok: rootMissing.length === 0,
    detail: rootMissing.length ? `thiếu ${rootMissing.join(', ')} — chạy /design-sync trước` : 'đủ file gốc trang cần',
    level: rootMissing.length ? 'problem' : 'ok',
  });
  if (rootMissing.length) report.ok = false;

  const dest = path.join(repoRoot, 'ds-bundle', 'cd', id);
  const out = { ok: report.ok, page, files: files.length, dest: path.relative(repoRoot, dest), checks: report.checks };

  if (!argv.includes('--scan')) {
    if (!report.ok) fail(`thư mục không qua phép soát:\n${report.checks.filter((c) => !c.ok && c.level === 'problem').map((c) => `  · ${c.name}: ${c.detail}`).join('\n')}`);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    for (const f of files) fs.copyFileSync(path.join(src, f), path.join(dest, f));
    out.copied = files.length;
    // Ảnh tư liệu: bản trong thư mục video là bản người dựng đã duyệt (image-apply tải về), nên chép bản đó
    // theo trang thay vì tin vào thứ quay về từ bên kia. Brief dặn trang nạp `img/<tên file>` cạnh nó.
    const imgDir = path.join(videoDir, 'img');
    if (fs.existsSync(imgDir)) {
      const imgs = fs.readdirSync(imgDir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
      fs.mkdirSync(path.join(dest, 'img'), { recursive: true });
      for (const f of imgs) fs.copyFileSync(path.join(imgDir, f), path.join(dest, 'img', f));
      out.copied += imgs.length;
      out.images = imgs.length;
    }
  }
  process.stdout.write(`${JSON.stringify(out)}\n`);
  process.exit(0);
}

const mod = await import(pathToFileURL(cuesFile).href);
const raw = mod.CUES ?? mod.RAW;
if (!Array.isArray(raw) || !raw.length) fail('cues.js không phơi ra CUES');
// SECTIONS chỉ là TÊN phần; số phần nằm trên từng câu. Thiếu tên thì brief vẫn dựng được, phần gọi là "Phần N".
const sections = mod.SECTIONS ?? [];

// Giọng đã thu thì dùng số đo thật; chưa thu thì dùng ước của kịch bản, và brief nói rõ là ước.
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// Giọng nằm ở `voice/out/<id>/` từ 2026; video cũ còn ở `tts-elevenlabs/out/<id>/` (xem voiceOutAll của
// Studio). Bỏ sót đường cũ thì brief lặng lẽ rơi về ước lượng dù đã có số đo thật.
const voiceFile = [
  path.join(repo, 'voice/out', id, 'voice.cues.json'),
  path.join(repo, 'tts-elevenlabs/out', id, 'voice.cues.json'),
].find((f) => fs.existsSync(f));
let measuredFrames = null;
if (voiceFile) {
  const parsed = JSON.parse(fs.readFileSync(voiceFile, 'utf8'));
  const list = Array.isArray(parsed) ? parsed : parsed.cues;
  measuredFrames = new Map(list.map((c) => [c.n, c.durationInFrames]));
}

const cues = raw.map((c) => {
  const frames = measuredFrames?.get(c.n) ?? c.frames ?? Math.round((c.seconds ?? 0) * 30);
  if (!frames) fail(`câu ${c.n} không có thời lượng — chạy voice-timing trước, hoặc để seconds trong cues.js`);
  return {
    n: c.n, section: c.section ?? 1, text: c.text ?? '', title: c.title ?? '', visual: c.visual ?? '', frames,
    speaker: c.speaker ?? '', silent: Boolean(c.silent), quiz: Boolean(c.quiz), tag: c.tag ?? '',
  };
});

// Tên video: dòng tiêu đề của kịch bản gốc là nguồn sạch nhất và không cần Studio.
const scriptFile = path.join(repo, 'projects', id, 'kich-ban-goc.md');
const title = fs.existsSync(scriptFile)
  ? (fs.readFileSync(scriptFile, 'utf8').match(/^#\s+(.+)$/m)?.[1]?.trim() || id)
  : id;

const style = flag('style') || 'lesson-lab';
const blockFile = path.join(repo, 'styles', `${style}.claude-design.md`);
const styleBlock = fs.existsSync(blockFile) ? fs.readFileSync(blockFile, 'utf8') : '';
if (!styleBlock) console.error(`! không có styles/${style}.claude-design.md — brief sẽ thiếu phần riêng của style`);

// Năng lực đã bật ở bước Kế hoạch. Không truyền cờ thì để null: brief khi đó không khẳng định gì về thứ nó
// không biết (ví dụ "không có linh vật") mà chỉ nói điều đọc được từ chính các câu.
const modules = flag('modules') === null ? null : String(flag('modules')).split(',').map((m) => m.trim()).filter(Boolean);

// Ảnh người dựng đã duyệt (image-apply sinh images.js). Bên kia không thấy máy này, nên brief phải nêu từng file.
const imagesFile = path.join(videoDir, 'images.js');
const images = fs.existsSync(imagesFile)
  ? Object.values((await import(pathToFileURL(imagesFile).href)).IMAGES ?? {}).map((i) => ({
      file: path.basename(String(i.src || '')), kind: i.kind, cues: i.cues ?? [], subject: i.subject ?? '',
      caption: i.caption ?? '', credit: i.credit ?? '', width: i.width, height: i.height,
    }))
  : [];

const text = buildPrompt({
  id,
  title,
  sections,
  cues,
  measured: Boolean(measuredFrames),
  styleName: style,
  styleBlock,
  format,
  modules,
  images,
});

const out = flag('out');
if (out) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), text.endsWith('\n') ? text : `${text}\n`);
  const total = cues.reduce((s, c) => s + c.frames, 0);
  console.error(`✓ ${out} · ${cues.length} câu · ${total.toLocaleString('vi-VN')} frame · thời lượng ${measuredFrames ? 'đo thật' : 'ƯỚC LƯỢNG'}`);
  // Một dòng JSON trên stdout cho Studio: những thứ nó phải nói với người dùng mà không nên đoán bằng regex.
  process.stdout.write(`${JSON.stringify({ cues: cues.length, frames: total, measured: Boolean(measuredFrames), format: format.id, styleBlock: Boolean(styleBlock), images: images.filter((i) => i.kind === 'use').length })}\n`);
} else {
  process.stdout.write(`${text}\n`);
}
