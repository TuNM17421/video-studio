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

/**
 * @param {object} args
 * @param {object} args.dossier            nội dung nguon.json
 * @param {(file: string) => string|null} args.readSource  đọc toàn văn một nguồn; null khi không có file
 * @param {number} args.minSources         mỗi câu phải dựa trên ít nhất bấy nhiêu nguồn
 * @param {number[]} [args.cueNumbers]     số câu thật trong kịch bản; bỏ trống khi kịch bản chưa viết
 */
export function checkDossier({ dossier, readSource, minSources, cueNumbers }) {
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
    const known = listed.filter((id) => byId.has(id));
    const unknown = listed.filter((id) => !byId.has(id));
    let level = 'ok';
    let note = null;
    if (unknown.length) {
      level = 'error';
      note = `nguồn không có trong hồ sơ: ${unknown.join(', ')}`;
    } else if (known.length === 0) {
      level = 'error';
      note = 'chưa gắn nguồn nào';
    } else if (known.length < minSources) {
      level = 'warn';
      note = `mới có ${known.length}/${minSources} nguồn`;
    }
    return { n, sources: known, level, note };
  });

  const badCues = cues.filter((c) => c.level === 'error').length;
  const weakCues = cues.filter((c) => c.level === 'warn').length;
  if (quoteProblems.length) problems.push(`${quoteProblems.length} trích đoạn không đối chiếu được với trang đã tải.`);
  if (badCues) problems.push(`${badCues} câu chưa truy được về nguồn.`);
  if (weakCues) problems.push(`${weakCues} câu chưa đủ ${minSources} nguồn độc lập.`);

  return {
    minSources,
    sources: { total: sources.length, fetched, unfetched: sources.length - fetched },
    quotes: { total: quotesTotal, ok: quotesOk, problems: quoteProblems },
    cues,
    ok: problems.length === 0,
    problems,
  };
}
