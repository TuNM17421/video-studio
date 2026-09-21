/**
 * Tìm ảnh qua API có sẵn giấy phép — Wikimedia Commons và Openverse — và quy kết quả về một kiểu chung
 * (`Candidate`) để phần còn lại (lọc giấy phép, xếp hạng, panel duyệt, dòng nguồn) không phải biết ảnh từ đâu.
 *
 * Nguyên tắc: tiêu đề, mô tả, tác giả, năm, giấy phép đều lấy **nguyên** từ metadata của nguồn (chỉ bỏ HTML).
 * Agent không được viết lại "ảnh này chụp gì" — ảnh lịch sử hay bị gán nhầm người, nhầm năm, và chữ của
 * trang nguồn là thứ duy nhất người dựng kiểm lại được.
 *
 * Candidate:
 *   { id, source, origin, title, description, creator, date, license, licenseVersion, licenseUrl,
 *     landingUrl, imageUrl, thumbUrl, width, height, mime, attributionRequired }
 *
 * Mọi hàm tìm trả `{ ok, candidates, error? }` và không ném: thiếu mạng hay API hết lượt thì nguồn đó rỗng,
 * lượt tìm vẫn chạy tiếp với nguồn còn lại.
 */
import { USER_AGENT } from './image-fetch.mjs';
import { normalizeLicense } from './image-license.mjs';

export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
export const OPENVERSE_API = 'https://api.openverse.org/v1/images/';
const TIMEOUT_MS = 20000;
/** Cỡ thumbnail để xem trước và để agent nhìn khi xếp hạng. */
export const THUMB_WIDTH = 640;
/** Video 1920×1080 — ảnh gốc lớn hơn thế thì tải bản thu nhỏ cỡ này, đủ nét mà nhẹ. */
export const RENDER_WIDTH = 1920;
/** Loại file trình duyệt vẽ được trong SVG <image>; TIFF/GIF/SVG/PDF bị bỏ. */
export const RENDERABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…' };

/** HTML của metadata → chữ trơn: bỏ phần ẩn (`display:none` — Commons giấu mã Wikidata trong đó), bỏ thẻ, giải mã entity. */
export function plainText(html) {
  if (html == null) return null;
  let s = String(html)
    .replace(/<(div|span)[^>]*display:\s*none[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > 500) s = `${s.slice(0, 499).trimEnd()}…`;
  return s || null;
}

/** Bỏ tham số theo dõi (`utm_*`) Commons gắn vào URL ảnh — URL gọn, và cùng ảnh thì cùng URL. */
export function cleanUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
    return u.href;
  } catch {
    return null;
  }
}

/** Lỗi không phải do câu hỏi: mạng chập chờn, máy chủ bận. 429 không tính — gọi lại chỉ tốn thêm lượt. */
const transient = (error) => !error?.status || error.status >= 500;

/** GET một JSON; lỗi tạm thời (mạng, 5xx) thì thử lại đúng một lần. */
async function getJson(url, fetchImpl, { retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
      if (res.status === 429) {
        const retry = res.headers.get('retry-after');
        throw Object.assign(new Error(`hết lượt gọi API (HTTP 429${retry ? `, thử lại sau ${retry} giây` : ''})`), { status: 429 });
      }
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      return await res.json();
    } catch (error) {
      if (attempt >= retries || !transient(error)) throw error;
    }
  }
}

const failure = (source, error) => ({
  ok: false,
  candidates: [],
  error: `${source}: ${error?.name === 'TimeoutError' ? `quá ${TIMEOUT_MS / 1000} giây không trả lời` : error?.cause?.code ?? error?.message ?? String(error)}`,
});

// ── Wikimedia Commons ────────────────────────────────────────────────────────────

const meta = (ext, key) => plainText(ext?.[key]?.value);

/** Một trang File: của Commons (API formatversion=2) → Candidate, hoặc null nếu không có imageinfo. */
export function commonsCandidate(page) {
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const ext = info.extmetadata ?? {};
  const lic = normalizeLicense(ext.License?.value || ext.LicenseShortName?.value);
  const fileTitle = String(page.title ?? '').replace(/^File:/, '');
  return {
    id: `commons:${page.title}`,
    source: 'commons',
    origin: 'wikimedia',
    title: meta(ext, 'ObjectName') ?? fileTitle.replace(/\.[a-z0-9]+$/i, ''),
    description: meta(ext, 'ImageDescription'),
    creator: meta(ext, 'Artist')?.replace(/\s*\(\s*(talk|contribs|category|user page)\s*\)/gi, '').trim() || null,
    date: meta(ext, 'DateTimeOriginal'),
    license: lic.code,
    licenseVersion: lic.version,
    licenseUrl: cleanUrl(ext.LicenseUrl?.value),
    landingUrl: info.descriptionurl ?? null,
    imageUrl: cleanUrl(info.url),
    thumbUrl: cleanUrl(info.thumburl ?? info.url),
    width: info.width ?? null,
    height: info.height ?? null,
    mime: info.mime ?? null,
    attributionRequired: ext.AttributionRequired?.value === 'false' ? false : lic.code !== 'pd' && lic.code !== 'cc0',
  };
}

