#!/usr/bin/env node
/**
 * Export a video's locked narration so the voice can be recorded or generated outside this repo, then
 * imported back with tools/voice-import.mjs.
 *
 *   node tools/voice-export.mjs <video dir> --out projects/<id>/voice-script [--pause 1.4] [--json]
 *
 * Writes, into --out:
 *   doc-thu.md        the reading script for a person: sections, numbering, estimated length, notes
 *   doc-thu.txt       narration only, one câu per line — paste into a local model
 *   voice-batch.jsonl one JSON object per câu, in the shape omnivoice-infer-batch --test_list expects,
 *                     with id = 01, 02 … so its --res_dir lands ready to import with no renaming
 *   cau/01.txt …      one câu per file, for generators driven by a folder of prompts
 *
 * The narration is locked: tools/voice-import.mjs refuses audio whose cues.js has changed since, so
 * every file here says plainly that the text must not be edited.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cueKey } from './lib/voice-files.mjs';

const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const VALUE_FLAGS = new Set(['out']);
const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) { positional.push(argv[i]); continue; }
  const name = argv[i].slice(2);
  flags[name] = VALUE_FLAGS.has(name) ? argv[++i] : true;
}
const flag = (name, fallback) => flags[name] ?? fallback;
const [videoDir] = positional;
if (!videoDir) fail('usage: node tools/voice-export.mjs <video dir> --out <dir>');
const cuesFile = path.resolve(videoDir, 'cues.js');
if (!fs.existsSync(cuesFile)) fail(`${cuesFile} not found`);
const id = path.basename(path.resolve(videoDir));
const outDir = path.resolve(flag('out', path.join('projects', id, 'voice-script')));

const mod = await import(`${pathToFileURL(cuesFile).href}?t=${Date.now()}`);
const CUES = mod.CUES || [];
if (!CUES.length) fail(`${cuesFile} exports no CUES`);
const SECTIONS = mod.SECTIONS || [];

const FPS = 30;
const key = cueKey(CUES);

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
const txt = spoken.map((c) => c.text).join('\n');
const jsonl = spoken.map((c) => JSON.stringify({ id: key(c.n), text: c.text, language_id: 'vi' })).join('\n');

fs.rmSync(path.join(outDir, 'cau'), { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'cau'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'doc-thu.md'), `${md.join('\n').replace(/\n{3,}/g, '\n\n')}\n`);
fs.writeFileSync(path.join(outDir, 'doc-thu.txt'), `${txt}\n`);
fs.writeFileSync(path.join(outDir, 'voice-batch.jsonl'), `${jsonl}\n`);
for (const c of spoken) fs.writeFileSync(path.join(outDir, 'cau', `${key(c.n)}.txt`), `${c.text}\n`);

const files = ['doc-thu.md', 'doc-thu.txt', 'voice-batch.jsonl', `cau/ (${spoken.length} tệp)`];
if (flags.json) {
  console.log(JSON.stringify({ dir: outDir, cues: CUES.length, spoken: spoken.length, files, text: txt }));
} else {
  console.log(`✓ ${path.relative(process.cwd(), outDir)} · ${CUES.length} câu (${spoken.length} có lời)`);
  for (const f of files) console.log(`  ${f}`);
}
