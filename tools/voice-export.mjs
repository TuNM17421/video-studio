#!/usr/bin/env node
/**
 * Export a video's locked narration so the voice can be recorded or generated outside this repo, then
 * imported back with tools/voice-import.mjs.
 *
 *   node tools/voice-export.mjs <video dir> --out projects/<id>/voice-script [--pause 1.4] [--json]
 *     [--pronounce <json>] [--all]
 *
 * Writes, into --out:
 *   doc-thu.md        the reading script for a person: sections, numbering, estimated length, notes —
 *                      shows the LOCKED text verbatim (a human reader does not need phonetic spelling)
 *   doc-thu.txt       narration only, one câu per line — paste into a local model (LUÔN đủ mọi câu)
 *   voice-batch.jsonl one JSON object per câu CẦN SINH — mặc định chỉ cue có text (sau pronounce) đổi
 *                     so với `gen-manifest.json` của lần export trước; `--all` ép ghi lại toàn bộ.
 *                     Vẫn đúng shape omnivoice-infer-batch --test_list mong đợi, id = 01, 02 …
 *   gen-manifest.json sha256 rút gọn của ttsText từng câu — để lần export sau biết câu nào đã đổi
 *   cau/01.txt …      one câu per file, for generators driven by a folder of prompts (LUÔN đủ mọi câu)
 *
 * `--pronounce <json>` applies the same `{ "chữ gốc": "cách đọc" }` word-boundary substitution as
 * `tts-elevenlabs/tts.mjs --pronounce` — but ONLY to doc-thu.txt/voice-batch.jsonl/cau/*.txt (what a
 * model actually reads); doc-thu.md keeps the locked wording untouched. Without this flag the
 * OmniVoice/Kaggle path never applies pronounce.json at all — it was silently ElevenLabs-only until
 * FM-19 (see .claude/skills/make-video/failure-modes.md). Always pass
 * `--pronounce projects/<id>/pronounce.json` when that file exists.
 *
 * The narration is locked: tools/voice-import.mjs refuses audio whose cues.js has changed since, so
 * every file here says plainly that the text must not be edited.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cueKey } from './lib/voice-files.mjs';
import { BACKENDS, backendFromRequest, backendHashKey, DEFAULT_BACKEND, resolveBackend } from './lib/voice-backends.mjs';
import { compareLock } from './lib/script-lock.mjs';

/** Manifest cũ (trước 21/09/2026) không ghi backend — mọi video khi đó đều là OmniVoice. */
const BACKENDS_OMNI = BACKENDS[DEFAULT_BACKEND];

const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const USAGE = `usage: node tools/voice-export.mjs <video dir> --out <dir> [--pronounce <json>] [--backend <spec>] [--all] [--json]
  --out <dir>        nơi ghi doc-thu.md/.txt, voice-batch.jsonl, gen-manifest.json, cau/NN.txt
  --pronounce <json> áp projects/<id>/pronounce.json lên văn bản model đọc (KHÔNG lên doc-thu.md)
  --backend <spec>   \`omnivoice\` | \`zerotts:<giọng>\` — đổi backend thì hash đổi, sinh lại toàn bộ
  --all              bỏ qua manifest hash, ghi lại mọi câu`;
const VALUE_FLAGS = new Set(['out', 'pronounce', 'backend']);
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(0); }
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) { positional.push(argv[i]); continue; }
  const name = argv[i].slice(2);
  flags[name] = VALUE_FLAGS.has(name) ? argv[++i] : true;
}
const flag = (name, fallback) => flags[name] ?? fallback;
const [videoDir] = positional;
if (!videoDir) fail(USAGE);
const cuesFile = path.resolve(videoDir, 'cues.js');

/*
 * Cổng khoá wording (retro d05-v06 F2): nếu video đã có `script.lock.json` mà lời hiện tại đã trôi
 * khỏi bản khoá, CẢNH BÁO TRƯỚC KHI tiêu một lượt GPU. Chỉ cảnh báo, không chặn — có lúc export
 * một bản thử là đúng; nhưng không ai được "vô tình" sinh giọng cho lời chưa duyệt.
 */
