#!/usr/bin/env node
/**
 * Gộp hai nguồn đo của một lần dựng video thành MỘT báo cáo để cải thiện workflow:
 *
 *   projects/<id>/TRACE.md      — người viết: vì sao đỏ, tài liệu sai ở đâu, chờ bao lâu
 *   projects/<id>/.studio/runs.jsonl — máy ghi: mỗi stage bao lâu, mấy lượt, mấy lần hỏng, token
 *
 *   node tools/trace-report.mjs --video <id> [--out <file>] [--json]
 *
 * Ra `projects/<id>/TRACE-REPORT.md`: bảng stage × (phút · lượt · lỗi · token) + danh sách friction
 * xếp theo tần suất, tách bốn loại: tài liệu · tool · gate (kèm nhánh "báo giả") · chờ.
 *
 * VÌ SAO CÓ FILE NÀY. Đợt 21/09/2026 tốn ~3,7M token cho 5 lane audit + 5 lane sửa, và phần lớn phát
 * hiện đắt nhất ("tài liệu ghi 6 bước, tool in 9") chỉ có trong đầu lane vừa làm xong. Ledger đo
 * được thời gian nhưng không đo được sự hiểu lầm. TRACE.md bắt lane ghi lại; file này xếp chúng
 * theo tần suất để biết nên sửa cái nào trước.
 *
 * KHÔNG có TRACE.md vẫn ra báo cáo hợp lệ — phần ledger vẫn đầy đủ, phần friction ghi rõ là thiếu
 * nguồn. Đó là ca thường gặp với video dựng TRƯỚC khi có hạ tầng này.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workflowReport } from './workflow-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = `usage: node tools/trace-report.mjs --video <id> [--out <file>] [--json]
       node tools/trace-report.mjs --video <id> --stamp "<LANE-NN> · <stage> · <vai>"

  --video <id>  video cần tổng hợp (projects/<id>/)
  --out <file>  mặc định projects/<id>/TRACE-REPORT.md
  --json        in JSON ra stdout thay vì ghi file
  --stamp <t>   APPEND một tiêu đề mục vào TRACE.md kèm giờ THẬT của máy + khuôn bảy trường rỗng,
                rồi in ra vị trí để lane điền thân mục. Giờ do \`Date\` lấy, không gõ tay.`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(0); }
const value = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const videoId = value('video');
if (!videoId) { console.error(USAGE); process.exit(2); }

const projectDir = path.join(ROOT, 'projects', videoId);
if (!fs.existsSync(projectDir)) {
  console.error(`✗ không thấy projects/${videoId}/ — kiểm lại id, hoặc tạo bằng \`node tools/new-video.mjs ${videoId} --style poster\``);
  process.exit(2);
}

/*
 * ── `--stamp` ─────────────────────────────────────────────────────────────────────────────────
 * Retro d05-v06 F10: giờ trong TRACE.md là BỊA. Owner và lane đều tự ước, có mục ghi giờ ở TƯƠNG
 * LAI, và bảng "phút mỗi stage" vì vậy vô nghĩa — đúng thứ TRACE sinh ra để đo. Từ nay lane KHÔNG
 * gõ tiêu đề mục: chạy lệnh này, máy đóng dấu giờ thật rồi lane chỉ điền thân mục.
 */
if (argv.includes('--stamp')) {
  const label = value('stamp');
  if (!label || label.startsWith('--')) {
    console.error('✗ --stamp cần một nhãn, ví dụ: --stamp "SCENE-02 · scenes · vai scene"');
    process.exit(2);
  }
  const file = path.join(projectDir, 'TRACE.md');
  if (!fs.existsSync(file)) {
    console.error(`✗ không thấy ${path.relative(ROOT, file)} — chép từ templates/video/<style>/project/TRACE.md`);
    process.exit(2);
  }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  // Giờ ĐỊA PHƯƠNG của máy, không UTC: báo cáo và TRACE phải đọc ra cùng một mốc với đồng hồ người dùng.
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const entry = [
    '',
    `## ${label}`,
    `- thời gian: ${stamp} → <chạy lại \`--stamp\` lúc đóng, hoặc điền giờ kết thúc>`,
    '- lệnh đã chạy: <số>',
    '- gate đỏ: <gate nào ×mấy lần — nguyên nhân thật; thêm chữ `báo giả` nếu tool báo sai>',
    '- làm lại: <mấy lượt — vì sao>',
    '- tài liệu: <chỗ tài liệu SAI/THIẾU khiến phải đoán — `không` nếu không có>',
    '- tool: <chỗ tool vấp / nuốt lỗi — `không` nếu không có>',
    '- chờ: <Kaggle/render/shoot bao nhiêu phút — `không` nếu không có>',
    '- token: <số token của lane này, lấy từ thông báo hoàn tất>',
    '- đề xuất: <một câu, sửa được ở đâu>',
    '',
  ].join('\n');
  fs.appendFileSync(file, entry);
  console.log(`✓ đã đóng dấu "${label}" lúc ${stamp} (giờ máy) vào ${path.relative(ROOT, file)}`);
  console.log('  Điền thân mục ngay bên dưới tiêu đề vừa tạo — đừng sửa dòng `thời gian`.');
  process.exit(0);
}

