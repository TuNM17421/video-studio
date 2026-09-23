#!/usr/bin/env node

/**
 * Parse markdown kịch bản → cues.js
 *
 * ## Input Markdown Format (Required from now on)
 *
 * Write `kich-ban-goc.md` with this exact structure for the tool to parse automatically:
 *
 * ```markdown
 * ## Sections
 * 1. Section Name 1
 * 2. Section Name 2
 * 3. Section Name 3
 * ...
 *
 * ## Bảng cue
 *
 * | # | Section | Lời đọc | Visual | Pose | Emotion |
 * |---|---|---|---|---|---|
 * | 1 | 1 | Lời đọc cue 1 (copy nguyên vẫn từ kịch bản) | visual-key-1 | wave | happy |
 * | 2 | 1 | Lời đọc cue 2 | visual-key-1 | point | serious |
 * | 3 | 2 | Lời đọc cue 3 (section 2) | visual-key-2 | teach | idle |
 * ```
 *
 * ### Rules:
 * - **Sections heading**: MUST be `## Sections` (or `Sections:` on same line with `##`)
 * - **Cues table heading**: Can be `## Bảng cue`, `## Cues`, or similar (tool finds table by column names)
 * - **Columns**: Must have `#`, `Section`, `Lời đọc`, `Pose`, `Emotion`. `Visual` is optional but recommended.
 * - **Section column**: Integer 1-based, must match section numbers in Sections list
 * - **Lời đọc column**: LOCKED VERBATIM — tool copies exactly, no edits
 * - **Pose, Emotion**: Copy as-is
 * - **Visual column** (if present): Not directly mapped to visualKey; tool auto-generates visualKey from section slug
 * - **Empty cells or missing required fields**: Tool stops with clear error, line number, and field name
 *
 * ## Usage
 *
 *   node tools/cues-from-markdown.mjs <kich-ban-goc.md> --out <cues.js> [--title "N5-XX · Title"]
 *
 * Example:
 *   node tools/cues-from-markdown.mjs projects/n5-05-risk-matrix/kich-ban-goc.md \\
 *     --out vinuni-lesson-video-ds/ui_kits/lesson-video/videos/n5-05-risk-matrix/cues.js \\
 *     --title "N5-05 · Risk Matrix"
 *
 * ## Output
 *
 * Generates a valid `cues.js` with:
 * - Import statements (from sample file)
 * - SECTIONS array
 * - SCRIPT array with cues
 * - SECTION_END computed FRESH from this video's own section boundaries (NOT copied from the
 *   template — the template's SECTION_END/TIMING are n5-04's own measured data, specific to it)
 * - TIMING left as an empty stub `[]`, to be filled later by `tools/voice-timing.mjs --write-cues`
 * - The rest (secondsFor/RAW/CUES/DURATION/spokenAt/speechEnd) copied verbatim from the template —
 *   that part is generic logic, not video-specific data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node cues-from-markdown.mjs <markdown-file> --out <cues.js> [--title "Title"]');
    process.exit(1);
  }

  const input = args[0];
  const outIdx = args.indexOf('--out');
  const titleIdx = args.indexOf('--title');

  if (outIdx === -1) {
    console.error('Error: --out flag is required');
    process.exit(1);
  }

  const output = args[outIdx + 1];
  const title = titleIdx !== -1 ? args[titleIdx + 1] : '';

  return { input, output, title };
}

function readMarkdown(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err.message);
    process.exit(1);
  }
}

function parseSections(content) {
  // Look for ## Sections or similar heading
  const sectionMatch = content.match(/##\s+Sections\s*\n([\s\S]*?)(?=##|\Z)/);
  if (!sectionMatch) {
    console.error('Error: Could not find "## Sections" heading in markdown');
    process.exit(1);
  }

  const sectionsText = sectionMatch[1];
  const lines = sectionsText.split('\n').filter(line => line.trim());

  const sections = [];
  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) {
      sections.push(match[1].trim());
    }
  }

  if (sections.length === 0) {
    console.error('Error: No sections found. Expected format: "1. Section Name"');
    process.exit(1);
  }

  return sections;
}

function parseTable(content) {
  // Find markdown table - look for lines with | delimiters
  const lines = content.split('\n');
  let tableStart = -1;
  let tableEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('|') && lines[i].includes('#') && lines[i].includes('Lời đọc')) {
      tableStart = i;
      break;
    }
  }

  if (tableStart === -1) {
    console.error('Error: Could not find cues table with columns: # | Section | Lời đọc | Pose | Emotion');
    process.exit(1);
  }

  // Find table end (next non-table line)
  for (let i = tableStart + 1; i < lines.length; i++) {
    if (!lines[i].trim().startsWith('|') || lines[i].trim().length < 3) {
      tableEnd = i;
      break;
    }
  }
  if (tableEnd === -1) tableEnd = lines.length;

  const tableLines = lines.slice(tableStart, tableEnd);

  // Parse header
  const headerLine = tableLines[0];
  const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);

  const colIndex = {};
  for (let i = 0; i < headers.length; i++) {
    const lower = headers[i].toLowerCase();
    if (lower === '#') colIndex.num = i;
    if (lower === 'section') colIndex.section = i;
    if (lower === 'lời đọc') colIndex.text = i;
    if (lower === 'visual') colIndex.visual = i;
    if (lower === 'pose') colIndex.pose = i;
    if (lower === 'emotion') colIndex.emotion = i;
  }

  // Validate required columns
  const required = ['num', 'section', 'text', 'pose', 'emotion'];
  for (const col of required) {
    if (!(col in colIndex)) {
      console.error(`Error: Missing required column: ${col === 'num' ? '#' : col === 'text' ? 'Lời đọc' : col}`);
      process.exit(1);
    }
  }

  // Parse rows (skip separator row at index 1)
  const rows = [];
  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i];
    if (!line.trim().startsWith('|')) continue;

    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < Object.keys(colIndex).length) continue;

    const row = {};
    for (const [key, idx] of Object.entries(colIndex)) {
      row[key] = cells[idx] || '';
    }

    // Validate required fields
    if (!row.text) {
      console.error(`Error at row ${i + 1}: Lời đọc (text) is empty`);
      process.exit(1);
    }
    if (!row.pose) {
      console.error(`Error at row ${i + 1}: Pose is empty`);
      process.exit(1);
    }
    if (!row.emotion) {
      console.error(`Error at row ${i + 1}: Emotion is empty`);
      process.exit(1);
    }

    const sectionNum = parseInt(row.section, 10);
    if (isNaN(sectionNum)) {
      console.error(`Error at row ${i + 1}: Section must be a number, got "${row.section}"`);
      process.exit(1);
    }

    rows.push({
      num: parseInt(row.num, 10),
      section: sectionNum,
      text: row.text,
      visual: row.visual || '',
      pose: row.pose,
      emotion: row.emotion
    });
  }

  if (rows.length === 0) {
    console.error('Error: No cues found in table');
    process.exit(1);
  }

  return rows;
}

function generateVisualKey(sectionName) {
  // Slugify section name: remove diacritics, lowercase, replace spaces/dashes with empty
  // Simple approach: "Sơ đồ hai trục" → "sodohaitr"
  const normalized = sectionName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') // Keep only alphanumeric
    .substring(0, 16); // Limit length
  return normalized || 'section';
}

function readTemplate(templatePath) {
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (err) {
    console.error(`Error reading template ${templatePath}:`, err.message);
    process.exit(1);
  }
}

// CHỈ lấy phần thật sự DÙNG CHUNG được (từ `secondsFor` trở xuống — logic tính RAW/CUES/DURATION,
// không phụ thuộc video nào). KHÔNG lấy `SECTION_END`/`TIMING` từ template — hai cái đó là DỮ LIỆU
// đo thật của riêng n5-04 (42 cue, timing thật), copy nguyên văn sang video khác sẽ gắn nhầm timing/
// pause-boundary của n5-04 vào video mới (bug thật, tự phát hiện khi review 17/09/2026, không phải
// suy đoán — xem `n5-04-ai-autonomy-risk/cues.js`: TIMING có đúng 42 dòng số đo thật, SECTION_END là
// {5,11,16,22,28,34,39,42} — chỉ đúng với cấu trúc n5-04). `generateCuesJs()` tự tính lại
// `SECTION_END` từ chính dữ liệu cue của video mới, và đặt `TIMING = []` (stub thật, chờ
// `voice-timing.mjs --write-cues` điền số đo thật sau khi có giọng).
function extractFooter(templateContent) {
  const footerMatch = templateContent.match(/const secondsFor[\s\S]*$/);
  if (!footerMatch) {
    console.error('Error: Could not extract reusable footer (secondsFor onward) from template');
    process.exit(1);
  }
  return footerMatch[0];
}

function generateCuesJs(sections, rows, templateFooter, title) {
  // Generate SECTIONS array
  const sectionsCode = sections
    .map(s => `  '${s.replace(/'/g, "\\'")}'`)
    .join(',\n');

  // Generate SCRIPT array
  // For each cue: [section, visualKey, pose, mascot, text]
  // Note: mascot is hardcoded to 'happy'/'idle'/etc based on some logic, but from the sample
  // it seems to be generated. For now, we'll use a simple mapping.
  const scriptLines = rows.map(row => {
    const visualKey = generateVisualKey(sections[row.section - 1]);
    // Determine mascot based on emotion (simple heuristic)
    let mascot = 'idle';
    if (row.emotion === 'happy') mascot = 'happy';
    else if (row.emotion === 'serious') mascot = 'serious';
    else if (row.emotion === 'thinking') mascot = 'thinking';
    else if (row.emotion === 'sad') mascot = 'sad';
    else if (row.emotion === 'excited') mascot = 'excited';
    else if (row.emotion === 'surprised') mascot = 'surprised';
    else if (row.emotion === 'talking') mascot = 'talking';
    else mascot = 'idle';

    // Escape single quotes in text
    const escapedText = row.text.replace(/'/g, "\\'");
    return `  [${row.section}, '${visualKey}', '${row.pose}', '${mascot}', '${escapedText}']`;
  });

  const scriptCode = scriptLines.join(',\n');

  // Build the comment header
  const commentTitle = title || 'Video Script';
  const header = `/**
 * ${commentTitle}
 * Text is locked verbatim from projects/<id>/kich-ban-goc.md.
 */`;

  // Tự tính SECTION_END từ chính dữ liệu cue của video này: cue cuối cùng của mỗi section (không
  // copy số của n5-04 — xem ghi chú tại extractFooter()).
  const sectionEndCues = [];
  for (let s = 1; s <= sections.length; s++) {
    const cuesInSection = rows.map((r, i) => ({ n: i + 1, section: r.section })).filter((r) => r.section === s);
    if (cuesInSection.length) sectionEndCues.push(cuesInSection[cuesInSection.length - 1].n);
  }
  const sectionEndCode = `const SECTION_END = new Set([${sectionEndCues.join(', ')}]);`;

  const output = `${header}
