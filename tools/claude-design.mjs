#!/usr/bin/env node
/**
 * Sinh bản brief gửi sang Claude Design cho một video — lời đọc, thời lượng đo thật của từng câu, chữ phải
 * hiện trên màn hình, và phần riêng của style.
 *
 *   node tools/claude-design.mjs prompt <video dir> [--style lesson-lab] [--out file.md]
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
import { buildPrompt } from './lib/claude-design.mjs';

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
if (command !== 'prompt' || !dirArg) {
  fail('dùng: node tools/claude-design.mjs prompt <video dir> [--style lesson-lab] [--out file.md]');
}

const videoDir = path.resolve(dirArg);
const cuesFile = path.join(videoDir, 'cues.js');
if (!fs.existsSync(cuesFile)) fail(`không thấy ${path.relative(process.cwd(), cuesFile)}`);

const id = path.basename(videoDir);
const mod = await import(pathToFileURL(cuesFile).href);
const raw = mod.CUES ?? mod.RAW;
if (!Array.isArray(raw) || !raw.length) fail('cues.js không phơi ra CUES');
const sections = mod.SECTIONS ?? [];
if (!sections.length) fail('cues.js không phơi ra SECTIONS — brief chia theo phần, không có phần thì không dựng được');

// Giọng đã thu thì dùng số đo thật; chưa thu thì dùng ước của kịch bản, và brief nói rõ là ước.
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const voiceFile = path.join(repo, 'voice/out', id, 'voice.cues.json');
let measuredFrames = null;
if (fs.existsSync(voiceFile)) {
  const parsed = JSON.parse(fs.readFileSync(voiceFile, 'utf8'));
  const list = Array.isArray(parsed) ? parsed : parsed.cues;
  measuredFrames = new Map(list.map((c) => [c.n, c.durationInFrames]));
}

const cues = raw.map((c) => {
  const frames = measuredFrames?.get(c.n) ?? c.frames ?? Math.round((c.seconds ?? 0) * 30);
  if (!frames) fail(`câu ${c.n} không có thời lượng — chạy voice-timing trước, hoặc để seconds trong cues.js`);
  return { n: c.n, section: c.section ?? 1, text: c.text ?? '', title: c.title ?? '', visual: c.visual ?? '', frames };
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

const text = buildPrompt({
  id,
  title,
  sections,
  cues,
  measured: Boolean(measuredFrames),
  styleName: style,
  styleBlock,
});

const out = flag('out');
if (out) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), text.endsWith('\n') ? text : `${text}\n`);
  const total = cues.reduce((s, c) => s + c.frames, 0);
  console.error(`✓ ${out} · ${cues.length} câu · ${total.toLocaleString('vi-VN')} frame · thời lượng ${measuredFrames ? 'đo thật' : 'ƯỚC LƯỢNG'}`);
} else {
  process.stdout.write(`${text}\n`);
}
