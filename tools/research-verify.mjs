#!/usr/bin/env node
/**
 * Soát một lượt research — cùng một lệnh cho Studio và cho agent chạy không qua Studio.
 *
 *   node tools/research-verify.mjs research/<rid> --stage extract
 *   node tools/research-verify.mjs research/<rid> --stage evidence [--claims c1,c3] [--no-fetch]
 *   node tools/research-verify.mjs research/<rid> --stage script
 *   node tools/research-verify.mjs research/<rid> --reuse [--skip c2,c3]   (dùng lại dữ kiện còn hạn trong research/_facts)
 *   … [--json]
 *
 * Kết quả ghi vào `checks/<stage>.json` và in ra; mã thoát 0 = đạt, 1 = có problem, 2 = gọi sai.
 *
 * Soát bằng chứng tải trang gốc của những URL agent dẫn mà chưa qua `tools/page.mjs` (vd agent đọc bằng
 * WebFetch), để mọi trích đoạn đều được so với trang thật chứ không với bản một model đã đọc lại. Claim
 * nào qua được soát thì được lưu vào thư viện dữ kiện cho các bài sau.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fetchPage, isTransient, urlKey } from './lib/fetch-page.mjs';
import { checkExtract, checkFinding, checkScript } from './lib/research-check.mjs';
import { factForReuse, findingFromFact, isFresh, lookupFact, saveFact } from './lib/research-facts.mjs';
import { knownNumbers, pageTextOf, pageTrusted, paths, readClaims, readFinding, readIndex, readJson, runDate, saveSource, sourceIdFor, writeJson } from './lib/research-store.mjs';
import { readVoices } from './lib/voices.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? '';
};
const list = (name) => flag(name)?.split(',').map((s) => s.trim()).filter(Boolean) ?? null;
const dir = args.find((a, i) => !a.startsWith('--') && !['--stage', '--claims', '--skip'].includes(args[i - 1]));
const stage = flag('--stage');
const json = args.includes('--json');
const noFetch = args.includes('--no-fetch');
const only = list('--claims');
const skip = new Set(list('--skip') ?? []);

function usage(message) {
  console.log(json ? JSON.stringify({ ok: false, error: message }) : `✗ ${message}`);
  process.exit(2);
}
if (!dir || !fs.existsSync(dir)) usage('Cách dùng: node tools/research-verify.mjs research/<rid> --stage extract|evidence|script | --reuse');
const P = paths(dir);
const runId = path.basename(path.resolve(dir));
const arr = (v) => (Array.isArray(v) ? v : []);

function finish(name, report, lines) {
  writeJson(P.checks(name), { ...report, checkedAt: new Date().toISOString() });
  if (json) console.log(JSON.stringify(report));
  else console.log(lines.join('\n'));
  process.exit(report.ok ? 0 : 1);
}

/** Số slide: state.json ghi khi nạp slide; không có thì đếm tiêu đề "## Slide N" trong slide.md. */
function slideCount() {
  const state = readJson(P.state, null);
  if (Number.isInteger(state?.deck?.slides)) return state.deck.slides;
  try { return (fs.readFileSync(P.slide, 'utf8').match(/^## Slide \d+/gm) ?? []).length || null; } catch { return null; }
}

// ── --reuse ───────────────────────────────────────────────────────────────────────
if (args.includes('--reuse')) {
  const reused = [];
  for (const claim of readClaims(dir)) {
    // Claim người dùng vừa bấm "Research lại" thì không lấy từ thư viện; dữ kiện do chính lượt này lưu cũng
    // không — đó đúng là kết quả người dùng muốn làm lại.
    if (skip.has(claim.id) || readFinding(dir, claim.id)) continue;
    const fact = lookupFact(dir, claim, { excludeRun: runId });
    if (!fact) continue;
    writeJson(P.finding(claim.id), findingFromFact(claim, fact));
    reused.push({ claim: claim.id, from: fact.file, checkedAt: fact.checkedAt });
  }
  if (json) console.log(JSON.stringify({ ok: true, reused }));
  else console.log(reused.length ? reused.map((r) => `♻ ${r.claim} ← ${r.from} (soát ${r.checkedAt.slice(0, 10)})`).join('\n') : 'Không có dữ kiện nào dùng lại được.');
  process.exit(0);
}

// ── extract ───────────────────────────────────────────────────────────────────────
if (stage === 'extract') {
  const report = checkExtract({ outline: readJson(P.outline, null), claims: readJson(P.claims, null), slideCount: slideCount() });
  const claims = readClaims(dir);
  finish('extract', { ...report, claims: claims.length }, [
    `${report.ok ? '✓' : '✗'} bóc tách: ${claims.length} claim`,
    ...report.problems.map((p) => `  ✗ ${p}`),
    ...report.warnings.map((w) => `  ⚠ ${w}`),
  ]);
}

// ── evidence ──────────────────────────────────────────────────────────────────────
if (stage === 'evidence') {
  const current = readClaims(dir);
  const claims = current.filter((c) => !only || only.includes(c.id));
  const previous = readJson(P.checks('evidence'), null)?.claims ?? {};
  const results = {};
  const reference = runDate(dir);
  /** Nguồn đã thử tải lại trong lượt soát này — lỗi tạm thời thì mỗi nguồn chỉ tải lại một lần mỗi lượt. */
  const retried = new Set();
  /** Nguồn mà chữ đã lưu không khớp vân tay code ghi — đã tải lại, và người duyệt phải được biết. */
  const tamperedSources = new Set();

  for (const claim of claims) {
    const finding = readFinding(dir, claim.id);
    if (!finding) {
      results[claim.id] = { claim: claim.id, ok: false, missing: true, verdict: null, quotes: { total: 0, verified: 0, unverifiable: 0 }, problems: ['chưa có finding.json'], warnings: [] };
      continue;
    }
    // Cờ `reused` nằm trong `claims/**` — đúng thứ chặng research được phép ghi — nên nó chỉ miễn soát khi
    // đối chiếu được với một dữ kiện thật trong thư viện. Không khớp thì coi như không có cờ: soát như thường.
    const reusedFact = finding.reused ? factForReuse(dir, claim, finding) : null;
    const forged = finding.reused && !reusedFact
      ? ['cờ "dùng lại dữ kiện" không khớp dữ kiện nào trong thư viện — đã soát lại như finding thường']
      : [];
    if (reusedFact) {
      // Soát theo chính dữ kiện đã chép vào finding và ngày gốc của lượt — không theo thư viện lúc này: thư viện
      // đổi (hay đồng hồ chạy tiếp) không được làm một claim đã đạt tự trượt khi soát lại.
      const fresh = isFresh({ checkedAt: finding.reused.checkedAt, timeSensitive: claim.timeSensitive }, reference, claim.timeSensitive);
      const n = arr(finding.evidence).length;
      results[claim.id] = {
        claim: claim.id, ok: fresh, reused: finding.reused, verdict: finding.verdict,
        quotes: { total: n, verified: n, unverifiable: 0 },
        problems: fresh ? [] : ['dữ kiện dùng lại đã hết hạn hoặc không còn khớp claim — research lại'],
        warnings: fresh ? [`dùng lại dữ kiện đã soát ngày ${finding.reused.checkedAt.slice(0, 10)}`] : [],
      };
      continue;
    }

    // Tra trước mọi nguồn finding dẫn tới (việc tải trang là bất đồng bộ), rồi soát đồng bộ.
    const refs = new Set([
      ...arr(finding.evidence).map((e) => String(e?.source ?? '').trim()),
      ...arr(finding.sources).map((s) => String(s?.url ?? '').trim()),
    ].filter(Boolean));
    for (const ref of refs) {
      if (noFetch) continue;
      // Finding dẫn bằng sid (dạng tài liệu hướng dẫn) hay bằng URL đều được: tra ra URL của nguồn.
      const known = readIndex(dir).sources[ref];
      const url = /^https?:\/\//i.test(ref) ? ref : known?.url;
      if (!url) continue;
      const sid = known ? ref : sourceIdFor(dir, url);
      // Chữ trang gốc bị sửa (hoặc chưa có vân tay) thì tải lại — đây là chỗ duy nhất bảo đảm "khớp trang gốc"
      // vẫn đúng khi agent là Codex/Antigravity, hai CLI ghi được khắp repo. Trang còn nguyên thì không tải lại.
      const meta = readIndex(dir).sources[sid];
      const tampered = sid && meta?.ok && !pageTrusted(dir, sid);
      if (tampered && !retried.has(sid)) {
        retried.add(sid);
        tamperedSources.add(sid);
        saveSource(dir, url, await fetchPage(url));
        continue;
      }
      // Đã có mà lỗi tạm thời (quá giờ, 429, 5xx, mạng) thì tải lại một lần; lỗi cố định (PDF, trang rỗng) thì thôi.
      if (sid && (!isTransient(meta) || retried.has(sid))) continue;
      if (sid) retried.add(sid);
      saveSource(dir, url, await fetchPage(url));
    }
    const idx = readIndex(dir);
    const resolveSource = (ref) => {
      const sid = idx.sources[ref] ? ref : idx.urls[urlKey(ref)];
      const meta = sid ? idx.sources[sid] : null;
      if (!meta) return null;
      return { ...meta, id: sid, text: meta.ok ? pageTextOf(dir, sid) : null };
    };
    const result = checkFinding({ claim, finding, resolveSource, referenceDate: reference });
    const touched = [...refs].map((ref) => (idx.sources[ref] ? ref : idx.urls[urlKey(ref)])).filter((sid) => tamperedSources.has(sid));
    result.warnings = [
      ...forged,
      ...(touched.length ? [`chữ trang gốc của ${[...new Set(touched)].join(', ')} không khớp bản Studio đã tải — đã tải lại và soát với trang thật`] : []),
      ...result.warnings,
    ];
    results[claim.id] = result;
    if (result.ok) {
      const saved = saveFact(dir, { claim, finding, sources: idx.sources, runId });
      if (saved) result.savedFact = saved;
    }
  }

  // Chỉ giữ kết quả của claim còn trong danh sách — claim đã bỏ ở cổng 1/2 không được để lại dấu "đạt".
  const ids = new Set(current.map((c) => c.id));
  const merged = Object.fromEntries(Object.entries({ ...previous, ...results }).filter(([id]) => ids.has(id)));
  const all = current.map((c) => merged[c.id]).filter(Boolean);
  const ok = Object.values(results).every((r) => r.ok);
  const report = { ok, total: current.length, passed: all.filter((r) => r.ok).length, claims: merged };
  finish('evidence', report, [
    `${ok ? '✓' : '✗'} bằng chứng: ${report.passed}/${report.total} claim qua soát`,
    ...Object.values(results).flatMap((r) => [
      `  ${r.ok ? '✓' : '✗'} ${r.claim} ${r.verdict ?? ''} · ${r.quotes.verified}/${r.quotes.total} trích đoạn khớp trang gốc${r.reused ? ' · dùng lại' : ''}`,
      ...r.problems.map((p) => `      ✗ ${p}`),
      ...r.warnings.map((w) => `      ⚠ ${w}`),
    ]),
  ]);
}

// ── script ────────────────────────────────────────────────────────────────────────
if (stage === 'script') {
  let markdown = '';
  try { markdown = fs.readFileSync(P.script, 'utf8'); } catch { usage(`chưa có ${P.script}`); }
  const evidence = readJson(P.checks('evidence'), null)?.claims ?? {};
  const outline = arr(readJson(P.outline, null)?.outline);
  const claims = Object.fromEntries(readClaims(dir).map((c) => [c.id, { ok: Boolean(evidence[c.id]?.ok), verdict: evidence[c.id]?.verdict ?? null }]));
  const report = checkScript({ markdown, deliveries: readVoices().deliveries, outline, claims, knownText: knownNumbers(dir) });
  const problems = report.issues.filter((i) => i.level === 'problem');
  const warnings = report.issues.filter((i) => i.level === 'warning');
  const where = (i) => (i.cue ? `câu ${i.cue}` : i.line ? `dòng ${i.line}` : 'chung');
  finish('script', report, [
    `${report.ok ? '✓' : '✗'} kịch bản: ${report.stats.cues} câu · ~${Math.round(report.stats.seconds / 60 * 10) / 10} phút · phủ ${report.coverage.covered}/${report.coverage.slides} slide`,
    ...problems.map((i) => `  ✗ ${where(i)}: ${i.message}`),
    ...warnings.map((i) => `  ⚠ ${where(i)}: ${i.message}`),
  ]);
}

usage('Thiếu --stage extract|evidence|script (hoặc --reuse).');
