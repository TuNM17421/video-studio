/**
 * Các phép soát của pipeline research — hàm thuần, không chạm mạng, không đọc đĩa (người gọi đưa dữ liệu
 * vào). Ba nhóm, theo ba chỗ Studio dừng lại soát:
 *
 *   checkExtract  — outline.json + claims.json sau chặng bóc tách
 *   checkFinding  — một claims/<cid>/finding.json sau chặng research (trích đoạn, nguồn độc lập, độ mới,
 *                   kết luận khớp nguồn)
 *   checkScript   — output/kich-ban.md sau chặng viết (mẫu kịch bản, nguồn, phủ slide)
 *
 * "problem" chặn chặng sau; "warning" chỉ hiện cho người duyệt.
 */
import { normalize, quoteInText, stripMarkdown } from './page-text.mjs';
import { lintScript, parseRefs, parseScript, spokenNumbers } from './script-lint.mjs';

export const CLAIM_KINDS = ['number', 'date', 'product', 'technical', 'quote', 'example'];
export const DIFFICULTIES = ['easy', 'normal', 'hard'];
export const PRIORITIES = ['high', 'normal', 'low'];
export const VERDICTS = ['ok', 'fix', 'wrong', 'insufficient'];
export const STANCES = ['supports', 'contradicts', 'context'];
export const SOURCE_KINDS = ['official', 'paper', 'reference', 'news', 'blog'];
/** Nguồn "gốc": một nguồn loại này đủ để xác nhận claim dễ hoặc thay cho nguồn thứ hai. */
const PRIMARY = new Set(['official', 'paper', 'reference']);

/** Một trích đoạn phải dài chừng này mới chứng minh được gì — "trí tuệ nhân tạo" thì trang AI nào cũng có. */
export const MIN_QUOTE_CHARS = 25;
const YEAR_MS = 365 * 24 * 3600 * 1000;
export const MAX_CLAIMS = 25;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

// ── chặng bóc tách ────────────────────────────────────────────────────────────────

/**
 * @param {{ outline: unknown, claims: unknown, slideCount: number|null }} input
 */
export function checkExtract({ outline, claims, slideCount }) {
  const problems = [];
  const warnings = [];
  const slides = Array.isArray(outline?.outline) ? outline.outline : null;
  if (!slides) problems.push('outline.json thiếu mảng `outline`');
  const inRange = (n) => Number.isInteger(n) && n >= 1 && (!slideCount || n <= slideCount);
  for (const [i, s] of (slides ?? []).entries()) {
    if (!inRange(s?.slide)) problems.push(`outline[${i}]: số slide ${JSON.stringify(s?.slide)} không hợp lệ`);
    if (!str(s?.heading) && !(Array.isArray(s?.points) && s.points.length) && !s?.skip) warnings.push(`slide ${s?.slide}: không có tiêu đề hay ý nào`);
  }
  if (slides && slideCount && slides.length < slideCount) warnings.push(`dàn ý có ${slides.length}/${slideCount} slide`);

  const list = Array.isArray(claims?.claims) ? claims.claims : null;
  if (!list) problems.push('claims.json thiếu mảng `claims`');
  const ids = new Set();
  for (const [i, c] of (list ?? []).entries()) {
    const where = `claims[${i}]${c?.id ? ` (${c.id})` : ''}`;
    if (!/^c\d{1,3}$/.test(String(c?.id))) problems.push(`${where}: id phải dạng c1, c2…`);
    else if (ids.has(c.id)) problems.push(`${where}: id trùng`);
    else ids.add(c.id);
    if (!str(c?.text)) problems.push(`${where}: thiếu \`text\``);
    if (!str(c?.question)) problems.push(`${where}: thiếu \`question\``);
    if (!Array.isArray(c?.slides) || !c.slides.every(inRange)) problems.push(`${where}: \`slides\` phải là mảng số slide có thật`);
    if (!CLAIM_KINDS.includes(c?.kind)) problems.push(`${where}: \`kind\` phải là một trong ${CLAIM_KINDS.join('|')}`);
    if (!DIFFICULTIES.includes(c?.difficulty)) problems.push(`${where}: \`difficulty\` phải là ${DIFFICULTIES.join('|')}`);
    if (c?.priority !== undefined && !PRIORITIES.includes(c.priority)) problems.push(`${where}: \`priority\` phải là ${PRIORITIES.join('|')}`);
    if (typeof c?.timeSensitive !== 'boolean') problems.push(`${where}: \`timeSensitive\` phải là true/false`);
    if (!str(c?.key)) warnings.push(`${where}: thiếu \`key\` — không tra được thư viện dữ kiện`);
  }
  if (list && list.length > MAX_CLAIMS) problems.push(`${list.length} claim — tối đa ${MAX_CLAIMS}; giữ những claim ưu tiên cao`);
  return { ok: problems.length === 0, problems, warnings };
}

