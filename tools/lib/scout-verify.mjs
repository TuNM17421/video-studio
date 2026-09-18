/**
 * Soát hồ sơ nguồn của một lượt "đóng gói kịch bản".
 *
 * Toàn bộ file này là hàm thuần và **không chạm tới mạng**: nó chỉ đối chiếu trích đoạn trong
 * `nguon.json` với toàn văn trang mà chính agent đã tải về và ghi xuống `sources/`. Đó là điểm mấu chốt —
 * công cụ tìm kiếm của agent là hộp đen, không ai xem lại được nó đã đọc gì; còn cái này thì chỉ so chuỗi
 * trên đĩa, nên một trích đoạn bịa ra sẽ trượt, bất kể agent nói gì trong phần tóm tắt của nó.
 */

/**
 * Chuẩn hoá trước khi so.
 *
 * Gộp khoảng trắng là bắt buộc: trang web xuống dòng ở đâu là chuyện của trình bày, trích đoạn chép lại
 * gần như chắc chắn ngắt dòng khác. Bỏ phân biệt hoa thường thì nới tay hơn một chút, nhưng không mở
 * đường cho việc bịa: không ai bịa trúng nguyên một câu chỉ nhờ sai hoa thường.
 */
export const norm = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Dưới ngưỡng này thì một "trích đoạn" không chứng minh được gì — "trí tuệ nhân tạo" xuất hiện trong mọi
 * trang về AI, khớp hay không khớp đều vô nghĩa. Đo bằng ký tự sau khi gộp khoảng trắng.
 */
export const MIN_QUOTE_CHARS = 40;

/** `"slide:3"` trong `cues` — câu dựa trên slide số 3 của giảng viên (lượt chạy từ slide). */
const SLIDE_REF = /^slide:(\d+)$/;

/**
 * @param {object} args
 * @param {object} args.dossier            nội dung nguon.json
 * @param {(file: string) => string|null} args.readSource  đọc toàn văn một nguồn; null khi không có file
 * @param {number} args.minSources         mỗi câu phải dựa trên ít nhất bấy nhiêu nguồn
 * @param {number[]} [args.cueNumbers]     số câu thật trong kịch bản; bỏ trống khi kịch bản chưa viết
 * @param {object} [args.slide]            lượt từ slide: { outline, items, conclusions, referenceDate }
 */
