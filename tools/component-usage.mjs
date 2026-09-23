#!/usr/bin/env node
/**
 * Kiểm kê component: cái nào đang được dùng ở video nào, cái nào chưa ai mở tới.
 *
 *   node tools/component-usage.mjs            # bảng tổng hợp
 *   node tools/component-usage.mjs --unused   # chỉ liệt kê cái chưa dùng, theo nhóm
 *   node tools/component-usage.mjs --video <id>   # một video dùng những gì
 *
 * Vì sao cần: đếm tay ngày 14/09/2026 ra 104 component dùng được nhưng chỉ 49 từng được dùng — hơn
 * một nửa kho chưa ai mở. Cứ mỗi phiên lại đi viết component mới trong khi thứ cần đã nằm sẵn đó.
 * Có lệnh này thì việc "kho có gì" là một câu lệnh, không phải một buổi đọc thư mục.
 *
 * Cách đếm, và giới hạn của nó: chỉ đọc danh sách `import { … } from '…/components/index.js'` ở đầu
 * mỗi file scene. Nên nó KHÔNG thấy component được dùng gián tiếp bên trong một component khác
 * (SceneFrame tự dựng Eyebrow, SubtitleBar, Watermark…). Những cái đó đã được loại khỏi phần thống
 * kê qua INDIRECT bên dưới; thêm component nội bộ mới thì nhớ thêm vào đây.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = path.join(ROOT, process.env.VK_DS || 'vinuni-lesson-video-ds');
const COMPONENTS = path.join(DS, 'components');
const VIDEOS = path.join(DS, 'ui_kits/lesson-video/videos');

/** Chrome do SceneFrame tự dựng bên trong — scene không import trực tiếp, không tính là "chưa dùng". */
const INDIRECT = new Set(['Eyebrow', 'SubtitleBar', 'Watermark', 'SceneFooter', 'CenterHeader', 'EditorialGrid', 'EditorialHeader', 'CornerTag']);

const args = new Set(process.argv.slice(2));
const videoArg = (() => {
  const i = process.argv.indexOf('--video');
  return i > 0 ? process.argv[i + 1] : null;
})();

// ── kho có gì ─────────────────────────────────────────────────────────────────
const byGroup = new Map();
for (const group of fs.readdirSync(COMPONENTS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const names = [];
  for (const f of fs.readdirSync(path.join(COMPONENTS, group)).filter((f) => f.endsWith('.jsx'))) {
    const src = fs.readFileSync(path.join(COMPONENTS, group, f), 'utf8');
    // Chỉ lấy tên viết hoa đầu: đó là component; tên thường là hàm hình học, tên toàn hoa là hằng số.
    for (const m of src.matchAll(/^export (?:function|const) ([A-Z][A-Za-z0-9]*)/gm)) {
      if (/^[A-Z0-9_]+$/.test(m[1])) continue;
      if (INDIRECT.has(m[1])) continue;
      names.push(m[1]);
    }
  }
  const hasCard = fs.readdirSync(path.join(COMPONENTS, group)).some((f) => f.endsWith('.html'));
  if (names.length) byGroup.set(group, { names: [...new Set(names)].sort(), hasCard });
}

// ── video nào dùng gì ─────────────────────────────────────────────────────────
const usedBy = new Map(); // component -> [video]
const perVideo = new Map();
const videoDirs = fs.existsSync(VIDEOS)
  ? fs.readdirSync(VIDEOS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];
for (const v of videoDirs) {
  const names = new Set();
  for (const f of fs.readdirSync(path.join(VIDEOS, v)).filter((f) => f.endsWith('.jsx'))) {
    const src = fs.readFileSync(path.join(VIDEOS, v, f), 'utf8');
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*components\/index\.js['"]/g)) {
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (/^[A-Z]/.test(name)) names.add(name);
      }
    }
  }
  perVideo.set(v, [...names].sort());
  for (const n of names) usedBy.set(n, [...(usedBy.get(n) || []), v]);
}

// ── in ────────────────────────────────────────────────────────────────────────
const all = [...byGroup.values()].flatMap((g) => g.names);
const used = all.filter((n) => usedBy.has(n));
const unused = all.filter((n) => !usedBy.has(n));

if (videoArg) {
  const list = perVideo.get(videoArg);
  if (!list) { console.error(`không có video "${videoArg}" — có: ${videoDirs.join(', ')}`); process.exit(1); }
  console.log(`${videoArg}: ${list.length} component`);
  console.log('  ' + list.join(' '));
  process.exit(0);
}

if (args.has('--unused')) {
  console.log(`${unused.length}/${all.length} component chưa bao giờ được dùng:\n`);
  for (const [group, g] of byGroup) {
    const miss = g.names.filter((n) => !usedBy.has(n));
    if (!miss.length) continue;
    console.log(`  ${group}${g.hasCard ? '' : '  ⚠️ chưa có card — không hiện trong gallery'}`);
    console.log(`    ${miss.join(' ')}`);
  }
  process.exit(0);
}

console.log(`kho: ${all.length} component · đã dùng ${used.length} · chưa dùng ${unused.length}\n`);
for (const [group, g] of byGroup) {
  const u = g.names.filter((n) => usedBy.has(n)).length;
  const bar = `${u}/${g.names.length}`;
  console.log(`  ${group.padEnd(12)} ${bar.padStart(6)}${g.hasCard ? '' : '   ⚠️ chưa có card'}`);
}
console.log('\nvideo:');
for (const [v, list] of perVideo) console.log(`  ${v.padEnd(28)} ${String(list.length).padStart(2)} component`);
console.log('\n`--unused` để xem danh sách chưa dùng · `--video <id>` để xem một video dùng gì');
