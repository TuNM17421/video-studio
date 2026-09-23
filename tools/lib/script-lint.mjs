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
/**
 * Số từ trung bình của một câu (một cảnh) khi tính độ dài theo số câu đã đặt. Đo trên các video đã làm: d2-01-lab
 * (47 câu, đã QA) trung vị 22 từ, dài nhất 28; lượt research đầu tiên viết trung vị 33 từ nên dài gần gấp đôi dự kiến.
 * Giữ khớp `SCRIPT_BUDGET` ở studio/src/lib/research.ts (có test).
 */
export const WORDS_PER_CUE = 24;
/** Dài hơn mức đặt chừng này lần thì cảnh báo / thành lỗi phải sửa. */
export const LENGTH_WARN = 1.2;
export const LENGTH_FAIL = 1.5;
const MAX_WORDS = 45;
const MIN_WORDS = 3;

/**
 * Từ chỉ số lượng trong lời đọc. Không phải để đổi ra chữ số — chỉ để biết câu này **có phát ra một con số**,
 * nên phải có dòng **Trên màn hình** mang con số đó, chỗ duy nhất phép soát đối chiếu được với slide và finding.
 * "một", "hai", "ba" đứng một mình thì bỏ qua: "một cách", "hai bên" quá thường trong lời nói.
 */
