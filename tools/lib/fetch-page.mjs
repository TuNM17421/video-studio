/**
 * Tải một trang web gốc và bóc chữ, không qua model nào — dùng chung cho `tools/page.mjs` (agent đọc
 * trang) và `tools/research-verify.mjs` (soát trích đoạn với trang thật).
 *
 * Ngoài chữ, lấy luôn ba thứ người soát cần: tiêu đề, nơi xuất bản và ngày đăng. Ngày đọc từ thẻ meta và
 * JSON-LD mà trang tự khai; trang không khai thì để null — đoán ngày là đúng thứ phép soát độ mới phải
 * tránh.
 */
import { execFile } from 'node:child_process';
import { checkHost, isInternalHost } from './net-guard.mjs';
import { asciiLower, decodeEntities, pageText } from './page-text.mjs';
import { pdfTextAsync } from './pdf-text.mjs';

export const TIMEOUT_MS = 20000;
export const MAX_BYTES = 8 * 1024 * 1024;
/** Dưới ngưỡng này thì trang gần như rỗng — thường là trang dựng bằng JavaScript, chữ thật chưa có trong HTML. */
export const MIN_TEXT = 400;
export const MAX_REDIRECTS = 5;

// Chặn địa chỉ nội bộ nằm ở net-guard.mjs (dùng chung với image-fetch); xuất lại cho người gọi cũ.
export { isInternalHost };

/**
 * Ngôn ngữ phải nói rõ: không có Accept-Language thì trang tài liệu nhiều thứ tiếng tự chọn theo nơi đặt
 * máy — tài liệu Gemini từng trả về bản tiếng Hindi, và mọi trích đoạn tiếng Anh thành "không khớp".
 * User-agent chỉ được có ký tự ASCII (header là ByteString).
 */
export const HEADERS = {
  'user-agent': 'Mozilla/5.0 (VideoStudio research; quote check)',
  accept: 'text/html,text/plain;q=0.9,*/*;q=0.5',
  'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
};

/** URL dùng làm khoá: bỏ phần `#…` — cùng một trang, khác chỗ cuộn. */
export function urlKey(url) {
  try {
    const u = new URL(String(url));
    u.hash = '';
    return u.toString();
  } catch {
    return String(url ?? '').trim();
  }
}

/** Ngày dạng bất kỳ trang tự khai → `YYYY-MM-DD`; không đọc được thì null. */
export function isoDay(value) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  const direct = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  // Chuỗi không theo ISO ("March 2, 2026") được Date.parse hiểu theo giờ máy — đọc lại theo giờ máy, đổi
  // sang UTC sẽ lùi một ngày ở múi giờ dương.
  const d = new Date(t);
  const year = d.getFullYear();
  if (year < 1990 || year > 2100) return null;
  return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mọi thẻ `<meta>` thành cặp (tên, nội dung); tên lấy từ property, name hoặc itemprop. */
function metaTags(html) {
  const out = [];
  for (const [tag] of String(html).matchAll(/<meta\b[^<>]*>/gi)) {
    const attr = (name) => {
      const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
      return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? '').trim() : null;
    };
    const key = (attr('property') ?? attr('name') ?? attr('itemprop') ?? '').toLowerCase();
    const content = attr('content');
    if (key && content) out.push([key, content]);
  }
  return out;
}

/** Mọi đối tượng trong các khối JSON-LD của trang, kể cả nằm trong `@graph` hay mảng. */
function jsonLd(html) {
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    out.push(node);
    if (node['@graph']) walk(node['@graph']);
  };
  // Quét bằng indexOf: regex lười `[\s\S]*?<\/script>` bậc hai trên trang có nhiều thẻ script không đóng.
  const src = String(html);
  const lower = asciiLower(src);
  for (let at = lower.indexOf('<script'); at !== -1;) {
    const gt = lower.indexOf('>', at);
    if (gt === -1) break;
    // Thẻ mở không lồng nhau: thẻ script kế tiếp nằm sau '>' này — tìm từ đó chứ không từ at+7, không thì
    // hàng vạn "<script " chung một '>' ở cuối trang là bậc hai.
    let next = gt;
    if (/type\s*=\s*["']application\/ld\+json["']/.test(lower.slice(at, Math.min(gt, at + 2000)))) {
      const close = lower.indexOf('</script', gt);
      if (close === -1) break;
      try { walk(JSON.parse(src.slice(gt + 1, close).trim())); } catch {}
      next = close;
    }
    at = lower.indexOf('<script', next);
  }
  return out;
}

/** Nội dung của thẻ đầu tiên `open…>…close` — tìm bằng indexOf, không regex lười. */
function between(html, open, close) {
  const lower = asciiLower(html);
  const at = lower.indexOf(open);
  if (at === -1) return null;
  const gt = lower.indexOf('>', at);
  const end = gt === -1 ? -1 : lower.indexOf(close, gt);
  return end === -1 ? null : html.slice(gt + 1, end);
}