export function checkDossier({ dossier, readSource, minSources, cueNumbers, slide }) {
  const sources = Array.isArray(dossier?.sources) ? dossier.sources : [];
  const byId = new Map(sources.map((s) => [s.id, s]));
  const problems = [];

  let fetched = 0;
  let quotesTotal = 0;
  let quotesOk = 0;
  const quoteProblems = [];

  // Toàn văn mỗi nguồn chỉ đọc một lần: một hồ sơ mười nguồn với năm trích đoạn mỗi nguồn sẽ đọc lại
  // cùng một file năm lượt nếu không nhớ.
  const textCache = new Map();
  const textOf = (file) => {
    if (!textCache.has(file)) textCache.set(file, norm(readSource(file)));
    return textCache.get(file);
  };

  for (const source of sources) {
    if (source.file) fetched++;
    const quotes = Array.isArray(source.quotes) ? source.quotes : [];
    for (const quote of quotes) {
      quotesTotal++;
      const needle = norm(quote);
      if (!source.file) {
        quoteProblems.push({ source: source.id, quote, reason: 'nguồn chưa tải trang về nên không đối chiếu được' });
        continue;
      }
      if (needle.length < MIN_QUOTE_CHARS) {
        quoteProblems.push({ source: source.id, quote, reason: `trích đoạn quá ngắn (dưới ${MIN_QUOTE_CHARS} ký tự) để chứng minh điều gì` });
        continue;
      }
      const hay = textOf(source.file);
      if (hay === null) {
        quoteProblems.push({ source: source.id, quote, reason: `không đọc được ${source.file}` });
        continue;
      }
      if (!hay.includes(needle)) {
        quoteProblems.push({ source: source.id, quote, reason: 'không có trong trang đã tải về' });
        continue;
      }
      quotesOk++;
    }
  }

  const map = dossier?.cues && typeof dossier.cues === 'object' ? dossier.cues : {};
  // Khi đã có kịch bản thì soát theo câu THẬT, không theo những gì hồ sơ tự khai: một câu bị bỏ quên
  // trong nguon.json là đúng cái lỗi cần bắt, mà duyệt theo khoá của map thì không bao giờ thấy.
  const numbers = cueNumbers?.length
    ? [...cueNumbers].sort((a, b) => a - b)
    : Object.keys(map).map(Number).filter(Number.isInteger).sort((a, b) => a - b);

  const cues = numbers.map((n) => {
    const listed = Array.isArray(map[String(n)]) ? map[String(n)] : [];
    // Lượt từ slide: "slide:3" nghĩa là câu giảng lại nội dung của chính giảng viên. Đó là một nguồn đủ
    // cho câu ấy, nhưng không được đếm vào số nguồn web — câu nào đã dùng kết quả research thì vẫn phải
    // có đủ nguồn độc lập, không thì gắn thêm "slide:" là qua mặt được luật.
    const slides = listed.map((id) => SLIDE_REF.exec(String(id))?.[1]).filter(Boolean).map(Number);
    const web = listed.filter((id) => !SLIDE_REF.test(String(id)));
    const known = web.filter((id) => byId.has(id));
    const unknown = web.filter((id) => !byId.has(id));
    let level = 'ok';
    let note = null;
    if (unknown.length) {
      level = 'error';
      note = `nguồn không có trong hồ sơ: ${unknown.join(', ')}`;
    } else if (known.length === 0 && slides.length === 0) {
      level = 'error';
      note = 'chưa gắn nguồn nào';
    } else if (known.length > 0 && known.length < minSources) {
      level = 'warn';
      note = `mới có ${known.length}/${minSources} nguồn`;
    }
    return slides.length ? { n, sources: known, slides, level, note } : { n, sources: known, level, note };
  });

  const badCues = cues.filter((c) => c.level === 'error').length;
  const weakCues = cues.filter((c) => c.level === 'warn').length;
  if (quoteProblems.length) problems.push(`${quoteProblems.length} trích đoạn không đối chiếu được với trang đã tải.`);
  if (badCues) problems.push(`${badCues} câu chưa truy được về nguồn.`);
  if (weakCues) problems.push(`${weakCues} câu chưa đủ ${minSources} nguồn độc lập.`);

  const report = {
    minSources,
    sources: { total: sources.length, fetched, unfetched: sources.length - fetched },
    quotes: { total: quotesTotal, ok: quotesOk, problems: quoteProblems },
    cues,
    ok: problems.length === 0,
    problems,
  };
  if (slide) {
    report.slide = checkSlideRun({ slide, cues, byId, dossier, minSources, quoteProblems, problems, hasScript: Boolean(cueNumbers?.length) });
    report.ok = problems.length === 0;
  }
  return report;
}

/**
 * Tên miền đăng ký của một URL — "vnexpress.net", "moh.gov.vn", "bbc.co.uk". Hai trang cùng tên miền là
 * cùng một nơi xuất bản, dù đường dẫn khác nhau.
 */
export function publisherDomain(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return String(url ?? ''); }
  const parts = host.split('.');
  // "gov.vn", "co.uk", "edu.au"…: nhãn thứ hai từ cuối là loại tổ chức, tên thật nằm trước nó.
  const takeThree = parts.length > 2 && parts.at(-1).length === 2 && ['com', 'edu', 'gov', 'org', 'net', 'ac', 'co'].includes(parts.at(-2));
  return parts.slice(takeThree ? -3 : -2).join('.');
}

/**
 * Số nơi xuất bản khác nhau trong một nhóm nguồn. Cùng tên miền là một nơi; khác tên miền nhưng cùng tên
 * nhà xuất bản (ai.google.dev và blog.google đều là "Google") cũng là một nơi.
 */
function publishers(list) {
  const groups = [];
  for (const s of list) {
    const domain = publisherDomain(s.url);
    const name = norm(s.publisher);
    const hit = groups.find((g) => g.domains.has(domain) || (name && g.names.has(name)));
    if (hit) {
      hit.domains.add(domain);
      if (name) hit.names.add(name);
    } else groups.push({ domains: new Set([domain]), names: new Set(name ? [name] : []), label: s.publisher || domain });
  }
  return groups.map((g) => g.label);
}

const YEAR_MS = 365 * 24 * 3600 * 1000;

