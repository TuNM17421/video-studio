#!/usr/bin/env node
/**
 * Một lệnh QA cho một video — chạy đúng chuỗi mà owner vẫn gõ tay, rồi để lại một báo cáo ngắn.
 *
 *   node tools/qa.mjs --video <id>
 *   node tools/qa.mjs --video <id> --no-frames     # bỏ bước trích ảnh từ MP4
 *   node tools/qa.mjs --selftest                   # tự kiểm các phép đo không cần video
 *   node tools/qa.mjs --help
 *
 * VÌ SAO CÓ FILE NÀY (audit qa, mục (f)(g)). Bốn công cụ QA đã có nhưng nằm rời: agent phải nhớ thứ
 * tự, nhớ cờ, rồi tự gom kết quả — ledger video demo ghi 23 lượt gate/67 phút, phần lớn là gõ lại
 * cùng một chuỗi. Và không lượt nào để lại thứ owner đọc được: mọi kết luận nằm trong scrollback.
 *
 * BA BƯỚC ĐẦU CHẶN (exit ≠ 0), phần còn lại chỉ cảnh báo:
 *   1. text-gate   — lời: nhịp câu, connector, cue quá dài, 5 chỉ số "tính người"
 *   2. qa-layout   — bố cục đo trong trình duyệt thật (chữ đè, che, mép, cỡ) — bỏ qua nếu video
 *                    chưa bật (`qa-layout.json`), vì nó là opt-in theo video
 *   3. verify      — gate toàn bộ design system + smoke render
 *   4. audio-qa    — gọi nếu `tools/audio-qa.mjs` có mặt (lane giọng đang viết); thiếu thì bỏ qua
 *   5. trích frame — ảnh full-res 1920×1080 tại mốc nhấn + đầu mỗi chương, cho owner nhìn bằng mắt
 *
 * Frame đầu mỗi chương + mốc nhấn, chứ không phải contact sheet: retro E2/E3 đã ghi một contact
 * sheet 47 frame làm chữ 20px co còn 5px và hai lỗi chồng chữ lọt qua ba vòng QA bằng mắt.
 *
 * Không gọi mạng, không sinh giọng, không render. Chỉ đọc thứ đã có trên đĩa.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { MIN_FONT_PX, smallTextProblems, ssrTextBoxes } from './lib/ssr-boxes.mjs';
import { cueSpeechSeconds, humanSignals, longCueProblems } from './lib/text-gates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DS = path.resolve(ROOT, process.env.VK_DS || 'vinuni-lesson-video-ds');
const VIDEOS = path.join(DS, 'ui_kits/lesson-video/videos');
const FPS = 30;
const MAX_IMAGES = 12;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? null : args[i + 1] ?? true;
};

if (args.includes('--help') || args.includes('-h') || !args.length) {
  console.log(`usage: node tools/qa.mjs --video <id> [--no-frames]
  --video <id>   video cần QA (bắt buộc)
  --no-frames    bỏ bước trích ảnh từ MP4
  --selftest     tự kiểm các phép đo, không cần video

chuỗi 10 bước: text-gate · qa-layout · verify · storyboard-gate · dead-frames · vach-boundary ·
scene-pace · audio-qa · trích frame từ MP4.
\`dead-frames\` chạy TRƯỚC render có chủ đích (F1): khung chết chỉ lộ sau render thì tốn thêm một
lượt render ~11 phút.
cần: \`npm run serve\` chạy sẵn ở terminal khác — bước qa-layout mở trình duyệt vào cổng 8765
exit: 0 mọi bước CHẶN đều xanh · 1 có bước chặn đỏ · 2 sai tham số`);
  process.exit(args.length ? 0 : 2);
}

// ── --selftest ────────────────────────────────────────────────────────────────────────────────
// Các phép đo mà `qa.mjs` và `verify.mjs` dùng chung phải CHỨNG MINH ĐƯỢC LÀ BIẾT FAIL. Fixture
// dựng tay ở đây thay vì phá file của video: nó chạy được ở mọi máy, và không đụng vào thư mục
// của lane khác.
if (args.includes('--selftest')) {
  const div = (style, text) => `<div style="${style}">${text}</div>`;
  const FONT = 'position:absolute;left:200px;top:300px;font-size';
  const clean = div(`${FONT}:40px`, 'Chữ to đàng hoàng') + div(`${FONT}:36px`, 'Một dòng nữa');
  const small = clean + div(`${FONT}:18px`, 'chú thích bé tí');
  const invisible = clean + div(`${FONT}:18px;opacity:0`, 'đang ẩn, không tính');
  const flex = div('font-size:40px', 'A') + div('font-size:40px', 'B'); // không khai toạ độ
  const cues = [
    { n: 1, text: 'một câu ngắn', duration: 60, pause: 0 },
    { n: 2, text: 'một câu rất dài', duration: 400, pause: 30 }, // 370/30 ≈ 12,3 s nói
  ];
  const checks = [
    ['khung sạch → 0 lỗi cỡ chữ', smallTextProblems(ssrTextBoxes(clean)).length === 0],
    ['có chữ 18px → 1 lỗi cỡ chữ', smallTextProblems(ssrTextBoxes(small)).length === 1],
    ['chữ nhỏ nhưng opacity:0 → 0 lỗi', smallTextProblems(ssrTextBoxes(invisible)).length === 0],
    [`ngưỡng cỡ chữ đang là ${MIN_FONT_PX}px`, MIN_FONT_PX === 22],
    ['div không khai toạ độ vẫn đọc được cỡ chữ', ssrTextBoxes(flex).length === 2],
    ['cue 370 frame nói → 12,3 s', Math.abs(cueSpeechSeconds(cues[1]) - 12.333) < 0.01],
    ['cue >9 s → đúng 1 dòng cảnh báo', longCueProblems(cues, 'x').length === 1],
    ['cue ngắn → 0 dòng', longCueProblems([cues[0]], 'x').length === 0],
    ['script trần thuật đều đều → đỏ chỉ số phản ứng', humanSignals([{ text: 'Trời hôm nay rất đẹp và trong xanh vô cùng.' }]).flagged.reactions],
    // Hai bước mới tự bật/tắt theo SỰ TỒN TẠI của một file. Kiểm chính phép quyết định đó trên một
    // đường dẫn chắc chắn không có, để "bỏ qua" không bao giờ im lặng thành "đạt".
    ['thiếu storyboard.json → bỏ qua, không đỏ', step({ name: 't', blocking: true, skip: fs.existsSync('/vk/khong/co/storyboard.json') ? null : 'thiếu file', cmd: ['false'] }).status === 'skip'],
    ['có file → thật sự chạy lệnh', step({ name: 't', blocking: false, skip: fs.existsSync(HERE) ? null : 'thiếu file', cmd: ['node', 'tools/storyboard-gate.mjs', '--help'] }).status === 'ok'],
  ];
  for (const [name, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  const ok = checks.every(([, v]) => v);
  console.log(ok ? '\n✓ selftest đạt' : '\n✗ selftest KHÔNG đạt');
  process.exit(ok ? 0 : 1);
}

const videoId = flag('video');
if (!videoId || videoId === true) {
  console.error('✗ thiếu --video <id>');
  process.exit(2);
}
const VIDEO_DIR = path.join(VIDEOS, videoId);
if (!fs.existsSync(VIDEO_DIR)) {
  console.error(`✗ không có video "${videoId}" trong ${path.relative(ROOT, VIDEOS)}`);
  process.exit(2);
}
const PROJECT_DIR = path.join(ROOT, 'projects', videoId);

/** Chạy một bước, giữ output cho báo cáo, KHÔNG dừng cả chuỗi (owner cần thấy hết trong một lượt). */
function step({ name, cmd, blocking, skip }) {
  if (skip) {
    console.log(`\n▷ ${name}: bỏ qua — ${skip}`);
    return { name, blocking, status: 'skip', note: skip, out: '' };
  }
  console.log(`\n▶ ${name}: ${cmd.join(' ')}`);
  const t0 = Date.now();
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  process.stdout.write(out);
  const ms = Date.now() - t0;
  const ok = res.status === 0;
  console.log(`${ok ? '✓' : '✗'} ${name} (${(ms / 1000).toFixed(1)} s, exit ${res.status})`);
  return { name, blocking, status: ok ? 'ok' : 'fail', exit: res.status, ms, out };
}

