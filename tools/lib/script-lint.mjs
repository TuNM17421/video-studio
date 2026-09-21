/**
 * Đọc và soát một kịch bản viết theo `templates/kich-ban-co-ban.md` — bằng code, không tốn token nào.
 *
 * Mục đích: kịch bản research xong phải đi thẳng vào pipeline video mà không ai sửa tay. Những lỗi code
 * bắt được (chữ số trong lời đọc, kiểu đọc lạ, thiếu dòng Lời…) được báo đúng số câu để agent sửa bằng một
 * lượt nhỏ, thay vì để một agent biên tập đắt tiền phải tự dò.
 *
 * Mỗi vấn đề có `level`: "problem" (pipeline video sẽ vấp) hoặc "warning" (nên sửa, không chặn).
 */

/** Tốc độ đọc dùng để ước thời lượng, theo mẫu kịch bản: khoảng 2,9 tiếng mỗi giây. */
export const SYLLABLES_PER_SECOND = 2.9;
const MAX_WORDS = 45;
const MIN_WORDS = 3;

/**
 * Từ chỉ số lượng trong lời đọc. Không phải để đổi ra chữ số — chỉ để biết câu này **có phát ra một con số**,
 * nên phải có dòng **Trên màn hình** mang con số đó, chỗ duy nhất phép soát đối chiếu được với slide và finding.
 * "một", "hai", "ba" đứng một mình thì bỏ qua: "một cách", "hai bên" quá thường trong lời nói.
 */
const SPOKEN_NUMBER = /\b(mươi|trăm|nghìn|ngàn|triệu|tỉ|tỷ|phần trăm|phần nghìn|gấp \w+|một nửa|hai phần ba|ba phần tư)\b/iu;

const DIGIT_WORDS = {
  không: 0, một: 1, mốt: 1, hai: 2, ba: 3, bốn: 4, tư: 4, năm: 5, lăm: 5, nhăm: 5, sáu: 6, bảy: 7, bẩy: 7, tám: 8, chín: 9,
};
const SCALE_WORDS = { nghìn: 1e3, ngàn: 1e3, triệu: 1e6, tỉ: 1e9, tỷ: 1e9 };

/**
 * Những con số **phát ra thành lời** trong một câu, đọc ngược về giá trị.
 *
 * Lý do phải có: luật ngay trên bắt mọi chữ số trong **Lời** viết thành chữ, nên phép đối chiếu con số (vốn
 * quét chữ số) không bao giờ nhìn thấy thứ người xem thật sự nghe. Đo thật trên kịch bản đã giao: đổi "một
 * trăm triệu người dùng" thành "năm trăm triệu" và "ba mươi phần trăm" thành "chín mươi phần trăm" thì mọi
 * phép soát vẫn xanh. Đọc được số thì con số nghe thấy mới đối chiếu được với slide và finding như con số
 * trên màn hình.
 *
 * @returns {{ text: string, value: number, percent: boolean }[]}
 */
export function spokenNumbers(text) {
  const tokens = String(text ?? '').toLowerCase().normalize('NFC').split(/[^\p{L}]+/u).filter(Boolean);
  const out = [];
  let run = [];
  const flush = (percent) => {
    const value = runValue(run);
    if (value !== null) out.push({ text: run.join(' '), value, percent });
    run = [];
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];
    // "… phần trăm" là đuôi của con số vừa đọc, không phải một con số mới ("trăm" ở đây không nhân với gì).
    if (t === 'phần' && next === 'trăm') {
      if (run.length) flush(true);
      i++;
      continue;
    }
    // "năm" vừa là số 5 vừa là "năm" trong "năm hai nghìn không trăm hai mươi hai". Là số 5 thì sau nó phải
    // là một bậc ("năm trăm", "năm mươi", "năm phần trăm"); còn lại là mốc thời gian, và nó ngắt con số trước.
    if (t === 'năm' && !['trăm', 'mươi', 'phần', ...Object.keys(SCALE_WORDS)].includes(next ?? '')) {
      if (run.length) flush(false);
      continue;
    }
    if (t in DIGIT_WORDS || t in SCALE_WORDS || t === 'mười' || t === 'mươi' || t === 'trăm' || t === 'linh' || t === 'lẻ') {
      run.push(t);
      continue;
    }
    if (run.length) flush(false);
  }
  if (run.length) flush(false);
  return out;
}

