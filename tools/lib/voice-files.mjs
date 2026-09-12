/**
 * The naming convention for narration recorded one câu at a time: câu 1 is `01.wav`, câu 2 `02.wav`,
 * and so on. Two tools have to agree on it — tools/voice-export.mjs writes the numbers into the reading
 * script and the batch JSONL, tools/voice-import.mjs reads them back off a folder — so both get the rule
 * from here rather than each keeping a copy that could drift.
 */
import path from 'node:path';

/** Formats a local generator might hand back; everything is decoded to the master's PCM on import. */
export const AUDIO_EXT = ['.wav', '.mp3', '.m4a', '.mp4', '.aac', '.flac', '.ogg', '.opus', '.webm'];

/** Two digits even for a short video, so a folder listing sorts the way the câu are numbered. */
const MIN_PAD = 2;

export const isAudioFile = (name) => !name.startsWith('.') && AUDIO_EXT.includes(path.extname(name).toLowerCase());

/** `key(n)` → the file name stem câu n should carry, padded to fit the video's highest câu number. */
export function cueKey(cues) {
  const pad = Math.max(MIN_PAD, String(Math.max(...cues.map((c) => c.n))).length);
  return (n) => String(n).padStart(pad, '0');
}

/**
 * Read a câu number off a file name. Deliberately lenient: the first run of digits wins, so `01.wav`,
 * `1.wav`, `cau-01.wav` and the `sample_001.wav` a batch generator writes all point at câu 1. A member
 * renaming files by hand should not lose a recording to a strict pattern — the import report shows the
 * mapping instead, which is the real safeguard.
 */
export function cueNumber(name) {
  const digits = path.basename(name, path.extname(name)).match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

/**
 * Assign each audio file to a câu.
 *
 *   names  file names in the folder (unfiltered; non-audio is ignored)
 *   cues   [{ n, … }] from cues.js
 *   key    from cueKey(cues)
 *
 * Returns { byCue, extra, clashes }. When two files claim the same câu (07.wav beside 07-ban-hai.wav)
 * the one named exactly as the convention asks wins, whatever the alphabet says, and the other is
 * reported rather than silently dropped.
 */
export function matchAudioFolder(names, cues, key) {
  const byCue = new Map();
  const extra = [];
  const clashes = [];
  const candidates = names
    .filter(isAudioFile)
    .map((name) => {
      const stem = path.basename(name, path.extname(name));
      const n = cueNumber(name);
      return { name, n, exact: n !== null && (stem === key(n) || stem === String(n)) };
    })
    .sort((a, b) => Number(b.exact) - Number(a.exact) || a.name.localeCompare(b.name));
  for (const { name, n } of candidates) {
    const cue = n === null ? null : cues.find((c) => c.n === n);
    if (!cue) { extra.push({ file: name, reason: n === null ? 'tên không có số câu' : `không có câu ${n}` }); continue; }
    if (byCue.has(cue.n)) { clashes.push({ file: name, n: cue.n, kept: byCue.get(cue.n) }); continue; }
    byCue.set(cue.n, name);
  }
  return { byCue, extra, clashes };
}