// ── chặng research ────────────────────────────────────────────────────────────────

/** Tên miền đăng ký của một URL — "vnexpress.net", "moh.gov.vn", "bbc.co.uk". */
export function publisherDomain(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return String(url ?? ''); }
  const parts = host.split('.');
  // "gov.vn", "co.uk", "edu.au"…: nhãn thứ hai từ cuối là loại tổ chức, tên thật nằm trước nó.
  const takeThree = parts.length > 2 && parts.at(-1).length === 2 && ['com', 'edu', 'gov', 'org', 'net', 'ac', 'co'].includes(parts.at(-2));
  return parts.slice(takeThree ? -3 : -2).join('.');
}

/** Nơi mà nhãn `official` tự nó đã có nghĩa: cơ quan nhà nước, trường, kho bài báo, bách khoa, tạp chí khoa học. */
const AUTHORITY = /(^|\.)(gov|edu|mil|int)(\.[a-z]{2})?$|^(arxiv\.org|wikipedia\.org|nature\.com|science\.org|acm\.org|ieee\.org|nih\.gov|who\.int)$/i;

/**
 * Nhãn `official` của một nguồn có tự kiểm được không.
 *
 * Đạt khi tên miền là một nơi có thẩm quyền sẵn, hoặc khi tên của nó xuất hiện ngay trong claim / câu trả lời
 * (openai.com cho một claim nhắc "OpenAI"). Không đạt **không có nghĩa là nguồn sai** — chỉ là máy không tự
 * xác nhận được, và chỗ đó phải do người duyệt nhìn chứ không được im lặng đi qua.
 */
export function authoritative(source, claim, finding) {
  const domain = publisherDomain(source?.url ?? '');
  if (AUTHORITY.test(domain)) return true;
  const label = domain.split('.')[0];
  if (label.length < 3) return false;
  const haystack = normalize([claim?.text, claim?.key, claim?.question, finding?.answer, finding?.corrected].filter(Boolean).join(' '))
    .replace(/[^a-z0-9]+/g, '');
  return haystack.includes(label.replace(/[^a-z0-9]+/g, ''));
}

/**
 * Số nơi xuất bản khác nhau. Cùng tên miền là một nơi; khác tên miền nhưng cùng tên nhà xuất bản
 * (ai.google.dev và blog.google đều là "Google") cũng là một nơi.
 */
export function publisherCount(sources) {
  const groups = [];
  for (const s of sources) {
    const domain = publisherDomain(s.url);
    const name = normalize(s.publisher ?? '');
    const hit = groups.find((g) => g.domains.has(domain) || (name && g.names.has(name)));
    if (hit) {
      hit.domains.add(domain);
      if (name) hit.names.add(name);
    } else groups.push({ domains: new Set([domain]), names: new Set(name ? [name] : []) });
  }
  return groups.length;
}

/** Phần dài nhất của một trích đoạn có dấu lược — để "the … a" không qua mặt được ngưỡng độ dài. */
const longestPart = (quote) => Math.max(0, ...normalize(stripMarkdown(quote)).split(/\s*\.\.\.\s*/).map((p) => p.length));

/**
 * Soát một finding.
 *
 * @param {object} args
 * @param {object} args.claim         claim tương ứng trong claims.json
 * @param {object} args.finding       nội dung finding.json
 * @param {(ref: string) => { id: string, url: string, publisher?: string|null, published?: string|null,
 *   modified?: string|null, text: string|null, error?: string|null } | null} args.resolveSource
 *   tra một nguồn theo sid hoặc URL; `text` null khi trang không đọc được
 * @param {number} args.referenceDate  ngày tạo lượt (ms) — mốc của phép soát độ mới
 */
