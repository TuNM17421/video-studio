/**
 * Giấy phép ảnh và chính sách dùng ảnh (images.policy.json ở gốc repo).
 *
 * Mỗi nguồn ảnh ghi giấy phép một kiểu — Commons có `License` ("cc-by-sa-4.0") và `LicenseShortName`
 * ("CC BY-SA 4.0"), Openverse có mã ngắn ("by-sa", "pdm") — nên mọi thứ được quy về một mã chung trước khi
 * so với chính sách. Khoá học là hoạt động thương mại: NC, ND, fair use và giấy phép không đọc ra được đều
 * bị loại. Chính sách nằm trong một file JSON được commit để đổi mà không sửa code.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const POLICY_FILE = path.join(REPO, 'images.policy.json');

/** Chính sách mặc định — dùng khi images.policy.json thiếu hoặc thiếu trường. */
export const DEFAULT_POLICY = Object.freeze({
  allow: ['pd', 'cc0', 'cc-by', 'cc-by-sa'],
  shareAlike: ['cc-by-sa'],
  minLongEdge: 800,
  maxSlots: 8,
  candidatesPerSlot: 12,
  sources: ['commons', 'openverse', 'research'],
});

export function readPolicy(file = POLICY_FILE) {
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  const policy = { ...DEFAULT_POLICY };
  for (const key of Object.keys(DEFAULT_POLICY)) {
    const v = raw[key];
    if (Array.isArray(DEFAULT_POLICY[key]) ? Array.isArray(v) : Number.isFinite(v)) policy[key] = v;
  }
  return policy;
}

/**
 * Quy một chuỗi giấy phép bất kỳ về `{ code, version }`.
 * code: pd · cc0 · cc-by[-nc][-nd][-sa] · other (có tên nhưng không phải CC, vd GFDL, sampling+) · unknown.
 */
export function normalizeLicense(raw) {
  const s = String(raw ?? '').trim().toLowerCase().replace(/_/g, '-');
  const version = /(\d\.\d)/.exec(s)?.[1] ?? null;
  if (!s) return { code: 'unknown', version: null };
  if (/fair[- ]?use|non-?free/.test(s)) return { code: 'other', version: null };
  if (/sampling/.test(s)) return { code: 'other', version: null };
  if (/cc0|cc-zero|cc zero/.test(s)) return { code: 'cc0', version: null };
  if (/^pdm$|^pd($|[- ])|public domain|^pd-/.test(s)) return { code: 'pd', version: null };
  const isBy = /^(cc[- ]?)?by($|[- ])/.test(s) || /creative commons attribution/.test(s);
  // Có tên mà không phải CC/PD (GFDL, "attribution", "copyrighted"…) — biết là gì nhưng chính sách không nhận.
  if (!isBy) return { code: 'other', version: null };
  const nc = /(^|[- ])nc([- ]|$)|non-?commercial/.test(s);
  const nd = /(^|[- ])nd([- ]|$)|no-?deriv/.test(s);
  const sa = /(^|[- ])sa([- ]|$)|share-?alike/.test(s);
  return { code: `cc-by${nc ? '-nc' : ''}${nd ? '-nd' : ''}${sa ? '-sa' : ''}`, version };
}

/** Nhãn ngắn để in trên dòng nguồn: "Public domain", "CC0", "CC BY-SA 4.0". */
export function licenseLabel(code, version) {
  if (code === 'pd') return 'Public domain';
  if (code === 'cc0') return 'CC0';
  if (code?.startsWith('cc-by')) return `CC ${code.slice(3).toUpperCase()}${version ? ` ${version}` : ''}`;
  return 'Giấy phép không rõ';
}

/**
 * Ảnh này có được dùng không. Trả `{ ok, reason, shareAlike }` — `reason` là câu tiếng Việt để ghi vào danh
 * sách ảnh bị loại, cho người dựng thấy vì sao một ảnh quen mặt không có trong đề xuất.
 */
export function licenseAllowed(code, policy = DEFAULT_POLICY) {
  const shareAlike = policy.shareAlike.includes(code);
  if (policy.allow.includes(code)) return { ok: true, reason: null, shareAlike };
  if (code === 'unknown') return { ok: false, reason: 'không đọc được giấy phép', shareAlike };
  if (/-nc/.test(code)) return { ok: false, reason: 'giấy phép phi thương mại (NC)', shareAlike };
  if (/-nd/.test(code)) return { ok: false, reason: 'giấy phép cấm chỉnh sửa (ND)', shareAlike };
  return { ok: false, reason: `giấy phép ${code} không nằm trong images.policy.json`, shareAlike };
}

const SOURCE_LABEL = { commons: 'Wikimedia Commons', openverse: 'Openverse' };

/** Tên nơi đăng ảnh để ghi công: Openverse thì ghi nơi gốc (Flickr…), không ghi bộ tìm kiếm. */
export function sourceLabel(candidate) {
  // Ảnh lấy từ trang research: nơi đăng là chính trang đó (tên báo / tên miền).
  if (candidate.source === 'research') return candidate.origin ?? 'trang nguồn';
  if (candidate.source === 'openverse' && candidate.origin) {
    const o = String(candidate.origin);
    return o === 'wikimedia' ? 'Wikimedia Commons' : o.charAt(0).toUpperCase() + o.slice(1);
  }
  return SOURCE_LABEL[candidate.source] ?? candidate.source;
}

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * Dòng nguồn in dưới ảnh trong video (PhotoCard `credit`): "Ảnh: <tác giả> · <giấy phép> · <nơi đăng>".
 * Chữ 14 px nên phải ngắn; bản ghi công đầy đủ (TASL) nằm ở `attributionText`.
 */
export function creditLine(candidate) {
  // Ảnh từ trang research: không biết tác giả ảnh, chỉ biết trang — "Ảnh: en.wikipedia.org · CC BY-SA".
  if (candidate.source === 'research') return `Ảnh: ${sourceLabel(candidate)} · ${licenseLabel(candidate.license, candidate.licenseVersion)}`;
  const who = candidate.creator ? clip(candidate.creator, 48) : clip(candidate.title ?? 'không rõ tác giả', 48);
  return `Ảnh: ${who} · ${licenseLabel(candidate.license, candidate.licenseVersion)} · ${sourceLabel(candidate)}`;
}

/** Ghi công đầy đủ theo TASL (Title – Author – Source – License), để lưu cùng ảnh. */
export function attributionText(candidate) {
  const title = candidate.title ? `“${candidate.title}”` : 'Ảnh';
  const by = candidate.creator ? ` — ${candidate.creator}` : '';
  const lic = licenseLabel(candidate.license, candidate.licenseVersion);
  return `${title}${by}, ${lic}${candidate.licenseUrl ? ` (${candidate.licenseUrl})` : ''}, ${sourceLabel(candidate)}: ${candidate.landingUrl}`;
}
