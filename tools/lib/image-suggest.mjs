/**
 * Dữ liệu của tính năng đề xuất ảnh — đường dẫn, schema và các phép soát — dùng chung cho các lệnh
 * `tools/image-*.mjs` và (sau này) cho Studio.
 *
 * Luồng (xem .claude/skills/image-suggest/SKILL.md):
 *   triage.json   agent chọn vài chỗ trong cues.js đáng có ảnh, kèm lý do và từ khoá
 *   candidates/   code tìm ảnh cho từng chỗ, lọc giấy phép, tải thumbnail
 *   suggest.json  agent nhìn thumbnail, xếp hạng tối đa 3 ảnh mỗi chỗ
 *   decisions.json người dựng video chọn: dùng ảnh · dùng làm tham khảo · bỏ (dùng animation)
 *   images.js     code tải ảnh đã chọn vào thư mục video và ghi bảng ảnh cho cảnh import
 *
 * Mọi thứ trung gian nằm trong `projects/<id>/images/` (không vào git). Ảnh dùng để render nằm trong
 * `<thư mục video>/img/` — cùng gốc được phục vụ khi render, không bao giờ trỏ URL ngoài.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFileAtomic } from './image-fetch.mjs';
import { DEFAULT_POLICY, licenseAllowed } from './image-license.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/**
 * Gốc design system. `src` trong images.js tính từ đây (vd `ui_kits/lesson-video/videos/<id>/img/s3.jpg`), không
 * tính từ thư mục video: render mở `ui_kits/lesson-video/index.html?scene=…`, nên đường dẫn tương đối theo thư
 * mục video trỏ sai chỗ. PhotoCard tự ghép `src` với gốc DS.
 */
export const DS_ROOT = path.join(REPO, 'vinuni-lesson-video-ds');

/** `src` của một file ảnh trong images.js — đường dẫn từ gốc DS, dấu `/`. */
export const dsSrc = (file, dsRoot = DS_ROOT) => path.relative(dsRoot, path.resolve(file)).split(path.sep).join('/');

export const VERSION = 1;
export const SLOT_RE = /^s\d{1,4}$/;
export const KINDS = ['use', 'reference'];
export const ACTIONS = ['use', 'reference', 'skip'];
export const FITS = ['good', 'ok'];
export const MAX_QUERIES = 3;
export const MAX_QUERY_CHARS = 120;
export const MIN_WHY_CHARS = 30;
export const MIN_RANK_WHY_CHARS = 20;
export const MAX_PICKS = 3;
export const MAX_CAPTION_CHARS = 60;

/** Đường dẫn của một video: thư mục làm việc (`--work` thay được) và nơi ghi ảnh dùng để render (`--dest`). */
export function imagePaths(videoDir, { work, dest } = {}) {
  const id = path.basename(path.resolve(videoDir));
  const W = path.resolve(work ?? path.join(REPO, 'projects', id, 'images'));
  const D = path.resolve(dest ?? videoDir);
  return {
    id,
    work: W,
    triage: path.join(W, 'triage.json'),
    candidates: (slot) => path.join(W, 'candidates', `${slot}.json`),
    thumbBase: (slot, k) => path.join(W, 'candidates', slot, `c${String(k).padStart(2, '0')}`),
    suggest: path.join(W, 'suggest.json'),
    decisions: path.join(W, 'decisions.json'),
    check: path.join(W, 'check.json'),
    dest: D,
    imgBase: (slot) => path.join(D, 'img', slot),
    imagesJs: path.join(D, 'images.js'),
  };
}

