/**
 * Word timestamps for imported narration: run tools/voice-align/align.py in the Whisper venv, then
 * map Whisper's words onto the locked cue text. The venv and the model are found through shared-env.mjs:
 * one install per machine, reused by every checkout/worktree instead of ~860 MB each.
 *
 * Whisper transcribes what it hears; cues.js holds what was written. The two are close but never equal
 * (punctuation, numbers read as words, the odd misheard syllable), so `mapWords` aligns the two word
 * sequences and reports how much of the cue it actually found. That single number does double duty:
 * it decides how much of spokenAt() rests on real timings, and it is what catches an audio folder whose
 * files are off by one — a file holding a different câu matches almost nothing.
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS } from './voice-audio.mjs';
import { findVenv, WHISPER_VENV, whisperModelCache } from './shared-env.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ALIGN_PY = path.join(ROOT, 'tools/voice-align/align.py');
export const SETUP_HINT = 'Chưa cài môi trường nhận diện giọng. Chạy: npm run setup:voice';

/** Where the Whisper venv is ({ dir, bin, from }), or null when no checkout on this machine has one. */
export const alignVenv = () => findVenv(WHISPER_VENV);

/** The venv interpreter, or null when `npm run setup:voice` has not been run on this machine. */
export function venvPython() {
  return alignVenv()?.bin ?? null;
}

/** download_root for faster-whisper: wherever the model already is, else the shared cache. */
export const modelCache = (model = process.env.VOICE_ALIGN_MODEL || 'small') => whisperModelCache(model);

