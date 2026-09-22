#!/usr/bin/env node
/**
 * Soát một kịch bản bài giảng theo `templates/kich-ban-co-ban.md` — **một lệnh cho cả hai pipeline**.
 *
 *   node tools/script-check.mjs projects/<id>/kich-ban-goc.md
 *   node tools/script-check.mjs research/<rid>/output/kich-ban.md --run research/<rid>
 *   … [--json]
 *
 * Vì sao có file này: kịch bản là **chỗ bàn giao** giữa pipeline đóng gói kịch bản và pipeline dựng video.
 * Trước đây chỉ bên research soát mẫu bằng code, còn bên video thì agent đọc mẫu bằng mắt — nên một kịch bản
 * viết tay hay mang từ nơi khác sang chỉ vỡ ra ở bước dựng cảnh, hoặc tệ hơn là ở bản render. Giờ cả hai bên
 * gọi đúng lệnh này, và người viết tay cũng gọi được.
 *
 * Không có `--run` thì chỉ soát **hình thức** (mẫu, kiểu đọc, lời đọc phát âm được). Có `--run` trỏ tới một
 * lượt research thì soát thêm phần **nội dung có căn cứ**: câu dẫn nguồn nào, con số nghe thấy có trong slide
 * hay finding không, slide nào chưa có câu.
 *
 * Mã thoát: 0 đạt (có thể còn cảnh báo), 1 có lỗi phải sửa, 2 gọi sai.
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkScript } from './lib/research-check.mjs';
import { knownNumbers, readClaims, readJson, paths } from './lib/research-store.mjs';
import { lintScript, parseScript } from './lib/script-lint.mjs';
import { readVoices } from './lib/voices.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? null;
};
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--run');
const run = flag('--run');

function die(message) {
  if (json) console.log(JSON.stringify({ ok: false, error: message }));
  else console.log(`✗ ${message}`);
  process.exit(2);
}

if (!file) die('Cách dùng: node tools/script-check.mjs <kịch bản .md> [--run research/<rid>] [--json]');
let markdown = '';
try { markdown = fs.readFileSync(file, 'utf8'); } catch { die(`không đọc được ${file}`); }

/** Có lượt research kèm theo thì soát luôn phần căn cứ; không thì chỉ soát hình thức. */
function report() {
  if (!run) {
    const script = parseScript(markdown);
    const { issues, stats } = lintScript(script, { deliveries: readVoices().deliveries });
    return {
      ok: !issues.some((i) => i.level === 'problem'),
      scope: 'hình thức',
      stats,
      coverage: null,
      issues,
    };
  }
  if (!fs.existsSync(run)) die(`không thấy lượt research ${run}`);
  const P = paths(run);
  const evidence = readJson(P.checks('evidence'), null)?.claims ?? {};
  const outline = readJson(P.outline, null)?.outline ?? [];
  const claims = Object.fromEntries(readClaims(run).map((c) => [c.id, { ok: Boolean(evidence[c.id]?.ok), verdict: evidence[c.id]?.verdict ?? null, slides: Array.isArray(c.slides) ? c.slides : [] }]));
  const cues = Number(readJson(P.state, null)?.options?.cues);
  const out = checkScript({ markdown, deliveries: readVoices().deliveries, outline, claims, knownText: knownNumbers(run), target: Number.isInteger(cues) ? cues : null });
  return { ...out, scope: 'hình thức + căn cứ' };
}

const result = report();
if (json) {
  console.log(JSON.stringify(result));
} else {
  const where = (i) => (i.cue ? `câu ${i.cue}` : i.line ? `dòng ${i.line}` : 'chung');
  const minutes = Math.round((result.stats.seconds / 60) * 10) / 10;
  console.log([
    `${result.ok ? '✓' : '✗'} ${path.basename(file)}: ${result.stats.cues} câu · ~${minutes} phút · soát ${result.scope}`,
    ...(result.coverage ? [`  phủ ${result.coverage.covered}/${result.coverage.slides} slide`] : []),
    ...result.issues.filter((i) => i.level === 'problem').map((i) => `  ✗ ${where(i)}: ${i.message}`),
    ...result.issues.filter((i) => i.level === 'warning').map((i) => `  ⚠ ${where(i)}: ${i.message}`),
  ].join('\n'));
}
process.exit(result.ok ? 0 : 1);
