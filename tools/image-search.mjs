#!/usr/bin/env node
/**
 * Tìm ảnh cho những chỗ đã chọn trong triage.json — việc của code, không của agent.
 *
 *   node tools/image-search.mjs <thư mục video> [--slot s3] [--dry-run] [--sources commons,openverse,research]
 *                                               [--work <dir>] [--json]
 *
 * Với mỗi chỗ: gọi từng từ khoá trên từng nguồn, gộp và bỏ trùng, loại ảnh sai giấy phép (images.policy.json)
 * hay trình duyệt không vẽ được, tải thumbnail để xem trước và để agent nhìn khi xếp hạng. Ghi
 * `candidates/<slot>.json` (kèm danh sách ảnh bị loại và lý do) + `candidates/<slot>/cNN.<ext>`.
 * `--dry-run` chỉ gọi API và in số kết quả — không tải, không ghi file.
 *
 * Nguồn `research` (mặc định có trong images.policy.json): video đóng gói từ một lượt research thì thêm ảnh đại
 * diện của đúng những trang research đã dẫn cho các câu của chỗ đó (tools/lib/image-research.mjs). Giấy phép
 * của chúng không rõ nên không qua bộ lọc giấy phép mà mang `referenceOnly` — mặc định chỉ để tham khảo.
 *
 * Mặc định thư mục làm việc là projects/<id>/images. Mã thoát 0 = xong, 1 = triage sai, 2 = gọi sai.
 */
import fs from 'node:fs';
import path from 'node:path';
import { downloadImage, THUMB_MAX_BYTES } from './lib/image-fetch.mjs';
import { creditLine, licenseAllowed, readPolicy } from './lib/image-license.mjs';
import { researchCandidates } from './lib/image-research.mjs';
import { mergeCandidates, RENDERABLE, SEARCHERS } from './lib/image-sources.mjs';
import { checkTriage, imagePaths, loadCues, readJson, REPO, writeJson } from './lib/image-suggest.mjs';

const args = process.argv.slice(2);
const VALUE_FLAGS = ['--slot', '--sources', '--work'];
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? '';
};
const dir = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));
const json = args.includes('--json');
const dryRun = args.includes('--dry-run');
const only = flag('--slot');
const PER_QUERY = 8;

function usage(message) {
  console.log(json ? JSON.stringify({ ok: false, error: message }) : `✗ ${message}`);
  process.exit(2);
}
if (!dir || !fs.existsSync(path.join(dir, 'cues.js'))) usage('Cách dùng: node tools/image-search.mjs <thư mục video có cues.js> [--slot s3] [--dry-run]');

const policy = readPolicy();
const sources = (flag('--sources')?.split(',').map((s) => s.trim()).filter(Boolean) ?? policy.sources);
const KNOWN = [...Object.keys(SEARCHERS), 'research'];
for (const s of sources) if (!KNOWN.includes(s)) usage(`nguồn "${s}" không có — dùng ${KNOWN.join(', ')}`);
const apiSources = sources.filter((s) => SEARCHERS[s]);
const P = imagePaths(dir, { work: flag('--work') ?? undefined });
const triage = readJson(P.triage, null);
if (!triage) usage(`không có ${path.relative(process.cwd(), P.triage)} — chạy bước chọn chỗ trước`);
const { cues, sections } = await loadCues(dir);
const { problems, warnings } = checkTriage({ triage, cues, sections, policy });
if (problems.length) {
  if (json) console.log(JSON.stringify({ ok: false, problems, warnings }));
  else console.log(['✗ triage.json chưa đạt — sửa rồi chạy lại:', ...problems.map((p) => `  - ${p}`)].join('\n'));
  process.exit(1);
}
const slots = triage.slots.filter((s) => !only || s.slot === only);
if (only && !slots.length) usage(`không có slot ${only} trong triage.json`);

/** Nguồn đã hết lượt trong lượt này thì không gọi tiếp — gọi nữa chỉ thêm lỗi 429. */
const exhausted = new Set();

async function searchSlot(slot) {
  const lists = [];
  const errors = [];
  const counts = [];
  for (const query of slot.queries) {
    for (const source of apiSources) {
      if (exhausted.has(source)) continue;
      const r = await SEARCHERS[source](query, { limit: PER_QUERY });
      counts.push({ query, source, found: r.candidates.length, ...(r.error ? { error: r.error } : {}) });
      if (!r.ok) {
        errors.push(r.error);
        if (/429/.test(r.error)) exhausted.add(source);
      }
      lists.push(r.candidates);
    }
  }
  return { merged: mergeCandidates(lists), errors, counts };
}