/** Bảy nhãn của một mục TRACE. Đổi nhãn ở template thì phải đổi ở đây — cố ý để lệch là thấy ngay. */
const FIELDS = ['thời gian', 'lệnh đã chạy', 'gate đỏ', 'làm lại', 'tài liệu', 'tool', 'chờ', 'token', 'đề xuất'];
/** Trường nào sinh ra friction loại nào. `gate đỏ` tách tiếp thành `gate` và `gate báo giả`. */
const FRICTION_OF = { 'tài liệu': 'tài liệu', tool: 'tool', 'gate đỏ': 'gate', 'chờ': 'chờ' };
const EMPTY = /^(không|none|-|n\/a|chưa có)\.?$/i;

/**
 * Đọc TRACE.md thành danh sách mục. Chỉ nhận heading `## <stage> · <vai>` NẰM SAU dòng mốc APPEND —
 * nhờ vậy phần hướng dẫn ở đầu template (có cả một khuôn mẫu trong code fence) không bị đếm thành
 * một mục thật.
 *
 * Bỏ thêm heading còn CHỖ TRỐNG `<…>`: một khuôn mẫu thứ hai có thể nằm SAU mốc APPEND và KHÔNG
 * trong code fence (ca thật: `d05-v06`, dòng 73 — orchestrator chép khuôn xuống dưới cho dễ dùng),
 * và khi đó nó lọt vào bảng thành một stage tên `<LANE>-NN` với 0 phút (chạy thật 21/09/2026).
 */
function readTrace(file) {
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, 'utf8');
  const marker = src.indexOf('APPEND TỪ ĐÂY');
  const body = marker >= 0 ? src.slice(src.indexOf('\n', marker) + 1) : src;
  const entries = [];
  let current = null;
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const head = line.match(/^##\s+(.+?)\s*$/);
    if (head && /<[^>]+>/.test(head[1])) { current = null; continue; } // KHUÔN MẪU, không phải mục thật
    if (head) {
      const parts = head[1].split('·').map((s) => s.trim());
      const [label, stage, role] = parts.length >= 3 ? parts : [parts[0], parts[0], parts[1]];
      /*
       * Mục ĐIỀU PHỐI (`ORCH-11 · …`) là ghi chép của owner giữa hai lane, KHÔNG phải một stage
       * dựng phim. Lượt trước chúng bị đếm thành stage nên bảng "phút mỗi stage" có 42 dòng cho
       * một phim 9 stage — vô nghĩa đúng ở chỗ nó sinh ra để đo (F10).
       */
      const orch = /^ORCH\b/i.test(label);
      const headSpan = head[1].match(/\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}\s*[–—-]\s*\d{1,2}:\d{2}/)?.[0]
        ?.replace(/(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/, '$1 → $2');
      current = {
        headSpan,
        label,
        lane: label.replace(/-\d+.*$/, ''),
        orch,
        stage: orch ? '(điều phối)' : (stage || label || '(không ghi stage)'),
        role: role || '(không ghi vai)',
        fields: {}, lines: 0,
      };
      entries.push(current);
      continue;
    }
    if (!current) continue;
    current.lines += 1;
    const field = line.match(/^\s*[-*]\s*([^:]+?)\s*:\s*(.*)$/);
    if (!field) continue;
    const name = field[1].trim().toLowerCase();
    if (FIELDS.includes(name)) current.fields[name] = field[2].trim();
  }
  return { file, entries };
}