function warnIfDrifted(cues) {
  const id = path.basename(path.resolve(videoDir));
  const lockFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'projects', id, 'script.lock.json');
  if (!fs.existsSync(lockFile)) {
    console.error(`! chưa khoá wording (không có projects/${id}/script.lock.json) — chạy \`node tools/script-lock.mjs --video ${id}\` trước khi tiêu GPU.`);
    return;
  }
  let lock;
  try { lock = JSON.parse(fs.readFileSync(lockFile, 'utf8')); } catch { return; }
  const d = compareLock(lock, cues);
  const n = d.changed.length + d.added.length + d.removed.length;
  if (!n) { console.error(`ℹ lời khớp bản khoá lúc ${lock.at} (${lock.cues} cue).`); return; }
  console.error(`⚠ LỜI ĐÃ TRÔI khỏi bản khoá lúc ${lock.at}: ${d.changed.length} cue đổi chữ · ${d.added.length} thêm · ${d.removed.length} mất.`);
  if (d.changed.length) console.error(`  cue đổi: ${d.changed.slice(0, 20).join(', ')}${d.changed.length > 20 ? '…' : ''}`);
  console.error(`  → khoá lại bằng \`node tools/script-lock.mjs --video ${id}\` (nó chạy lại gate), rồi export.`);
}
if (!fs.existsSync(cuesFile)) fail(`${cuesFile} not found`);
const id = path.basename(path.resolve(videoDir));
const outDir = path.resolve(flag('out', path.join('projects', id, 'voice-script')));

/**
 * Backend giọng: `--backend` thắng, rồi tới dòng `voice:` trong `projects/<id>/REQUEST.md`, rồi mới
 * tới mặc định. Đọc REQUEST.md ở đây chứ không bắt mọi lệnh phải gõ cờ — chọn backend là quyết định
 * của MỘT video, ghi một lần ở brief của nó.
 */
const requestFile = path.join('projects', id, 'REQUEST.md');
const fromRequest = fs.existsSync(requestFile) ? backendFromRequest(fs.readFileSync(requestFile, 'utf8')) : null;
let chosen;
try { chosen = resolveBackend(flag('backend', fromRequest), { fallback: DEFAULT_BACKEND }); }
catch (e) { fail(e.message); }
const backendSource = flags.backend ? '--backend' : fromRequest ? `${requestFile} (voice:)` : 'mặc định';

const mod = await import(`${pathToFileURL(cuesFile).href}?t=${Date.now()}`);
const CUES = mod.CUES || [];
warnIfDrifted(CUES);
if (!CUES.length) fail(`${cuesFile} exports no CUES`);
const SECTIONS = mod.SECTIONS || [];

const FPS = 30;
const key = cueKey(CUES);
const pronounce = flags.pronounce ? JSON.parse(fs.readFileSync(path.resolve(flags.pronounce), 'utf8')) : {};
function ttsText(text) {
  let out = text;
  for (const [from, to] of Object.entries(pronounce)) {
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'gu'), to);
  }
  return out;
}

/**
 * The same timing the Video Studio cue list shows: `start` / `end` in cues.js already carry the measured
 * length once tools/voice-timing.mjs has written `frames`, and the script's estimate before that. Say
 * which of the two it is, because "0:42" means something different when it is a guess.
 */
const measured = CUES.some((c) => c.frames != null);
const spoken = CUES.filter((c) => !c.silent);
const startSeconds = (c) => c.start / FPS;
const lengthSeconds = (c) => (c.end - c.start) / FPS;
/** Time spent speaking, without the pause after it — only known from a recording. */
const speechSeconds = (c) => (c.speech != null ? c.speech / FPS : null);
const totalSeconds = CUES.length ? CUES[CUES.length - 1].end / FPS : 0;
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const secs = (s) => `${s.toFixed(1).replace('.', ',')}s`;

