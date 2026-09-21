#!/usr/bin/env node
/**
 * Đưa những ảnh người dựng video đã chọn vào video.
 *
 *   node tools/image-apply.mjs <thư mục video> [--work <dir>] [--dest <dir>] [--json]
 *
 * Đọc decisions.json; với mỗi chỗ "use" / "reference": tải ảnh (bản thu nhỏ cỡ 1920 khi ảnh gốc lớn hơn) vào
 * `<thư mục video>/img/<slot>.<ext>` và ghi `<thư mục video>/images.js` (`src` tính từ gốc design system). Chỗ "skip" hay không còn trong
 * decisions thì xoá ảnh cũ của nó. Chạy lại bao nhiêu lần cũng được: ảnh đã tải đúng ứng viên thì giữ nguyên.
 *
 * Mã thoát 0 = xong, 1 = decisions sai hoặc có ảnh không tải được, 2 = gọi sai.
 */
import fs from 'node:fs';
import path from 'node:path';
import { downloadImage, EXT, imageSize, MAX_BYTES, writeFileAtomic } from './lib/image-fetch.mjs';
import { attributionText, creditLine, licenseAllowed, readPolicy } from './lib/image-license.mjs';
import { renderUrl } from './lib/image-sources.mjs';
import { checkDecisions, dsSrc, imagePaths, imagesModule, readCandidates, readJson, writeJson } from './lib/image-suggest.mjs';

const args = process.argv.slice(2);
const VALUE_FLAGS = ['--work', '--dest'];
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? '';
};
const dir = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));
const json = args.includes('--json');

function usage(message) {
  console.log(json ? JSON.stringify({ ok: false, error: message }) : `✗ ${message}`);
  process.exit(2);
}
if (!dir || !fs.existsSync(path.join(dir, 'cues.js'))) usage('Cách dùng: node tools/image-apply.mjs <thư mục video có cues.js>');

const policy = readPolicy();
const P = imagePaths(dir, { work: flag('--work') ?? undefined, dest: flag('--dest') ?? undefined });
const triage = readJson(P.triage, null);
const decisions = readJson(P.decisions, null);
if (!triage) usage('không có triage.json');
if (!decisions) usage('không có decisions.json — người dựng chưa chọn ảnh nào');
const suggest = readJson(P.suggest, null);
const candidatesBySlot = readCandidates(P, triage);
const { problems, warnings } = checkDecisions({ decisions, triage, candidatesBySlot, suggest, policy });
if (problems.length) {
  if (json) console.log(JSON.stringify({ ok: false, problems, warnings }));
  else console.log(['✗ decisions.json chưa đạt:', ...problems.map((p) => `  - ${p}`)].join('\n'));
  process.exit(1);
}

/** Ghi nhớ ảnh nào đã tải cho chỗ nào — để lần chạy sau không tải lại. */
const APPLIED = path.join(P.work, 'applied.json');
const applied = readJson(APPLIED, {});
const existing = (slot) => Object.values(EXT).map((ext) => `${P.imgBase(slot)}.${ext}`).find((f) => fs.existsSync(f)) ?? null;
const removeSlot = (slot) => { for (const ext of Object.values(EXT)) fs.rmSync(`${P.imgBase(slot)}.${ext}`, { force: true }); };

const bySlot = new Map(triage.slots.map((s) => [s.slot, s]));
const entries = {};
const failed = [];
const done = [];
const nextApplied = {};

for (const [slot, d] of Object.entries(decisions.slots)) {
  if (d.action === 'skip') continue;
  const c = candidatesBySlot[slot].candidates.find((x) => x.id === d.candidate);
  let file = existing(slot);
  let size = null;
  if (file && applied[slot]?.candidate === c.id) {
    size = imageSize(fs.readFileSync(file));
  } else {
    const url = await renderUrl(c);
    const r = await downloadImage(url, P.imgBase(slot), { maxBytes: MAX_BYTES });
    if (!r.ok) {
      failed.push(`${slot}: không tải được ảnh ${c.id} — ${r.error}`);
      continue;
    }
    file = r.file;
    size = { width: r.width, height: r.height };
    done.push(slot);
  }
  nextApplied[slot] = { candidate: c.id, file: path.basename(file) };
  const t = bySlot.get(slot);
  entries[slot] = {
    src: dsSrc(file),
    kind: d.action,
    cues: t.cues,
    subject: t.subject,
    ...(d.action === 'use' ? { caption: d.caption ?? null, credit: creditLine(c) } : { note: t.why }),
    attribution: attributionText(c),
    license: c.license,
    shareAlike: licenseAllowed(c.license, policy).shareAlike,
    landingUrl: c.landingUrl,
    width: size?.width ?? null,
    height: size?.height ?? null,
  };
}

// Chỗ không còn dùng ảnh: xoá file cũ để thư mục video không giữ ảnh rác (render không đọc tới nhưng người đọc
// thư mục sẽ tưởng ảnh đó đang dùng).
for (const slot of Object.keys(applied)) if (!entries[slot]) removeSlot(slot);
for (const s of triage.slots) if (!entries[s.slot] && existing(s.slot)) removeSlot(s.slot);

if (Object.keys(entries).length) writeFileAtomic(P.imagesJs, imagesModule(entries));
else {
  fs.rmSync(P.imagesJs, { force: true });
  try { fs.rmdirSync(path.join(P.dest, 'img')); } catch {}
}
writeJson(APPLIED, nextApplied);

const ok = !failed.length;
if (json) console.log(JSON.stringify({ ok, warnings, failed, downloaded: done, images: Object.keys(entries) }));
else {
  const lines = [...warnings.map((w) => `! ${w}`), ...failed.map((f) => `✗ ${f}`)];
  lines.push(`${ok ? '✓' : '✗'} ${Object.keys(entries).length} ảnh trong ${path.relative(process.cwd(), P.imagesJs)} (tải mới: ${done.join(', ') || 'không'})`);
  console.log(lines.join('\n'));
}
process.exit(ok ? 0 : 1);