/**
 * `2026-09-21 14:05 → 15:20` → số phút. Nhận cả ba khuôn đã gặp thật trong TRACE của d05-v06:
 *   `<ngày> HH:MM → HH:MM` · `<ngày> HH:MM → <ngày> HH:MM` · `<ngày> HH:MM–HH:MM` (gạch nối)
 * và cả `~150 phút` (lane ước bằng chữ). Không đọc được → null, mục vẫn được giữ.
 */
function minutesOf(span) {
  if (!span) return null;
  const flat = String(span).match(/~?\s*(\d+)\s*phút/i);
  if (flat && !/\d{1,2}:\d{2}/.test(span)) return Number(flat[1]);
  const parts = span.split(/→|->|–|—/).map((s) => s.trim());
  if (parts.length !== 2) return null;
  const day = parts[0].match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  const stamp = (s) => {
    const d = s.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? day;
    const t = s.match(/\d{1,2}:\d{2}/)?.[0];
    return d && t ? Date.parse(`${d}T${t.padStart(5, '0')}:00`) : NaN;
  };
  const [a, b] = parts.map(stamp);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 60000);
}

const trace = readTrace(path.join(projectDir, 'TRACE.md'));
const ledger = workflowReport(ROOT, videoId);

// ── Bảng stage ────────────────────────────────────────────────────────────────────────────────
const stages = new Map();
const row = (name) => {
  if (!stages.has(name)) stages.set(name, { stage: name, ledgerMin: 0, runs: 0, failures: 0, tokens: 0, traceMin: null, traceCmds: 0, entries: 0 });
  return stages.get(name);
};
for (const [name, s] of Object.entries(ledger.byStage ?? {})) {
  const r = row(name);
  r.ledgerMin = Math.round((s.durationMs ?? 0) / 60000);
  r.runs = s.runs ?? 0;
  r.failures = s.failures ?? 0;
  r.tokens = s.agentTokens ?? 0;
}
for (const e of (trace?.entries ?? []).filter((e) => !e.orch)) {
  const r = row(e.stage);
  r.entries += 1;
  const m = minutesOf(e.fields['thời gian'] ?? e.headSpan);
  if (m != null) r.traceMin = (r.traceMin ?? 0) + m;
  const c = Number(String(e.fields['lệnh đã chạy'] ?? '').match(/\d+/)?.[0]);
  if (Number.isFinite(c)) r.traceCmds += c;
}

