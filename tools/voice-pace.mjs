#!/usr/bin/env node
/**
 * Nhịp đọc ĐO ĐƯỢC của giọng, và ước lượng thời lượng cho một bản nháp.
 *
 *   node tools/voice-pace.mjs                      # bảng nhịp của mọi video đã có voice.js
 *   node tools/voice-pace.mjs --estimate <file>    # ước thời lượng cho cues.js hoặc .md nháp
 *   node tools/voice-pace.mjs --estimate <file> --rate 5.09
 *
 * VÌ SAO CÓ FILE NÀY (retro 21/09/2026, E1). Script lane lấy nhịp "3,08 âm tiết/giây" từ một ghi chú
 * "~120 từ/phút" trong nguồn ngoài. Giọng OmniVoice của harness đọc **5,0–5,2 âm tiết/giây**. Hậu quả:
 * ước 4:40, đo thật 3:08 — sai 1,5 lần, và `dur` của cả 21 cảnh phải tính lại SAU khi đã dựng xong
 * hình. Không ước lượng bằng "từ/phút" của nguồn ngoài nữa: hỏi chính các video đã duyệt.
 *
 * ĐỊNH NGHĨA (đúng đơn vị, không trộn):
 *   âm tiết      = token `\S+` của `text` — CÙNG cách `narrationWordCount` trong verify.mjs đếm,
 *                  để một con số dùng được cho cả gate chữ lẫn ước thời lượng.
 *   giây NÓI     = `speechFrames` / 30 — phần thật sự có tiếng, KHÔNG gồm khoảng nghỉ cuối cue.
 *   nhịp         = tổng âm tiết / tổng giây NÓI.
 *   % nghỉ       = (durationInFrames − speechFrames) / durationInFrames.
 * Nhịp phải tính trên giây NÓI, không trên tổng thời lượng: trộn khoảng nghỉ vào sẽ ra một con số
 * nhỏ hơn thật và phụ thuộc vào `pauseAfter` của từng video, tức là không so được giữa các video.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_BACKEND } from './lib/voice-backends.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DS = path.resolve(ROOT, process.env.VK_DS || 'vinuni-lesson-video-ds');
const VIDEOS = path.join(DS, 'ui_kits/lesson-video/videos');
const FPS = 30;

const syllables = (s) => (String(s || '').match(/\S+/g) || []).length;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? null : args[i + 1] ?? true;
};

/** Đọc voice.js mà không cần bundler: nó là một file ESM chỉ export một object literal. */
async function readVoice(dir) {
  const file = path.join(dir, 'voice.js');
  if (!fs.existsSync(file)) return null;
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  return mod.VOICE || null;
}

async function measureAll() {
  const rows = [];
  for (const name of fs.readdirSync(VIDEOS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    const voice = await readVoice(path.join(VIDEOS, name));
    if (!voice || !voice.cues?.length) continue;
    let syl = 0;
    let speech = 0;
    let total = 0;
    for (const c of voice.cues) {
      if (!c.speechFrames) continue;
      syl += syllables(c.text);
      speech += c.speechFrames;
      total += c.durationInFrames;
    }
    if (!speech) continue;
    rows.push({
      id: name,
      cues: voice.cues.length,
      syllables: syl,
      rate: syl / (speech / FPS),
      pausePct: total ? (total - speech) / total : 0,
      seconds: total / FPS,
      generator: voice.generator || '?',
      /**
       * Nhóm để tính trung vị. `generator` chỉ phân biệt ElevenLabs với "mọi thứ nhập vào", mà
       * "mọi thứ nhập vào" giờ có ít nhất hai backend đọc nhanh chậm khác hẳn nhau (OmniVoice
       * ~5,1 âm tiết/giây · ZeroTTS `baotrang` ~4,1). Video bind trước 21/09/2026 không ghi
       * backend — mọi video khi đó đều là OmniVoice, nên `null` quy về đúng nó.
       */
      backendKey: voice.generator === 'import'
        ? (voice.backend ? `${voice.backend}${voice.backendVoice ? `:${voice.backendVoice}` : ''}` : DEFAULT_BACKEND)
        : (voice.generator || '?'),
    });
  }
  return rows;
}

const fmt = (n, d = 2) => n.toFixed(d).replace('.', ',');
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const rows = await measureAll();
if (!rows.length) {
  console.error('Không video nào có voice.js đã bind.');
  process.exit(1);
}
/**
 * Trung vị tính RIÊNG theo backend giọng, không gộp. ElevenLabs đọc 4,05–4,26 âm tiết/giây còn
 * OmniVoice đọc 4,58–6,32: gộp lại thì trung vị bị kéo về 4,98 và một bản nháp sẽ được ước dài hơn
 * thật ~2%. Mặc định lấy nhóm `import` (OmniVoice — đường giọng harness đang dùng); `--all` để gộp.
 */
const med = (xs) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};
const useAll = args.includes('--all');
/**
 * `--backend <spec>` chọn đúng một nhóm backend+giọng. Không truyền thì lấy nhóm ĐÔNG NHẤT trong số
 * các video nhập vào — tức đường giọng harness đang chạy nhiều nhất — thay vì gom tất cả lại.
 */
