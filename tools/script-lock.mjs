#!/usr/bin/env node
/**
 * CỔNG KHOÁ WORDING — một LỆNH, không phải một thao tác sửa file.
 *
 *   node tools/script-lock.mjs --video <id> [--delta <file.md>] [--force] [--json]
 *   node tools/script-lock.mjs --video <id> --check      # chỉ so lời hiện tại với bản đã khoá
 *
 * Chuỗi: áp delta của owner vào `cues.js` → chạy `text-gate` + `text-gate --human` + `voice-risk`
 * → **ĐỎ thì TỪ CHỐI và in nguyên chỗ đỏ, KHÔNG ghi gì** → xanh mới ghi
 * `projects/<id>/script.lock.json` (hash lời từng cue + giờ thật từ `date`).
 *
 * ── Vì sao (retro d05-v06 · F2) ───────────────────────────────────────────────────────────────
 * Owner khoá lời mà không chạy lại gate → cue 80 vượt 9 s → VOICE phải tách cue → 132 ≠ 133 cue →
 * mọi `cues: [n]` trong `storyboard.json` lệch số → hai lane đi sửa tay. Một lệnh ở đúng chỗ đó
 * chặn được cả chuỗi. `--force` vẫn khoá được khi đỏ, nhưng ghi thẳng lý do vào file lock để lượt
 * sau còn đọc được là ai đã bỏ qua cái gì.
 *
 * `voice-export.mjs` đọc `script.lock.json` và CẢNH BÁO nếu lời đã trôi — trước khi tiêu GPU.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyDelta, compareLock, makeLock, parseDelta } from './lib/script-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEOS = path.join(ROOT, 'vinuni-lesson-video-ds/ui_kits/lesson-video/videos');
const USAGE = `usage: node tools/script-lock.mjs --video <id> [--delta <file.md>] [--force] [--json]
       node tools/script-lock.mjs --video <id> --check

  --delta <f>  file delta của owner (mặc định projects/<id>/loi-dan-lock.md nếu có).
               Khuôn mỗi mục:  ## cue 80   HOẶC  ## anchor: <cụm từ duy nhất>
                               > lời mới nguyên văn
                               lý do: <một câu>
  --check      chỉ so lời hiện tại với script.lock.json, không sửa, không ghi
  --force      vẫn khoá khi gate đỏ; lý do được ghi vào chính file lock
  --json       output máy đọc

exit: 0 đã khoá (hoặc --check thấy khớp) · 1 gate đỏ / lời đã trôi · 2 sai cách gọi`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(0); }
const value = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const has = (n) => argv.includes(`--${n}`);
const fail = (m) => { console.error(`✗ ${m}`); process.exit(2); };

const videoId = value('video');
if (!videoId) fail(`thiếu --video <id>.\n${USAGE}`);
const vdir = path.join(VIDEOS, videoId);
const cuesFile = path.join(vdir, 'cues.js');
const projectDir = path.join(ROOT, 'projects', videoId);
if (!fs.existsSync(cuesFile)) fail(`không thấy ${path.relative(ROOT, cuesFile)}`);
const lockFile = path.join(projectDir, 'script.lock.json');

const loadCues = async () => {
  // `?v=` để Node không trả bản đã cache sau khi ta vừa ghi đè file.
  const mod = await import(`${pathToFileURL(cuesFile).href}?v=${Date.now()}`);
  return mod.CUES ?? mod.RAW ?? [];
};

/** Giờ THẬT của máy (F10: giờ gõ tay trong TRACE đều là bịa). Giờ địa phương, không UTC. */
function now() {
  try { return execFileSync('date', ['+%Y-%m-%d %H:%M:%S%z'], { encoding: 'utf8' }).trim(); } catch { return new Date().toISOString(); }
}

// ── --check ───────────────────────────────────────────────────────────────────────────────────
if (has('check')) {
  if (!fs.existsSync(lockFile)) {
    console.log(`! chưa khoá: không có ${path.relative(ROOT, lockFile)} — chạy \`node tools/script-lock.mjs --video ${videoId}\``);
    process.exit(1);
  }
  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  const diff = compareLock(lock, await loadCues());
  const drifted = diff.changed.length + diff.added.length + diff.removed.length;
  if (has('json')) { console.log(JSON.stringify({ video: videoId, lockedAt: lock.at, ...diff }, null, 2)); process.exit(drifted ? 1 : 0); }
  if (!drifted) { console.log(`✓ lời khớp bản khoá lúc ${lock.at} (${lock.cues} cue)`); process.exit(0); }
  console.log(`✗ lời đã TRÔI khỏi bản khoá lúc ${lock.at}:`);
  if (diff.changed.length) console.log(`  đổi chữ: cue ${diff.changed.join(', ')}`);
  if (diff.added.length) console.log(`  thêm mới: cue ${diff.added.join(', ')}`);
  if (diff.removed.length) console.log(`  mất: cue ${diff.removed.join(', ')}`);
  console.log('  → khoá lại bằng `node tools/script-lock.mjs --video ' + videoId + '` (nó chạy lại gate trước khi ghi).');
  process.exit(1);
}

