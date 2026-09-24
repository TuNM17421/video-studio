/**
 * Thư viện dữ kiện đã kiểm — `research/_facts/`, chỉ nằm trên máy người dùng (gitignore).
 *
 * Mỗi claim qua được soát bằng chứng được lưu lại theo câu hỏi chuẩn hoá (`key` do chặng bóc tách đặt, vd
 * "gpt-4 context window"). Bài sau gặp lại đúng điều đó mà dữ kiện còn hạn thì dùng lại, không tốn một lượt
 * tìm web nào. Các bài trong một khoá học trùng nhau nhiều, nên đây là chỗ tiết kiệm token lớn nhất về lâu dài.
 *
 * Dùng lại chỉ khi **cả khoá lẫn câu của slide** trùng: kết luận (đúng / cần sửa / sai) là phán xét về đúng câu
 * slide đó. Cùng khoá "gpt-4 context window" mà slide này ghi 128K, slide kia ghi 32K thì kết luận của bài trước
 * không áp được cho bài sau — bài sau phải research lại.
 *
 * Hạn dùng: dữ kiện hay đổi 90 ngày, dữ kiện ổn định 365 ngày — tính từ ngày soát; claim hoặc dữ kiện nào
 * đánh dấu hay đổi thì lấy hạn ngắn.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { normalize } from './page-text.mjs';
import { readJson, writeJson } from './research-store.mjs';

const DAY_MS = 24 * 3600 * 1000;
export const TTL_DAYS = { volatile: 90, stable: 365 };

/** Thư mục thư viện: cạnh các lượt research (`research/_facts`). */
export const factsDir = (runDir) => path.join(path.dirname(path.resolve(runDir)), '_facts');

const normKey = (key) => normalize(key).replace(/[?!.]+$/, '');