const steps = [];
const cuesFile = path.join(VIDEO_DIR, 'cues.js');

// 1 · lời
steps.push(step({ name: 'text-gate', blocking: true, cmd: ['node', 'tools/text-gate.mjs', cuesFile] }));

// 2 · bố cục đo trong trình duyệt — opt-in theo video
steps.push(step({
  name: 'qa-layout',
  blocking: true,
  skip: fs.existsSync(path.join(VIDEO_DIR, 'qa-layout.json')) ? null : 'video chưa bật qa-layout.json (opt-in)',
  cmd: ['node', 'tools/qa-layout.mjs', '--video', videoId],
}));

// 3 · gate design system + smoke render, chỉ video này
steps.push(step({ name: 'verify', blocking: true, cmd: ['node', 'tools/verify.mjs'] }));

/*
 * 3b · khai báo HÌNH — `projects/<id>/storyboard.json`.
 *
 * CHẶN khi video CÓ file khai báo, bỏ qua kèm một dòng khi không có. Mười video cũ không có
 * `storyboard.json` và không được chuyển từ đạt sang trượt vì một check vừa thêm — cùng luật với
 * `qa-layout` ở trên (opt-in theo sự tồn tại của file cấu hình, không theo allowlist tên video).
 */
const SB_FILE = path.join(ROOT, 'projects', videoId, 'storyboard.json');
steps.push(step({
  name: 'storyboard-gate',
  blocking: true,
  skip: fs.existsSync(SB_FILE) ? null : `chưa có projects/${videoId}/storyboard.json`,
  cmd: ['node', 'tools/storyboard-gate.mjs', '--video', videoId],
}));

