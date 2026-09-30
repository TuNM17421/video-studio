/**
 * Hàm thuần (pure functions) dùng chung giữa sfx-mix.mjs và test.
 * Tách ra để test fixture không cần file video thật.
 */

export const FPS = 30;
export const LEAD_FRAMES = 6;

/**
 * Độ lợi đưa một tiếng về ĐÍCH của lớp nó.
 *   · One-shot chuẩn theo ĐỈNH (`peakTargetDb` + `entry.peak`)
 *   · Bed chuẩn theo RMS   (`rmsTargetDb` + `entry.rmsDb`)
 * Trả 0 khi thiếu số đo.
 *
 * @param {{ peak?: number, rmsDb?: number }} entry  - mục trong sfx.json
 * @param {{ peakTargetDb?: number, rmsTargetDb?: number }} layer - mục trong sfx.json._layers
 * @returns {number}
 */
export function toTarget(entry, layer) {
  if (Number.isFinite(layer.peakTargetDb) && Number.isFinite(entry.peak)) return layer.peakTargetDb - entry.peak;
  if (Number.isFinite(layer.rmsTargetDb) && Number.isFinite(entry.rmsDb)) return layer.rmsTargetDb - entry.rmsDb;
  return 0;
}

/**
 * Tính startFrame của một tiếng — frame mà ffmpeg bắt đầu phát file.
 *
 * Chế độ cổ điển: targetFrame đã trừ LEAD_FRAMES sẵn → startFrame = targetFrame (không trừ nữa).
 * Chế độ phân lớp: targetFrame là mốc ĐÍCH (đỉnh phải rơi đúng đây) → startFrame = targetFrame - peakAtMs_frames.
 * Hai chế độ KHÔNG được trừ LEAD_FRAMES hai lần — đó là lỗi "ding đỉnh ở frame 9, lời ở frame 15".
 *
 * @param {number} targetFrame  - mốc đích (classic: đã trừ LEAD_FRAMES; layered: chưa trừ gì)
 * @param {number} peakAtMs     - đỉnh file nằm ở ms nào (từ sfx.json)
 * @param {boolean} layered     - true = chế độ phân lớp
 * @param {number} [fps=FPS]
 * @returns {number}
 */
export function computeStartFrame(targetFrame, peakAtMs, layered, fps = FPS) {
  if (!layered) return Math.max(0, targetFrame); // classic: đã căn trước ở vòng lặp cues.js
  return Math.max(0, targetFrame - Math.round(((peakAtMs ?? 0) / 1000) * fps));
}

/**
 * Xây key tra cứu cho set `overridden` — dùng để đè beat storyboard lên sfx cues.js.
 * Fix: khi `cueN` là undefined (beat khai anchor mà không khai số cue), key cũ là `undefined\0anchor`
 * → không khớp được với `${t.n}\0${word}` → hai accent phát cùng lúc.
 * Hàm này luôn nhận `cueN` đã giải xong; nếu vẫn null thì key = null (không thêm vào set).
 *
 * @param {number|null} cueN
 * @param {string} anchor
 * @returns {string|null}
 */
export function overrideKey(cueN, anchor) {
  if (cueN == null) return null;
  return `${cueN}\u0000${anchor}`;
}
