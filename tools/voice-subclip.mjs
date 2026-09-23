/**
 * Sub-clip — chữa một cue bị OmniVoice NUỐT MỆNH ĐỀ mà KHÔNG được đổi số cue.
 *
 * ── Vấn đề ────────────────────────────────────────────────────────────────────────────────────
 * FM-27: ở chuỗi liệt kê và cặp vế đối, OmniVoice rụng nguyên một mệnh đề. Cách chữa có sẵn là
 * "mỗi phần tử một cue" — nhưng cách đó ĐỔI SỐ CUE, mà khi lane dựng cảnh đã bắt đầu thì số cue và
 * thứ tự cue phải đứng yên (cảnh neo theo `n`).
 *
 * ── Cách chữa ─────────────────────────────────────────────────────────────────────────────────
 * Tách LỜI của cue thành 2–3 MẢNH ở ranh giới câu/vế, cho model đọc từng mảnh một lần gọi riêng
 * (mảnh ngắn thì không còn gì để nuốt), rồi NỐI các mảnh lại thành đúng một `NNN.wav`. Phần còn
 * lại của pipeline không biết là đã có chuyện gì: vẫn một clip cho một cue.
 *
 *   WORDING KHÔNG ĐỔI MỘT CHỮ. Nối các mảnh lại phải ra đúng `text` của cue.
 *   Tool tự kiểm điều đó (`--plan` fail nếu nối lại không khớp `cues.js`).
 *
 * Khe NỘI BỘ giữa hai mảnh được ĐO, không cộng mù: dùng đúng `speechBounds()` của
 * `lib/voice-audio.mjs` để biết mỗi mảnh còn giữ bao nhiêu lặng ở hai đầu, rồi chỉ chèn thêm phần
 * còn thiếu để khe THỰC chạm đích — cùng công thức `voice-gaps.mjs` dùng cho khe giữa hai cue.
 *
 * ── Biến thể cách VIẾT ────────────────────────────────────────────────────────────────────────
 * Một mảnh có thể khai nhiều `variants`: cùng một lời, khác cách VIẾT cho model (`đòn bẩy` ·
 * `đòn-bẩy` · đổi dấu câu cuối). Chúng chỉ vào `ttsText`; `text` hiển thị và phụ đề giữ nguyên.
 * Tool sinh mọi biến thể trong CÙNG một lượt Kaggle rồi `--join` ghép ra mỗi biến thể một clip ứng
 * viên để chấm bằng Whisper — chọn bằng số đo, không chọn bằng cảm giác.
 *
 * ── Ba chế độ ─────────────────────────────────────────────────────────────────────────────────
 *   --plan <plan.json> --batch <out.jsonl>   kiểm plan + xuất batch mảnh cho tools/voice-kaggle.mjs
 *   --plan <plan.json> --from <dir> --join <dir>   nối mảnh → <dir>/NNN.wav (mỗi biến thể một thư mục)
 *   --plan <plan.json> --check               chỉ kiểm plan khớp cues.js rồi thoát
 *
 * Khuôn `plan.json`:
 *   {
 *     "cues": "<video dir>/cues.js",
 *     "pronounce": "projects/<id>/pronounce.json",
 *     "gap": 0.21,                       // khe nội bộ giữa hai mảnh, giây THỰC NGHE THẤY
 *     "items": [
 *       { "n": 21, "parts": [{ "text": "…" }, { "text": "…" }] },
 *       { "n": 41, "parts": [{ "text": "Vậy…?" },
 *                            { "text": "Có ba đòn bẩy,", "variants": ["Có ba đòn-bẩy,", "Có ba đòn bẩy."] },
 *                            { "text": "và đó…" }] }
 *     ]
 *   }
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { speechBounds, wav } from './lib/voice-audio.mjs';

const require = createRequire(import.meta.url);
const SAMPLE_RATE = 24000;
const LEAD_CAP = 0.05; // ≤50 ms đầu — đúng luật của assemble()
const TAIL_CAP = 0.08; // ≤80 ms đuôi
const GAP_DEFAULT = 0.21; // giữa dải 0,18–0,25 s owner chốt cho khe NỘI BỘ

const USAGE = `usage:
  node tools/voice-subclip.mjs --plan <plan.json> --batch <out.jsonl>
  node tools/voice-subclip.mjs --plan <plan.json> --from <dir mảnh> --join <dir clip>
  node tools/voice-subclip.mjs --plan <plan.json> --check
`;

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(2);
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    if (['plan', 'batch', 'from', 'join'].includes(k)) flags[k] = argv[++i];
    else flags[k] = true;
  }
  return flags;
}

function ffmpeg() {
  try {
    const b = require('ffmpeg-static');
    if (b && fs.existsSync(b)) return b;
  } catch {}
  return 'ffmpeg';
}

/** WAV bất kỳ → PCM s16le mono 24 kHz, đúng định dạng `assemble()` làm việc. */
export function decodePcm(file) {
  const res = spawnSync(ffmpeg(), ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 's16le', '-'], {
    maxBuffer: 1 << 30,
  });
  if (res.status !== 0 || !res.stdout?.length) {
    throw new Error(`ffmpeg không đọc được ${file}: ${String(res.stderr || '').trim().split('\n').pop()}`);
  }
  return res.stdout;
}

