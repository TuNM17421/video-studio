/**
 * Khoá wording của một video — ngăn sinh giọng cho lời chưa duyệt.
 *
 * File này là STUB tối giản cho nhánh feat/sfx-audio-pipeline.
 * Phiên bản đầy đủ (kèm CLI script-lock.mjs) sẽ vào theo feat/script-quality-gates (#48).
 *
 * Lock format (projects/<id>/script.lock.json):
 *   { "at": "<ISO timestamp>", "cues": <count>, "texts": { "<n>": "<sha256-7>" } }
 *
 * `texts` map dùng SHA-256 7 ký tự đầu của từng cue.text để phát hiện wording drift.
 */
import crypto from 'node:crypto';

/** Băm tóm tắt của một đoạn văn bản (7 ký tự hex đầu SHA-256). */
export function hashText(text) {
  return crypto.createHash('sha256').update(String(text ?? '')).digest('hex').slice(0, 7);
}

/**
 * So `lock` (đọc từ script.lock.json) với `cues` (mảng CUES từ cues.js).
 *
 * @param {object} lock    - nội dung script.lock.json
 * @param {Array}  cues    - mảng cue object (mỗi cue có .n và .text)
 * @returns {{ changed: number[], added: number[], removed: number[] }}
 *   số thứ tự câu (n) của các thay đổi.
 */
export function compareLock(lock, cues) {
  const locked = lock?.texts ?? {};
  const current = {};
  for (const c of cues ?? []) {
    if (c.text != null) current[String(c.n)] = hashText(c.text);
  }

  const changed = [];
  const added = [];
  const removed = [];

  for (const [n, hash] of Object.entries(current)) {
    if (!(n in locked)) { added.push(Number(n)); continue; }
    if (locked[n] !== hash) changed.push(Number(n));
  }
  for (const n of Object.keys(locked)) {
    if (!(n in current)) removed.push(Number(n));
  }

  return { changed, added, removed };
}

/**
 * Dựng nội dung script.lock.json từ `cues` hiện tại.
 *
 * @param {Array} cues - mảng CUES từ cues.js
 * @returns {object}   - object sẵn để JSON.stringify ghi ra file
 */
export function buildLock(cues) {
  const texts = {};
  for (const c of cues ?? []) {
    if (c.text != null) texts[String(c.n)] = hashText(c.text);
  }
  return {
    at: new Date().toISOString(),
    cues: (cues ?? []).filter((c) => c.text != null).length,
    texts,
  };
}
