/**
 * `vach-boundary` — carrier có ĐI LIỀN qua ranh giới cảnh không?
 *
 * Dòng video "poster vector" không dùng `transition`: chuyển cảnh là do một VẬT đi tiếp
 * (`styles/poster.md` §6). Với `d05-v06` cái vật đó là CÁI VẠCH, và hai lane dựng song song mỗi
 * lane một nửa phim. Bảng `VACH_STATE` trong `kit.jsx` chỉ là LỜI HỨA giữa hai lane; thứ duy nhất
 * chứng minh carrier không gãy là tham số ĐANG VẼ ở frame cuối cảnh trước so với frame đầu cảnh sau.
 *
 * Tool này smoke-render đúng hai frame đó cho từng cặp cảnh liền kề, đọc `data-vk-vach` mà
 * `lib/poster/vach.jsx` ghi ra, rồi so từng khoá. KHÔNG đọc bảng khai báo — đó chính là chỗ mà lời
 * hứa và hiện thực đã lệch nhau một lần (ranh giới C3→C4, 21/09/2026).
 *
 *   node tools/vach-boundary.mjs --video <id> [--tol 0.02] [--json]
 *
 * exit 0 xanh · 1 có ranh giới lệch · 2 sai cách gọi / không dựng được.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = path.join(REPO, 'vinuni-lesson-video-ds');
const VIDEOS = path.join(DS, 'ui_kits/lesson-video/videos');
const fail = (m) => { console.error(`✗ ${m}`); process.exit(2); };

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Kiểm carrier "cái vạch" có đi liền qua từng ranh giới cảnh không.

  node tools/vach-boundary.mjs --video <id> [--tol <số>] [--json]

  Với mỗi cặp cảnh liền kề: render frame CUỐI của cảnh trước và frame ĐẦU của cảnh sau, đọc
  \`data-vk-vach\` (trạng thái THẬT đang vẽ, không phải bảng khai báo), so từng khoá:
    p · shift · divide · tilt · cracks · branches · band · zones · gap · notches
  Lệch quá \`--tol\` (mặc định 0,02 cho số 0…1) là đỏ.

  Cảnh cố ý KHÔNG có vạch trên khung vẫn phải khai một trạng thái — vạch lùi thành đường chân trời,
  nó không được biến mất giữa phim.

exit 0 xanh · 1 có ranh giới lệch · 2 sai cách gọi`);
  process.exit(0);
}
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next && !next.startsWith('--')) { flags[argv[i].slice(2)] = next; i++; } else flags[argv[i].slice(2)] = true;
}
const videoId = flags.video;
if (!videoId || videoId === true) fail('usage: node tools/vach-boundary.mjs --video <id>');
const TOL = Number(flags.tol ?? 0.02);
const base = path.join(VIDEOS, videoId);
if (!fs.existsSync(base)) fail(`không có thư mục cảnh ${path.relative(REPO, base)}`);

const NODE_MODULES = path.join(REPO, 'node_modules');
if (!fs.existsSync(NODE_MODULES)) fail('thiếu node_modules (cần esbuild + react-dom)');
const require = createRequire(path.join(NODE_MODULES, 'noop.js'));
const esbuild = require('esbuild');

const entry = `
  import React from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';
  import Video, { meta } from ${JSON.stringify(path.join(base, 'video.jsx'))};
  import { TIMELINE } from ${JSON.stringify(path.join(base, 'timeline.js'))};
  import { ConfigContext, FrameContext } from ${JSON.stringify(path.join(DS, 'lib/player.jsx'))};
  export { meta, TIMELINE };
  export const renderAt = (frame) =>
    renderToStaticMarkup(
      React.createElement(ConfigContext.Provider, { value: { fps: 30, width: 1920, height: 1080, durationInFrames: meta.duration } },
        React.createElement(FrameContext.Provider, { value: frame }, React.createElement(Video))));
`;
let mod;
try {
  const out = await esbuild.build({
    stdin: { contents: entry, resolveDir: base, loader: 'jsx' },
    bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
    nodePaths: [NODE_MODULES], loader: { '.js': 'jsx', '.jsx': 'jsx' },
    define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent',
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
  mod = m.exports;
} catch (e) {
  fail(`không dựng được ${videoId}: ${String(e.message || e).split('\n')[0]}`);
}
const { TIMELINE, renderAt } = mod;

/** Biên frame của từng CẢNH (không phải cue) theo đúng thứ tự phim. */
const scenes = [];
for (const t of TIMELINE) {
  const last = scenes[scenes.length - 1];
  if (last && last.id === t.scene) last.end = t.end;
  else scenes.push({ id: t.scene, start: t.start, end: t.end });
}

/*
 * HAI TÊN THUỘC TÍNH — `data-vk-vach` (carrier "cái vạch" của d05-v06) và `data-vk-carrier`
 * (carrier BẤT KỲ, ví dụ "cái cân" của d05-v01). Tool này ra đời cho cái vạch nên khoá số của nó
 * được liệt kê cứng; phim khác có bộ khoá khác, vì vậy từ 22/09/2026 phép so là:
 *   - mọi khoá SỐ có mặt ở một trong hai frame (hợp của hai tập khoá),
 *   - cộng bốn khoá cấu trúc riêng của cái vạch (`band` · `zones` · `gap` · `notches`) khi có.
 * Với d05-v06 tập khoá số đúng bằng danh sách cũ nên hành vi không đổi.
 */
const readVach = (frame) => {
  const html = renderAt(frame);
  const m = html.match(/data-vk-(?:vach|carrier)="([^"]*)"/);
  if (!m) return null;
  const raw = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  try { return JSON.parse(raw); } catch { return null; }
};