/*
 * 3c · nhịp CẢNH (chỉ video kiểu poster, nhận ra bằng `stage.jsx` + bảng `CHAPTERS`). Mức CẢNH BÁO:
 * tỉ lệ giọng/authored là quyết định thẩm mỹ của owner, không phải lỗi — công cụ in bảng để nhìn.
 */
steps.push(step({
  name: 'scene-pace',
  blocking: false,
  skip: fs.existsSync(path.join(VIDEO_DIR, 'stage.jsx')) ? null : 'video không phải kiểu poster (không có stage.jsx)',
  cmd: ['node', 'tools/scene-pace.mjs', '--video', videoId],
}));

/*
 * 3d · KHUNG CHẾT, đo bằng SSR — CHẠY TRƯỚC RENDER.
 *
 * Retro d05-v06 F1 (friction đắt nhất): khung chết 2,2 giây ở đầu phim chỉ lộ ra SAU khi render,
 * nên phải render thêm 2 lượt ≈ 22 phút. `dead-frames.mjs` đo trên SSR markup (~30 giây, không cần
 * MP4, không cần trình duyệt) nên bắt được ở đây. Ở nhịp 2 của lượt dựng đó, chạy nó trước render
 * làm số lượt render từ 3 xuống ĐÚNG MỘT.
 *
 * CHẶN với quãng mở đầu phim, CẢNH BÁO với phần còn lại: người xem bỏ đi ở 10 giây đầu, còn một
 * quãng đứng hình giữa phim có khi là chủ ý (giữ hình cho người đọc kịp).
 */
const DEAD_FRAMES = path.join(HERE, 'dead-frames.mjs');
steps.push(step({
  name: 'dead-frames',
  blocking: false,
  skip: fs.existsSync(DEAD_FRAMES) ? null : 'tools/dead-frames.mjs chưa có',
  cmd: ['node', 'tools/dead-frames.mjs', '--video', videoId],
}));

/*
 * 3e · carrier đi LIỀN qua ranh giới cảnh. Chỉ chạy khi video thật sự có carrier khai `data-vk-vach`
 * — `vach-boundary` tự bỏ qua video không có, nhưng chạy một lệnh trình duyệt vô ích thì tốn 30s.
 */
const VACH = path.join(HERE, 'vach-boundary.mjs');
const hasCarrier = (() => {
  if (!fs.existsSync(VACH) || !fs.existsSync(VIDEO_DIR)) return false;
  return fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith('.jsx'))
    .some((f) => /data-vk-vach/.test(fs.readFileSync(path.join(VIDEO_DIR, f), 'utf8')));
})();
steps.push(step({
  name: 'vach-boundary',
  blocking: false,
  skip: hasCarrier ? null : 'video không khai carrier `data-vk-vach`',
  cmd: ['node', 'tools/vach-boundary.mjs', '--video', videoId],
}));

// 4 · audio QA — lane giọng (W2) đang viết; gọi có điều kiện
const AUDIO_QA = path.join(HERE, 'audio-qa.mjs');
steps.push(step({
  name: 'audio-qa',
  blocking: false,
  skip: fs.existsSync(AUDIO_QA) ? null : 'tools/audio-qa.mjs chưa có',
  cmd: ['node', 'tools/audio-qa.mjs', '--video', videoId],
}));

// ── 5 · trích frame full-res ở mốc nhấn + đầu mỗi chương ──────────────────────────────────────
/**
 * Mốc nhấn của video poster neo vào TỪ trong lời đọc: `beatT('<cảnh>', '<cụm từ>')` trong các file
 * scene, giải ra frame bằng `spokenAt` (word timing thật của giọng — xem `lib/speech.js`). Đọc
 * thẳng các lời gọi đó thay vì đoán mốc, để ảnh trích ra rơi đúng chỗ người dựng đã canh.
 */