/**
 * Nối các mảnh PCM thành một clip, khe NỘI BỘ chạm `gap` giây thực nghe thấy.
 *
 * Với mỗi mảnh giữ ≤50 ms lặng đầu và ≤80 ms lặng đuôi (đúng như `assemble()` sẽ làm với clip cuối
 * cùng), rồi chèn thêm `gap − (đuôi mảnh trước + đầu mảnh sau)` giây lặng — ĐO chứ không cộng mù.
 * Lặng ngoài rìa của mảnh đầu/cuối giữ nguyên để `assemble()` xử lý như với mọi clip khác.
 *
 * Trả `{ pcm, gaps }` — `gaps` là khe thực đạt được của từng mối nối, để in ra và để test soi.
 */
export function joinParts(pcms, { gap = GAP_DEFAULT, sampleRate = SAMPLE_RATE } = {}) {
  if (!pcms.length) throw new Error('không có mảnh nào để nối');
  const leadCap = Math.round(LEAD_CAP * sampleRate);
  const tailCap = Math.round(TAIL_CAP * sampleRate);
  const cut = pcms.map((pcm, i) => {
    const { a, b } = speechBounds(pcm);
    const total = pcm.length / 2;
    // mảnh ĐẦU giữ nguyên lặng đầu thật, mảnh CUỐI giữ nguyên lặng đuôi thật — rìa ngoài là việc của assemble()
    const lead = i === 0 ? a : Math.min(a, leadCap);
    const tail = i === pcms.length - 1 ? total - b : Math.min(total - b, tailCap);
    return { buf: pcm.subarray((a - lead) * 2, (b + tail) * 2), lead: lead / sampleRate, tail: tail / sampleRate };
  });
  const out = [];
  const gaps = [];
  for (let i = 0; i < cut.length; i++) {
    out.push(cut[i].buf);
    if (i === cut.length - 1) break;
    const kept = cut[i].tail + cut[i + 1].lead; // lặng ĐÃ có sẵn ở mối nối này
    const add = Math.max(0, Math.round((gap - kept) * sampleRate));
    if (add) out.push(Buffer.alloc(add * 2));
    gaps.push(Math.round((kept + add / sampleRate) * 1000) / 1000);
  }
  return { pcm: Buffer.concat(out), gaps };
}

/** Đỉnh tuyệt đối của một PCM, chuẩn hoá về 0..1 — để test chứng minh nối không làm clipping. */
export function peak(pcm) {
  let m = 0;
  for (let i = 0; i + 1 < pcm.length; i += 2) m = Math.max(m, Math.abs(pcm.readInt16LE(i)));
  return m / 32768;
}