// ── doc-thu.md — the human reading script ────────────────────────────────────
const md = [
  `# Lời đọc · ${id}`,
  '',
  `${CUES.length} câu · ${spoken.length} câu có lời · tổng ${mmss(totalSeconds)} ${measured ? '(đo từ bản thu hiện tại)' : '(ước tính từ kịch bản)'}.`,
  '',
  measured
    ? 'Mốc thời gian lấy từ bản thu đang gắn với video, nên là độ dài thật. Số giây của mỗi câu là phần đọc,'
      + ' không tính khoảng nghỉ sau câu — vì vậy cộng lại sẽ nhỏ hơn tổng.'
    : 'Chưa có bản thu nào, nên mốc thời gian chỉ là ước tính từ kịch bản (≈ 3 tiếng/giây).'
      + ' Cứ đọc tự nhiên, đừng cố khớp: độ dài thật sẽ được đo lại khi nhập audio.',
  '',
  '## Quy ước bắt buộc',
  '',
  '- **Không sửa lời.** Lời ở đây đã được duyệt và khoá. Bước nhập giọng sẽ đối chiếu lại;',
  '  sửa một chữ là phải quay lại bước Lời & Cue.',
  `- **Mỗi câu một file audio**, đặt tên đúng theo số câu: \`${key(1)}.wav\`, \`${key(2)}.wav\`, …`,
  '  Nhận cả `.wav .mp3 .m4a .mp4 .aac .flac .ogg .opus`; nên dùng `.wav`.',
  '- Đọc liền một câu, không cắt giữa chừng. Khoảng lặng đầu/cuối file sẽ được tự động cắt bỏ,',
  '  nên không cần canh cho khít.',
  '- Câu ghi "khoảng dừng" thì **không cần file** — hệ thống tự chèn im lặng.',
  '- Xong thì để tất cả file trong **một thư mục** và chọn thư mục đó ở bước Giọng đọc.',
  '',
  '## Dùng model local',
  '',
  '- `doc-thu.txt` — lời thuần, mỗi câu một dòng, để dán vào model.',
  '- `cau/` — mỗi câu một file `.txt`, cho generator chạy theo thư mục.',
  '- `voice-batch.jsonl` — chạy thẳng với OmniVoice, kết quả đã đúng tên file để nhập lại:',
  '',
  '  ```bash',
  `  omnivoice-infer-batch --model k2-fsa/OmniVoice --test_list voice-batch.jsonl --res_dir results/`,
  '  ```',
  '',
  '  Muốn giọng đồng nhất giữa các câu thì thêm `ref_audio` (+ `ref_text`) vào mỗi dòng để clone giọng,',
  '  hoặc `instruct` để mô tả giọng. Đừng đặt `duration` — hãy để model tự chọn độ dài tự nhiên.',
  '',
];
let section = null;
for (const c of CUES) {
  if (c.section != null && c.section !== section) {
    section = c.section;
    md.push('', `## Phần ${section}${SECTIONS[section - 1] ? ` · ${SECTIONS[section - 1]}` : ''} — từ ${mmss(startSeconds(c))}`, '');
  }
  if (c.silent) {
    md.push(`**${key(c.n)}** · ${mmss(startSeconds(c))} · khoảng dừng ${c.silent}s · *không cần file audio*`, '');
    continue;
  }
  const length = speechSeconds(c) ?? lengthSeconds(c);
  md.push(`**${key(c.n)}.wav** · ${mmss(startSeconds(c))} · ${measured ? '' : '~'}${secs(length)}${c.title ? ` · ${c.title}` : ''}`);
  if (c.voice) md.push(`> Cách đọc: ${c.voice}`);
  md.push('', c.text, '');
}

// ── the machine-readable exports ─────────────────────────────────────────────
// Áp pronounce.json ở đây — đây là text thật đưa cho model, khác doc-thu.md (giữ nguyên lời khoá).
const txt = spoken.map((c) => ttsText(c.text)).join('\n');
const batchItems = spoken.map((c) => ({ id: key(c.n), text: ttsText(c.text), language_id: 'vi' }));

