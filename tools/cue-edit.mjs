#!/usr/bin/env node
/**
 * Sửa trực tiếp một câu trong cues.js — lời đọc, chữ trên màn hình, ý đồ hình — không cần một lượt agent.
 *
 *   echo '{"text":"…","title":"…"}' | node tools/cue-edit.mjs <video dir> --n 12 [--script projects/<id>/kich-ban-goc.md]
 *
 * In ra một dòng JSON: { n, changed: { text: { before, after }, … }, script }. `script` là "updated" khi dòng
 * `- **Lời:**` của câu đó trong kịch bản được sửa theo, "not-found" / "ambiguous" khi không tìm được đúng một dòng
 * (kịch bản giữ nguyên, người dùng tự sửa), "none" khi lời đọc không đổi hoặc không có kịch bản.
 *
 * Không ghi gì khi bản sửa không qua phép kiểm: file sau khi sửa được import lại, câu đó phải đọc đúng giá trị
 * mới, mọi câu khác cùng SECTIONS và DURATION phải y như trước (tools/lib/cue-edit.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cleanValue, EDITABLE, editCueSource, lostAnchors, opaqueAnchors, syncScriptNarration } from './lib/cue-edit.mjs';

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const dir = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
const n = Number(flag('n'));
const scriptFile = flag('script');
if (!dir || !Number.isInteger(n)) fail('usage: node tools/cue-edit.mjs <video dir> --n <câu> [--script kich-ban-goc.md]  (thay đổi là JSON trên stdin)');
const cuesFile = path.resolve(dir, 'cues.js');
if (!fs.existsSync(cuesFile)) fail(`Không có ${path.relative(process.cwd(), cuesFile)}.`);

let input = '';
for await (const chunk of process.stdin) input += chunk;
let requested;
try { requested = JSON.parse(input || '{}'); } catch { fail('Thay đổi trên stdin không phải JSON.'); }

const load = async (file) => import(`${pathToFileURL(file).href}?t=${Date.now()}-${Math.random()}`);
const before = await load(cuesFile);
const cue = (before.CUES || []).find((c) => c.n === n);
if (!cue) fail(`cues.js không có câu ${n}.`);

const changes = {};
for (const key of EDITABLE) {
  if (!(key in requested)) continue;
  const value = cleanValue(requested[key]);
  if (value === (cue[key] ?? '')) continue;
  changes[key] = value;
}
if (!Object.keys(changes).length) {
  console.log(JSON.stringify({ n, changed: {}, script: 'none' }));
  process.exit(0);
}
if ('text' in changes && cue.silent) fail(`Câu ${n} là khoảng dừng, không có lời đọc để sửa.`);
if ('text' in changes && !changes.text) fail('Lời đọc không được để trống. Muốn bỏ câu thì nhờ agent.');
if ('text' in changes) {
  // Scenes already built on this câu time their beats to phrases of its narration; losing one breaks the video.
  const videoDir = path.dirname(cuesFile);
  const scenes = fs.readdirSync(videoDir).filter((name) => name.endsWith('.jsx')).map((name) => ({ file: name, source: fs.readFileSync(path.join(videoDir, name), 'utf8') }));
  const opaque = opaqueAnchors(scenes, n);
  if (opaque.length) {
    const list = opaque.slice(0, 3).map(({ file, expr }) => `${file} neo nhịp vào ${expr}`).join('; ');
    fail(`Cảnh đã dựng neo nhịp của câu ${n} bằng biến, không đọc được thành cụm từ (${list}${opaque.length > 3 ? `; và ${opaque.length - 3} chỗ khác` : ''}), nên không kiểm được lời mới có giữ đủ nhịp không. Nhờ agent sửa câu này cùng cảnh.`);
  }
  const lost = lostAnchors(scenes, n, changes.text);
  if (lost.length) {
    const list = lost.slice(0, 3).map(({ file, phrase }) => `${file} neo nhịp vào "${phrase}"`).join('; ');
    fail(`Cảnh đã dựng dùng lời cũ của câu ${n} (${list}${lost.length > 3 ? `; và ${lost.length - 3} chỗ khác` : ''}). Lời mới phải giữ nguyên các cụm này, hoặc nhờ agent sửa câu này cùng cảnh.`);
  }
}

const source = fs.readFileSync(cuesFile, 'utf8');
let edited;
try { edited = editCueSource(source, n, changes); } catch (error) { fail(error.message); }

// Checked on a copy beside the original, so its relative imports (voice.js, lib/speech.js) resolve the same.
const trial = path.join(path.dirname(cuesFile), `.cues-edit-${process.pid}-${Date.now()}.js`);
fs.writeFileSync(trial, edited);
try {
  let after;
  try { after = await load(trial); } catch (error) { throw new Error(`cues.js sau khi sửa không chạy được: ${error.message}`); }
  const allowed = new Set([...Object.keys(changes), ...('title' in changes && cue.screen === cue.title ? ['screen'] : [])]);
  const strip = (c) => JSON.stringify(Object.fromEntries(Object.entries(c).filter(([key]) => !(c.n === n && allowed.has(key))).sort(([a], [b]) => a.localeCompare(b))));
  const was = before.CUES.map(strip);
  const now = (after.CUES || []).map(strip);
  const editedCue = (after.CUES || []).find((c) => c.n === n);
  const problems = [
    ...(now.length !== was.length ? [`số câu đổi từ ${was.length} thành ${now.length}`] : []),
    ...was.flatMap((row, i) => (row === now[i] ? [] : [`câu ${before.CUES[i].n} bị đổi ngoài ý muốn`])),
    ...Object.entries(changes).flatMap(([key, value]) => (editedCue?.[key] === value ? [] : [`${key} của câu ${n} không thành giá trị mới`])),
    ...(JSON.stringify(after.SECTIONS) === JSON.stringify(before.SECTIONS) ? [] : ['SECTIONS bị đổi']),
    ...(after.DURATION === before.DURATION ? [] : ['DURATION bị đổi']),
  ];
  if (problems.length) throw new Error(`Không ghi: bản sửa làm hỏng cues.js (${problems.slice(0, 3).join('; ')}). Nhờ agent sửa câu này.`);
  fs.renameSync(trial, cuesFile);
} catch (error) {
  fs.rmSync(trial, { force: true });
  fail(error.message);
}

let script = 'none';
if ('text' in changes && scriptFile && fs.existsSync(scriptFile)) {
  const original = fs.readFileSync(scriptFile, 'utf8');
  const synced = syncScriptNarration(original, cue.text, changes.text);
  script = synced.result;
  if (synced.result === 'updated') {
    const tmp = `${scriptFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, synced.script);
    fs.renameSync(tmp, scriptFile);
  }
}

const changed = Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, { before: cue[key] ?? '', after: value }]));
console.log(JSON.stringify({ n, changed, script }));
