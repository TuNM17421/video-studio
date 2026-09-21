/**
 * Đọc/ghi thư mục của một lượt research (`research/<rid>/`) — dùng chung cho mọi công cụ dòng lệnh của
 * pipeline, để agent nào (Claude, Codex, Antigravity) hay Studio chạy thì cũng thấy cùng một bố cục.
 *
 *   research/<rid>/
 *     input/slide.md             chữ và ghi chú từng slide
 *     outline.json claims.json   chặng bóc tách
 *     claims/<cid>/finding.json  chặng research
 *     sources/index.json         url → sid, và thông tin từng trang
 *     sources/<sid>/page.txt     chữ của trang gốc Studio tự tải
 *     checks/*.json              kết quả soát
 *     output/kich-ban.md         kịch bản
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { urlKey } from './fetch-page.mjs';

export const RUN_ID_RE = /^[a-z0-9][a-z0-9-]{1,80}$/;
export const CLAIM_ID_RE = /^c\d{1,3}$/;
export const SOURCE_ID_RE = /^s\d{1,4}$/;

export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

const RENAME_RETRY_MS = 1500;

/**
 * Ghi qua file tạm rồi đổi tên: Studio có thể đang đọc đúng lúc đó, và không được thấy nửa file.
 *
 * Trên Windows, đổi tên đè lên một file mà tiến trình khác đang mở để đọc thì hỏng với EPERM/EACCES/EBUSY —
 * đo thật: 11/60 lần ghi hỏng khi bốn page.mjs chạy song song. Thử lại trong chốc lát như graceful-fs làm;
 * vẫn hỏng thì dọn file tạm rồi báo lỗi.
 */