/** Tìm ảnh bitmap trên Commons (namespace File). */
export async function searchCommons(query, { limit = 8, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: String(limit),
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(THUMB_WIDTH),
    iiextmetadatafilter: 'ObjectName|ImageDescription|Artist|DateTimeOriginal|License|LicenseShortName|LicenseUrl|AttributionRequired',
  });
  try {
    const data = await getJson(`${COMMONS_API}?${params}`, fetchImpl);
    const pages = [...(data?.query?.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return { ok: true, candidates: pages.map(commonsCandidate).filter(Boolean) };
  } catch (error) {
    return failure('Commons', error);
  }
}

/**
 * URL để tải ảnh dùng trong video: ảnh gốc rộng hơn RENDER_WIDTH thì xin Commons một bản thu nhỏ đúng cỡ
 * (ảnh gốc Commons có thể vài chục MB). Nguồn khác trả thẳng `imageUrl`.
 */
export async function renderUrl(candidate, { fetchImpl = fetch } = {}) {
  if (candidate.source !== 'commons' || !(candidate.width > RENDER_WIDTH)) return candidate.imageUrl;
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    titles: candidate.id.replace(/^commons:/, ''), prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(RENDER_WIDTH),
  });
  try {
    const data = await getJson(`${COMMONS_API}?${params}`, fetchImpl);
    return cleanUrl(data?.query?.pages?.[0]?.imageinfo?.[0]?.thumburl) ?? candidate.imageUrl;
  } catch {
    return candidate.imageUrl;
  }
}

// ── Openverse ────────────────────────────────────────────────────────────────────

const OV_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', tiff: 'image/tiff' };

/** Mime đoán từ `filetype` hoặc đuôi URL; null khi không biết (vẫn giữ — lúc tải sẽ nhận diện bằng byte). */
function openverseMime(r) {
  const t = String(r.filetype ?? '').toLowerCase() || /\.([a-z0-9]+)(?:$|\?)/i.exec(r.url ?? '')?.[1]?.toLowerCase();
  return OV_MIME[t] ?? null;
}

/** Một kết quả Openverse → Candidate. */
export function openverseCandidate(r) {
  if (!r?.id || !r.url) return null;
  const lic = normalizeLicense(r.license);
  return {
    id: `openverse:${r.id}`,
    source: 'openverse',
    origin: r.source ?? r.provider ?? null,
    title: plainText(r.title),
    description: null,
    creator: plainText(r.creator),
    date: null,
    license: lic.code,
    licenseVersion: r.license_version && r.license_version !== 'N/A' ? String(r.license_version) : lic.version,
    licenseUrl: r.license_url ?? null,
    landingUrl: r.foreign_landing_url ?? null,
    imageUrl: r.url,
    thumbUrl: r.thumbnail ?? r.url,
    width: r.width ?? null,
    height: r.height ?? null,
    mime: openverseMime(r),
    attributionRequired: lic.code !== 'pd' && lic.code !== 'cc0',
    mature: Boolean(r.mature),
  };
}

/**
 * Tìm trên Openverse, chỉ giấy phép dùng thương mại được. Ảnh ẩn danh bị giới hạn lượt (lúc viết: 20/phút,
 * 200/ngày) — hết lượt thì trả lỗi 429 rõ ràng. `OPENVERSE_TOKEN` trong môi trường (không commit) dùng khi đã
 * đăng ký client.
 */
export async function searchOpenverse(query, { limit = 8, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({ q: query, license_type: 'commercial', page_size: String(limit), mature: 'false' });
  try {
    const token = process.env.OPENVERSE_TOKEN;
    const impl = token ? (url, init) => fetchImpl(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } }) : fetchImpl;
    const data = await getJson(`${OPENVERSE_API}?${params}`, impl);
    return { ok: true, candidates: (data?.results ?? []).map(openverseCandidate).filter((c) => c && !c.mature) };
  } catch (error) {
    return failure('Openverse', error);
  }
}

export const SEARCHERS = { commons: searchCommons, openverse: searchOpenverse };

/** Khoá so trùng: cùng trang nguồn (Openverse cũng lập chỉ mục ảnh của Commons) hoặc cùng file ảnh. */
function dedupeKey(c) {
  const landing = c.landingUrl ? decodeURIComponent(c.landingUrl).replace(/^https?:\/\//, '').replace(/_/g, ' ').toLowerCase() : null;
  return landing ?? c.imageUrl;
}

/**
 * Gộp nhiều danh sách (mỗi cặp từ khoá × nguồn một danh sách), bỏ trùng. Lấy lần lượt từng phần tử của mỗi
 * danh sách (round-robin) để khi cắt bớt, kết quả đầu của nguồn/từ khoá sau không bị đẩy hết ra ngoài.
 */
export function mergeCandidates(lists) {
  const seen = new Set();
  const out = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const c = list[i];
      if (!c) continue;
      const key = dedupeKey(c);
      if (seen.has(key) || seen.has(c.id)) continue;
      seen.add(key);
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}