/**
 * Bốn bước soát riêng của lượt từ slide — đều chỉ đọc những gì agent đã ghi:
 * nguồn độc lập, nguồn đủ mới, kịch bản phủ đủ slide, kết luận dựa trên nguồn đã đọc thật.
 */
function checkSlideRun({ slide, cues, byId, dossier, minSources, quoteProblems, problems, hasScript }) {
  // 1 · nguồn độc lập: đủ số nguồn nhưng chỉ từ một hai nơi xuất bản thì chưa phải xác nhận chéo.
  const independence = [];
  for (const row of cues) {
    if (row.sources.length < minSources) continue;
    const from = publishers(row.sources.map((id) => byId.get(id)));
    if (from.length >= minSources) continue;
    independence.push({ n: row.n, sources: row.sources.length, publishers: from });
    if (row.level === 'ok') {
      row.level = 'warn';
      row.note = `${row.sources.length} nguồn nhưng chỉ từ ${from.length} nơi xuất bản (${from.join(', ')})`;
    }
  }
  if (independence.length) problems.push(`${independence.length} câu có đủ số nguồn nhưng chưa đủ ${minSources} nơi xuất bản khác nhau.`);

  // 2 · nguồn đủ mới cho mục "có thể đã cũ", tính từ lúc lượt chạy chứ không từ hôm nay — chạy lại bao giờ
  // cũng ra cùng kết quả.
  const reference = Date.parse(dossier?.createdAt ?? '') || Date.parse(slide.referenceDate ?? '') || Date.now();
  const recency = [];
  for (const item of slide.items ?? []) {
    if (item.kind !== 'cap-nhat') continue;
    const used = (slide.conclusions?.[item.id]?.sources ?? []).map((id) => byId.get(id)).filter(Boolean);
    const dated = used.map((s) => Date.parse(s.published ?? '')).filter(Number.isFinite);
    const newest = dated.length ? Math.max(...dated) : null;
    if (newest !== null && reference - newest <= YEAR_MS) continue;
    recency.push({ item: item.id, title: item.title, newest: newest === null ? null : new Date(newest).toISOString().slice(0, 10), undated: used.length - dated.length });
  }
  if (recency.length) problems.push(`${recency.length} mục "có thể đã cũ" không có nguồn nào đăng trong 12 tháng trước lượt chạy.`);

  // 3 · kịch bản phủ đủ slide: slide nào có nội dung mà không câu nào dựa vào.
  const wanted = (slide.outline ?? []).filter((o) => o.heading || o.points?.length).map((o) => o.slide);
  const used = new Set(cues.flatMap((c) => c.slides ?? []));
  const missing = hasScript ? wanted.filter((n) => !used.has(n)) : [];
  if (missing.length) problems.push(`${missing.length} slide không có câu kịch bản nào dựa vào: ${missing.join(', ')}.`);
  const coverage = { slides: wanted.length, covered: hasScript ? wanted.length - missing.length : 0, missing };

  // 4 · kết luận khớp nguồn: mỗi nguồn trong kết luận phải có trong hồ sơ, đã tải, và có trích đoạn soát được.
  const failedQuotes = new Map();
  for (const p of quoteProblems) failedQuotes.set(p.source, (failedQuotes.get(p.source) ?? 0) + 1);
  const findings = [];
  for (const item of slide.items ?? []) {
    const conclusion = slide.conclusions?.[item.id];
    const issues = [];
    if (!conclusion) issues.push('chưa có kết luận');
    for (const id of conclusion?.sources ?? []) {
      const s = byId.get(id);
      if (!s) { issues.push(`${id} không có trong hồ sơ`); continue; }
      if (!s.file) { issues.push(`${id} chưa tải trang về`); continue; }
      const quotes = Array.isArray(s.quotes) ? s.quotes.length : 0;
      if (quotes === 0 || (failedQuotes.get(id) ?? 0) >= quotes) issues.push(`${id} không có trích đoạn nào soát được`);
    }
    if (conclusion && !(conclusion.sources ?? []).length && conclusion.verdict !== 'khong-du-nguon') issues.push('kết luận không nêu nguồn nào');
    if (issues.length) findings.push({ item: item.id, problems: issues });
  }
  if (findings.length) problems.push(`${findings.length} mục có kết luận chưa dựa trên nguồn đã đọc và soát được.`);

  return { independence, recency, coverage, findings };
}