export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 1)}\n`);
  const deadline = Date.now() + RENAME_RETRY_MS;
  const nap = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || Date.now() > deadline) {
        fs.rmSync(tmp, { force: true });
        throw error;
      }
      Atomics.wait(nap, 0, 0, 20);
    }
  }
}

export const paths = (dir) => ({
  slide: path.join(dir, 'input', 'slide.md'),
  outline: path.join(dir, 'outline.json'),
  claims: path.join(dir, 'claims.json'),
  claimDir: (cid) => path.join(dir, 'claims', cid),
  finding: (cid) => path.join(dir, 'claims', cid, 'finding.json'),
  feedback: (cid) => path.join(dir, 'claims', cid, 'feedback.json'),
  sources: path.join(dir, 'sources'),
  index: path.join(dir, 'sources', 'index.json'),
  page: (sid) => path.join(dir, 'sources', sid, 'page.txt'),
  checks: (name) => path.join(dir, 'checks', `${name}.json`),
  script: path.join(dir, 'output', 'kich-ban.md'),
  state: path.join(dir, 'state.json'),
});

// ── nguồn ─────────────────────────────────────────────────────────────────────────

export function readIndex(dir) {
  const idx = readJson(paths(dir).index, null);
  return { next: Number(idx?.next) || 1, urls: idx?.urls ?? {}, sources: idx?.sources ?? {} };
}

/** sid của một URL đã tải (theo URL agent đưa hoặc URL cuối sau chuyển hướng), không có thì null. */
export function sourceIdFor(dir, url) {
  return readIndex(dir).urls[urlKey(url)] ?? null;
}

const LOCK_WAIT_MS = 10_000;
const LOCK_STALE_MS = 30_000;

/**
 * Chạy `fn` khi đang giữ khoá của `sources/index.json`. Agent hay gọi vài `node tools/page.mjs` cùng lúc:
 * không có khoá thì hai tiến trình cùng đọc index, cùng cấp `s5` cho hai trang khác nhau, và bản ghi sau
 * xoá mất bản ghi trước — trích đoạn trỏ sai trang. Khoá là một file tạo độc quyền (`wx`); khoá bỏ lại
 * bởi tiến trình chết quá 30 giây thì coi như hết hạn.
 */
function withIndexLock(dir, fn) {
  const lock = path.join(dir, 'sources', '.index.lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const deadline = Date.now() + LOCK_WAIT_MS;
  const nap = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try {
      fs.closeSync(fs.openSync(lock, 'wx'));
      break;
    } catch (error) {
      // EPERM trên Windows: file khoá vừa bị xoá nhưng còn "chờ xoá" — cũng là đang có người giữ, chờ tiếp.
      if (error.code !== 'EEXIST' && error.code !== 'EPERM') throw error;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) fs.rmSync(lock, { force: true });
      } catch {}
      if (Date.now() > deadline) throw new Error('sources/index.json đang bị khoá quá lâu');
      Atomics.wait(nap, 0, 0, 25);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

/**
 * Lưu kết quả `fetchPage` thành một nguồn. Cùng URL thì dùng lại sid cũ (tải lại chỉ ghi đè chữ), để
 * trích đoạn agent đã gắn với sid đó vẫn đúng chỗ.
 */
export function saveSource(dir, url, result) {
  return withIndexLock(dir, () => {
    const idx = readIndex(dir);
    const keys = [urlKey(url), ...(result.finalUrl ? [urlKey(result.finalUrl)] : [])];
    let sid = keys.map((k) => idx.urls[k]).find(Boolean);
    if (!sid) sid = `s${idx.next++}`;
    for (const k of keys) idx.urls[k] = sid;
    const { text, ...meta } = result;
    idx.sources[sid] = { id: sid, ...meta, url: urlKey(url) };
    if (typeof text === 'string') {
      fs.mkdirSync(path.join(dir, 'sources', sid), { recursive: true });
      fs.writeFileSync(paths(dir).page(sid), text);
      stampPage(dir, sid, text);
    }
    writeJson(paths(dir).index, idx);
    return sid;
  });
}

export function sourceMeta(dir, sid) {
  return readIndex(dir).sources[sid] ?? null;
}

export function pageTextOf(dir, sid) {
  if (!SOURCE_ID_RE.test(String(sid))) return null;
  try { return fs.readFileSync(paths(dir).page(sid), 'utf8'); } catch { return null; }
}

/**
 * Vân tay của chữ từng trang gốc, để ngoài thư mục lượt: `research/_pages/<rid>.json`.
 *
 * `sources/<sid>/page.txt` là thứ phép soát đối chiếu trích đoạn. Với Claude, quyền ghi hẹp tới từng file nên
 * agent không đụng được vào đó. Nhưng **Codex chạy `--sandbox workspace-write`** và **Antigravity không có
 * allowlist** — hai CLI đó ghi được khắp repo, kể cả đúng file này. Nếu phép soát chỉ đọc bản đã lưu thì
 * "trích đoạn khớp trang gốc" chỉ còn đúng khi người dùng chọn Claude. Băm do **code** ghi, ở chỗ không chặng
 * agent nào được phép ghi, nên sửa page.txt là lệch băm và lượt soát tải lại trang thật.
 */
export const pagesFile = (dir) => path.join(path.dirname(path.resolve(dir)), '_pages', `${path.basename(path.resolve(dir))}.json`);

const digest = (text) => createHash('sha256').update(text).digest('hex').slice(0, 32);

export function stampPage(dir, sid, text) {
  const file = pagesFile(dir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const all = readJson(file, null) ?? {};
  all[sid] = digest(text);
  writeJson(file, all);
}

/** `true` nếu page.txt vẫn đúng chữ code đã tải về. Chưa có vân tay (lượt cũ) cũng coi là chưa tin được. */
export function pageTrusted(dir, sid) {
  const text = pageTextOf(dir, sid);
  if (text === null) return false;
  const stamped = (readJson(pagesFile(dir), null) ?? {})[sid];
  return typeof stamped === 'string' && stamped === digest(text);
}

/**
 * Chữ của mọi con số **được phép** xuất hiện trong kịch bản: slide, dàn ý, và finding đã qua soát.
 *
 * Một hàm cho cả `research-verify --stage script` lẫn `script-check.mjs --run`: hai bên dựng riêng thì sớm
 * muộn cũng lệch, và lệch ở đây nghĩa là một con số bịa qua được bên này mà chặn ở bên kia.
 *
 * Hai thứ cố ý **không** vào danh sách: câu slide mà research đã bác bỏ (`fix`/`wrong`) — giữ lại là cấp giấy
 * thông hành cho đúng chỗ sai — và finding chưa qua soát, vì con số trong đó chưa ai đối chiếu với trang gốc.
 */
export function knownNumbers(dir) {
  const P = paths(dir);
  const evidence = readJson(P.checks('evidence'), null)?.claims ?? {};
  const claims = readClaims(dir);
  const rejected = claims.filter((c) => ['fix', 'wrong'].includes(evidence[c.id]?.verdict ?? '') && evidence[c.id]?.ok);
  const flat = (v) => String(v ?? '').replace(/\s+/g, ' ');
  const drop = (text) => rejected.reduce((s, c) => s.split(flat(c.text)).join(' '), flat(text));
  let known = '';
  try { known += drop(fs.readFileSync(P.slide, 'utf8')); } catch {}
  // Slide PDF không có slide.md: dàn ý agent bóc từ PDF là nơi con số của giảng viên được ghi lại.
  for (const o of readJson(P.outline, null)?.outline ?? []) known += `\n${drop(`${o?.heading ?? ''} ${(o?.points ?? []).join(' ')}`)}`;
  for (const c of claims) {
    const f = evidence[c.id]?.ok ? readFinding(dir, c.id) : null;
    if (f) known += `\n${f.answer ?? ''}\n${f.corrected ?? ''}\n${(Array.isArray(f.evidence) ? f.evidence : []).map((e) => e?.quote ?? '').join('\n')}`;
  }
  return known;
}

// ── claim ─────────────────────────────────────────────────────────────────────────

export function readClaims(dir) {
  const raw = readJson(paths(dir).claims, null);
  return Array.isArray(raw?.claims) ? raw.claims : [];
}

export function readFinding(dir, cid) {
  return CLAIM_ID_RE.test(String(cid)) ? readJson(paths(dir).finding(cid), null) : null;
}

/** Ngày gốc của lượt — các phép soát theo thời gian tính từ đây, để chạy lại lúc nào cũng ra cùng kết quả. */
export function runDate(dir) {
  const state = readJson(paths(dir).state, null);
  const t = Date.parse(state?.createdAt ?? '');
  return Number.isFinite(t) ? t : Date.now();
}