export function checkFinding({ claim, finding, resolveSource, referenceDate }) {
  const problems = [];
  const warnings = [];
  const f = finding ?? {};
  if (f.claim !== claim.id) problems.push(`\`claim\` phải là "${claim.id}"`);
  if (!VERDICTS.includes(f.verdict)) problems.push(`\`verdict\` phải là ${VERDICTS.join('|')}`);
  if (!str(f.answer)) problems.push('thiếu `answer` — câu trả lời ngắn cho câu hỏi của claim');
  if ((f.verdict === 'fix' || f.verdict === 'wrong') && !str(f.corrected)) problems.push('kết luận fix/wrong phải có `corrected` — câu đúng để dùng trong kịch bản');
  if (f.verdict === 'insufficient' && !str(f.reason)) problems.push('kết luận insufficient phải có `reason`');

  const declared = new Map();
  for (const s of Array.isArray(f.sources) ? f.sources : []) {
    const key = str(s?.id) || str(s?.url);
    if (key) declared.set(key, s);
  }
  const evidence = Array.isArray(f.evidence) ? f.evidence : [];
  if (f.verdict !== 'insufficient' && evidence.length === 0) problems.push('không có trích đoạn nào (`evidence`)');

  const rows = evidence.map((e, i) => {
    const ref = str(e?.source);
    const quote = str(e?.quote);
    const stance = STANCES.includes(e?.stance) ? e.stance : null;
    const row = { i, ref, stance, status: 'ok', note: null, source: null };
    if (!stance) { row.status = 'bad'; row.note = `stance phải là ${STANCES.join('|')}`; return row; }
    if (!ref) { row.status = 'bad'; row.note = 'thiếu `source`'; return row; }
    if (longestPart(quote) < MIN_QUOTE_CHARS) { row.status = 'bad'; row.note = `trích đoạn ngắn quá (dưới ${MIN_QUOTE_CHARS} ký tự) để chứng minh điều gì`; return row; }
    const source = resolveSource(ref) ?? (declared.get(ref)?.url ? resolveSource(declared.get(ref).url) : null);
    row.source = source;
    if (!source) { row.status = 'bad'; row.note = `không biết nguồn "${ref}" — dùng sid do tools/page.mjs in ra`; return row; }
    if (source.text === null) { row.status = 'unverifiable'; row.note = `không đọc được trang gốc (${source.error ?? 'không rõ'})`; return row; }
    if (!quoteInText(quote, source.text)) { row.status = 'bad'; row.note = 'không có nguyên văn trong trang gốc'; return row; }
    return row;
  });
  for (const r of rows) {
    if (r.status === 'bad') problems.push(`trích đoạn ${r.i + 1} (${r.ref || '?'}): ${r.note}`);
    if (r.status === 'unverifiable') warnings.push(`trích đoạn ${r.i + 1} (${r.ref}): ${r.note}`);
  }

  const verified = rows.filter((r) => r.status === 'ok');
  const kindOf = (r) => declared.get(r.ref)?.kind ?? declared.get(r.source?.url)?.kind ?? null;
  const supports = verified.filter((r) => r.stance === 'supports');
  const contradicts = verified.filter((r) => r.stance === 'contradicts');
  const uniq = (list) => [...new Map(list.map((r) => [r.source.id, r])).values()];
  /**
   * `stance` nói về câu của slide. Kết luận "ok" dựa trên trích đoạn ủng hộ slide; kết luận "fix"/"wrong"
   * dựa trên cả trích đoạn ủng hộ lẫn phản bác — đoạn phản bác slide chính là căn cứ cho câu sửa. Chỉ đếm
   * "supports" thì một claim được sửa đúng bằng hai nguồn phản bác độc lập sẽ trượt oan (đã gặp thật).
   */
  const basis = f.verdict === 'ok' ? supports : [...supports, ...contradicts];

  // "wrong" sửa lời giảng viên nên cần căn cứ ít nhất cũng chắc như "fix": cùng luật số nguồn và độ mới.
  const judged = ['ok', 'fix', 'wrong'].includes(f.verdict);
  if (judged) {
    const sources = uniq(basis);
    if (!sources.length) {
      problems.push(f.verdict === 'ok' ? 'không có trích đoạn ủng hộ nào soát được với trang gốc' : 'không có trích đoạn nào (ủng hộ hay phản bác slide) soát được với trang gốc');
    } else {
      const primary = sources.some((r) => PRIMARY.has(kindOf(r)));
      const places = publisherCount(sources.map((r) => r.source));
      const needTwo = claim.difficulty !== 'easy';
      const official = sources.filter((r) => kindOf(r) === 'official');
      if (needTwo && places < 2 && !official.length) {
        problems.push(`claim ${claim.difficulty === 'hard' ? 'khó' : 'thường'} cần 2 nơi xuất bản độc lập hoặc 1 nguồn chính thức — mới có ${places} nơi`);
      }
      // `kind` là chữ agent tự gõ vào finding: một nguồn khai `official` miễn luôn luật hai nơi xuất bản. Máy
      // không tự biết trang nào là trang chính thức của chủ thể trong claim, nên chỗ nào không tự nhận ra được
      // thì đẩy cho người duyệt (cổng 2 dừng khi claim quan trọng hay dữ kiện hay đổi có cảnh báo) — đừng im lặng.
      if (needTwo && places < 2 && official.length && !official.some((r) => authoritative(r.source, claim, f))) {
        warnings.push(`chỉ có 1 nơi xuất bản và nhãn "official" là do agent tự khai (${publisherDomain(official[0].source.url) || '?'}) — người duyệt nên xem có đúng là trang chính thức không`);
      }
      // Hai trang báo/blog cùng thuật lại một nghiên cứu là hai tên miền nhưng **một** nguồn gốc. Đã gặp thật:
      // claim về tỉ lệ ảo giác qua soát bằng hai blog tiếp thị cùng dẫn lại một system card của OpenAI.
      if (claim.difficulty === 'hard' && !primary) {
        warnings.push('claim khó nhưng không nguồn căn cứ nào là chính thức/nghiên cứu/tham khảo — toàn báo hoặc blog thuật lại, người duyệt nên xem nguồn gốc');
      }
      if (!needTwo && !primary && places < 2) problems.push('claim dễ cần 1 nguồn chính thức/tham khảo, hoặc 2 nguồn ở hai nơi xuất bản');
    }
    if (f.verdict === 'ok' && contradicts.length) warnings.push('kết luận "ok" nhưng có trích đoạn phản bác — người duyệt nên xem');
  }

  if (claim.timeSensitive && judged) {
    const dates = uniq(basis).map((r) => Date.parse(r.source.modified ?? r.source.published ?? '')).filter(Number.isFinite);
    const newest = dates.length ? Math.max(...dates) : null;
    if (newest === null) warnings.push('dữ kiện hay đổi nhưng không nguồn căn cứ nào ghi ngày — người duyệt nên xem độ mới');
    else if (referenceDate - newest > YEAR_MS) problems.push(`dữ kiện hay đổi nhưng nguồn mới nhất là ${new Date(newest).toISOString().slice(0, 10)} — cần nguồn trong 12 tháng`);
  }

  return {
    claim: claim.id,
    ok: problems.length === 0,
    verdict: VERDICTS.includes(f.verdict) ? f.verdict : null,
    quotes: { total: rows.length, verified: verified.length, unverifiable: rows.filter((r) => r.status === 'unverifiable').length },
    // Bảng nguồn đã tính sẵn ở trên. Trước đây nó bị vứt đi sau khi đếm, nên lượt research lại chỉ nhận được
    // một dòng "mới có 1 nơi xuất bản" — agent không biết nguồn nào bị loại vì lý do gì và đi tìm lại từ đầu
    // (đo được: 3 lượt tìm web, 8 lần page.mjs, 125 giây cho một claim). Giữ lại thì lượt sau sửa đúng chỗ.
    sources: rows.map((r) => ({
      ref: r.ref,
      stance: r.stance,
      status: r.status,
      note: r.note,
      publisher: r.source?.publisher ?? null,
      domain: r.source ? publisherDomain(r.source.url) : null,
      kind: kindOf(r),
      published: r.source?.published ?? r.source?.modified ?? null,
    })),
    problems,
    warnings,
  };
}