const PUBLISHED_META = ['article:published_time', 'og:published_time', 'datepublished', 'citation_publication_date', 'citation_date', 'dc.date', 'dc.date.issued', 'dcterms.created', 'date', 'pubdate', 'publish-date', 'publication_date', 'sailthru.date'];
const MODIFIED_META = ['article:modified_time', 'og:updated_time', 'datemodified', 'dcterms.modified', 'last-modified'];
const PUBLISHER_META = ['og:site_name', 'application-name', 'citation_publisher', 'dc.publisher', 'publisher'];

/**
 * Tiêu đề, nơi xuất bản, ngày đăng và ngày sửa của một trang — chỉ từ những gì trang tự khai.
 * Thứ tự ưu tiên: thẻ meta, rồi JSON-LD, rồi thẻ `<time datetime>` đầu tiên (chỉ cho ngày đăng).
 */
export function pageMeta(html) {
  const metas = metaTags(html);
  const first = (keys) => {
    for (const k of keys) {
      const hit = metas.find(([name]) => name === k);
      if (hit) return hit[1];
    }
    return null;
  };
  const ld = jsonLd(html);
  const ldValue = (field) => {
    for (const node of ld) {
      const v = node[field];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (v && typeof v === 'object' && typeof v.name === 'string') return v.name.trim();
    }
    return null;
  };
  const titleTag = between(String(html), '<title', '</title>');
  const title = first(['og:title', 'twitter:title', 'citation_title']) ?? ldValue('headline') ?? (titleTag ? decodeEntities(titleTag).replace(/\s+/g, ' ').trim() : null);
  const timeTag = /<time\b[^<>]*\bdatetime\s*=\s*["']([^"'<>]+)["']/i.exec(String(html))?.[1];
  const published = isoDay(first(PUBLISHED_META)) ?? isoDay(ldValue('datePublished')) ?? isoDay(ldValue('dateCreated')) ?? isoDay(timeTag);
  const modified = isoDay(first(MODIFIED_META)) ?? isoDay(ldValue('dateModified'));
  const publisher = first(PUBLISHER_META) ?? ldValue('publisher');
  return { title: title || null, publisher: publisher || null, published, modified, image: pageImage(metas, ld) };
}

const IMAGE_META = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'];

/**
 * Ảnh đại diện trang tự khai (og:image, twitter:image, JSON-LD `image`) — chưa ghép với URL trang, có thể là
 * đường dẫn tương đối. Bước đề xuất ảnh dùng nó làm ứng viên phụ từ đúng những trang research đã đọc.
 */
