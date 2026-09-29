import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { cleanValue, editCueSource, literal, lostAnchors, rawCues, syncScriptNarration } from './cue-edit.mjs';

const execFileP = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VIDEOS = path.join(ROOT, 'vinuni-lesson-video-ds', 'ui_kits', 'lesson-video', 'videos');

const SOURCE = `import { VOICE } from './voice.js';
// { a brace in a comment } and a 'quote'
const RAW = [
  // ── Phần 1 ──
  {
    n: 1, seconds: 4, section: 1,
    title: 'Chữ "trên" màn hình',
    text: 'Lời đọc có dấu \\'nháy\\' và {ngoặc}.',
    visual: 'Ý đồ, hình: [a] → (b)',
  },
  { n: 2, seconds: 3, section: 1, text: "Câu hai" },
  {
    n: 3, silent: 2, section: 1,
    text: '',
  },
];
export const SECTIONS = ['Mở đầu'];
`;

const load = async (source) => {
  const dir = fs.mkdtempSync(path.join(ROOT, 'tools', '.cue-edit-test-'));
  try {
    fs.writeFileSync(path.join(dir, 'voice.js'), 'export const VOICE = null;\n');
    fs.writeFileSync(path.join(dir, 'cues.mjs'), `${source}\nexport { RAW };\n`);
    return (await import(pathToFileURL(path.join(dir, 'cues.mjs')).href)).RAW;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test('rawCues finds each câu and its top-level properties, whatever sits in comments and strings', () => {
  const cues = rawCues(SOURCE);
  assert.equal(cues.length, 3);
  assert.deepEqual(cues[0].props.map((p) => p.key), ['n', 'seconds', 'section', 'title', 'text', 'visual']);
  assert.deepEqual(cues[1].props.map((p) => p.key), ['n', 'seconds', 'section', 'text']);
});

test('editCueSource replaces only the literals asked for; the file still says everything else as before', async () => {
  const out = editCueSource(SOURCE, 1, { text: "Lời mới, có 'nháy' và \\ gạch.", title: 'Tiêu đề mới' });
  const raw = await load(out);
  assert.equal(raw[0].text, "Lời mới, có 'nháy' và \\ gạch.");
  assert.equal(raw[0].title, 'Tiêu đề mới');
  assert.equal(raw[0].visual, 'Ý đồ, hình: [a] → (b)');
  assert.deepEqual(raw.slice(1), await load(SOURCE).then((r) => r.slice(1)));
  // only the two literals changed: the comment, the other câu and the layout are byte-for-byte the same
  assert.equal(out.replace(/title: '[^']*'/, '').replace(/text: '(?:[^'\\]|\\.)*'/, ''), SOURCE.replace(/title: 'Chữ "trên" màn hình'/, '').replace(/text: '(?:[^'\\]|\\.)*'/, ''));
});

test('a double-quoted literal is rewritten too, and a missing field is added on its own line', async () => {
  const out = editCueSource(SOURCE, 2, { text: 'Câu hai đã sửa', visual: 'Hình mới' });
  const raw = await load(out);
  assert.equal(raw[1].text, 'Câu hai đã sửa');
  assert.equal(raw[1].visual, 'Hình mới');
  const added = editCueSource(SOURCE, 3, { title: 'Nghĩ một chút' });
  assert.match(added, /text: '',\n {4}title: 'Nghĩ một chút',\n {2}\}/);
  assert.equal((await load(added))[2].title, 'Nghĩ một chút');
});

test('what it cannot place it refuses, with a reason', () => {
  assert.throws(() => editCueSource(SOURCE, 9, { text: 'x' }), /Không tìm thấy câu 9/);
  assert.throws(() => editCueSource(SOURCE, 1, { seconds: 5 }), /Không sửa trực tiếp được: seconds/);
  const built = SOURCE.replace("text: \"Câu hai\"", "text: 'Câu ' + 'hai'");
  assert.throws(() => editCueSource(built, 2, { text: 'x' }), /không phải một chuỗi đơn/);
  const template = SOURCE.replace("text: \"Câu hai\"", 'text: `Câu ${2}`');
  assert.throws(() => editCueSource(template, 2, { text: 'x' }), /không phải một chuỗi đơn/);
  assert.throws(() => editCueSource('export const CUES = [];', 1, { text: 'x' }), /const RAW = \[/);
});

test('literal and cleanValue keep what goes into cues.js on one line', () => {
  assert.equal(literal("a'b\\c\nd"), "'a\\'b\\\\c\\nd'");
  assert.equal(cleanValue('  Một câu\n  hai dòng  '), 'Một câu hai dòng');
});

test('syncScriptNarration rewrites the one **Lời:** line that says the old narration', () => {
  const script = '### Câu 1\r\n\r\n- **Lời:** Xin chào các bạn.\r\n- **Trên màn hình:** Xin chào\r\n\r\n### Câu 2\r\n\r\n- **Lời:** Câu hai.\r\n';
  const done = syncScriptNarration(script, 'Xin chào các bạn.', 'Chào cả lớp.');
  assert.equal(done.result, 'updated');
  assert.equal(done.script, script.replace('Xin chào các bạn.', 'Chào cả lớp.'));
  assert.equal(syncScriptNarration(script, 'Không có câu này.', 'x').result, 'not-found');
  const twice = `${script}- **Lời:** Câu hai.\n`;
  assert.deepEqual(syncScriptNarration(twice, 'Câu hai.', 'x'), { script: twice, result: 'ambiguous' });
});

test('lostAnchors names the scene phrases a new narration would drop', () => {
  const scenes = [
    // the way every scene in the repo writes it: a constant N, then spokenAt(N, '…')
    { file: 's02.jsx', source: "const N = 2;\nconst T = { a: spokenAt(N, 'bọc máy học') - 6, b: spokenAt(N, \"trong cùng\") };" },
    { file: 's03.jsx', source: "const N = 3;\nconst T = { a: spokenAt(N, 'bọc máy học') };" }, // another câu: not this edit's business
    { file: 'shared.jsx', source: "export const x = spokenAt(2, 'AI tạo sinh');" },
  ];
  assert.deepEqual(lostAnchors(scenes, 2, 'Trí tuệ nhân tạo bao trùm máy học, và trong cùng là AI tạo sinh.'), [{ file: 's02.jsx', phrase: 'bọc máy học' }]);
  assert.deepEqual(lostAnchors(scenes, 2, 'AI bọc máy học, và trong cùng là AI tạo sinh.'), []);
  assert.deepEqual(lostAnchors(scenes, 3, 'Không còn cụm đó.'), [{ file: 's03.jsx', phrase: 'bọc máy học' }]);
});

test('cue-edit.mjs writes nothing when the edit changes more than the câu', async () => {
  // A cues.js whose timing is computed from the narration: a new text would move DURATION — refused.
  const dir = fs.mkdtempSync(path.join(VIDEOS, '.cue-edit-test-'));
  const source = "const RAW = [\n  { n: 1, text: 'Một hai ba' },\n];\nexport const CUES = RAW.map((c) => ({ ...c, start: 0, end: c.text.length }));\nexport const DURATION = CUES.at(-1).end;\nexport const SECTIONS = [];\n";
  try {
    fs.writeFileSync(path.join(dir, 'cues.js'), source);
    const child = execFileP(process.execPath, ['tools/cue-edit.mjs', dir, '--n', '1'], { cwd: ROOT });
    child.child.stdin.end(JSON.stringify({ text: 'Một hai ba bốn năm' }));
    await assert.rejects(child, /DURATION bị đổi/);
    assert.equal(fs.readFileSync(path.join(dir, 'cues.js'), 'utf8'), source);
    assert.deepEqual(fs.readdirSync(dir), ['cues.js']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('cue-edit.mjs on a real cues.js: edits, checks by importing, syncs the script', async () => {
  const sample = path.join(VIDEOS, 'mau-huong-dan');
  // A copy inside videos/ so the file's own relative imports (lib/speech.js) resolve exactly as in the video.
  const dir = fs.mkdtempSync(path.join(VIDEOS, '.cue-edit-test-'));
  const script = path.join(dir, 'kich-ban-goc.md');
  try {
    fs.copyFileSync(path.join(sample, 'cues.js'), path.join(dir, 'cues.js'));
    fs.writeFileSync(path.join(dir, 'voice.js'), 'export const VOICE = null;\n');
    const before = await import(`${pathToFileURL(path.join(dir, 'cues.js')).href}?a`);
    const old = before.CUES.find((c) => c.n === 2);
    fs.writeFileSync(script, `### Câu 2\n\n- **Lời:** ${old.text}\n`);
    const run = (changes, n = 2) => {
      const child = execFileP(process.execPath, ['tools/cue-edit.mjs', dir, '--n', String(n), '--script', script], { cwd: ROOT });
      child.child.stdin.end(JSON.stringify(changes));
      return child;
    };
    const { stdout } = await run({ text: 'Hôm nay mình kể bạn nghe một kịch bản đã sửa.', title: old.title });
    const result = JSON.parse(stdout);
    // the title was sent unchanged, so only the narration counts as changed
    assert.deepEqual(result, { n: 2, changed: { text: { before: old.text, after: 'Hôm nay mình kể bạn nghe một kịch bản đã sửa.' } }, script: 'updated' });
    const after = await import(`${pathToFileURL(path.join(dir, 'cues.js')).href}?b`);
    assert.equal(after.CUES.find((c) => c.n === 2).text, 'Hôm nay mình kể bạn nghe một kịch bản đã sửa.');
    assert.equal(after.DURATION, before.DURATION);
    assert.equal(fs.readFileSync(script, 'utf8'), '### Câu 2\n\n- **Lời:** Hôm nay mình kể bạn nghe một kịch bản đã sửa.\n');
    // nothing left behind but the two files it was asked to change
    assert.deepEqual(fs.readdirSync(dir).sort(), ['cues.js', 'kich-ban-goc.md', 'voice.js']);

    await assert.rejects(run({ text: '   ' }), /Lời đọc không được để trống/);
    // a scene built on this câu times a beat to a phrase of its narration: dropping it is refused, file untouched
    fs.writeFileSync(path.join(dir, 's02.jsx'), "const N = 2;\nexport const T = { a: spokenAt(N, 'kịch bản đã sửa') };\n");
    const kept = fs.readFileSync(path.join(dir, 'cues.js'), 'utf8');
    await assert.rejects(run({ text: 'Một lời hoàn toàn khác.' }), /s02\.jsx neo nhịp vào "kịch bản đã sửa"/);
    assert.equal(fs.readFileSync(path.join(dir, 'cues.js'), 'utf8'), kept);
    fs.rmSync(path.join(dir, 's02.jsx'));
    const unchanged = JSON.parse((await run({ text: 'Hôm nay mình kể bạn nghe một kịch bản đã sửa.' })).stdout);
    assert.deepEqual(unchanged, { n: 2, changed: {}, script: 'none' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
