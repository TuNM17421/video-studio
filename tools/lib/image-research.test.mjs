import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pageMeta } from './fetch-page.mjs';
import { researchCandidates, researchRunOf, scriptCueFor, sourcesForCues } from './image-research.mjs';
import { checkDecisions, checkSuggest, effectiveLicense } from './image-suggest.mjs';
import { parseScript } from './script-lint.mjs';

const RID = 'lich-su-ai-2609';
const SCRIPT = `# Lịch sử AI

- **Mục tiêu:** điểm lại vài cột mốc
- **Nguồn kịch bản:** đóng gói từ \`research/${RID}\`, duyệt ngày 2026-09-21, 2/2 claim qua soát bằng chứng.

## 1 · Mở đầu

### Câu 1
- **Kiểu:** kể
- **Lời:** Năm 1950, Alan Turing đặt câu hỏi nổi tiếng: máy có thể suy nghĩ không?
- **Trên màn hình:** Alan Turing · 1950
- **Nguồn:** slide:1, c1

### Câu 2
- **Kiểu:** giảng
- **Lời:** Năm 1997, Deep Blue đánh bại Garry Kasparov.
- **Trên màn hình:** Deep Blue · 1997
- **Nguồn:** slide:2, c2
`;
// cues.js tách câu 1 thành hai câu: khớp theo lời, không theo số câu.
const CUES = [
  { n: 1, text: 'Năm 1950, Alan Turing đặt câu hỏi nổi tiếng:' },
  { n: 2, text: 'máy có thể suy nghĩ không?' },
  { n: 3, text: 'Năm 1997, Deep Blue đánh bại Garry Kasparov.' },
];

/** Một repo tạm: projects/<id>/kich-ban-goc.md + research/<rid>/ có index nguồn và finding. */
function fixture({ sources, findings }) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'img-research-'));
  fs.mkdirSync(path.join(repo, 'projects', 'vid'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'projects', 'vid', 'kich-ban-goc.md'), SCRIPT);
  const run = path.join(repo, 'research', RID);
  fs.mkdirSync(path.join(run, 'sources'), { recursive: true });
  fs.writeFileSync(path.join(run, 'sources', 'index.json'), JSON.stringify({ next: 9, urls: {}, sources }));
  for (const [cid, f] of Object.entries(findings)) {
    fs.mkdirSync(path.join(run, 'claims', cid), { recursive: true });
    fs.writeFileSync(path.join(run, 'claims', cid, 'finding.json'), JSON.stringify({ claim: cid, verdict: 'ok', ...f }));
  }
  return { repo, run };
}

test('pageMeta đọc ảnh đại diện: og:image trước, rồi JSON-LD image', () => {
  assert.equal(pageMeta('<meta property="og:image" content="/img/turing.jpg"><meta name="twitter:image" content="https://x/t.jpg">').image, '/img/turing.jpg');
  assert.equal(pageMeta('<script type="application/ld+json">{"@type":"Article","image":{"url":"https://a.org/p.png"}}</script>').image, 'https://a.org/p.png');
  assert.equal(pageMeta('<title>Không ảnh</title>').image, null);
});

test('researchRunOf đọc lượt research từ dòng Nguồn kịch bản', () => {
  assert.equal(researchRunOf(SCRIPT), RID);
  assert.equal(researchRunOf('# Kịch bản viết tay\n'), null);
});

test('câu của cues.js ứng với câu của kịch bản theo lời đọc, kể cả khi cues.js tách câu', () => {
  const { cues } = parseScript(SCRIPT);
  assert.equal(scriptCueFor(cues, CUES[1]).n, 1);
  assert.equal(scriptCueFor(cues, CUES[2]).n, 2);
});

