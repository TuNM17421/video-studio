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

const PAD = Math.max(2, String(Math.max(...CUES.map((c) => c.n))).length);
const key = (n) => String(n).padStart(PAD, '0');
const syllables = (s) => s.trim().split(/\s+/).filter(Boolean).length;
/** Same 3 syllables/s estimate lib/speech.js uses before a recording exists. */
const estimate = (c) => (c.silent ? Number(c.silent) : syllables(c.text) / 3);

const spoken = CUES.filter((c) => !c.silent);
const totalSeconds = CUES.reduce((s, c) => s + estimate(c), 0);
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// ── doc-thu.md — the human reading script ────────────────────────────────────
const md = [
  `# Lời đọc · ${id}`,
  '',
  `${CUES.length} câu (${spoken.length} câu có lời) · ước tính ${mmss(totalSeconds)} chưa tính khoảng nghỉ.`,
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
    md.push('', `## Phần ${section}${SECTIONS[section - 1] ? ` · ${SECTIONS[section - 1]}` : ''}`, '');
  }
  if (c.silent) {
    md.push(`**${key(c.n)}** · khoảng dừng ${c.silent}s · *không cần file audio*`, '');
    continue;
  }
  md.push(`**${key(c.n)}.wav** · ~${estimate(c).toFixed(1)}s${c.title ? ` · ${c.title}` : ''}`);
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