/** So hai trạng thái; trả danh sách khoá lệch, mỗi khoá một dòng người đọc được. */
function diff(a, b) {
  const out = [];
  if (!a && !b) return ['CẢ HAI frame không vẽ cái vạch — carrier biến mất giữa phim'];
  if (!a) return ['frame cuối cảnh TRƯỚC không vẽ cái vạch'];
  if (!b) return ['frame đầu cảnh SAU không vẽ cái vạch'];
  const num = (k) => {
    const x = a[k] ?? 0;
    const y = b[k] ?? 0;
    if (Math.abs(x - y) > TOL) out.push(`${k} ${x} → ${y}`);
  };
  const numKeys = new Set();
  for (const k of ['p', 'shift', 'divide', 'tilt', 'cracks', 'branches']) numKeys.add(k);
  for (const s of [a, b]) for (const [k, v] of Object.entries(s)) if (typeof v === 'number') numKeys.add(k);
  for (const k of [...numKeys].sort()) num(k);
  const band = (s) => (s.band ? `${s.band.from}–${s.band.to}` : '—');
  if (band(a) !== band(b)) {
    const ok = a.band && b.band && Math.abs(a.band.from - b.band.from) <= TOL && Math.abs(a.band.to - b.band.to) <= TOL;
    if (!ok) out.push(`band ${band(a)} → ${band(b)}`);
  }
  const zones = (s) => (s.zones ? s.zones.map((z) => `${z.tone}:${z.from}-${z.to}`).join('|') : '—');
  if (zones(a) !== zones(b)) out.push(`zones ${zones(a)} → ${zones(b)}`);
  const gap = (s) => (s.gap ? `${s.gap.at}±${s.gap.w}` : '—');
  if (gap(a) !== gap(b)) out.push(`gap ${gap(a)} → ${gap(b)}`);
  // Danh sách khấc RỖNG ≡ không có khấc: một cảnh khai `notches` nhưng `on` còn 0 ở frame đầu
  // không phải là lệch so với cảnh trước chưa có khấc nào.
  const notch = (s) => {
    const on = (s.notches || []).filter((n) => n.on > 0.5).map((n) => n.at);
    return on.length ? on.join(',') : '—';
  };
  if (notch(a) !== notch(b)) out.push(`notches ${notch(a)} → ${notch(b)}`);
  return out;
}

/*
 * CẢNH CỐ Ý KHÔNG CÓ CARRIER — khai trong `storyboard.json` là `$carrierAbsent`, kèm lý do.
 *
 * Mặc định của tool này (vạch không bao giờ được biến mất) là đúng cho gần hết phim, nhưng có
 * cảnh mà sự VẮNG MẶT chính là nội dung: ba cảnh trắc nghiệm của `d05-v06` cố ý tắt cái vạch để
 * người xem tự dựng lại nó trong đầu. Bỏ qua im lặng thì mất luôn phép kiểm, nên ở đây làm chặt
 * hơn: nhảy QUA cả quãng vắng mặt và so trạng thái TRƯỚC quãng với trạng thái SAU quãng. Carrier
 * vẫn phải nối liền — nó chỉ không hiện hình một lúc.
 *
 * Cảnh vắng mặt KHÔNG khai trong storyboard vẫn đỏ y như trước.
 */
const absent = new Set();
try {
  const sb = JSON.parse(fs.readFileSync(path.join(REPO, 'projects', videoId, 'storyboard.json'), 'utf8'));
  for (const id of sb.$carrierAbsent?.scenes || []) absent.add(id);
} catch { /* không có storyboard thì giữ nguyên hành vi cũ */ }

const rows = [];
for (let i = 0; i < scenes.length - 1; i++) {
  const prev = scenes[i];
  const next = scenes[i + 1];
  if (absent.has(prev.id) && absent.has(next.id)) continue; // vẫn trong quãng vắng mặt đã khai
  let j = i + 1;
  while (j < scenes.length && absent.has(scenes[j].id)) j++;
  const skipped = j - i - 1;
  if (skipped && j >= scenes.length) {
    // Quãng vắng mặt chạy tới hết phim: không có gì ở bờ bên kia để so.
    rows.push({ from: prev.id, to: scenes[scenes.length - 1].id, fa: prev.end - 1, fb: null,
      diff: [], skipped, note: 'quãng vắng mặt kéo tới hết phim — không có bờ bên kia để so' });
    break;
  }
  const to = scenes[j];
  const fa = prev.end - 1;
  const fb = to.start;
  const d = diff(readVach(fa), readVach(fb));
  rows.push({ from: prev.id, to: to.id, fa, fb, diff: d, skipped });
}

const bad = rows.filter((r) => r.diff.length);
if (flags.json) {
  console.log(JSON.stringify({ video: videoId, tol: TOL, boundaries: rows.length, bad: bad.length, rows }, null, 2));
} else {
  console.log(`vach-boundary · ${videoId} · ${rows.length} ranh giới cảnh · tol ${TOL}`);
  const skippedRows = rows.filter((r) => r.skipped);
  for (const r of skippedRows) {
    console.log(`  ⤳ ${r.from} → ${r.to}: nhảy qua ${r.skipped} cảnh khai \`$carrierAbsent\`${r.note ? ` (${r.note})` : ''}`);
  }
  for (const r of bad) {
    console.log(`  ✗ ${r.from} (f${r.fa}) → ${r.to} (f${r.fb})`);
    for (const d of r.diff) console.log(`      ${d}`);
  }
  console.log(bad.length ? `\n✗ ${bad.length}/${rows.length} ranh giới lệch` : `\n✓ ${rows.length}/${rows.length} ranh giới khớp — carrier đi liền hết phim`);
}
process.exit(bad.length ? 1 : 0);