/** "hai nghìn không trăm hai mươi hai" → 2022. Trả null nếu chuỗi không thành một con số. */
function runValue(tokens) {
  let total = 0;
  let group = 0;
  let cur = 0;
  let any = false;
  for (const t of tokens) {
    if (t === 'linh' || t === 'lẻ') continue;
    any = true;
    if (t in DIGIT_WORDS) { cur = DIGIT_WORDS[t]; continue; }
    if (t === 'mười') { group += 10; cur = 0; continue; }
    if (t === 'mươi') { group += cur * 10; cur = 0; continue; }
    if (t === 'trăm') { group += cur * 100; cur = 0; continue; }
    const scale = SCALE_WORDS[t];
    const sub = group + cur;
    // "một nghìn tỉ": bậc đứng ngay sau một bậc lớn hơn thì nhân vào cả phần đã đọc, không cộng thêm 0.
    total = sub === 0 && total > 0 ? total * scale : total + sub * scale;
    group = 0;
    cur = 0;
  }
  return any ? total + group + cur : null;
}
/** Quá chừng này câu liền nhau cùng một kiểu đọc thì giọng đều đều — lỗi đã gặp thật ở bộ Day 02. */
const SAME_DELIVERY_RUN = 6;

/** Dòng `- **Tên:** giá trị` của một câu hoặc của phần đầu kịch bản. */
const FIELD = /^\s*-\s*\*\*([^*:]+?):?\*\*:?\s*(.*)$/;

/**
 * @param {string} md
 * @returns {{ title: string|null, header: Record<string,string>, sections: { title: string, line: number }[],
 *   cues: { n: number, line: number, section: string|null, fields: Record<string,string>, fieldLines: Record<string,number> }[] }}
 */