// ── chặng viết ────────────────────────────────────────────────────────────────────

/** Con số đáng soát trên màn hình: có từ hai chữ số, hoặc kèm %, dấu thập phân. "Bước 1" thì bỏ qua. */
const DATA_NUMBER = /\d[\d.,]*\d%?|\d%/g;
/** Mọi con số trong chữ nguồn, kể cả số một chữ số — "3" trong "GPT-3" cũng là một con số đã biết. */
const ANY_NUMBER = /\d[\d.,]*\d|\d/g;

/** "0128" → "128", "3.50" → "3.5": một giá trị, một cách viết. */
const canon = (s) => String(Number(s));

/**
 * Các giá trị một con số viết ra có thể mang — **từng con số một**, không gộp chữ số của cả đoạn.
 *
 * Bản cũ bỏ hết `.` `,` `%` khỏi toàn bộ chữ nguồn rồi mới tìm, nên "3.5" thành "35" và "1,2" thành "12": kịch
 * bản đọc "ba mươi lăm phần trăm" hay ghi "35%" trong khi nguồn nói 3,5% vẫn qua — đúng con số bịa mà phép soát
 * này có để bắt. Dấu phân cách được hiểu theo cả hai lối viết, và chỉ khi nó hợp lý:
 * - hàng nghìn — mọi nhóm sau dấu đúng 3 chữ số: "128,000" = "128.000" = 128000;
 * - thập phân — đúng một dấu: "3.5" = "3,5" = 3.5;
 * - và từng nhóm riêng lẻ ("1,2,3" liệt kê, "GPT-3.5" có số 3), không bao giờ ghép chúng lại thành số mới.
 */