// ── Friction ──────────────────────────────────────────────────────────────────────────────────
const friction = new Map();
for (const e of trace?.entries ?? []) {
  for (const [field, kind] of Object.entries(FRICTION_OF)) {
    const text = e.fields[field];
    if (!text || EMPTY.test(text)) continue;
    const type = kind === 'gate' && /báo giả/i.test(text) ? 'gate báo giả' : kind;
    const key = `${type}\u0000${text}`;
    if (!friction.has(key)) friction.set(key, { type, text, count: 0, where: new Set() });
    const f = friction.get(key);
    f.count += 1;
    f.where.add(`${e.stage}/${e.role}`);
  }
}
const ORDER = ['tài liệu', 'tool', 'gate báo giả', 'gate', 'chờ'];
const frictions = [...friction.values()].sort((a, b) => b.count - a.count || ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
const byType = ORDER.map((t) => ({ type: t, count: frictions.filter((f) => f.type === t).reduce((s, f) => s + f.count, 0) })).filter((x) => x.count);

/*
 * Chi phí theo LANE, không theo stage: token là của một phiên agent, và một lane có thể chạm nhiều
 * stage. Owner ghi một dòng `token: <số>` trong mục — đó là con số trong thông báo hoàn tất của
 * lane, thứ duy nhất đo được từ ngoài.
 */
const byLane = new Map();
for (const e of trace?.entries ?? []) {
  const n = Number(String(e.fields.token ?? '').replace(/[.,\s]/g, '').match(/\d+/)?.[0]);
  const min = minutesOf(e.fields['thời gian'] ?? e.headSpan);
  const cmds = Number(String(e.fields['lệnh đã chạy'] ?? '').match(/\d+/)?.[0]);
  if (!byLane.has(e.lane)) byLane.set(e.lane, { lane: e.lane, entries: 0, tokens: 0, measured: 0, minutes: 0, cmds: 0, orch: e.orch });
  const L = byLane.get(e.lane);
  L.entries += 1;
  if (Number.isFinite(n)) { L.tokens += n; L.measured += 1; }
  if (min != null) L.minutes += min;
  if (Number.isFinite(cmds)) L.cmds += cmds;
}

const suggestions = (trace?.entries ?? [])
  .map((e) => ({ stage: e.stage, role: e.role, text: e.fields['đề xuất'] }))
  .filter((s) => s.text && !EMPTY.test(s.text));

const gaps = [];
if (!trace) gaps.push('**không có `TRACE.md`** — video này dựng trước khi có hạ tầng trace, hoặc lane chưa append mục nào. Bảng dưới chỉ có phần ledger đo được; phần "vì sao" không khôi phục lại được.');
else {
  if (!trace.entries.length) gaps.push('`TRACE.md` có nhưng **chưa mục nào được append** — mỗi lane phải ghi một mục khi kết thúc việc.');
  const missing = (trace.entries ?? []).flatMap((e) => FIELDS.filter((f) => !(f in e.fields)).map((f) => `${e.stage}/${e.role}: thiếu trường \`${f}\``));
  if (missing.length) gaps.push(`${missing.length} trường bỏ trống — ${missing.slice(0, 6).join(' · ')}${missing.length > 6 ? ' …' : ''}`);
  const tooLong = (trace.entries ?? []).filter((e) => e.lines > 15);
  if (tooLong.length) gaps.push(`${tooLong.length} mục dài quá 15 dòng (${tooLong.map((e) => e.stage).join(', ')}) — phần thừa thuộc về báo cáo của lane.`);
}
const orchCount = (trace?.entries ?? []).filter((e) => e.orch).length;
if (orchCount) gaps.push(`${orchCount} mục \`ORCH-*\` là ghi chép ĐIỀU PHỐI, đã tách khỏi bảng stage (chúng không phải một stage dựng phim) nhưng vẫn tính trong bảng chi phí theo lane.`);
if (!ledger.usage?.measuredRuns) gaps.push('ledger **chưa có lượt nào kèm token** — owner phải ghi bằng `node tools/video-workflow.mjs run finish --video <id> --run-id <id> --status done --input-tokens N --output-tokens N --model <tên>`.');

// ── Xuất ──────────────────────────────────────────────────────────────────────────────────────
const rows = [...stages.values()].sort((a, b) => b.ledgerMin - a.ledgerMin || b.runs - a.runs);
const num = (n) => (n ?? 0).toLocaleString('vi-VN');

if (argv.includes('--json')) {
  console.log(JSON.stringify({ video: videoId, hasTrace: Boolean(trace), stages: rows.map((r) => ({ ...r, traceMin: r.traceMin })), frictions: frictions.map((f) => ({ ...f, where: [...f.where] })), byType, suggestions, gaps }, null, 2));
  process.exit(0);
}

const out = [];
out.push(`# TRACE-REPORT — ${videoId}`, '');
// Giờ ĐỊA PHƯƠNG của máy. Bản cũ in UTC nên lệch 7 tiếng so với mọi mốc lane ghi tay (F10).
const pad2 = (n) => String(n).padStart(2, '0');
const nowLocal = (() => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; })();
out.push(`Sinh bằng \`node tools/trace-report.mjs --video ${videoId}\` lúc ${nowLocal} (giờ máy).`);
out.push(`Nguồn: \`projects/${videoId}/.studio/runs.jsonl\` (máy đo) ${trace ? `+ \`projects/${videoId}/TRACE.md\` (${trace.entries.length} mục)` : '— **không có `TRACE.md`**'}.`, '');

out.push('## 1. Stage × số đo', '');
out.push('| Stage | Phút (ledger) | Phút (TRACE) | Lượt | Lỗi | Token | Mục TRACE |');
out.push('|---|---:|---:|---:|---:|---:|---:|');
for (const r of rows) {
  out.push(`| ${r.stage} | ${num(r.ledgerMin)} | ${r.traceMin == null ? '—' : num(r.traceMin)} | ${num(r.runs)}${r.traceCmds ? ` (+${num(r.traceCmds)} lệnh)` : ''} | ${num(r.failures)} | ${r.tokens ? num(r.tokens) : '—'} | ${r.entries || '—'} |`);
}
const total = rows.reduce((s, r) => ({ min: s.min + r.ledgerMin, runs: s.runs + r.runs, fail: s.fail + r.failures, tok: s.tok + r.tokens }), { min: 0, runs: 0, fail: 0, tok: 0 });
out.push(`| **tổng** | **${num(total.min)}** | | **${num(total.runs)}** | **${num(total.fail)}** | **${total.tok ? num(total.tok) : '—'}** | |`, '');
out.push(`Tự động hoá: ${Math.round((ledger.automationRatio ?? 0) * 100)}% lượt là stage tất định · ${num(ledger.usage?.measuredRuns ?? 0)}/${num(ledger.runs?.agent ?? 0)} lượt agent có đo token.`, '');

out.push('## 1b. Chi phí theo LANE', '');
if (!byLane.size) out.push('_Không có mục TRACE nào._', '');
else {
  const lanes = [...byLane.values()].sort((a, b) => b.tokens - a.tokens || b.minutes - a.minutes);
  out.push('| Lane | Mục | Phút | Lệnh | Token | Đo được |');
  out.push('|---|---:|---:|---:|---:|---:|');
  for (const L of lanes) {
    out.push(`| ${L.lane}${L.orch ? ' _(điều phối)_' : ''} | ${L.entries} | ${num(L.minutes)} | ${num(L.cmds)} | ${L.tokens ? num(L.tokens) : '—'} | ${L.measured}/${L.entries} |`);
  }
  const tt = lanes.reduce((s, L) => ({ t: s.t + L.tokens, m: s.m + L.minutes, c: s.c + L.cmds, e: s.e + L.entries, q: s.q + L.measured }), { t: 0, m: 0, c: 0, e: 0, q: 0 });
  out.push(`| **tổng** | **${tt.e}** | **${num(tt.m)}** | **${num(tt.c)}** | **${tt.t ? num(tt.t) : '—'}** | **${tt.q}/${tt.e}** |`, '');
  if (tt.q < tt.e) out.push(`_${tt.e - tt.q}/${tt.e} mục chưa có dòng \`token:\` — owner điền số trong thông báo hoàn tất của lane._`, '');
}