/**
 * Cache theo cue: `voice-batch.jsonl` mặc định chỉ chứa cue có TEXT (sau pronounce) đổi so với lần
 * export gần nhất — không phải toàn bộ, để khỏi phải tay soạn `retry-batch.jsonl` khi sửa vài dòng.
 * `doc-thu.md/.txt` và `cau/*.txt` LUÔN ghi đủ, không bị cache — chỉ `voice-batch.jsonl` (thứ thật
 * sự tốn máy) được lọc.
 *
 * ── Cache phải biết BACKEND, không chỉ biết text (21/09/2026) ─────────────────────────────────
 * Trước đây hash chỉ gồm `ttsText`, nên đổi từ OmniVoice sang ZeroTTS mà `voice-batch.jsonl` vẫn ra
 * RỖNG: pipeline im lặng ghép lại clip giọng cũ vào một video đã chuyển backend. Vì vậy manifest
 * mang thêm `$backendKey` = backend + giọng + phiên bản package; khác một thứ trong ba thứ đó thì
 * MỌI cue bị coi là cần sinh lại, dù không đổi một chữ nào.
 *
 * Hash từng cue vẫn là hash của RIÊNG text — cố ý. Nếu trộn backend vào hash cue thì mọi manifest
 * cũ (7 video OmniVoice đang chạy) sẽ lệch một lượt và báo "cần sinh lại toàn bộ" một cách vô cớ.
 * Manifest cũ không có `$backendKey` được coi là OmniVoice — đúng với thực tế mọi video hiện có.
 */
const manifestFile = path.join(outDir, 'gen-manifest.json');
const prevRaw = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
const prevKey = prevRaw.$backendKey ?? backendHashKey({ backend: BACKENDS_OMNI, voice: null });
const nextKey = backendHashKey(chosen);
const backendChanged = prevKey !== nextKey;
const prevManifest = prevRaw;
const hashOf = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
const nextManifest = { $backendKey: nextKey, $backend: chosen.spec };
const changed = [];
for (const item of batchItems) {
  const hash = hashOf(item.text);
  nextManifest[item.id] = hash;
  if (flags.all || backendChanged || prevManifest[item.id] !== hash) changed.push(item);
}
const toGenerate = flags.all ? batchItems : changed;
const jsonl = toGenerate.map((item) => JSON.stringify(item)).join('\n');

fs.rmSync(path.join(outDir, 'cau'), { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'cau'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'doc-thu.md'), `${md.join('\n').replace(/\n{3,}/g, '\n\n')}\n`);
fs.writeFileSync(path.join(outDir, 'doc-thu.txt'), `${txt}\n`);
fs.writeFileSync(path.join(outDir, 'voice-batch.jsonl'), toGenerate.length ? `${jsonl}\n` : '');
fs.writeFileSync(manifestFile, `${JSON.stringify(nextManifest, null, 2)}\n`);
for (const c of spoken) fs.writeFileSync(path.join(outDir, 'cau', `${key(c.n)}.txt`), `${ttsText(c.text)}\n`);

const files = ['doc-thu.md', 'doc-thu.txt', 'voice-batch.jsonl', `cau/ (${spoken.length} tệp)`, 'gen-manifest.json'];
if (flags.json) {
  console.log(JSON.stringify({
    dir: outDir, cues: CUES.length, spoken: spoken.length, files, text: txt, pronounce: Object.keys(pronounce),
    toGenerate: toGenerate.length, cached: batchItems.length - toGenerate.length, all: Boolean(flags.all),
    backend: chosen.spec, backendSource, backendChanged,
  }));
} else {
  console.log(`✓ ${path.relative(process.cwd(), outDir)} · ${CUES.length} câu (${spoken.length} có lời)`);
  for (const f of files) console.log(`  ${f}`);
  console.log(`  backend: ${chosen.spec} (${backendSource})`);
  if (backendChanged) console.log('  ⚠ backend/giọng/phiên bản ĐỔI so với lần export trước → mọi cue phải sinh lại, không dùng lại clip cũ');
  if (Object.keys(pronounce).length) console.log(`  pronounce: ${Object.keys(pronounce).join(', ')}`);
  else console.log('  ⚠ không có --pronounce — nếu project có pronounce.json, đây là chạy thiếu bước');
  if (flags.all) console.log(`  --all: ${toGenerate.length}/${batchItems.length} cue trong voice-batch.jsonl (ép sinh lại hết)`);
  else console.log(`  ${toGenerate.length}/${batchItems.length} cue cần sinh lại trong voice-batch.jsonl${toGenerate.length < batchItems.length ? ` (${batchItems.length - toGenerate.length} cue text không đổi từ lần export trước — dùng --all để ép sinh hết)` : ''}`);
}
