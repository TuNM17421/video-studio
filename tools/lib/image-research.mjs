/**
 * Ứng viên ảnh từ research — ảnh đại diện (og:image) của đúng những trang mà bước "Đóng gói kịch bản" đã đọc
 * để kiểm chứng câu đó.
 *
 * Video tạo từ một lượt research mang dòng `**Nguồn kịch bản:** đóng gói từ \`research/<rid>\`` trong
 * kich-ban-goc.md. Từ một chỗ cần ảnh (các câu `n` trong cues.js) đi ngược: câu → `### Câu` của kịch bản (khớp
 * theo lời đọc) → các claim nó dẫn (`**Nguồn:** c3`) → nguồn của finding claim đó → trang → og:image. Chỉ trang
 * được dẫn cho **đúng câu đó**, không phải mọi trang của lượt research — ảnh đại diện của một bài báo về chuyện
 * khác thì chỉ là nhiễu.
 *
 * Giấy phép của ảnh trên trang là **không rõ** (trang không khai). Nên ứng viên này mang `referenceOnly: true`:
 * mặc định chỉ dùng làm tham khảo để vẽ lại; muốn đưa vào video thì người dựng phải tự kiểm trên trang nguồn và
 * chọn giấy phép đó khi duyệt (xem `checkDecisions`).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fetchPage } from './fetch-page.mjs';
import { normalize } from './page-text.mjs';
import { paths as researchPaths, readFinding, readIndex } from './research-store.mjs';
import { parseRefs, parseScript } from './script-lint.mjs';

/** Tối đa bao nhiêu ảnh research cho một chỗ — đủ để thêm lựa chọn, không lấn các ảnh có giấy phép rõ. */
export const MAX_RESEARCH_PER_SLOT = 4;

/** Ảnh chung của trang (logo, favicon, ảnh mặc định khi chia sẻ) — không bao giờ là ảnh của chủ thể. */
const GENERIC = /logo|favicon|sprite|placeholder|default[-_]?(image|og|share|thumb)|share[-_]?default|avatar|icon[-_.]|brand/i;

/** `research/<rid>` mà kịch bản của video được đóng gói từ đó, hoặc null. */
export function researchRunOf(scriptText) {
  const m = /\*\*Nguồn kịch bản:\*\*[^\n]*`research\/([a-z0-9][a-z0-9-]{1,80})`/.exec(String(scriptText ?? ''));
  return m ? m[1] : null;
}

const norm = (s) => normalize(String(s ?? '')).replace(/[.!?…"“”'‘’]+/g, '').trim();

/**
 * Câu của kịch bản ứng với một câu trong cues.js: khớp theo lời đọc (cues.js chép nguyên văn lời), rồi mới
 * theo số câu khi lời không khớp được (cues.js có thể tách một **Lời** dài thành vài câu).
 */
export function scriptCueFor(scriptCues, cue) {
  const text = norm(cue.text);
  if (text) {
    const exact = scriptCues.find((c) => norm(c.fields['lời']) === text);
    if (exact) return exact;
    const part = scriptCues.find((c) => { const l = norm(c.fields['lời']); return l && (l.includes(text) || text.includes(l)); });
    if (part) return part;
  }
  return scriptCues.find((c) => c.n === cue.n) ?? null;
}

/** Các nguồn (sid) research đã dùng cho những câu này, theo thứ tự xuất hiện, kèm claim dẫn tới nó. */
export function sourcesForCues({ scriptText, runDir, cues, slotCues }) {
  const { cues: scriptCues } = parseScript(scriptText);
  const out = [];
  const seen = new Set();
  for (const n of slotCues) {
    const cue = cues.find((c) => c.n === n);
    if (!cue) continue;
    const sc = scriptCueFor(scriptCues, cue);
    if (!sc) continue;
    for (const cid of parseRefs(sc.fields['nguồn']).claims) {
      const finding = readFinding(runDir, cid);
      if (!finding) continue;
      const ids = [
        ...(Array.isArray(finding.sources) ? finding.sources.map((s) => s?.id) : []),
        ...(Array.isArray(finding.evidence) ? finding.evidence.map((e) => e?.source) : []),
      ].filter((sid) => typeof sid === 'string' && /^s\d+$/.test(sid));
      for (const sid of ids) {
        if (seen.has(sid)) continue;
        seen.add(sid);
        out.push({ sid, claim: cid });
      }
    }
  }
  return out;
}

const domainOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; } };

/**
 * Ứng viên ảnh (cùng dạng với Commons/Openverse) cho một chỗ. Ảnh đọc từ index của lượt research nếu lượt đó
 * đã lưu `image`; lượt cũ hơn chưa có thì tải lại trang để đọc (lỗi thì bỏ qua trang đó, không hỏng cả lượt).
 */
export async function researchCandidates({ repo, videoId, cues, slotCues, fetchImpl = fetch, lookup }) {
  const scriptFile = path.join(repo, 'projects', videoId, 'kich-ban-goc.md');
  let scriptText;
  try { scriptText = fs.readFileSync(scriptFile, 'utf8'); } catch { return { candidates: [], errors: [], rid: null }; }
  const rid = researchRunOf(scriptText);
  if (!rid) return { candidates: [], errors: [], rid: null };
  const runDir = path.join(repo, 'research', rid);
  if (!fs.existsSync(researchPaths(runDir).index)) return { candidates: [], errors: [`không thấy research/${rid} trên máy này`], rid };
  const index = readIndex(runDir);
  const errors = [];
  const candidates = [];
  const seenImages = new Set();
  for (const { sid, claim } of sourcesForCues({ scriptText, runDir, cues, slotCues })) {
    if (candidates.length >= MAX_RESEARCH_PER_SLOT) break;
    const meta = index.sources[sid];
    if (!meta?.url || /pdf/i.test(meta.type ?? '')) continue;
    let image = meta.image ?? null;
    let page = meta;
    if (!('image' in meta)) {
      const fresh = await fetchPage(meta.url, { fetchImpl, ...(lookup ? { lookup } : {}) });
      if (!fresh.ok && !fresh.image) { errors.push(`${sid}: ${fresh.error ?? 'không đọc được trang'}`); continue; }
      image = fresh.image ?? null;
      page = { ...meta, ...fresh };
    }
    if (!image || !/^https:\/\//i.test(image) || GENERIC.test(image) || seenImages.has(image)) continue;
    seenImages.add(image);
    const landing = page.finalUrl ?? meta.url;
    candidates.push({
      id: `research:${crypto.createHash('sha1').update(image).digest('hex').slice(0, 12)}`,
      source: 'research',
      // Nơi đăng là tên miền của trang (ngắn, kiểm lại được); tác giả ảnh thì trang không khai — để trống, đừng
      // ghi tên nhà xuất bản của bài vào chỗ tác giả ảnh.
      origin: domainOf(landing),
      title: page.title ?? null,
      description: `Ảnh đại diện của trang research ${sid} (dẫn cho ${claim})${page.publisher ? ` — ${page.publisher}` : ''}.`,
      creator: null,
      date: page.published ?? null,
      license: 'unknown',
      licenseVersion: null,
      licenseUrl: null,
      landingUrl: landing,
      imageUrl: image,
      thumbUrl: image,
      width: null,
      height: null,
      mime: null,
      attributionRequired: true,
      referenceOnly: true,
      research: { rid, sid, claim },
    });
  }
  return { candidates, errors, rid };
}
