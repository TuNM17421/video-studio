/**
 * Bàn giao giữa lane là một FILE, không phải một lời nhắn.
 *
 * ── Vì sao (retro d05-v06 · F3 — friction đắt thứ ba) ─────────────────────────────────────────
 * Lượt dựng vừa rồi: lane VOICE ghi đè `cues.js` trong lúc lane cảnh đang build → build vỡ giữa
 * chừng; owner lấy "có mục TRACE mới" làm dấu hiệu lane kia đã xong, rồi lại mở thêm một vòng.
 * Vòng sau lane tự dựng `.studio/handoff.json` bằng tay và mọi thứ chạy trơn — nhưng **chưa tool
 * nào đọc/ghi file đó**, nên khuôn của nó là thoả thuận miệng giữa hai lane.
 *
 * Module này biến nó thành hợp đồng có code: `get` · `set` · `wait`. Khoá lồng nhau viết bằng dấu
 * chấm (`voice.state`, `audition.done`) để lane chờ đúng thứ nó cần, không chờ cả khối.
 *
 * KHÔNG có khoá ghi (file lock) ở đây: một repo — một writer là luật của harness, `handoff.json`
 * chỉ để BIẾT lane kia xong chưa. Chống ghi đè đồng thời là việc của điều phối, không phải của file.
 */
import fs from 'node:fs';
import path from 'node:path';

export const HANDOFF_REL = (videoId) => path.join('projects', videoId, '.studio', 'handoff.json');

export function handoffPath(videoId, repoRoot) {
  return path.join(repoRoot, HANDOFF_REL(videoId));
}

export function readHandoff(videoId, repoRoot) {
  const file = handoffPath(videoId, repoRoot);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

/** `getPath({a:{b:1}}, 'a.b')` → 1. Khoá không có → `undefined`, không ném. */
export function getPath(obj, dotted) {
  return String(dotted).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Đặt giá trị theo khoá lồng, tạo nhánh trung gian. Trả object MỚI, không sửa tại chỗ. */
export function setPath(obj, dotted, value) {
  const keys = String(dotted).split('.');
  const out = { ...(obj ?? {}) };
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = typeof cur[k] === 'object' && cur[k] !== null && !Array.isArray(cur[k]) ? { ...cur[k] } : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return out;
}

/**
 * Đọc giá trị người dùng gõ ở CLI về đúng kiểu. `true`/`false`/số/JSON được nhận đúng kiểu, còn
 * lại là chuỗi — nếu không thì `--value true` sẽ thành chuỗi `"true"` và mọi phép chờ đều trượt.
 */
export function coerce(raw) {
  if (raw === undefined) return undefined;
  const s = String(raw);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^[[{]/.test(s)) { try { return JSON.parse(s); } catch { return s; } }
  return s;
}

/**
 * Điều kiện chờ đã đạt chưa. `expect === undefined` nghĩa là "chỉ cần khoá TỒN TẠI và không phải
 * `null`/`false`" — đúng ngữ nghĩa mà lane muốn khi hỏi `voice.state`.
 */
export function satisfied(value, expect) {
  if (expect === undefined) return value !== undefined && value !== null && value !== false;
  return JSON.stringify(value) === JSON.stringify(expect);
}