import { VOICE } from './voice.js';
import { createSpeech } from '../../../../lib/speech.js';

export const SECTIONS = [
${sectionsCode}
];

// [section, visualKey, pose, mascot, text]
const SCRIPT = [
${scriptCode}
];

${sectionEndCode}

// tools/voice-timing.mjs writes measured frames/speech into these stable cue records — stub until
// then, so đừng gõ số vào đây bằng tay.
const TIMING = [];

${templateFooter}`;

  return output;
}

// Main
const { input, output, title } = parseArgs();

console.log(`Parsing ${input}...`);
const markdown = readMarkdown(input);

const sections = parseSections(markdown);
console.log(`✓ Found ${sections.length} sections: ${sections.join(', ')}`);

const rows = parseTable(markdown);
console.log(`✓ Found ${rows.length} cues`);

// Validate section numbers
for (const row of rows) {
  if (row.section < 1 || row.section > sections.length) {
    console.error(`Error: Cue ${row.num} references section ${row.section}, but only ${sections.length} sections exist`);
    process.exit(1);
  }
}

// Read template
const templatePath = path.join(__dirname, '../vinuni-lesson-video-ds/ui_kits/lesson-video/videos/n5-04-ai-autonomy-risk/cues.js');
console.log(`Reading template from ${templatePath}...`);
const template = readTemplate(templatePath);
const footer = extractFooter(template);

const cuesJs = generateCuesJs(sections, rows, footer, title);

// Write output
try {
  const outDir = path.dirname(output);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(output, cuesJs, 'utf-8');
  console.log(`✓ Generated ${output}`);
} catch (err) {
  console.error(`Error writing ${output}:`, err.message);
  process.exit(1);
}

console.log('Done!');