export function numberForms(token) {
  const t = String(token).replace(/%$/, '');
  const parts = t.split(/[.,]/).filter(Boolean);
  const forms = new Set(parts.map(canon));
  if (parts.length > 1 && parts.slice(1).every((p) => p.length === 3)) forms.add(canon(parts.join('')));
  if (parts.length === 2) forms.add(canon(`${parts[0]}.${parts[1]}`));
  return forms;
}

/** Tập giá trị của mọi con số trong chữ slide + finding. */
function numbersIn(text) {
  const known = new Set();
  for (const m of String(text ?? '').matchAll(ANY_NUMBER)) for (const f of numberForms(m[0])) known.add(f);
  return known;
}

/**
 * Con số trên màn hình có trong nguồn không. Viết có dấu thì theo cách hiểu hợp lý nhất của chính nó — "3.5%"
 * là 3.5, "128,000" là 128000 — chứ không theo từng nhóm: nhóm "5" của "3.5" có trong nguồn không làm "3.5" có thật.
 */
function screenNumberKnown(known, token) {
  const parts = String(token).replace(/%$/, '').split(/[.,]/).filter(Boolean);
  if (parts.length === 1) return known.has(canon(parts[0]));
  const whole = [];
  if (parts.slice(1).every((p) => p.length === 3)) whole.push(canon(parts.join('')));
  if (parts.length === 2) whole.push(canon(`${parts[0]}.${parts[1]}`));
  return whole.some((f) => known.has(f));
}

/**
 * Con số nghe thấy có khớp một con số trong slide/finding không.
 *
 * Nguồn viết theo bậc ("100 triệu", "128K") còn lời đọc là giá trị đầy đủ (100 000 000), nên so cả giá trị lẫn
 * phần đầu của nó theo từng bậc: 100 000 000 → 100000000, 100000, 100. Khớp một dạng là đủ.
 */
function spokenNumberKnown(known, n) {
  const forms = new Set([String(n.value)]);
  for (const scale of [1e3, 1e6, 1e9]) {
    if (n.value % scale === 0) forms.add(String(n.value / scale));
  }
  return [...forms].some((form) => known.has(canon(form)));
}

/**
 * @param {object} args
 * @param {string} args.markdown            nội dung kich-ban.md
 * @param {Record<string, {label?: string}>} args.deliveries   voices.json → deliveries
 * @param {{ slide: number, skip?: boolean, heading?: string, points?: string[] }[]} args.outline
 * @param {Record<string, { verdict: string|null, ok: boolean }>} args.claims   kết quả soát từng claim
 * @param {string} args.knownText           chữ slide + finding (answer, corrected, trích đoạn) — nơi con số được phép đến từ
 */