test('chỉ lấy nguồn research đã dẫn cho đúng những câu của chỗ đó', () => {
  const { run } = fixture({ sources: {}, findings: {
    c1: { sources: [{ id: 's1', kind: 'reference' }], evidence: [{ source: 's2', quote: 'x', stance: 'supports' }] },
    c2: { sources: [{ id: 's3', kind: 'news' }] },
  } });
  assert.deepEqual(sourcesForCues({ scriptText: SCRIPT, runDir: run, cues: CUES, slotCues: [1, 2] }).map((s) => s.sid), ['s1', 's2']);
  assert.deepEqual(sourcesForCues({ scriptText: SCRIPT, runDir: run, cues: CUES, slotCues: [3] }).map((s) => s.sid), ['s3']);
});

test('ứng viên research: ảnh của trang (không tải lại khi index đã có), bỏ logo, giấy phép không rõ nên chỉ tham khảo', async () => {
  const { repo } = fixture({
    sources: {
      s1: { id: 's1', url: 'https://en.wikipedia.org/wiki/Alan_Turing', title: 'Alan Turing - Wikipedia', publisher: 'Wikipedia', image: 'https://upload.wikimedia.org/turing.jpg' },
      s2: { id: 's2', url: 'https://news.example/a', title: 'Bài báo', publisher: 'News', image: 'https://news.example/static/logo-share.png' },
    },
    findings: { c1: { sources: [{ id: 's1' }, { id: 's2' }] } },
  });
  const fetchImpl = async () => { throw new Error('không được tải lại trang đã có ảnh trong index'); };
  const { candidates, rid } = await researchCandidates({ repo, videoId: 'vid', cues: CUES, slotCues: [1], fetchImpl });
  assert.equal(rid, RID);
  assert.equal(candidates.length, 1);
  assert.match(candidates[0].id, /^research:[0-9a-f]{12}$/);
  assert.equal(candidates[0].license, 'unknown');
  assert.equal(candidates[0].referenceOnly, true);
  assert.deepEqual(candidates[0].research, { rid: RID, sid: 's1', claim: 'c1' });
  // video không đóng gói từ research: không có ứng viên, không lỗi
  fs.writeFileSync(path.join(repo, 'projects', 'vid', 'kich-ban-goc.md'), '# Viết tay\n');
  assert.deepEqual((await researchCandidates({ repo, videoId: 'vid', cues: CUES, slotCues: [1], fetchImpl })).candidates, []);
});

test('ảnh chưa rõ giấy phép: được đề xuất, dùng làm tham khảo được, dùng trong video phải có giấy phép người dựng xác nhận', () => {
  const triage = { slots: [{ slot: 's1', cues: [1] }] };
  const c = { id: 'research:abc', license: 'unknown', licenseVersion: null, referenceOnly: true };
  const candidatesBySlot = { s1: { candidates: [c] } };
  const suggest = { slots: [{ slot: 's1', candidates: [{ id: c.id, fit: 'ok', why: 'Ảnh từ trang research, đúng chân dung trong câu.' }] }] };
  assert.deepEqual(checkSuggest({ suggest, triage, candidatesBySlot }).problems, []);
  const decide = (d) => checkDecisions({ decisions: { slots: { s1: { candidate: c.id, ...d } } }, triage, candidatesBySlot, suggest }).problems;
  assert.deepEqual(decide({ action: 'reference' }), []);
  assert.match(decide({ action: 'use' })[0], /chưa rõ giấy phép/);
  assert.deepEqual(decide({ action: 'use', license: 'cc-by' }), []);
  assert.match(decide({ action: 'use', license: 'cc-by-nc' })[0], /không được dùng/);
  assert.deepEqual(effectiveLicense(c, { license: 'cc-by' }), { license: 'cc-by', licenseVersion: null, confirmedBy: 'người dựng video' });
  // ảnh có giấy phép từ nguồn thì giữ giấy phép đó, bỏ qua giấy phép người dựng ghi
  assert.equal(effectiveLicense({ license: 'pd' }, { license: 'cc-by' }).license, 'pd');
});