/** Áp `pronounce.json` — CÙNG một phép thế biên-từ mà tools/voice-export.mjs dùng. */
export function makeTtsText(pronounce) {
  const entries = Object.entries(pronounce || {});
  return (text) => {
    let out = text;
    for (const [from, to] of entries) {
      out = out.replace(
        new RegExp(`(?<![\\p{L}\\p{N}])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'gu'),
        to,
      );
    }
    return out;
  };
}

/** Nối `text` của các mảnh lại — phải ra đúng `text` của cue, nếu không là đã đổi lời. */
export function rejoin(parts) {
  return parts.map((p) => p.text.trim()).join(' ').replace(/\s+/g, ' ').trim();
}

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

/** Mỗi mảnh sinh ra bao nhiêu biến thể; biến thể 0 luôn là cách viết nguyên dạng. */
const variantsOf = (part) => [part.text, ...(part.variants || [])];

/** Mọi tổ hợp biến thể của một cue — mỗi tổ hợp là một clip ứng viên. */
export function candidates(parts) {
  let combos = [[]];
  for (const p of parts) {
    const next = [];
    for (const c of combos) for (let v = 0; v < variantsOf(p).length; v++) next.push([...c, v]);
    combos = next;
  }
  return combos;
}

/** Id của một mảnh trong batch Kaggle: `021a` · `041b-v1`. */
export const partId = (n, i, v) => `${String(n).padStart(3, '0')}${'abcdefgh'[i]}${v ? `-v${v}` : ''}`;

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) { console.log(USAGE); return; }
  if (!flags.plan) fail(USAGE);
  const plan = JSON.parse(fs.readFileSync(path.resolve(flags.plan), 'utf8'));
  const mod = await import(pathToFileURL(path.resolve(plan.cues)).href);
  const CUES = mod.CUES;
  const pronounce = plan.pronounce ? JSON.parse(fs.readFileSync(path.resolve(plan.pronounce), 'utf8')) : {};
  const toTts = makeTtsText(pronounce);
  const gap = plan.gap ?? GAP_DEFAULT;

  // ── Cổng: nối mảnh lại phải ra ĐÚNG lời đã khoá ─────────────────────────────────────────────
  for (const item of plan.items) {
    const cue = CUES.find((c) => c.n === item.n);
    if (!cue) fail(`cue ${item.n} không có trong ${plan.cues}`);
    if (norm(rejoin(item.parts)) !== norm(cue.text)) {
      fail(
        `cue ${item.n}: nối mảnh lại KHÔNG ra đúng lời đã khoá — wording không được đổi\n` +
          `  cues.js : ${norm(cue.text)}\n  mảnh    : ${norm(rejoin(item.parts))}`,
      );
    }
    for (const p of item.parts) {
      for (const v of p.variants || []) {
        const strip = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        if (strip(v) !== strip(p.text)) {
          fail(`cue ${item.n}: biến thể "${v}" đổi CHỮ so với "${p.text}" — biến thể chỉ được đổi CÁCH VIẾT`);
        }
      }
    }
  }
  const nParts = plan.items.reduce((a, it) => a + it.parts.reduce((b, p) => b + variantsOf(p).length, 0), 0);
  console.log(`✓ plan hợp lệ · ${plan.items.length} cue · ${nParts} mảnh (kể cả biến thể) · khe nội bộ đích ${gap}s`);
  if (flags.check) return;

  // ── Chế độ 1: xuất batch mảnh cho Kaggle ────────────────────────────────────────────────────
  if (flags.batch) {
    const lines = [];
    for (const item of plan.items) {
      item.parts.forEach((p, i) => {
        variantsOf(p).forEach((text, v) => {
          lines.push(JSON.stringify({ id: partId(item.n, i, v), text: toTts(text), language_id: 'vi' }));
        });
      });
    }
    fs.mkdirSync(path.dirname(path.resolve(flags.batch)), { recursive: true });
    fs.writeFileSync(path.resolve(flags.batch), lines.join('\n') + '\n');
    console.log(`✓ ${flags.batch} · ${lines.length} mảnh`);
    return;
  }

  // ── Chế độ 2: nối mảnh → clip cue, mỗi tổ hợp biến thể một thư mục ──────────────────────────
  if (flags.join) {
    if (!flags.from) fail('thiếu --from <thư mục wav mảnh>');
    const fromDir = path.resolve(flags.from);
    const joinDir = path.resolve(flags.join);
    let written = 0;
    for (const item of plan.items) {
      const combos = candidates(item.parts);
      combos.forEach((combo, ci) => {
        const dir = combos.length === 1 ? joinDir : path.join(joinDir, `cand-${ci}`);
        fs.mkdirSync(dir, { recursive: true });
        const pcms = item.parts.map((p, i) => {
          const id = partId(item.n, i, combo[i]);
          const f = [`${id}.wav`, `${id.replace(/^0+/, '')}.wav`].map((x) => path.join(fromDir, x)).find(fs.existsSync);
          if (!f) fail(`thiếu mảnh ${id}.wav trong ${flags.from}`);
          return decodePcm(f);
        });
        const { pcm, gaps } = joinParts(pcms, { gap });
        const name = `${String(item.n).padStart(3, '0')}.wav`;
        fs.writeFileSync(path.join(dir, name), wav(pcm, SAMPLE_RATE));
        written++;
        const tag = combos.length === 1 ? '' : ` · cand-${ci} [${combo.map((v, i) => variantsOf(item.parts[i])[v] === item.parts[i].text ? 'gốc' : `v${v}`).join(' ')}]`;
        console.log(
          `  ${name}${tag} · ${item.parts.length} mảnh · ${(pcm.length / 2 / SAMPLE_RATE).toFixed(2)}s · khe nội bộ ${gaps.map((g) => g.toFixed(3)).join(' / ')}s · đỉnh ${peak(pcm).toFixed(3)}`,
        );
      });
    }
    console.log(`✓ ${written} clip → ${flags.join}`);
    return;
  }
  fail(USAGE);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => fail(e.message));
}
