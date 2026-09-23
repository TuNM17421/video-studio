#!/usr/bin/env node
/**
 * Soát dữ liệu đề xuất ảnh của một video — cùng một lệnh cho Studio và cho agent chạy không qua Studio.
 *
 *   node tools/image-check.mjs <thư mục video> [--stage triage|suggest|decisions|images] [--work <dir>] [--json]
 *                                              [--stamp]
 *
 * Không có `--stage` thì soát mọi file đang có. Kết quả ghi vào `check.json` của thư mục làm việc và in ra;
 * mã thoát 0 = đạt, 1 = có problem, 2 = gọi sai.
 *
 * `--stamp`: triage.json đạt thì ghi dấu vân tay lời đọc (`cuesHash`) vào nó — agent không tự tính được, còn
 * Studio cần nó để biết lúc lời đổi sau khi đã chọn chỗ. Một chỗ tính duy nhất là `cuesHash` ở lib.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readPolicy } from './lib/image-license.mjs';
import { checkDecisions, checkImages, checkSuggest, checkTriage, cuesHash, imagePaths, loadCues, readCandidates, readJson, writeJson } from './lib/image-suggest.mjs';

const STAGES = ['triage', 'suggest', 'decisions', 'images'];
const args = process.argv.slice(2);
const VALUE_FLAGS = ['--stage', '--work'];
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? '';
};
const dir = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));
const json = args.includes('--json');
const stage = flag('--stage');

function usage(message) {
  console.log(json ? JSON.stringify({ ok: false, error: message }) : `✗ ${message}`);
  process.exit(2);
}
if (!dir || !fs.existsSync(path.join(dir, 'cues.js'))) usage('Cách dùng: node tools/image-check.mjs <thư mục video có cues.js> [--stage triage|suggest|decisions|images]');
if (stage && !STAGES.includes(stage)) usage(`--stage phải là ${STAGES.join(' | ')}`);

const policy = readPolicy();
const P = imagePaths(dir, { work: flag('--work') ?? undefined });
const triage = readJson(P.triage, null);
const suggest = readJson(P.suggest, null);
const decisions = readJson(P.decisions, null);
const candidatesBySlot = readCandidates(P, triage);
const wants = (s) => (stage ? stage === s : true);

const report = { ok: true, stages: {} };
function add(name, result) {
  report.stages[name] = result;
  if (result.problems.length) report.ok = false;
}

if (wants('triage')) {
  if (triage) {
    const { cues, sections } = await loadCues(dir);
    const result = checkTriage({ triage, cues, sections, policy });
    add('triage', result);
    if (args.includes('--stamp') && !result.problems.length) writeJson(P.triage, { ...triage, cuesHash: cuesHash(cues) });
  } else if (stage) add('triage', { problems: ['không có triage.json'], warnings: [] });
}
if (wants('suggest')) {
  if (suggest) add('suggest', checkSuggest({ suggest, triage, candidatesBySlot, policy }));
  else if (stage) add('suggest', { problems: ['không có suggest.json'], warnings: [] });
}
if (wants('decisions')) {
  if (decisions) add('decisions', checkDecisions({ decisions, triage, candidatesBySlot, suggest, policy }));
  else if (stage) add('decisions', { problems: ['không có decisions.json'], warnings: [] });
}
if (wants('images')) {
  if (fs.existsSync(P.imagesJs)) {
    const { IMAGES } = await import(`${pathToFileURL(P.imagesJs).href}?t=${Date.now()}`);
    add('images', checkImages({ images: IMAGES }));
  } else if (stage) add('images', { problems: ['không có images.js'], warnings: [] });
}
if (!Object.keys(report.stages).length) usage('chưa có file nào để soát (triage.json, suggest.json, decisions.json, images.js)');

if (fs.existsSync(P.work)) writeJson(P.check, { ...report, checkedAt: new Date().toISOString() });
if (json) console.log(JSON.stringify(report));
else {
  const lines = [];
  for (const [name, r] of Object.entries(report.stages)) {
    lines.push(`${r.problems.length ? '✗' : '✓'} ${name}: ${r.problems.length} problem · ${r.warnings.length} cảnh báo`);
    for (const p of r.problems) lines.push(`    - ${p}`);
    for (const w of r.warnings) lines.push(`    ! ${w}`);
  }
  console.log(lines.join('\n'));
}
process.exit(report.ok ? 0 : 1);