function pageImage(metas, ld) {
  for (const k of IMAGE_META) {
    const hit = metas.find(([name]) => name === k);
    if (hit?.[1]) return hit[1];
  }
  for (const node of ld) {
    const v = Array.isArray(node.image) ? node.image[0] : node.image;
    const url = typeof v === 'string' ? v : v && typeof v === 'object' ? v.url ?? v.contentUrl : null;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  return null;
}

/**
 * Tải một URL. Không bao giờ ném lỗi: trang hỏng là một kết quả (`ok: false` kèm `error`), vì người gọi
 * cần ghi lại lý do chứ không phải dừng cả lượt.
 *
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, lookup?: Function }} [opts]   `lookup`: phân giải DNS (thay được trong test)
 */
export async function fetchPage(url, { fetchImpl = fetch, lookup } = {}) {
  const base = { url: String(url ?? ''), fetchedAt: new Date().toISOString() };
  if (!/^https?:\/\//i.test(base.url)) return { ...base, ok: false, error: 'không phải URL http(s)' };
  if (isInternalHost(base.url)) return { ...base, ok: false, error: 'địa chỉ nội bộ — không đọc' };
  const first = await fetchOnce(base, fetchImpl, lookup);
  // Trang tin lớn (Yahoo…) gửi header vượt giới hạn 16 KB mặc định của Node; giới hạn đó chỉ đổi được lúc
  // khởi động tiến trình, nên tải lại trong một tiến trình con có giới hạn lớn hơn.
  if (!first.ok && /HEADERS_OVERFLOW/.test(first.error ?? '') && fetchImpl === fetch) return fetchInChild(base);
  return first;
}

/** Tải lại trong `node --max-http-header-size=…`: tiến trình con in kết quả `fetchOnce` dạng JSON. */
function fetchInChild(base) {
  const script = `import(${JSON.stringify(new URL(import.meta.url).href)}).then(async (m) => process.stdout.write(JSON.stringify(await m.fetchPageDirect(${JSON.stringify(base.url)}))))`;
  return new Promise((resolve) => {
    execFile(process.execPath, ['--max-http-header-size=131072', '-e', script], { maxBuffer: MAX_BYTES * 2, timeout: TIMEOUT_MS + 5000 }, (error, stdout) => {
      try { resolve(JSON.parse(stdout)); } catch { resolve({ ...base, ok: false, error: `không tải được: ${error?.message ?? 'header quá lớn'}` }); }
    });
  });
}

/** Đọc thân trả về, dừng ngay khi vượt MAX_BYTES — không tải hết một file vài trăm MB rồi mới biết là quá lớn. */
async function readCapped(res) {
  if (!res.body) return Buffer.from(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Lỗi có thể hết khi thử lại: quá thời gian, mạng chập chờn, máy chủ bận (408/425/429/5xx). PDF, trang không
 * phải HTML, trang rỗng thì thử lại cũng vậy — chỉ những cái đó mới được nhớ suốt lượt.
 */
export function isTransient(meta) {
  if (!meta || meta.ok) return false;
  return /^HTTP (408|425|429|5\d\d)$/.test(meta.error ?? '') || /^không tải được/.test(meta.error ?? '');
}

/** Một lần tải, không có đường dự phòng — tiến trình con dùng hàm này. */
export const fetchPageDirect = (url) => fetchOnce({ url: String(url), fetchedAt: new Date().toISOString() }, fetch);

/**
 * Gọi URL, đi theo chuyển hướng **bằng tay**: mỗi bước được kiểm (net-guard) trước khi gửi yêu cầu. Để fetch tự
 * đi theo thì yêu cầu tới một địa chỉ nội bộ đã đi rồi mới tới lúc kiểm URL cuối.
 */
async function follow(base, fetchImpl, lookup) {
  let current = base.url;
  for (let hop = 0; ; hop++) {
    const bad = await checkHost(current, lookup ? { lookup } : {});
    if (bad?.kind === 'internal') return { error: `${hop ? 'chuyển hướng về ' : ''}${bad.message} — không đọc`, url: current };
    // Tên miền không phân giải được là lỗi mạng như mọi lỗi tải khác — isTransient nhận ra nó để thử lại.
    if (bad) return { error: bad.kind === 'dns' ? `không tải được: ${bad.message}` : bad.message, url: current };
    const res = await fetchImpl(current, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: HEADERS });
    const next = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!next) return { res, url: current };
    if (hop >= MAX_REDIRECTS) return { error: `quá ${MAX_REDIRECTS} lần chuyển hướng`, url: current };
    current = new URL(next, current).href;
  }
}

async function fetchOnce(base, fetchImpl, lookup) {
  try {
    const hop = await follow(base, fetchImpl, lookup);
    if (!hop.res) return { ...base, finalUrl: hop.url, ok: false, error: hop.error };
    const { res } = hop;
    const type = res.headers.get('content-type') ?? '';
    const info = { ...base, status: res.status, finalUrl: hop.url, type };
    if (!res.ok) return { ...info, ok: false, error: `HTTP ${res.status}` };
    const isPdf = /pdf/i.test(type);
    if (!isPdf && !/html|text\/plain|xml/i.test(type)) return { ...info, ok: false, error: `loại nội dung ${type || 'không rõ'}` };
    const buf = await readCapped(res);
    if (!buf) return { ...info, ok: false, error: `trang quá lớn (trên ${MAX_BYTES / 1024 / 1024} MB)` };
    if (isPdf) {
      // Nguồn gốc hay là PDF (system card, báo cáo, bài nghiên cứu). Đọc được thì finding dùng thẳng nó, thay
      // vì phải quay sang một trang thuật lại — xem `tools/lib/pdf-text.mjs`.
      const pdf = await pdfTextAsync(buf);
      if (!pdf) return { ...info, ok: false, error: 'PDF không có chữ đọc được (bản quét ảnh hoặc mã hoá glyph)' };
      return { ...info, title: null, publisher: null, published: null, modified: null, text: pdf, chars: pdf.length, ok: true };
    }
    const raw = buf.toString('utf8');
    const html = /html|xml/i.test(type);
    const text = html ? pageText(raw) : raw;
    const meta = html ? pageMeta(raw) : { title: null, publisher: null, published: null, modified: null, image: null };
    // og:image hay là đường dẫn tương đối — ghép với chỗ thật sự được đọc (sau chuyển hướng).
    if (meta.image) try { meta.image = new URL(meta.image, info.finalUrl).href; } catch { meta.image = null; }
    const thin = text.length < MIN_TEXT;
    return {
      ...info, ...meta, text, chars: text.length, ok: !thin,
      ...(thin ? { error: 'trang gần như không có chữ (có thể dựng bằng JavaScript)' } : {}),
    };
  } catch (error) {
    const reason = error?.name === 'TimeoutError' ? `quá ${TIMEOUT_MS / 1000} giây không trả lời` : error?.cause?.code ?? error?.message ?? String(error);
    return { ...base, ok: false, error: `không tải được: ${reason}` };
  }
}