// Biên bằng `\p{L}` chứ không bằng `\b`: `\b` của JavaScript chỉ hiểu chữ ASCII, nên "tỷ" (kết thúc bằng ỷ) không
// bao giờ khớp — "một tỷ người dùng" không có dòng màn hình vẫn lọt.
const SPOKEN_NUMBER = /(?<!\p{L})(mươi|trăm|nghìn|ngàn|triệu|tỉ|tỷ|phẩy|phần trăm|phần nghìn|gấp \p{L}+|một nửa|hai phần ba|ba phần tư)(?!\p{L})/iu;

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
 * Số thập phân đọc bằng "phẩy" hay "chấm" ("hai phẩy năm", "Opus bốn chấm sáu", "một phẩy năm triệu") là một con
 * số, không phải hai: đọc tách thì "một phẩy năm triệu người" thành 1 và 5 000 000 — sai cả hai.
 *
 * @returns {{ text: string, value: number, percent: boolean, decimal?: boolean }[]}
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
    if ((t === 'phẩy' || t === 'chấm') && run.length && next && (next in DIGIT_WORDS || next === 'mười')) {
      const whole = runValue(run);
      const frac = [];
      let j = i + 1;
      while (j < tokens.length && (tokens[j] in DIGIT_WORDS || ['mười', 'mươi', 'linh', 'lẻ'].includes(tokens[j]))) frac.push(tokens[j++]);
      // Phần sau dấu đọc từng chữ số ("hai lăm" = 25, "không năm" = 05) hay đọc như một số ("bảy mươi lăm" = 75).
      const digitsOnly = frac.every((w) => w in DIGIT_WORDS);
      const fracText = digitsOnly ? frac.map((w) => DIGIT_WORDS[w]).join('') : String(runValue(frac) ?? '');
      const words = [...run, t, ...frac];
      // Nhân bậc bằng số mũ trong chuỗi, không bằng phép nhân: 1.1 * 1e6 là 1100000.0000000002.
      let exp = 0;
      if (tokens[j] in SCALE_WORDS) { exp = Math.round(Math.log10(SCALE_WORDS[tokens[j]])); words.push(tokens[j++]); }
      const value = Number(`${whole}.${fracText}e${exp}`);
      let percent = false;
      if (tokens[j] === 'phần' && tokens[j + 1] === 'trăm') { percent = true; j += 2; }
      if (Number.isFinite(value)) out.push({ text: words.join(' '), value, percent, decimal: true });
      run = [];
      i = j - 1;
      continue;
    }
    // "… phần trăm" là đuôi của con số vừa đọc, không phải một con số mới ("trăm" ở đây không nhân với gì).
    if (t === 'phần' && next === 'trăm') {
      if (run.length) flush(true);
      i++;
      continue;
    }
    // "năm" vừa là số 5 vừa là "năm" trong "năm hai nghìn không trăm hai mươi hai". Là số 5 thì sau nó phải
    // là một bậc ("năm trăm", "năm mươi", "năm phần trăm"); còn lại là mốc thời gian, và nó ngắt con số trước.
    if (t === 'năm' && !['trăm', 'mươi', 'phần', 'phẩy', 'chấm', ...Object.keys(SCALE_WORDS)].includes(next ?? '')) {
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

const UNIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** 1–99 thành lời: 21 → "hai mươi mốt", 15 → "mười lăm", 24 → "hai mươi tư". */
function smallNumberWords(n) {
  if (n < 10) return UNIT_WORDS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  const head = tens === 1 ? 'mười' : `${UNIT_WORDS[tens]} mươi`;
  if (!unit) return head;
  const tail = unit === 5 ? 'lăm' : unit === 1 && tens > 1 ? 'mốt' : unit === 4 && tens > 1 ? 'tư' : UNIT_WORDS[unit];
  return `${head} ${tail}`;
}

/** Thời lượng lời đọc bằng chữ, làm tròn nửa phút: 375 giây → "khoảng sáu phút rưỡi". */
export function durationPhrase(seconds) {
  if (!(seconds > 0)) return null;
  if (seconds < 45) return 'dưới một phút';
  const halves = Math.max(2, Math.round(seconds / 30));
  const minutes = Math.floor(halves / 2);
  if (minutes > 99) return null;
  return `khoảng ${smallNumberWords(minutes)} phút${halves % 2 ? ' rưỡi' : ''}`;
}

/**
 * Ghi lại dòng **Thời lượng dự kiến:** ở phần đầu theo độ dài lời đọc thật. Người viết đoán con số này trước khi
 * viết và không ai sửa sau các lượt cắt/gộp: lượt thật ghi "bốn phút rưỡi" cho một kịch bản đọc hơn sáu phút, và
 * dòng đó đi thẳng sang pipeline video. Chỉ thay dòng đã có (không thêm dòng, để số dòng các lỗi khác vẫn đúng).
 * Trả kịch bản mới, hoặc null nếu không có dòng đó hay dòng đã đúng.
 */
export function syncDuration(markdown, seconds) {
  const phrase = durationPhrase(seconds);
  if (!phrase) return null;
  const md = String(markdown ?? '');
  const firstSection = md.search(/^##\s/m);
  const m = /^([ \t]*-[ \t]*\*\*Thời lượng dự kiến:?\*\*:?[ \t]*)([^\r\n]*)/m.exec(md);
  if (!m || (firstSection !== -1 && m.index > firstSection)) return null;
  const line = `${m[1]}${phrase}.`;
  if (m[0] === line) return null;
  return md.slice(0, m.index) + line + md.slice(m.index + m[0].length);
}
/** Quá chừng này câu liền nhau cùng một kiểu đọc thì giọng đều đều — lỗi đã gặp thật ở bộ Day 02. */
const SAME_DELIVERY_RUN = 6;
/** Số bộ quiz platform QA muốn thấy trong một video (HUONG-DAN-MANIFEST.md, "Quiz: đúng mẫu ba câu"). */
const QUIZ_SETS = 3;
/** Câu đệm hết giờ — hợp lý khi đọc, nhưng đặt sau khoảng chờ thì nó thành đáp án mẫu. */
const FILLER_ANSWER = /^(hết giờ|hết thời gian|thời gian đã hết|xong rồi|xong)[.!…]*$/i;

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
  const pauses = [];
  let cue = null;
  let pause = null;
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
    // Khoảng chờ của module quiz: `### Dừng 1` + `- **Dừng:** 30 giây`. Nó không phải một câu (không có
    // lời đọc, không tốn credit) nhưng là một cue `silent` trong video, và platform QA đọc chỗ dừng để
    // tìm bộ quiz — nên phải giữ lại, đúng vị trí giữa hai câu.
    if (/^###\s+Dừng\b/i.test(line)) {
      cue = null;
      pause = { line: no, after: cues.at(-1)?.n ?? null, section: sections.at(-1)?.title ?? null, fields: {} };
      pauses.push(pause);
      target = pause.fields;
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
  return { title, header, sections, cues, pauses };
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
 * @param {{ deliveries: Record<string, {label?: string}>, terms?: Set<string> }} ctx — `terms`: viết tắt có trên slide
 *   (LLM, API…) — thuật ngữ của chính bài giảng, giữ trong lời đọc chứ không bắt viết thành lời.
 * `code` của một vấn đề (nếu có) để máy phân loại: `pronounce` là việc của bước làm video (khai pronounce.json) — sửa
 * kịch bản không giải quyết được, nên pipeline research không gửi nó cho agent sửa.
 *
 * @returns {{ issues: { level: 'problem'|'warning', cue: number|null, line: number|null, message: string, code?: string }[],
 *   stats: { cues: number, words: number, seconds: number } }}
 */
export function lintScript(script, { deliveries, terms = new Set() }) {
  const issues = [];
  const add = (level, cue, line, message, code) => issues.push({ level, cue, line, message, ...(code ? { code } : {}) });
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
      if (named.length) add('warning', cue.n, at('lời'), `tên có chữ số (${named.join(', ')}) — kiểm máy đọc có đúng không, cần thì khai pronounce.json`, 'pronounce');
      // Viết tắt có trên slide (LLM, API…) là thuật ngữ của bài: giữ trong lời đọc. Bắt nó thì lượt sửa xoá luôn
      // thuật ngữ cốt lõi để hết cảnh báo — một lượt thật đã bỏ "LLM" và "API" khỏi cả bài giảng về LLM.
      const abbr = [...text.matchAll(/\b[A-Z][A-Z0-9]{1,}\b/g)].map((m) => m[0]).filter((w) => w !== 'AI' && !terms.has(w));
      if (abbr.length) add('warning', cue.n, at('lời'), `viết tắt trong lời đọc: ${[...new Set(abbr)].join(', ')} (không có trên slide) — viết tắt thông thường thì viết thành lời; tên riêng (GPT, UBS) thì giữ nguyên, khai cách đọc ở pronounce.json, đừng phiên âm. Đừng xoá thuật ngữ chỉ để hết cảnh báo`);
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
      // Cắt ý chứ không tách câu: tách làm bài dài thêm — một lượt thật đi từ 26 lên 34 câu mà thời lượng không đổi.
      if (n > MAX_WORDS) add('warning', cue.n, at('lời'), `câu dài ${n} từ — một cảnh gánh nhiều ý; cắt bớt ý phụ cho gọn, chỉ tách thành hai câu khi bài còn chỗ`);
      // Đọc cả dãy số (bảng giá, bảng thông số) thì người nghe không giữ nổi con số nào — bảng để trên màn hình.
      const numbers = spokenNumbers(text).filter((s) => s.decimal || s.percent || s.value >= 10);
      if (numbers.length >= 4) add('warning', cue.n, at('lời'), `lời đọc có ${numbers.length} con số — người nghe không nhớ nổi; để bảng số trên màn hình, lời chỉ nói ý chính (chênh bao nhiêu, cái nào rẻ nhất)`);
      const sentences = text.split(/(?<=[.!?…])\s+(?=[\p{Lu}"“])/u).filter((s) => wordCount(s) >= 2);
      if (sentences.length > 1) add('warning', cue.n, at('lời'), `mục Lời có ${sentences.length} câu — mỗi mục một câu = một cảnh; nối lại thành một câu hoặc cắt bớt ý`);
    }
    if (!cue.fields['trên màn hình']) add('warning', cue.n, cue.line, 'thiếu dòng **Trên màn hình:**');

    const kindRaw = cue.fields['kiểu'];
    const kind = kindRaw ? resolve(kindRaw) : 'giang';
    if (kindRaw && !kind) add('problem', cue.n, at('kiểu'), `kiểu đọc "${kindRaw}" không có trong voices.json — chọn một trong: ${Object.values(deliveries ?? {}).map((d) => d.label).join(', ')}`);
    if (kind && kind === runKey) runLength++;
    else { runKey = kind; runLength = 1; }
    if (runLength === SAME_DELIVERY_RUN) add('warning', cue.n, cue.line, `${SAME_DELIVERY_RUN} câu liền cùng kiểu "${kindRaw || 'giảng'}" — giọng sẽ đều đều, xen kiểu khác vào`);
  }
  lintQuiz(script, add);
  return { issues, stats: { cues: script.cues.length, words, seconds: Math.round(words / SYLLABLES_PER_SECOND) } };
}

/**
 * Chỗ dừng của module quiz, soát theo đúng mẫu platform QA đọc: **câu hỏi → khoảng chờ → câu chữa bài**,
 * ba mẩu liền nhau. Platform lấy *đúng câu ngay sau khoảng chờ* làm đáp án mẫu và dừng video ở đó, nên
 * một câu đệm ("Hết giờ.") chen vào giữa là đủ để người học nhận một đáp án rỗng — lỗi này đã có thật ở
 * bộ Day 2, và chỉ lộ ra sau khi đã thu giọng và render xong. Soát ở đây, trên chính kịch bản, là chỗ rẻ
 * nhất: chưa mất một ký tự credit nào.
 *
 * Kịch bản không có chỗ dừng nào thì không nói gì — video không quiz là hợp lệ, platform chuyển sang màn
 * "viết ba ý chính".
 */
export function lintQuiz(script, add) {
  const pauses = script.pauses ?? [];
  if (!pauses.length) return;
  const spokenAfter = (line) => script.cues.find((c) => c.line > line && c.fields['lời']);
  for (const pause of pauses) {
    if (!pause.fields['dừng']) {
      add('problem', null, pause.line, 'chỗ dừng thiếu dòng **Dừng:** — phải ghi rõ mấy giây, không có chỗ nào khác khai thời lượng khoảng chờ');
    }
    const question = script.cues.filter((c) => c.line < pause.line).at(-1);
    if (!question?.fields['lời']) {
      add('problem', null, pause.line, 'chỗ dừng không có câu hỏi ngay trước — platform QA chỉ nhận một bộ quiz khi có câu hỏi → khoảng chờ → câu chữa bài liền nhau');
      continue;
    }
    const answer = spokenAfter(pause.line);
    const nextPause = pauses.find((p) => p.line > pause.line);
    if (!answer || (nextPause && nextPause.line < answer.line)) {
      add('problem', question.n, pause.line, `câu ${question.n} hỏi xong nhưng không có câu chữa bài nào sau khoảng chờ — bộ quiz này sẽ bị bỏ qua`);
      continue;
    }
    if (FILLER_ANSWER.test(answer.fields['lời'].trim())) {
      add('problem', answer.n, answer.fieldLines['lời'] ?? answer.line,
        `câu ${answer.n} ("${answer.fields['lời'].trim()}") nằm ngay sau khoảng chờ nên platform QA lấy chính nó làm đáp án mẫu — bỏ câu đệm này, hoặc viết nó trước khoảng chờ`);
    }
  }
  if (pauses.length < QUIZ_SETS) {
    add('warning', null, pauses[0].line, `kịch bản có ${pauses.length} chỗ dừng, platform QA muốn ${QUIZ_SETS} — ít hơn thì phải được duyệt ngoại lệ ở Giai đoạn 0`);
  }
}