/** Lọc theo chính sách; trả ảnh giữ lại và ảnh bị loại (kèm lý do để panel cho người dựng xem). */
function screen(merged) {
  const kept = [];
  const filtered = [];
  for (const c of merged) {
    const lic = licenseAllowed(c.license, policy);
    const reason = !lic.ok ? lic.reason : c.mime && !RENDERABLE.has(c.mime) ? `loại file ${c.mime} không dùng được trong video` : null;
    if (reason) filtered.push({ id: c.id, title: c.title, license: c.license, landingUrl: c.landingUrl, reason });
    else kept.push({ ...c, shareAlike: lic.shareAlike });
  }
  return { kept, filtered };
}

/** Tải thumbnail, 4 ảnh một lúc. Ảnh không tải được thì chuyển sang danh sách bị loại. */
async function fetchThumbs(slot, kept, filtered) {
  fs.rmSync(path.dirname(P.thumbBase(slot.slot, 1)), { recursive: true, force: true });
  const out = new Array(kept.length);
  let next = 0;
  async function worker() {
    while (next < kept.length) {
      const k = next++;
      const c = kept[k];
      const r = await downloadImage(c.thumbUrl, P.thumbBase(slot.slot, k + 1), { maxBytes: THUMB_MAX_BYTES });
      if (!r.ok) {
        filtered.push({ id: c.id, title: c.title, license: c.license, landingUrl: c.landingUrl, reason: `không tải được thumbnail: ${r.error}` });
        continue;
      }
      // Ảnh research không có kích thước từ API: thumbnail của nó chính là ảnh gốc, đo luôn từ file vừa tải.
      const size = c.width && c.height ? { width: c.width, height: c.height } : { width: r.width ?? null, height: r.height ?? null };
      const longEdge = Math.max(size.width ?? 0, size.height ?? 0);
      out[k] = {
        ...c,
        ...size,
        thumb: path.relative(P.work, r.file).split(path.sep).join('/'),
        lowRes: longEdge > 0 && longEdge < policy.minLongEdge,
        credit: creditLine(c),
      };
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  return out.filter(Boolean);
}

// Tìm lại thì danh sách ứng viên đổi (mã ảnh, thứ tự) — xếp hạng và lựa chọn cũ của chỗ đó không còn khớp.
if (!dryRun) {
  const ranked = new Set((readJson(P.suggest, null)?.slots ?? []).map((s) => s.slot));
  const decided = new Set(Object.keys(readJson(P.decisions, null)?.slots ?? {}));
  for (const s of slots) {
    if (ranked.has(s.slot) || decided.has(s.slot)) warnings.push(`slot ${s.slot}: đã có xếp hạng/lựa chọn từ lần tìm trước — xếp hạng lại và chọn lại cho chỗ này`);
  }
}

const report = [];
for (const slot of slots) {
  const { merged, errors, counts } = await searchSlot(slot);
  const { kept, filtered } = screen(merged);
  // Ảnh từ trang research: giữ chỗ trong danh sách trước khi cắt, để chúng không bị ảnh API đẩy hết ra ngoài.
  const fromResearch = sources.includes('research') ? await researchCandidates({ repo: REPO, videoId: P.id, cues, slotCues: slot.cues }) : null;
  const extra = fromResearch?.candidates ?? [];
  if (fromResearch?.rid) counts.push({ query: `research/${fromResearch.rid}`, source: 'research', found: extra.length });
  errors.push(...(fromResearch?.errors ?? []).map((e) => `research: ${e}`));
  const top = [...kept.slice(0, Math.max(0, policy.candidatesPerSlot - extra.length)), ...extra];
  if (dryRun) {
    report.push({ slot: slot.slot, counts, found: merged.length + extra.length, allowed: kept.length + extra.length, filtered: filtered.length, errors });
    continue;
  }
  const candidates = await fetchThumbs(slot, top, filtered);
  writeJson(P.candidates(slot.slot), {
    version: 1,
    slot: slot.slot,
    queries: slot.queries,
    sources,
    searchedAt: new Date().toISOString(),
    errors,
    candidates,
    filtered,
  });
  report.push({ slot: slot.slot, counts, found: merged.length + extra.length, candidates: candidates.length, filtered: filtered.length, errors });
}

if (json) console.log(JSON.stringify({ ok: true, dryRun, warnings, slots: report }));
else {
  const lines = [];
  for (const w of warnings) lines.push(`! ${w}`);
  for (const r of report) {
    lines.push(`${r.slot}: ${r.found} ảnh tìm thấy · ${dryRun ? `${r.allowed} đúng giấy phép` : `${r.candidates} ứng viên`} · ${r.filtered} bị loại`);
    for (const c of r.counts) lines.push(`    ${c.source.padEnd(9)} "${c.query}" → ${c.found}${c.error ? ` (${c.error})` : ''}`);
  }
  if (!dryRun) lines.push(`→ ${path.relative(process.cwd(), path.join(P.work, 'candidates'))}/`);
  console.log(lines.join('\n'));
}