const wanted = flag('backend');
const byBackend = new Map();
for (const r of rows) {
  if (r.generator !== 'import') continue;
  if (!byBackend.has(r.backendKey)) byBackend.set(r.backendKey, []);
  byBackend.get(r.backendKey).push(r);
}
const biggest = [...byBackend.entries()].sort((a, b) => b[1].length - a[1].length)[0];
const poolLabel = useAll ? 'mọi backend' : wanted ? String(wanted) : (biggest?.[0] ?? 'import');
const pool = useAll ? rows : wanted ? (byBackend.get(String(wanted)) || []) : (biggest?.[1] ?? []);
const base = pool.length ? pool : rows;
const median = med(base.map((r) => r.rate));
const medianPause = med(base.map((r) => r.pausePct));

const estimate = flag('estimate');
if (!estimate) {
  console.log('nhịp đọc đo được — âm tiết/giây trên giây NÓI (không tính khoảng nghỉ)\n');
  console.log(`  ${'video'.padEnd(30)} ${'cue'.padStart(4)} ${'âm tiết'.padStart(8)} ${'nhịp'.padStart(6)} ${'% nghỉ'.padStart(7)} ${'dài'.padStart(6)}  nguồn`);
  for (const r of rows) {
    console.log(`  ${r.id.padEnd(30)} ${String(r.cues).padStart(4)} ${String(r.syllables).padStart(8)} ${fmt(r.rate).padStart(6)} ${(fmt(r.pausePct * 100, 1) + '%').padStart(7)} ${mmss(r.seconds).padStart(6)}  ${r.backendKey}`);
  }
  console.log(`\n  trung vị nhịp = ${fmt(median)} âm tiết/giây · trung vị % nghỉ = ${fmt(medianPause * 100, 1)}%`);
  console.log(`  (tính trên ${base.length} video backend "${poolLabel}"; --backend <spec> để chọn nhóm khác, --all để gộp hết)`);
  const others = [...byBackend.entries()].filter(([k]) => k !== poolLabel);
  if (others.length && !useAll) console.log(`  backend khác đang có: ${others.map(([k, v]) => `${k} (${v.length} video)`).join(' · ')}`);
  console.log(`  ước thời lượng cho một bản nháp: giây = âm tiết / ${fmt(median)} / ${fmt(1 - medianPause, 3)}`);
  process.exit(0);
}

// ── --estimate ────────────────────────────────────────────────────────────────────────────────
const rate = Number(flag('rate')) || median;
const file = path.resolve(String(estimate));
if (!fs.existsSync(file)) {
  console.error(`✗ không thấy ${file}`);
  process.exit(1);
}
let syl = 0;
let cueCount = 0;
let pauseSeconds = 0;
let how;
if (file.endsWith('.js') || file.endsWith('.mjs')) {
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  const cues = mod.CUES || mod.RAW || [];
  if (!cues.length) {
    console.error('✗ file không export CUES');
    process.exit(1);
  }
  for (const c of cues) {
    syl += syllables(c.text);
    pauseSeconds += c.pauseAfter ?? 1;
  }
  cueCount = cues.length;
  how = 'cues.js — âm tiết từ `text`, khoảng nghỉ từ `pauseAfter`';
} else {
  // .md nháp: mỗi dòng bắt đầu bằng `|` trong một bảng cue, hoặc mỗi đoạn văn xuôi.
  const text = fs.readFileSync(file, 'utf8');
  const cells = [...text.matchAll(/^\|(?!\s*-)(.*)\|\s*$/gm)].map((m) => m[1]);
  if (cells.length > 5) {
    for (const row of cells) {
      const cols = row.split('|').map((c) => c.trim());
      const cue = cols.find((c) => /\s/.test(c) && !/^\*\*/.test(c) && syllables(c) >= 4);
      if (!cue) continue;
      const pause = cols.map(Number).find((n) => Number.isFinite(n) && n >= 0 && n <= 3);
      syl += syllables(cue);
      pauseSeconds += Number.isFinite(pause) ? pause : 0.5;
      cueCount += 1;
    }
    how = 'bảng markdown — mỗi dòng một cue, cột số 0–3 coi là pauseAfter';
  } else {
    syl = syllables(text.replace(/^#.*$/gm, '').replace(/[`*_>|-]/g, ' '));
    cueCount = 0;
    pauseSeconds = 0;
    how = 'văn xuôi — chỉ đếm âm tiết, CHƯA có khoảng nghỉ (ước lượng sẽ thấp hơn thật)';
  }
}
const speak = syl / rate;
const total = speak + pauseSeconds;
console.log(`ước lượng · ${path.relative(ROOT, file)}`);
console.log(`  cách đọc file : ${how}`);
console.log(`  âm tiết       : ${syl}${cueCount ? ` · ${cueCount} cue` : ''}`);
console.log(`  nhịp dùng     : ${fmt(rate)} âm tiết/giây${flag('rate') ? ' (--rate)' : ' (trung vị đo được)'}`);
console.log(`  giây nói      : ${fmt(speak, 1)}s`);
console.log(`  khoảng nghỉ   : ${fmt(pauseSeconds, 1)}s`);
console.log(`  TỔNG          : ${fmt(total, 1)}s = ${mmss(total)}`);
const lo = syl / (rate * 1.04) + pauseSeconds;
const hi = syl / (rate * 0.96) + pauseSeconds;
console.log(`  biên ±4% nhịp : ${mmss(lo)} … ${mmss(hi)}`);
