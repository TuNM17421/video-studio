#!/usr/bin/env node
/**
 * Sinh khung file cho một video mới thay vì chép tay ~10 file từ `d2-01-lab` (audit process #3).
 * Chỉ sinh KHUNG rỗng (schema tối thiểu để `build`/`verify` chạy được) — KHÔNG sinh nội dung sáng
 * tạo; script/scene thật vẫn do agent viết theo `.claude/skills/make-video/SKILL.md`.
 *
 *   node tools/new-video.mjs <id> --style poster|slide [--title <text>] [--day <NN>]
 *
 * Sinh hai cây:
 *   projects/<id>/{REQUEST.md, kich-ban-goc.md, pronounce.json, PROMPTS.md}
 *   vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/{cues.js, voice.js, timeline.js,
 *     shared.jsx, video.jsx, s01.jsx, card.html, player.html, STORYBOARD.md, (poster: stage.jsx,
 *     chapters.jsx, qa-layout.json)}
 *
 * Nguồn khung: `templates/video/<style>/{project,scene}/**`. Từ chối ghi đè id đã tồn tại (project
 * hoặc scene dir). Id nên theo quy ước `d{NN}-v{NN}-{slug}` — sai quy ước chỉ CẢNH BÁO, không chặn
 * (id tạm `demo-…` là thật, xem `AGENTS.md`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(2);
};

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage:
  node tools/new-video.mjs <id> --style poster|slide [--title <text>] [--day <NN>]

Sinh khung file cho video mới (projects/<id>/ + vinuni-lesson-video-ds/.../videos/<id>/) từ
templates/video/<style>/. Không sinh nội dung sáng tạo — chỉ schema tối thiểu để build/verify chạy.
Từ chối ghi đè id đã tồn tại.`);
  process.exit(0);
}

const id = argv[0];
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const style = flag('style');
if (!id || id.startsWith('--')) fail('thiếu <id>. Xem --help.');
if (!['poster', 'slide'].includes(style)) fail('--style phải là poster hoặc slide. Xem --help.');

const idPattern = /^d\d{2}-v\d{2}-[a-z0-9-]+$/;
if (!idPattern.test(id)) {
  console.warn(`⚠ id "${id}" không theo quy ước d{NN}-v{NN}-{slug} — vẫn sinh (id tạm demo-… là hợp lệ có thật), nhưng kiểm lại trước khi coi là video chính thức.`);
}

const dayFlag = flag('day');
const dayMatch = id.match(/^d(\d{2})-/);
const day = dayFlag || (dayMatch ? dayMatch[1] : '');

const title = flag('title') || id
  .replace(/^d\d{2}-v\d{2}-/, '')
  .split(/[-_]/)
  .filter(Boolean)
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join(' ');

// Tên component React hợp lệ (đầu chữ hoa, không dấu gạch): "d01-v01-ai-history" -> "D01V01AiHistoryVideo".
const componentName = `${id
  .split(/[-_]/)
  .filter(Boolean)
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join('')}Video`.replace(/[^A-Za-z0-9]/g, '');

const projectDir = path.join(REPO, 'projects', id);
const sceneDir = path.join(REPO, 'vinuni-lesson-video-ds', 'ui_kits', 'lesson-video', 'videos', id);
if (fs.existsSync(projectDir)) fail(`đã tồn tại ${path.relative(REPO, projectDir)} — không ghi đè.`);
if (fs.existsSync(sceneDir)) fail(`đã tồn tại ${path.relative(REPO, sceneDir)} — không ghi đè.`);

const templateRoot = path.join(REPO, 'templates', 'video', style);
if (!fs.existsSync(templateRoot)) fail(`không tìm thấy khung ${path.relative(REPO, templateRoot)}.`);

const placeholders = {
  __ID__: id,
  __TITLE__: title,
  __DAY__: day || '(chưa rõ)',
  __COMPONENT_NAME__: componentName,
};

function fillPlaceholders(text) {
  let out = text;
  for (const [key, value] of Object.entries(placeholders)) out = out.split(key).join(value);
  return out;
}

function copyTree(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const written = [];
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      written.push(...copyTree(src, dest));
      continue;
    }
    const raw = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, fillPlaceholders(raw));
    written.push(dest);
  }
  return written;
}

const written = [
  ...copyTree(path.join(templateRoot, 'project'), projectDir),
  ...copyTree(path.join(templateRoot, 'scene'), sceneDir),
];

console.log(`✓ sinh ${written.length} file cho ${id} (style ${style})`);
for (const file of written.sort()) console.log(`  ${path.relative(REPO, file)}`);
console.log(`\nTiếp theo: điền projects/${id}/REQUEST.md + kich-ban-goc.md, rồi làm theo SKILL.md — giọng trước, scene sau.`);
console.log('  Chốt trường **Voice** TRƯỚC khi sinh câu đầu tiên: video kiểu DẪN, không tương tác với người');
console.log('  nghe → `zerotts:baotrang`; còn lại → `omnivoice`. Đổi sau là phải sinh lại TOÀN BỘ cue.');