/** "GPT-4 Context Window?" → "gpt-4-context-window" — bỏ dấu để "cửa sổ ngữ cảnh" và "cua so ngu canh" là một. */
export function factSlug(key) {
  return String(key ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/**
 * Tên file của một khoá: phần đọc được + băm của khoá đầy đủ. Chỉ lấy slug thì "c++ first release" và
 * "c# first release" cùng thành "c-first-release", và câu hỏi dài bị cắt ở 60 ký tự thì hai câu khác nhau trùng file.
 */
export function factFile(key) {
  const slug = factSlug(key);
  if (!slug) return null;
  return `${slug}-${createHash('sha1').update(normKey(key)).digest('hex').slice(0, 8)}.json`;
}

/**
 * Tên file của một claim — **theo câu của slide**, không theo `key`.
 *
 * `key` là một cụm tiếng Anh do chặng bóc tách tự nghĩ ra lại ở mỗi lượt, nên cùng một điều có thể thành
 * "chatgpt 100 million users milestone" lần này và "chatgpt 100m users milestone" lần sau — hai file khác
 * nhau, và bài sau research lại từ đầu mà không dòng log nào báo là đã trượt cache. Đo thật: ba cách viết
 * gần giống nhau cho ra ba file khác nhau, mỗi lần trượt là một lô research đầy đủ (50–125 giây).
 * `claim.text` là dòng slide nguyên văn — cùng bài giảng thì nó giống hệt nhau.
 */
export function claimFile(claim) {
  const text = String(claim?.text ?? '').trim();
  if (!text) return null;
  // Cả phần đọc được lẫn phần băm đều lấy từ câu slide: lấy slug theo `key` thì ba cách viết khác nhau vẫn
  // ra ba tên file khác nhau dù băm đã giống — vẫn trượt cache như cũ.
  const slug = factSlug(text);
  if (!slug) return null;
  return `${slug}-${createHash('sha1').update(normalize(text)).digest('hex').slice(0, 8)}.json`;
}

export function isFresh(fact, now = Date.now(), timeSensitive = false) {
  const checked = Date.parse(fact?.checkedAt ?? '');
  if (!Number.isFinite(checked)) return false;
  const ttl = (fact.timeSensitive || timeSensitive ? TTL_DAYS.volatile : TTL_DAYS.stable) * DAY_MS;
  return now - checked <= ttl;
}

/**
 * Một dữ kiện đã lưu có nói về đúng claim này không — **một** luật cho cả lúc tra (`lookupFact`) lẫn lúc soát cờ
 * dùng lại (`factForReuse`). Hai bên từng khác nhau: tra nhận khoá *hoặc* câu hỏi, soát lại đòi khoá — nên một
 * dữ kiện tra ra theo câu hỏi (khoá đặt lại khác) bị soát coi là cờ giả, và claim đi research lại từ đầu.
 *
 * Câu slide phải trùng: kết luận (đúng / cần sửa / sai) là phán xét về **đúng câu đó**. Cùng câu mà khác số liệu
 * là bài khác, phải research lại. Và phải đúng **điều đang hỏi**: một câu slide có thể sinh hai claim hỏi hai
 * chuyện khác nhau. Nhận khoá hoặc câu hỏi, một trong hai — `key` là cụm agent tự đặt lại mỗi lượt nên đòi cả
 * hai là trượt oan.
 */
export function factMatchesClaim(fact, claim) {
  if (normalize(fact?.claimText ?? '') !== normalize(claim?.text ?? '')) return false;
  const sameKey = normKey(fact.key) === normKey(claim.key);
  const sameQuestion = normalize(fact.question ?? '') === normalize(claim.question ?? '');
  return sameKey || sameQuestion;
}

/**
 * Dữ kiện dùng lại được cho một claim, hoặc null. `excludeRun`: bỏ qua dữ kiện do chính lượt này lưu — "Research
 * lại claim này" không được trả lời bằng đúng kết quả người dùng vừa muốn làm lại.
 */
export function lookupFact(runDir, claim, { now = Date.now(), excludeRun = null } = {}) {
  // Tên file mới đặt theo câu slide; tên cũ đặt theo `key` — vẫn đọc được để thư viện đã có không mất trắng.
  for (const file of [claimFile(claim), factFile(claim?.key)].filter(Boolean)) {
    const fact = readJson(path.join(factsDir(runDir), file), null);
    if (!fact) continue;
    if (!factMatchesClaim(fact, claim)) continue;
    if (excludeRun && fact.run === excludeRun) continue;
    if (isFresh(fact, now, claim.timeSensitive)) return { ...fact, file: `_facts/${file}` };
  }
  return null;
}

/**
 * Lưu một claim đã qua soát. Trích đoạn giữ kèm URL (không kèm sid — sid chỉ có nghĩa trong một lượt), để
 * lượt sau dùng lại vẫn biết nguồn ở đâu.
 */
export function saveFact(runDir, { claim, finding, sources, runId, warnings = [], checkedAt = new Date().toISOString() }) {
  const file = claimFile(claim);
  if (!file || !['ok', 'fix', 'wrong'].includes(finding.verdict)) return null;
  const urlOf = (ref) => sources[ref]?.url ?? ref;
  const fact = {
    key: claim.key,
    claimText: claim.text,
    question: claim.question,
    timeSensitive: Boolean(claim.timeSensitive),
    verdict: finding.verdict,
    answer: finding.answer ?? null,
    corrected: finding.corrected ?? null,
    reason: finding.reason ?? null,
    checkedAt,
    run: runId,
    sources: (Array.isArray(finding.sources) ? finding.sources : []).map(({ id, ...s }) => ({ ...s, url: s.url ?? urlOf(id) })),
    evidence: (Array.isArray(finding.evidence) ? finding.evidence : []).map((e) => ({ url: urlOf(e.source), quote: e.quote, stance: e.stance })),
    // Cảnh báo lúc soát gốc (nguồn toàn báo, nhãn "official" tự khai, không ghi ngày…) đi theo dữ kiện: bài sau dùng
    // lại thì người duyệt vẫn thấy đúng những điều đó, không chỉ một dòng "đã soát ngày …".
    warnings: (Array.isArray(warnings) ? warnings : []).filter((w) => typeof w === 'string' && w.trim()),
  };
  fs.mkdirSync(factsDir(runDir), { recursive: true });
  writeJson(path.join(factsDir(runDir), file), fact);
  return `_facts/${file}`;
}

/**
 * Dữ kiện thật đứng sau cờ `reused` của một finding, hoặc null.
 *
 * `claims/**` là thứ chặng research được phép ghi, nên `reused` là một dòng **agent tự gõ ra được**. Nếu phần
 * soát tin thẳng vào nó thì cách rẻ nhất để đóng một claim khó là khai bừa "đã kiểm ở bài trước": không lượt
 * tìm web nào, không trích đoạn nào, mà vẫn `ok`. Vì thế mỗi trường của cờ phải khớp đúng dữ kiện trong thư
 * viện — kể cả ngày soát (không thì agent tự gia hạn) và từng trích đoạn (không thì nó mượn một dữ kiện thật
 * để chở một kết luận khác).
 */
export function factForReuse(runDir, claim, finding) {
  const from = String(finding?.reused?.from ?? '').replace(/^_facts[/\\]/, '');
  // Chỉ nhận đúng tên file chuẩn của claim này (mới hoặc cũ) — `from` là chữ agent viết, không phải đường
  // dẫn để đi theo.
  const file = [claimFile(claim), factFile(claim?.key)].find((f) => f && f === from);
  if (!file) return null;
  const fact = readJson(path.join(factsDir(runDir), file), null);
  if (!fact || !factMatchesClaim(fact, claim)) return null;
  // Dữ kiện do chính lượt này lưu không phải "đã kiểm ở bài trước": sau "Research lại", agent chép lại đúng kết quả
  // người duyệt vừa nghi ngờ thì claim qua mà không trích đoạn nào được soát.
  if (fact.run && fact.run === path.basename(path.resolve(runDir))) return null;
  if (fact.checkedAt !== finding.reused.checkedAt) return null;
  if (fact.verdict !== finding.verdict) return null;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const asSaved = findingFromFact(claim, { ...fact, file: `_facts/${file}` });
  if (!same(asSaved.evidence, arrOf(finding.evidence)) || !same(asSaved.sources, arrOf(finding.sources))) return null;
  if (normalize(asSaved.answer ?? '') !== normalize(finding.answer ?? '')) return null;
  if (normalize(asSaved.corrected ?? '') !== normalize(finding.corrected ?? '')) return null;
  return fact;
}

const arrOf = (v) => (Array.isArray(v) ? v : []);

/**
 * Gỡ khỏi thư viện dữ kiện mà **chính lượt này** đã lưu cho một claim — khi người duyệt bấm "Research lại": họ không
 * tin kết quả đó nữa, thì bài sau cũng không được dùng lại nó. Dữ kiện của lượt khác thì để nguyên.
 */
export function forgetFacts(runDir, claim) {
  const run = path.basename(path.resolve(runDir));
  const removed = [];
  for (const file of new Set([claimFile(claim), factFile(claim?.key)].filter(Boolean))) {
    const p = path.join(factsDir(runDir), file);
    if (readJson(p, null)?.run !== run) continue;
    fs.rmSync(p, { force: true });
    removed.push(`_facts/${file}`);
  }
  return removed;
}

/** Dữ kiện đã lưu → finding.json của một claim trong lượt mới, đánh dấu là dùng lại. */
export function findingFromFact(claim, fact) {
  return {
    claim: claim.id,
    verdict: fact.verdict,
    answer: fact.answer,
    ...(fact.corrected ? { corrected: fact.corrected } : {}),
    ...(fact.reason ? { reason: fact.reason } : {}),
    sources: fact.sources,
    evidence: fact.evidence.map((e) => ({ source: e.url, quote: e.quote, stance: e.stance })),
    reused: { from: fact.file, checkedAt: fact.checkedAt },
  };
}