export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function writeJson(file, data) {
  writeFileAtomic(file, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Câu của video, đọc bằng cách import thẳng cues.js như `tools/cues-json.mjs` (cues.js là module ES của design
 * system, không phải dữ liệu tĩnh).
 */
export async function loadCues(videoDir) {
  const file = path.resolve(videoDir, 'cues.js');
  if (!fs.existsSync(file)) throw new Error(`không có cues.js trong ${videoDir}`);
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  const cues = (mod.CUES || []).map((c) => ({
    n: c.n,
    text: c.text,
    title: c.title || c.screen || '',
    section: c.section ?? null,
    silent: Boolean(c.silent),
    quiz: Boolean(c.quiz),
  }));
  return { cues, sections: mod.SECTIONS || [] };
}

/** Dấu vân tay của lời đọc: triage làm trên lời cũ thì phải biết để làm lại. */
export function cuesHash(cues) {
  return crypto.createHash('sha1').update(cues.map((c) => `${c.n}\u0000${c.text}`).join('\u0001')).digest('hex').slice(0, 12);
}

/** Số chỗ tối đa được đề xuất: ít nhất 2, mỗi phần của kịch bản một chỗ, không quá trần của chính sách. */
export function maxSlotsFor(sections, policy = DEFAULT_POLICY) {
  const count = Array.isArray(sections) ? sections.length : 0;
  return Math.min(policy.maxSlots, Math.max(2, count));
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Soát triage.json. Trả `{ problems, warnings }` — câu tiếng Việt, mỗi câu chỉ rõ chỗ sai. */
export function checkTriage({ triage, cues, sections, policy = DEFAULT_POLICY }) {
  const problems = [];
  const warnings = [];
  if (!triage || typeof triage !== 'object') return { problems: ['triage.json không đọc được'], warnings };
  const slots = Array.isArray(triage.slots) ? triage.slots : null;
  if (!slots) return { problems: ['triage.json thiếu mảng "slots" (không có chỗ nào thì ghi "slots": [])'], warnings };
  if (triage.cuesHash && triage.cuesHash !== cuesHash(cues)) {
    warnings.push('lời đọc trong cues.js đã đổi sau khi chọn chỗ — nên chạy lại bước chọn chỗ');
  }
  const max = maxSlotsFor(sections, policy);
  if (slots.length > max) problems.push(`${slots.length} chỗ đề xuất — tối đa ${max}; ảnh là ngoại lệ, giữ những chỗ rõ nhất`);
  const byN = new Map(cues.map((c) => [c.n, c]));
  const taken = new Map();
  const ids = new Set();
  for (const [i, s] of slots.entries()) {
    const where = `slot ${s?.slot ?? `#${i + 1}`}`;
    if (!SLOT_RE.test(s?.slot ?? '')) { problems.push(`${where}: "slot" phải có dạng s<số câu đầu>, vd "s3"`); continue; }
    if (ids.has(s.slot)) problems.push(`${where}: trùng mã slot`);
    ids.add(s.slot);
    const list = Array.isArray(s.cues) ? s.cues : [];
    if (!list.length) problems.push(`${where}: "cues" rỗng`);
    for (const [k, n] of list.entries()) {
      const cue = byN.get(n);
      if (!cue) { problems.push(`${where}: câu ${n} không có trong cues.js`); continue; }
      if (cue.silent) problems.push(`${where}: câu ${n} là khoảng lặng, không có lời để minh hoạ`);
      if (cue.quiz) problems.push(`${where}: câu ${n} là khoảng chờ quiz`);
      if (k > 0 && n <= list[k - 1]) problems.push(`${where}: "cues" phải tăng dần, không trùng`);
      if (taken.has(n)) problems.push(`${where}: câu ${n} đã thuộc ${taken.get(n)}`);
      taken.set(n, s.slot);
    }
    if (list.length && s.slot !== `s${list[0]}`) problems.push(`${where}: mã slot phải là s${list[0]} (theo câu đầu)`);
    if (!KINDS.includes(s.kind)) problems.push(`${where}: "kind" phải là ${KINDS.join(' | ')}`);
    if (str(s.why).length < MIN_WHY_CHARS) problems.push(`${where}: "why" quá ngắn — nói rõ vì sao ảnh thật hơn animation ở câu này`);
    if (!str(s.subject)) problems.push(`${where}: thiếu "subject" (ảnh phải cho thấy ai/cái gì)`);
    const q = Array.isArray(s.queries) ? s.queries.map(str).filter(Boolean) : [];
    if (!q.length || q.length > MAX_QUERIES) problems.push(`${where}: cần 1–${MAX_QUERIES} từ khoá trong "queries"`);
    if (q.some((x) => x.length > MAX_QUERY_CHARS)) problems.push(`${where}: từ khoá dài quá ${MAX_QUERY_CHARS} ký tự`);
  }
  return { problems, warnings };
}

/**
 * Soát images.js đã sinh: mỗi ảnh có file thật (resolve từ gốc DS), `src` không phải URL ngoài, ảnh "use" có
 * `credit`. `images` là object IMAGES đã import.
 */
export function checkImages({ images, dsRoot = DS_ROOT }) {
  const problems = [];
  for (const [slot, e] of Object.entries(images ?? {})) {
    const src = String(e?.src ?? '');
    if (!src) problems.push(`images.js ${slot}: thiếu "src"`);
    else if (/^([a-z]+:)?\/\//i.test(src) || src.startsWith('/')) problems.push(`images.js ${slot}: "src" phải là đường dẫn từ gốc design system, không phải URL/đường dẫn tuyệt đối (${src})`);
    else if (!fs.existsSync(path.join(dsRoot, src))) problems.push(`images.js ${slot}: không có file ${src} (tính từ gốc design system)`);
    if (e?.kind === 'use' && !String(e?.credit ?? '').trim()) problems.push(`images.js ${slot}: ảnh "use" thiếu "credit"`);
  }
  return { problems, warnings: [] };
}

/** Danh sách ứng viên của một chỗ (candidates/<slot>.json) thành Map id → candidate. */
const byId = (file) => new Map((file?.candidates ?? []).map((c) => [c.id, c]));

/** Soát suggest.json so với triage và ứng viên code đã tìm. */
export function checkSuggest({ suggest, triage, candidatesBySlot, policy = DEFAULT_POLICY }) {
  const problems = [];
  const warnings = [];
  if (!suggest || !Array.isArray(suggest.slots)) return { problems: ['suggest.json thiếu mảng "slots"'], warnings };
  const triaged = new Set((triage?.slots ?? []).map((s) => s.slot));
  const seen = new Set();
  for (const s of suggest.slots) {
    const where = `slot ${s?.slot}`;
    if (!triaged.has(s?.slot)) { problems.push(`${where}: không có trong triage.json`); continue; }
    if (seen.has(s.slot)) problems.push(`${where}: xuất hiện hai lần`);
    seen.add(s.slot);
    const pool = byId(candidatesBySlot[s.slot]);
    const picks = Array.isArray(s.candidates) ? s.candidates : [];
    if (picks.length > MAX_PICKS) problems.push(`${where}: ${picks.length} ảnh — tối đa ${MAX_PICKS}`);
    if (!picks.length && str(s.none).length < MIN_RANK_WHY_CHARS) problems.push(`${where}: không chọn ảnh nào thì ghi lý do vào "none"`);
    const ids = new Set();
    for (const p of picks) {
      const c = pool.get(p?.id);
      if (!c) { problems.push(`${where}: ảnh ${p?.id} không có trong candidates/${s.slot}.json`); continue; }
      if (ids.has(p.id)) problems.push(`${where}: ảnh ${p.id} lặp lại`);
      ids.add(p.id);
      if (!FITS.includes(p.fit)) problems.push(`${where}: ảnh ${p.id} — "fit" phải là ${FITS.join(' | ')}`);
      if (str(p.why).length < MIN_RANK_WHY_CHARS) problems.push(`${where}: ảnh ${p.id} — "why" quá ngắn`);
      // Ảnh từ trang research (giấy phép không rõ) được đề xuất như ảnh tham khảo; dùng trong video là việc người
      // dựng tự xác nhận lúc duyệt.
      if (!c.referenceOnly && !licenseAllowed(c.license, policy).ok) problems.push(`${where}: ảnh ${p.id} có giấy phép không được dùng (${c.license})`);
      if (c.lowRes) warnings.push(`${where}: ảnh ${p.id} độ phân giải thấp (${c.width}×${c.height})`);
    }
    for (const r of Array.isArray(s.rejected) ? s.rejected : []) {
      if (!pool.has(r?.id)) problems.push(`${where}: ảnh bị loại ${r?.id} không có trong candidates/${s.slot}.json`);
      else if (ids.has(r.id)) problems.push(`${where}: ảnh ${r.id} vừa được chọn vừa bị loại`);
      if (!str(r?.reason)) problems.push(`${where}: ảnh bị loại ${r?.id} thiếu "reason"`);
    }
  }
  for (const slot of triaged) {
    if (!seen.has(slot) && (candidatesBySlot[slot]?.candidates?.length ?? 0) > 0) warnings.push(`slot ${slot}: có ứng viên nhưng chưa được xếp hạng`);
  }
  return { problems, warnings };
}

/**
 * Giấy phép dùng để ghi công cho một lựa chọn. Ảnh có giấy phép từ nguồn giữ nguyên nó; ảnh từ trang research
 * (không rõ) dùng giấy phép người dựng đã tự kiểm trên trang nguồn và chọn lúc duyệt (`decision.license`).
 */
export function effectiveLicense(candidate, decision) {
  if (candidate?.referenceOnly && decision?.license) {
    return { license: decision.license, licenseVersion: decision.licenseVersion ?? null, confirmedBy: 'người dựng video' };
  }
  return { license: candidate?.license, licenseVersion: candidate?.licenseVersion ?? null, confirmedBy: null };
}

/** Soát decisions.json — lựa chọn của người dựng video. */
export function checkDecisions({ decisions, triage, candidatesBySlot, suggest, policy = DEFAULT_POLICY }) {
  const problems = [];
  const warnings = [];
  const slots = decisions?.slots;
  if (!slots || typeof slots !== 'object' || Array.isArray(slots)) return { problems: ['decisions.json thiếu object "slots"'], warnings };
  const triaged = new Set((triage?.slots ?? []).map((s) => s.slot));
  const suggested = new Map((suggest?.slots ?? []).map((s) => [s.slot, new Set((s.candidates ?? []).map((p) => p.id))]));
  for (const [slot, d] of Object.entries(slots)) {
    const where = `slot ${slot}`;
    if (!triaged.has(slot)) { problems.push(`${where}: không có trong triage.json`); continue; }
    if (!ACTIONS.includes(d?.action)) { problems.push(`${where}: "action" phải là ${ACTIONS.join(' | ')}`); continue; }
    if (d.action === 'skip') continue;
    const c = byId(candidatesBySlot[slot]).get(d.candidate);
    if (!c) { problems.push(`${where}: ảnh ${d.candidate ?? '(trống)'} không có trong candidates/${slot}.json`); continue; }
    const lic = effectiveLicense(c, d);
    if (c.referenceOnly && d.action === 'use' && !d.license) {
      problems.push(`${where}: ảnh ${d.candidate} lấy từ trang research, chưa rõ giấy phép — chỉ dùng làm tham khảo, hoặc kiểm giấy phép trên trang nguồn rồi chọn nó khi duyệt`);
    } else if (d.action === 'use' && !licenseAllowed(lic.license, policy).ok) {
      problems.push(`${where}: ảnh ${d.candidate} có giấy phép không được dùng (${lic.license})`);
    } else if (!c.referenceOnly && !licenseAllowed(c.license, policy).ok) {
      problems.push(`${where}: ảnh ${d.candidate} có giấy phép không được dùng (${c.license})`);
    }
    if (d.license && !c.referenceOnly) warnings.push(`${where}: ảnh ${d.candidate} đã có giấy phép từ nguồn — bỏ qua giấy phép người dựng ghi`);
    if (!suggested.get(slot)?.has(d.candidate)) warnings.push(`${where}: ảnh ${d.candidate} không nằm trong đề xuất của agent — người dựng tự chọn`);
    if (d.caption != null && [...String(d.caption)].length > MAX_CAPTION_CHARS) problems.push(`${where}: chú thích dài quá ${MAX_CAPTION_CHARS} ký tự`);
  }
  return { problems, warnings };
}

/** Đọc candidates/<slot>.json của mọi chỗ trong triage. */
export function readCandidates(P, triage) {
  const out = {};
  for (const s of triage?.slots ?? []) out[s.slot] = readJson(P.candidates(s.slot), null);
  return out;
}

/**
 * Nội dung file images.js của video — bảng ảnh đã duyệt mà cảnh import:
 *   import { IMAGES } from './images.js';
 *   <PhotoCard src={IMAGES.s3.src} credit={IMAGES.s3.credit} … />
 * `src` tính từ gốc design system (xem DS_ROOT).
 * Sinh bởi tools/image-apply.mjs; sửa tay sẽ bị ghi đè.
 */
export function imagesModule(entries) {
  const lines = [
    '// Sinh bởi tools/image-apply.mjs từ projects/<id>/images/decisions.json — đừng sửa tay, chạy lại lệnh.',
    '// kind "use": dùng trong cảnh bằng PhotoCard (credit chép nguyên). kind "reference": chỉ để xem rồi vẽ lại',
    '// bằng component của design system — không đưa vào PhotoCard.',
    `export const IMAGES = ${JSON.stringify(entries, null, 2)};`,
    '',
  ];
  return lines.join('\n');
}