// ── áp delta ──────────────────────────────────────────────────────────────────────────────────
const deltaFile = value('delta') ?? (fs.existsSync(path.join(projectDir, 'loi-dan-lock.md')) ? path.join(projectDir, 'loi-dan-lock.md') : null);
let applied = [];
if (deltaFile) {
  if (!fs.existsSync(deltaFile)) fail(`không thấy file delta ${deltaFile}`);
  const delta = parseDelta(fs.readFileSync(deltaFile, 'utf8'));
  if (!delta.length) console.log(`! ${path.relative(ROOT, deltaFile)} không có mục nào đọc được — vẫn chạy gate trên lời hiện tại.`);
  const res = applyDelta(fs.readFileSync(cuesFile, 'utf8'), await loadCues(), delta);
  if (res.problems.length) {
    console.error('✗ delta không áp được — KHÔNG sửa gì cả:');
    for (const p of res.problems) console.error(`  · ${p}`);
    process.exit(1);
  }
  const real = res.applied.filter((a) => !a.noop);
  if (real.length) {
    fs.writeFileSync(cuesFile, res.src);
    console.log(`✓ áp ${real.length} thay đổi vào ${path.relative(ROOT, cuesFile)}: cue ${real.map((a) => a.n).join(', ')}`);
  } else console.log('· delta không đổi chữ nào (lời đã đúng như file delta).');
  applied = res.applied;
}

// ── gate ──────────────────────────────────────────────────────────────────────────────────────
/** Chạy một gate; trả `{ name, ok, out }`. KHÔNG ném — ta muốn chạy hết rồi báo một lượt. */
function gate(name, args) {
  const r = { name, ok: false, out: '' };
  try {
    r.out = execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    r.ok = true;
  } catch (e) {
    r.out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    r.ok = false;
  }
  return r;
}

const gates = [
  gate('text-gate', [path.join(ROOT, 'tools/text-gate.mjs'), cuesFile]),
  gate('text-gate --human', [path.join(ROOT, 'tools/text-gate.mjs'), '--human', cuesFile]),
  gate('voice-risk', [path.join(ROOT, 'tools/voice-risk.mjs'), vdir, ...(fs.existsSync(path.join(projectDir, 'pronounce.json')) ? ['--pronounce', path.join(projectDir, 'pronounce.json')] : [])]),
];
for (const g of gates) {
  console.log(`\n▶ ${g.name} — ${g.ok ? 'xanh' : 'ĐỎ'}`);
  console.log(g.out.trimEnd().split('\n').map((l) => `  ${l}`).join('\n'));
}
const red = gates.filter((g) => !g.ok);

if (red.length && !has('force')) {
  console.error(`\n✗ TỪ CHỐI KHOÁ — ${red.length} gate đỏ (${red.map((g) => g.name).join(', ')}).`);
  console.error('  Sửa lời rồi chạy lại. Đây đúng là chỗ đáng dừng: khoá lời đỏ ở đây từng kéo theo');
  console.error('  tách cue → lệch số cue ↔ storyboard → hai lane sửa tay (retro d05-v06 F2).');
  console.error(`  Cố tình bỏ qua: thêm --force (lý do sẽ được ghi vào script.lock.json).`);
  process.exit(1);
}

// ── ghi lock ──────────────────────────────────────────────────────────────────────────────────
const cues = await loadCues();
fs.mkdirSync(projectDir, { recursive: true });
const lock = makeLock(cues, {
  video: videoId,
  at: now(),
  note: red.length ? `KHOÁ BẰNG --force dù ${red.length} gate đỏ: ${red.map((g) => g.name).join(', ')}` : null,
});
lock.delta = applied.filter((a) => !a.noop).map((a) => ({ cue: a.n, why: a.why || null }));
fs.writeFileSync(lockFile, `${JSON.stringify(lock, null, 2)}\n`);

if (has('json')) console.log(JSON.stringify({ video: videoId, locked: true, at: lock.at, cues: lock.cues, forced: Boolean(lock.note) }, null, 2));
else {
  console.log(`\n✓ ĐÃ KHOÁ ${lock.cues} cue → ${path.relative(ROOT, lockFile)} (${lock.at})`);
  if (lock.note) console.log(`  ⚠ ${lock.note}`);
  console.log('  Từ giờ `voice-export` sẽ cảnh báo nếu lời trôi khỏi bản này.');
}
process.exit(0);