export function checkScript({ markdown, deliveries, outline, claims, knownText }) {
  const script = parseScript(markdown);
  const { issues, stats } = lintScript(script, { deliveries });
  const add = (level, cue, line, message) => issues.push({ level, cue, line, message });
  const known = numbersIn(knownText);
  const used = new Set();
  const usedClaims = new Set();

  for (const cue of script.cues) {
    const line = cue.fieldLines['nguồn'] ?? cue.line;
    const refs = parseRefs(cue.fields['nguồn']);
    if (!cue.fields['nguồn']) add('problem', cue.n, cue.line, 'thiếu dòng **Nguồn:** (slide:N và/hoặc cN)');
    if (refs.unknown.length) add('problem', cue.n, line, `không hiểu nguồn: ${refs.unknown.join(', ')} — chỉ dùng slide:N và cN`);
    for (const s of refs.slides) {
      if (!outline.some((o) => o.slide === s)) add('problem', cue.n, line, `slide:${s} không có trong dàn ý`);
      used.add(s);
    }
    for (const c of refs.claims) {
      usedClaims.add(c);
      const r = claims[c];
      if (!r) add('problem', cue.n, line, `${c} không có trong danh sách claim`);
      else if (!r.ok) add('problem', cue.n, line, `${c} chưa qua soát bằng chứng — không dùng làm căn cứ`);
      else if (r.verdict === 'insufficient') add('warning', cue.n, line, `${c} không đủ nguồn — câu này không được khẳng định dữ kiện đó`);
    }
    const screen = String(cue.fields['trên màn hình'] ?? '');
    for (const m of screen.matchAll(DATA_NUMBER)) {
      if (!screenNumberKnown(known, m[0])) add('warning', cue.n, cue.fieldLines['trên màn hình'] ?? cue.line, `con số "${m[0]}" trên màn hình không thấy trong slide hay finding nào`);
    }
    // Con số **người xem nghe thấy**. Không kiểm ở đây thì không kiểm ở đâu cả: luật lint bắt mọi chữ số trong
    // **Lời** viết thành chữ, nên vòng quét chữ số ngay trên không bao giờ nhìn tới lời đọc. Đo thật: sửa "một
    // trăm triệu" thành "năm trăm triệu" trong kịch bản đã giao thì mọi phép soát vẫn xanh.
    for (const n of spokenNumbers(cue.fields['lời'])) {
      if (n.value < 10) continue;
      if (spokenNumberKnown(known, n)) continue;
      // Con số lớn hoặc phần trăm là dữ kiện, phải dừng; số nhỏ hay là chuyện trình bày ("mười lăm phút").
      const level = n.percent || n.value >= 100 ? 'problem' : 'warning';
      add(level, cue.n, cue.fieldLines['lời'] ?? cue.line, `lời đọc nói "${n.text}"${n.percent ? ' phần trăm' : ''} nhưng không slide hay finding nào có con số đó — sửa cho khớp nguồn, hoặc bỏ con số khỏi câu`);
    }
  }

  const wanted = outline.filter((o) => !o.skip).map((o) => o.slide);
  const missing = wanted.filter((n) => !used.has(n));
  if (missing.length) add('warning', null, null, `slide ${missing.join(', ')} không có câu nào dựa vào — thiếu ý của giảng viên?`);
  // Chỗ research đã bác bỏ mà kịch bản không dẫn tới là **lỗi**, không phải nhắc nhở: hoặc kịch bản bỏ qua
  // điều giảng viên nói sai, hoặc nó nói lại đúng điều đó mà không ai đối chiếu. Cả hai đều phải sửa trước
  // khi tới cổng 3 — nếu thật sự không cần nhắc ý đó thì bỏ luôn câu, đừng để câu không dẫn nguồn.
  const unused = Object.entries(claims).filter(([id, r]) => r.ok && (r.verdict === 'fix' || r.verdict === 'wrong') && !usedClaims.has(id)).map(([id]) => id);
  if (unused.length) add('problem', null, null, `${unused.join(', ')} là chỗ slide sai/cần sửa nhưng không câu nào dẫn tới — sửa lại cho đúng rồi dẫn \`${unused[0]}\`, hoặc bỏ hẳn ý đó khỏi kịch bản`);

  const problems = issues.filter((x) => x.level === 'problem');
  return {
    ok: problems.length === 0,
    stats,
    coverage: { slides: wanted.length, covered: wanted.length - missing.length, missing },
    issues,
  };
}