/** Run align.py with `job` on stdin. Resolves { ok, result | error }; never throws for a bad exit. */
export function runAlign(job, { onLine, check = false, python = venvPython() } = {}) {
  if (!python) return Promise.resolve({ ok: false, error: SETUP_HINT });
  return new Promise((resolve) => {
    // UTF-8 both ways: align.py prints "câu" in its progress lines, and Python on Windows writes stderr in the
    // console codepage unless told otherwise — the log showed "c�u".
    const child = spawn(python, [ALIGN_PY, ...(check ? ['--check'] : [])], { cwd: ROOT, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' } });
    let out = '';
    let err = '';
    child.stdout.on('data', (b) => { out += b; });
    child.stderr.on('data', (b) => {
      err += b;
      for (const line of String(b).split('\n')) if (line.trim()) onLine?.(line.trim());
    });
    child.on('error', (e) => resolve({ ok: false, error: `${python}: ${e.message}` }));
    child.on('close', (code) => {
      if (code !== 0) return resolve({ ok: false, error: err.trim().split('\n').pop() || `align.py exit ${code}` });
      try { resolve({ ok: true, result: JSON.parse(out) }); } catch { resolve({ ok: false, error: 'align.py trả về dữ liệu không đọc được.' }); }
    });
    child.stdin.end(JSON.stringify({ cacheDir: modelCache(job.model), ...job }));
  });
}

/**
 * Whisper on a list of files, one câu each, through the same cache the import uses
 * (voice/cache/align/<file sha256>-<model>.json): a take heard once is never transcribed again.
 *
 *   items    [{ key, file }] — `key` is whatever the caller wants back
 *   returns  { ok: true, heard: Map<key, { text, words, avgLogprob }> } | { ok: false, error }
 *            A file Whisper failed on is simply absent from the map.
 */
export async function transcribe(items, { model = process.env.VOICE_ALIGN_MODEL || 'small', onLine } = {}) {
  const heard = new Map();
  const todo = [];
  for (const { key, file } of items) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const cache = path.join(ROOT, 'voice/cache/align', `${hash}-${model}.json`);
    if (fs.existsSync(cache)) heard.set(key, JSON.parse(fs.readFileSync(cache, 'utf8')));
    else todo.push({ key, file, cache });
  }
  if (!todo.length) return { ok: true, heard };
  // align.py labels progress "align i/N · câu <n>": show the caller's key there, not a list position that
  // reads as another câu of the video.
  const label = (line) => line.replace(/câu (\d+)$/, (_, i) => `${todo[Number(i) - 1]?.key ?? i}`);
  const res = await runAlign({ model, items: todo.map((t, i) => ({ n: i + 1, wav: t.file })) }, { onLine: onLine && ((line) => onLine(label(line))) });
  if (!res.ok) return res;
  for (const item of res.result.items) {
    const job = todo[item.n - 1];
    if (!job || item.error) continue;
    fs.mkdirSync(path.dirname(job.cache), { recursive: true });
    fs.writeFileSync(job.cache, JSON.stringify(item));
    heard.set(job.key, item);
  }
  return { ok: true, heard };
}

// ── the checks every take of a câu goes through ──────────────────────────────
// One set of rules for the import table and for regenerating a câu: a take the table would flag is never
// the one a retake picks.

/** A câu whose transcript matches this little is almost certainly the wrong file. */
export const MATCH_BLOCK = 0.4;
export const MATCH_WARN = 0.65;
/** Measured speech this far off the 3 syllables/s estimate is worth a second look. */
export const SHORT = 0.45;
export const LONG = 2.2;
export const expectedSeconds = (text) => text.trim().split(/\s+/).filter(Boolean).length / 3;

/** 'short' | 'long' | null — how a take of `text` lasting `seconds` compares with the estimate. */
export function durationFlag(text, seconds) {
  const ratio = seconds / Math.max(0.5, expectedSeconds(text));
  return ratio < SHORT ? 'short' : ratio > LONG ? 'long' : null;
}

/**
 * What Whisper's words say about one take: wrong file ('error'), a partial match or something lost or
 * doubled ('warn'), or clean ('ok').
 */
export function judgeHeard(text, words) {
  const { matchRatio } = mapWords(text, words);
  const issues = matchRatio >= MATCH_BLOCK ? speechIssues(text, words) : [];
  const level = matchRatio < MATCH_BLOCK ? 'error' : matchRatio < MATCH_WARN || issues.length ? 'warn' : 'ok';
  return { matchRatio, issues, level };
}

// ── mapping Whisper's words onto the locked narration ────────────────────────

/**
 * Comparable form of a word: lowercase, no punctuation. Diacritics are kept — they carry meaning here.
 * NFC first: text pasted from a PDF can arrive decomposed, and stripping non-letters would then strip
 * the combining tone marks with it ("trí" → "tri").
 */
const norm = (w) => w.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Word starts in the cue text: [{ char, word }] with `char` the index of the word's first character. */
export function cueWords(text) {
  const out = [];
  const re = /\S+/gu;
  let m;
  while ((m = re.exec(text))) out.push({ char: m.index, word: m[0] });
  return out;
}

/** Longest common subsequence over normalised words → pairs of [cueIndex, heardIndex]. */
function lcsPairs(a, b) {
  const n = a.length;
  const m = b.length;
  // n and m are one sentence's worth of words (tens), so the full table is cheap.
  const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

/**
 * Map heard words ([word, startSeconds, endSeconds]) onto `text`.
 *
 *   offsetSeconds  how much of the source file the assembler cut from the front
 *   returns { words: [[charIndex, frame], …], matchRatio, heard }
 *
 * Words the transcript missed are interpolated between their matched neighbours, so `words` always
 * covers the whole sentence and stays monotonic — spokenAt() can index into it for any phrase.
 */
export function mapWords(text, heard, offsetSeconds = 0) {
  const cue = cueWords(text);
  if (!cue.length || !heard?.length) return { words: [], matchRatio: 0, heard: heard?.length ?? 0 };
  const pairs = lcsPairs(cue.map((c) => norm(c.word)), heard.map((h) => norm(h[0])));
  const matchRatio = +(pairs.length / cue.length).toFixed(3);
  if (!pairs.length) return { words: [], matchRatio: 0, heard: heard.length };

  const frameOf = (seconds) => Math.max(0, Math.round((seconds - offsetSeconds) * FPS));
  const at = new Array(cue.length).fill(null);
  for (const [ci, hi] of pairs) at[ci] = frameOf(heard[hi][1]);

  // Fill the gaps: before the first match, after the last, and evenly between two matches.
  const first = pairs[0][0];
  const last = pairs[pairs.length - 1][0];
  const lastEnd = frameOf(heard[pairs[pairs.length - 1][1]][2]);
  for (let i = first - 1; i >= 0; i--) at[i] = Math.max(0, at[i + 1] - 1);
  for (let i = first; i <= last; i++) {
    if (at[i] !== null) continue;
    let j = i;
    while (at[j] === null) j++;
    const span = j - (i - 1);
    for (let k = i; k < j; k++) at[k] = Math.round(at[i - 1] + ((at[j] - at[i - 1]) * (k - (i - 1))) / span);
  }
  for (let i = last + 1; i < cue.length; i++) {
    at[i] = Math.round(at[last] + ((lastEnd - at[last]) * (i - last)) / (cue.length - last));
  }
  // monotonic, so spokenAt() never walks backwards
  for (let i = 1; i < at.length; i++) if (at[i] < at[i - 1]) at[i] = at[i - 1];
  return { words: cue.map((c, i) => [c.char, at[i]]), matchRatio, heard: heard.length };
}

// ── what went missing or doubled inside one câu ──────────────────────────────
//
// matchRatio is one number for the whole câu, so it cannot tell "the last two words were never spoken"
// (0.8 on a 10-word câu, passes) from ten scattered mishearings, and a repeated word still scores 1.0.
// A local model fails in exactly those ways: OmniVoice fixes the length before it decodes, so a tight
// budget cuts the end of the câu or skips a run of words, and sampling now and then loops a word.
//
// Every finding is a "listen again", never a verdict: Whisper mishears Vietnamese on its own (tr/ch,
// d/gi/r, s/x, "ba" written as "3"), so both sides are folded over those merges first, and a gap that
// Whisper filled with *other* words is a mishearing, not a skip — only a gap it heard (almost) nothing in
// counts.

/** Single digits Whisper writes for a spoken number word. Longer numbers make a gap undecidable instead. */
const DIGIT_WORDS = { 0: 'không', 1: 'một', 2: 'hai', 3: 'ba', 4: 'bốn', 5: 'năm', 6: 'sáu', 7: 'bảy', 8: 'tám', 9: 'chín', 10: 'mười' };

/** norm() plus the onset merges Whisper makes in Vietnamese, applied to both sides alike. */
export function fold(word) {
  const w = norm(word);
  if (DIGIT_WORDS[w]) return DIGIT_WORDS[w];
  return w.replace(/^tr/u, 'ch').replace(/^gi(?=\p{L})/u, 'z').replace(/^[dr]/u, 'z').replace(/^s/u, 'x');
}

/** Digits and the unit signs Whisper writes in their place ("1 $", "50 %"). */
const NUMERIC = /[\p{N}$€£¥₫%‰]/u;

/** A missing run is only a skip when the audio holds (almost) nothing where those words should be. */
const skipped = (missing, heardInGap) => missing >= 3 && heardInGap <= Math.floor(missing / 3);

/**
 * Word alignment by edit distance (substitute, insert, delete: 1 each), traced back preferring the
 * diagonal → { pairs of equal keys, heard indices that are pure insertions }. Unlike the LCS in
 * mapWords, a misheard word is used up as a substitution instead of being skipped — with a word the câu
 * says twice ("gõ lệnh, gõ thêm"), LCS would pair the heard word with the wrong copy and leave an empty
 * gap that looks like a skip. (mapWords keeps LCS: its matchRatio is tuned for the wrong-file check.)
 */
function editAlign(a, b) {
  const n = a.length;
  const m = b.length;
  const d = Array.from({ length: n + 1 }, (_, i) => { const row = new Uint16Array(m + 1); row[0] = i; return row; });
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
  }
  const pairs = [];
  const inserted = new Set();
  let deleted = 0;
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const same = a[i - 1] === b[j - 1];
    if (d[i][j] === d[i - 1][j - 1] + (same ? 0 : 1)) {
      if (same) pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (d[i][j] === d[i - 1][j] + 1) { i--; deleted++; }
    else inserted.add(--j);
  }
  while (j > 0) inserted.add(--j);
  return { pairs: pairs.reverse(), inserted, deleted: deleted + i };
}

/**
 * Words the recording seems to have lost or doubled, for a câu whose file is the right one.
 *
 *   heard    Whisper's words, [word, startSeconds, endSeconds]
 *   returns  [{ code: 'truncation' | 'dropped' | 'repeat', words, start, end }] — seconds in the file;
 *            `end: null` means "to the end of the file"
 */
export function speechIssues(text, heard) {
  const cue = cueWords(text).map((c) => ({ word: c.word, key: fold(c.word) })).filter((c) => c.key);
  // A bare "$" or "%" folds to nothing but still stands for spoken words ("đô la", "phần trăm"): keep it
  // as a placeholder that matches nothing, so the gap it sits in does not look empty.
  const got = (heard || [])
    .map(([word, start, end]) => ({ word, start, end, key: fold(word) || (NUMERIC.test(word) ? '#' : '') }))
    .filter((h) => h.key);
  if (!cue.length || !got.length) return [];
  const { pairs, inserted, deleted } = editAlign(cue.map((c) => c.key), got.map((h) => h.key));
  if (!pairs.length) return [];

  const issues = [];
  const words = (from, to) => cue.slice(from, to).map((c) => c.word).join(' ').replace(/[.,;:!?…"“”]+$/u, '');
  // Whisper writes "20" for "hai mươi", "3,3" for "ba phẩy bảy", "1 $" for "một đô la" — a stretch
  // holding a number or a unit sign cannot be judged word by word.
  const hasNumber = (from, to) => got.slice(from, to).some((h) => NUMERIC.test(h.word));

  // Runs of missing câu words between two matches (and before the first one).
  let prevC = -1;
  let prevH = -1;
  for (const [c, h] of pairs) {
    const missing = c - prevC - 1;
    if (missing && skipped(missing, h - prevH - 1) && !hasNumber(prevH + 1, h)) {
      issues.push({ code: 'dropped', words: words(prevC + 1, c), start: prevH >= 0 ? got[prevH].end : 0, end: got[h].start });
    }
    prevC = c;
    prevH = h;
  }

  // The end of the câu. Nothing heard after the last match is the clearest sign of a cut ending.
  const tail = cue.length - 1 - prevC;
  const heardAfter = got.length - 1 - prevH;
  if (tail > 0 && (heardAfter === 0 || skipped(tail, heardAfter)) && !hasNumber(prevH + 1, got.length)) {
    issues.push({ code: 'truncation', words: words(prevC + 1, cue.length), start: got[prevH].end, end: null });
  }

  // A word or a short phrase (up to four words — a looped "các mô hình" is three) heard twice in a row,
  // where one copy is the câu's own words and the other is a pure insertion — heard in addition to the
  // câu, not in place of one of its words. "từ từ" in the text matches both copies; "chưa cho" heard as
  // "cho cho" is a misheard word, a substitution; a spelled-out acronym ("LLM" as "eo eo em" or
  // "L L M") matches nothing. All are left alone. A real loop also makes the recording longer than the
  // câu: a run of words each heard as its neighbour ("và ta ngữ" → "ta ngữ ta") aligns as one deletion
  // plus one insertion and adds nothing, so the heard words must outnumber the missing ones by the loop.
  const matched = new Set(pairs.map(([, h]) => h));
  const cueOf = new Map(pairs.map(([c, h]) => [h, c]));
  const surplus = inserted.size - deleted;
  // Quote the câu's own words for the copy that matched them — Whisper's spelling ("gpt" for "GPT-4o")
  // is not what the narrator was given, and the table underlines the quote inside the câu.
  const ownWords = (from, size) => {
    const first = cueOf.get(from), last = cueOf.get(from + size - 1);
    return first != null && last != null && last - first === size - 1 ? words(first, last + 1) : null;
  };
  const all = (from, size, set) => Array.from({ length: size }, (_, k) => set.has(from + k)).every(Boolean);
  for (let i = 0; i < got.length; i++) {
    for (const size of [1, 2, 3, 4]) {
      const second = got.slice(i + size, i + 2 * size);
      if (second.length < size || surplus < size) continue;
      const looped = (all(i, size, matched) && all(i + size, size, inserted)) || (all(i, size, inserted) && all(i + size, size, matched));
      if (!looped || hasNumber(i, i + 2 * size)) continue;
      if (got.slice(i, i + size).every((h, k) => h.key === second[k].key)) {
        const own = ownWords(all(i, size, matched) ? i : i + size, size);
        issues.push({ code: 'repeat', words: own ?? got.slice(i, i + size).map((h) => h.word).join(' '), start: got[i].start, end: second[size - 1].end });
        i += 2 * size - 1;
        break;
      }
    }
  }
  return issues.sort((a, b) => a.start - b.start);
}
