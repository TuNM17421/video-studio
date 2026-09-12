/**
 * Word timestamps for imported narration: run tools/voice-align/align.py in the repo's voice venv, then
 * map Whisper's words onto the locked cue text.
 *
 * Whisper transcribes what it hears; cues.js holds what was written. The two are close but never equal
 * (punctuation, numbers read as words, the odd misheard syllable), so `mapWords` aligns the two word
 * sequences and reports how much of the cue it actually found. That single number does double duty:
 * it decides how much of spokenAt() rests on real timings, and it is what catches an audio folder whose
 * files are off by one — a file holding a different câu matches almost nothing.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS } from './voice-audio.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const VENV = path.join(ROOT, 'voice/.venv');
export const ALIGN_PY = path.join(ROOT, 'tools/voice-align/align.py');
export const MODEL_CACHE = path.join(ROOT, 'voice/cache/whisper');
export const SETUP_HINT = 'Chưa cài môi trường nhận diện giọng. Chạy: npm run setup:voice';

/** The venv interpreter, or null when `npm run setup:voice` has not been run on this machine. */
export function venvPython() {
  for (const p of [path.join(VENV, 'bin/python'), path.join(VENV, 'Scripts/python.exe')]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Run align.py with `job` on stdin. Resolves { ok, result | error }; never throws for a bad exit. */
export function runAlign(job, { onLine, check = false } = {}) {
  const python = venvPython();
  if (!python) return Promise.resolve({ ok: false, error: SETUP_HINT });
  return new Promise((resolve) => {
    const child = spawn(python, [ALIGN_PY, ...(check ? ['--check'] : [])], { cwd: ROOT });
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
    child.stdin.end(JSON.stringify({ cacheDir: MODEL_CACHE, ...job }));
  });
}

// ── mapping Whisper's words onto the locked narration ────────────────────────

/** Comparable form of a word: lowercase, no punctuation. Diacritics are kept — they carry meaning here. */
const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

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