async function pickFrames() {
  const notes = [];
  let cues;
  let spokenAt;
  try {
    const mod = await import(pathToFileURL(cuesFile).href);
    cues = mod.CUES || mod.RAW;
    spokenAt = mod.spokenAt;
    const tl = path.join(VIDEO_DIR, 'timeline.js');
    if (fs.existsSync(tl)) cues = (await import(pathToFileURL(tl).href)).TIMELINE;
  } catch (e) {
    return { frames: [], notes: [`không đọc được cues/timeline: ${String(e.message).split('\n')[0]}`] };
  }
  const byN = new Map(cues.map((c) => [c.n, c]));
  const picks = [];

  // đầu mỗi chương — cue đầu tiên của mỗi `section`
  const seenSection = new Set();
  const raw = (await import(pathToFileURL(cuesFile).href)).CUES || [];
  for (const c of raw) {
    if (c.section === undefined || seenSection.has(c.section)) continue;
    seenSection.add(c.section);
    const t = byN.get(c.n);
    if (t) picks.push({ frame: t.start + 2, label: `đầu chương ${c.section} — câu ${c.n}` });
  }

  // mốc nhấn
  if (typeof spokenAt === 'function') {
    const calls = new Set();
    for (const f of fs.readdirSync(VIDEO_DIR).filter((x) => x.endsWith('.jsx'))) {
      const src = fs.readFileSync(path.join(VIDEO_DIR, f), 'utf8');
      for (const m of src.matchAll(/beatT\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g)) calls.add(`${m[1]}\u0000${m[2]}`);
    }
    for (const key of calls) {
      const [scene, phrase] = key.split('\u0000');
      const cue = raw.find((c) => c.scene === scene && c.text && c.text.includes(phrase));
      if (!cue) { notes.push(`mốc "${phrase}" (${scene}) không khớp cue nào — bỏ qua`); continue; }
      const t = byN.get(cue.n);
      if (!t) continue;
      try {
        picks.push({ frame: t.start + spokenAt(cue.n, phrase), label: `mốc nhấn "${phrase}" — câu ${cue.n}` });
      } catch (e) {
        notes.push(`mốc "${phrase}": ${String(e.message).split('\n')[0]}`);
      }
    }
  }

  /*
   * Bỏ trùng rồi cắt còn MAX_IMAGES. Đầu chương được ưu tiên, NHƯNG vẫn phải chịu trần: video
   * nhiều chương (n5-06 có 16) thì riêng đầu chương đã vượt 12, và "ưu tiên" mà không cắt thì trần
   * thành vô nghĩa — đúng lỗi đã gặp ở lần chạy thật đầu tiên (16/12 ảnh).
   */
  const uniq = [...new Map(picks.map((p) => [p.frame, p])).values()].sort((a, b) => a.frame - b.frame);
  const cap = MAX_IMAGES;
  if (uniq.length <= cap) return { frames: uniq, notes };
  const thin = (list, room) => {
    if (list.length <= room) return list;
    const stride = list.length / room;
    return Array.from({ length: room }, (_, i) => list[Math.floor(i * stride)]);
  };
  const chapters = uniq.filter((p) => p.label.startsWith('đầu chương'));
  const beats = uniq.filter((p) => !p.label.startsWith('đầu chương'));
  // Chia đôi chỗ khi cả hai loại đều nhiều, rồi dồn phần thừa sang loại còn lại.
  const chapterRoom = Math.min(chapters.length, Math.max(cap - beats.length, Math.ceil(cap / 2)));
  const keptChapters = thin(chapters, chapterRoom);
  const keptBeats = thin(beats, cap - keptChapters.length);
  const kept = [...keptChapters, ...keptBeats].slice(0, cap);
  notes.push(`${uniq.length} mốc (${chapters.length} đầu chương + ${beats.length} mốc nhấn) → giữ ${kept.length} ảnh (trần ${cap})`);
  return { frames: kept.sort((a, b) => a.frame - b.frame), notes };
}