out.push('## 2. Friction — xếp theo tần suất', '');
if (!frictions.length) {
  out.push(trace ? '_Không mục TRACE nào ghi friction._' : '_Không có `TRACE.md` → không có dữ liệu friction. Cột "Lỗi" ở bảng trên là thứ duy nhất còn lại, và nó không nói được vì sao._', '');
} else {
  out.push(`Theo loại: ${byType.map((t) => `**${t.type}** ${t.count}`).join(' · ')}`, '');
  out.push('| # | Loại | Gặp ở | Lần | Nội dung |');
  out.push('|---:|---|---|---:|---|');
  frictions.forEach((f, i) => out.push(`| ${i + 1} | ${f.type} | ${[...f.where].join(', ')} | ${f.count} | ${f.text.replace(/\|/g, '\\|')} |`));
  out.push('');
}

out.push('## 3. Đề xuất sửa workflow (nguyên văn từ lane)', '');
if (!suggestions.length) out.push('_Chưa lane nào ghi đề xuất._', '');
else { for (const s of suggestions) out.push(`- **${s.stage} / ${s.role}** — ${s.text}`); out.push(''); }

out.push('## 4. Chỗ báo cáo này KHÔNG kết luận được', '');
if (!gaps.length) out.push('_Không có — cả hai nguồn đều đầy đủ._', '');
else { for (const g of gaps) out.push(`- ${g}`); out.push(''); }

const outFile = value('out') ? path.resolve(value('out')) : path.join(projectDir, 'TRACE-REPORT.md');
fs.writeFileSync(outFile, `${out.join('\n')}\n`);
console.log(`✓ ${path.relative(ROOT, outFile)} — ${rows.length} stage · ${frictions.length} friction · ${gaps.length} chỗ chưa kết luận được`);
if (!trace) console.log('! không có TRACE.md: báo cáo chỉ có phần ledger. Lần dựng sau, mỗi lane append một mục theo templates/video/<style>/project/TRACE.md');