export function parseScript(md) {
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n');
  let title = null;
  const header = {};
  const sections = [];
  const cues = [];
  let cue = null;
  let lastKey = null;
  let target = header;
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const no = i + 1;
    if (/^#\s+/.test(line) && !/^##/.test(line)) {
      if (title === null) title = line.replace(/^#\s+/, '').trim();
      lastKey = null;
      return;
    }
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      sections.push({ title: line.replace(/^##\s+/, '').trim(), line: no });
      cue = null;
      target = null;
      lastKey = null;
      return;
    }
    const heading = /^###\s+Câu\s+(\d+)\b/i.exec(line);
    if (heading) {
      cue = { n: Number(heading[1]), line: no, section: sections.at(-1)?.title ?? null, fields: {}, fieldLines: {} };
      cues.push(cue);
      target = cue.fields;
      lastKey = null;
      return;
    }
    if (/^###\s+/.test(line)) {
      cue = null;
      target = null;
      lastKey = null;
      return;
    }
    const field = FIELD.exec(line);
    if (field && target) {
      const key = field[1].trim().toLowerCase();
      target[key] = field[2].trim();
      if (cue) cue.fieldLines[key] = no;
      lastKey = key;
      return;
    }
    // dòng tiếp nối của một trường (thụt lề, không phải gạch đầu dòng mới)
    if (lastKey && target && /^\s{2,}\S/.test(raw) && !/^\s*-\s/.test(raw)) {
      target[lastKey] = `${target[lastKey]} ${line.trim()}`.trim();
      return;
    }
    if (!line.trim()) lastKey = null;
  });
  return { title, header, sections, cues };
}

/** Số từ (≈ số tiếng trong tiếng Việt). */
export const wordCount = (s) => String(s ?? '').trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** `slide:4, c3, c5` → { slides: [4], claims: ["c3","c5"], unknown: [] } */
export function parseRefs(value) {
  const slides = [];
  const claims = [];
  const unknown = [];
  for (const token of String(value ?? '').split(/[,;]/).map((t) => t.trim()).filter(Boolean)) {
    const slide = /^slide\s*:?\s*(\d+)$/i.exec(token);
    if (slide) slides.push(Number(slide[1]));
    else if (/^c\d{1,3}$/i.test(token)) claims.push(token.toLowerCase());
    else unknown.push(token);
  }
  return { slides, claims, unknown };
}

/**
 * Kiểu đọc hợp lệ: nhận cả mã (`ke`) lẫn nhãn (`kể`) trong `voices.json → deliveries`.
 * @param {Record<string, { label?: string }>} deliveries
 */
export function deliveryResolver(deliveries) {
  const map = new Map();
  for (const [key, d] of Object.entries(deliveries ?? {})) {
    map.set(key.toLowerCase(), key);
    if (d?.label) map.set(String(d.label).toLowerCase().normalize('NFC'), key);
  }
  return (value) => map.get(String(value ?? '').trim().toLowerCase().normalize('NFC').replace(/[.`*]/g, '')) ?? null;
}

/**
 * Soát kịch bản theo mẫu cơ bản.
 *
 * @param {ReturnType<typeof parseScript>} script
 * @param {{ deliveries: Record<string, {label?: string}> }} ctx
 * @returns {{ issues: { level: 'problem'|'warning', cue: number|null, line: number|null, message: string }[],
 *   stats: { cues: number, words: number, seconds: number } }}
 */
export function lintScript(script, { deliveries }) {
  const issues = [];
  const add = (level, cue, line, message) => issues.push({ level, cue, line, message });
  const resolve = deliveryResolver(deliveries);

  if (!script.title) add('problem', null, 1, 'thiếu tiêu đề `# …` ở dòng đầu');
  if (!script.header['mục tiêu']) add('warning', null, null, 'phần đầu thiếu dòng **Mục tiêu:**');
  if (!script.sections.length) add('problem', null, null, 'không có phần nào (`## …`) — mỗi phần là một chương của video');
  if (!script.cues.length) add('problem', null, null, 'không có câu nào (`### Câu N`)');

  // Kịch bản đời trước dùng khối `**Lời đọc nguyên văn:**` với trích dẫn `>` và mốc giờ trong tiêu đề câu.
  // Nó vẫn có `### Câu N` nên vào được tới đây, và soát từng câu sẽ ra một dãy "thiếu **Lời:**" dài bằng số
  // câu — vô dụng, và tệ hơn là dụ người (hay agent) đi sửa từng câu một. Nói đúng một câu là đủ.
  const withText = script.cues.filter((c) => c.fields['lời']).length;
  if (script.cues.length >= 3 && withText / script.cues.length < 0.2) {
    add('problem', null, script.cues[0].line,
      'kịch bản không theo mẫu hiện tại — câu nào cũng thiếu dòng `- **Lời:**`. Bản đời trước dùng khối '
      + '`**Lời đọc nguyên văn:**` với dấu `>` và mốc giờ; hãy chuyển cả file sang mẫu ở '
      + '`templates/kich-ban-co-ban.md` (mỗi câu là `### Câu N` rồi các dòng `- **Kiểu:**`, `- **Lời:**`, '
      + '`- **Trên màn hình:**`), đừng sửa lắt nhắt từng câu.');
    return { issues, stats: { cues: script.cues.length, words: 0, seconds: 0 } };
  }

  let words = 0;
  let expected = 1;
  let runKey = null;
  let runLength = 0;
  for (const cue of script.cues) {
    const at = (key) => cue.fieldLines[key] ?? cue.line;
    if (cue.n !== expected) add('warning', cue.n, cue.line, `đánh số câu nhảy từ ${expected} sang ${cue.n}`);
    expected = cue.n + 1;

    const text = cue.fields['lời'];
    if (!text) {
      add('problem', cue.n, cue.line, 'thiếu dòng **Lời:**');
    } else {
      const n = wordCount(text);
      words += n;
      // Số đứng riêng ("20", "2024", "128,000") máy đọc không theo ý người viết — phải viết thành chữ. Tên có
      // chữ số ("GPT-4", "H100") thì không viết lại được, chỉ cần kiểm cách đọc.
      const tokens = text.split(/\s+/);
      const bare = tokens.filter((w) => /\d/.test(w) && !/\p{L}/u.test(w.replace(/[%]/g, '')));
      const named = tokens.filter((w) => /\d/.test(w) && /\p{L}/u.test(w));
      if (bare.length) add('problem', cue.n, at('lời'), `lời đọc có số viết bằng chữ số (${bare.join(', ')}) — viết thành chữ ("hai mươi", không phải "20"); số để ở dòng Trên màn hình`);
      if (named.length) add('warning', cue.n, at('lời'), `tên có chữ số (${named.join(', ')}) — kiểm máy đọc có đúng không, cần thì khai pronounce.json`);
      const abbr = [...text.matchAll(/\b[A-Z][A-Z0-9]{1,}\b/g)].map((m) => m[0]).filter((w) => w !== 'AI');
      if (abbr.length) add('warning', cue.n, at('lời'), `viết tắt trong lời đọc: ${[...new Set(abbr)].join(', ')} — viết tắt thông thường thì viết thành lời; tên riêng (GPT, UBS) thì giữ nguyên, khai cách đọc ở pronounce.json, đừng phiên âm`);
      if (/\[c\d+\]|\bslide\s*:\s*\d/i.test(text)) add('problem', cue.n, at('lời'), 'mã nguồn nằm trong lời đọc — chuyển sang dòng **Nguồn:**');
      // Tên riêng bị phiên âm ra tiếng Việt ("Cát Gi Pi Ti", "U Bi Ét", "Gi Pi Ti bốn"): luật viết-tắt ở trên
      // không bắt được vì phiên âm xong thì không còn chữ hoa liền nhau nữa. Ba tiếng hoa một âm tiết đứng
      // liền nhau gần như chỉ xảy ra khi đọc từng chữ cái của một tên viết tắt.
      const spelled = [...text.matchAll(/(?:\b[\p{Lu}][\p{Ll}]{0,2}\b[ ]){2,}\b[\p{Lu}][\p{Ll}]{0,2}\b/gu)].map((m) => m[0].trim());
      if (spelled.length) add('problem', cue.n, at('lời'), `tên riêng bị phiên âm từng chữ cái (${[...new Set(spelled)].join('; ')}) — viết đúng tên gốc (ChatGPT, UBS, GPT-4) và khai cách đọc ở pronounce.json`);
      // Con số **đọc thành lời** không đi qua phép soát nào: luật trên bắt viết số thành chữ, mà phép đối chiếu
      // con số lại chỉ quét dòng **Trên màn hình**. Có số trong lời thì buộc phải có dòng màn hình để đối chiếu.
      if (SPOKEN_NUMBER.test(text) && !cue.fields['trên màn hình']) {
        add('problem', cue.n, at('lời'), 'lời đọc có con số nhưng câu không có dòng **Trên màn hình** — viết con số đó ra màn hình để phần soát đối chiếu được với slide và finding');
      }
      if (n < MIN_WORDS) add('warning', cue.n, at('lời'), `câu quá ngắn (${n} từ) — thành cảnh chưa tới một giây; viết liền vào câu bên cạnh`);
      if (n > MAX_WORDS) add('warning', cue.n, at('lời'), `câu dài ${n} từ — một cảnh phải gánh nhiều ý; tách thành hai câu`);
      const sentences = text.split(/(?<=[.!?…])\s+(?=[\p{Lu}"“])/u).filter((s) => wordCount(s) >= 2);
      if (sentences.length > 1) add('warning', cue.n, at('lời'), `mục Lời có ${sentences.length} câu — mỗi mục một câu = một cảnh`);
    }
    if (!cue.fields['trên màn hình']) add('warning', cue.n, cue.line, 'thiếu dòng **Trên màn hình:**');

    const kindRaw = cue.fields['kiểu'];
    const kind = kindRaw ? resolve(kindRaw) : 'giang';
    if (kindRaw && !kind) add('problem', cue.n, at('kiểu'), `kiểu đọc "${kindRaw}" không có trong voices.json — chọn một trong: ${Object.values(deliveries ?? {}).map((d) => d.label).join(', ')}`);
    if (kind && kind === runKey) runLength++;
    else { runKey = kind; runLength = 1; }
    if (runLength === SAME_DELIVERY_RUN) add('warning', cue.n, cue.line, `${SAME_DELIVERY_RUN} câu liền cùng kiểu "${kindRaw || 'giảng'}" — giọng sẽ đều đều, xen kiểu khác vào`);
  }
  return { issues, stats: { cues: script.cues.length, words, seconds: Math.round(words / SYLLABLES_PER_SECOND) } };
}