const QA_DIR = path.join(PROJECT_DIR, 'qa');
const SHOT_DIR = path.join(QA_DIR, 'frames');
let shots = [];
let frameNotes = [];
if (args.includes('--no-frames')) {
  console.log('\n▷ trích frame: bỏ qua (--no-frames)');
} else {
  const mp4 = [
    path.join(PROJECT_DIR, 'render', `${videoId}.mp4`),
    ...(fs.existsSync(path.join(PROJECT_DIR, 'render'))
      ? fs.readdirSync(path.join(PROJECT_DIR, 'render')).filter((f) => f.endsWith('.mp4') && !f.includes('superseded'))
        .map((f) => path.join(PROJECT_DIR, 'render', f))
      : []),
  ].find((f) => fs.existsSync(f));
  if (!mp4) {
    console.log('\n▷ trích frame: bỏ qua — chưa có MP4 nào trong projects/<id>/render/');
    frameNotes.push('chưa render MP4 nào');
  } else {
    const { frames, notes } = await pickFrames();
    frameNotes = notes;
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    console.log(`\n▶ trích ${frames.length} frame từ ${path.relative(ROOT, mp4)}`);
    for (const f of frames) {
      const out = path.join(SHOT_DIR, `f${String(f.frame).padStart(5, '0')}.png`);
      const res = spawnSync('ffmpeg', ['-y', '-ss', String(f.frame / FPS), '-i', mp4, '-frames:v', '1', '-q:v', '2', out], { encoding: 'utf8' });
      if (res.status === 0 && fs.existsSync(out)) shots.push({ ...f, file: path.relative(ROOT, out) });
      else frameNotes.push(`ffmpeg lỗi ở frame ${f.frame}`);
    }
    console.log(`✓ ${shots.length}/${frames.length} ảnh → ${path.relative(ROOT, SHOT_DIR)}`);
  }
}

// ── báo cáo ───────────────────────────────────────────────────────────────────────────────────
const blockingFailed = steps.filter((s) => s.blocking && s.status === 'fail');
const mmss = (f) => `${String(Math.floor(f / FPS / 60)).padStart(2, '0')}:${String(Math.floor((f / FPS) % 60)).padStart(2, '0')}`;
/** Dòng đáng đọc nhất của một bước: lỗi (`✗`/`- `) và cảnh báo (`!`), bỏ phần thống kê. */
const highlights = (out, max) =>
  out.split('\n').filter((l) => /^\s*(✗|!|- )/.test(l)).map((l) => l.trim()).slice(0, max);

const icon = { ok: '✅', fail: '❌', skip: '⏭️' };
const lines = [];
lines.push(`# QA · ${videoId}`);
lines.push('');
lines.push(`${new Date().toISOString().slice(0, 16).replace('T', ' ')} · \`node tools/qa.mjs --video ${videoId}\``);
lines.push('');
lines.push(blockingFailed.length ? `**❌ ${blockingFailed.length} bước CHẶN đỏ: ${blockingFailed.map((s) => s.name).join(', ')}**` : '**✅ mọi bước chặn đều xanh**');
lines.push('');
lines.push('| bước | mức | kết quả |');
lines.push('|---|---|---|');
for (const s of steps) {
  const r = s.status === 'skip' ? s.note : `exit ${s.exit} · ${(s.ms / 1000).toFixed(1)} s`;
  lines.push(`| ${s.name} | ${s.blocking ? 'chặn' : 'cảnh báo'} | ${icon[s.status]} ${r} |`);
}
// Trần 40 dòng là cố ý: báo cáo owner không đọc hết thì bằng không có. Phần chi tiết nằm ở
// scrollback của chính lệnh, không nhân bản vào đây.
for (const s of steps) {
  const hl = s.status === 'skip' ? [] : highlights(s.out, s.blocking ? 4 : 2);
  if (!hl.length) continue;
  lines.push('');
  lines.push(`**${s.name}**`);
  for (const h of hl) lines.push(`- ${h.length > 150 ? `${h.slice(0, 150)}…` : h}`);
}
if (shots.length) {
  lines.push('');
  lines.push(`**Ảnh full-res (${shots.length}) — mở bằng mắt, đừng gộp thành contact sheet**`);
  for (const s of shots) lines.push(`- \`${s.file}\` · ${mmss(s.frame)} · ${s.label}`);
}
if (frameNotes.length) {
  lines.push('');
  for (const n of frameNotes) lines.push(`> ${n}`);
}
lines.push('');
lines.push(`→ ${blockingFailed.length ? 'sửa phần đỏ rồi chạy lại đúng lệnh trên.' : 'phần còn lại cần mắt owner: xem ảnh ở trên.'}`);

fs.mkdirSync(QA_DIR, { recursive: true });
const REPORT = path.join(QA_DIR, 'REPORT.md');
if (lines.length > 40) lines.splice(38, lines.length - 39, `> …cắt bớt cho vừa 40 dòng — chạy lại lệnh ở đầu file để xem đầy đủ.`);
fs.writeFileSync(REPORT, `${lines.join('\n')}\n`);
console.log(`\n📄 ${path.relative(ROOT, REPORT)} (${lines.length} dòng)`);
process.exit(blockingFailed.length ? 1 : 0);
