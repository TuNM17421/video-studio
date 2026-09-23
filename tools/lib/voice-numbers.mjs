/**
 * Số viết bằng chữ trong lời đọc tiếng Việt — nhận diện và quy về dạng chữ số, dùng cho hai việc:
 *
 *   1. `voice-risk.mjs` — một cue chứa số ≥2 chữ số viết bằng chữ là rủi ro TTS đọc sai/lệch nhịp
 *      TRƯỚC khi đẩy Kaggle (không cần nghe audio).
 *   2. `align-health.mjs` — Whisper hay phiên âm số THÀNH chữ số ("một chín bảy ba" → "1973"), làm
 *      `matchRatio` (so từng từ) tụt dù giọng đọc đúng. Quy cả hai vế (lời gốc & lời Whisper nghe được)
 *      về cùng dạng chữ số trước khi so, để điểm khớp phản ánh lỗi đọc thật, không phải lỗi định dạng.
 *
 * Hai cách đọc số tiếng Việt xuất hiện trong kịch bản:
 *   (a) đọc từng chữ số một — năm, mã, số điện thoại: "một chín bảy ba" = 1973 (ghép từng chữ số).
 *   (b) đọc số đếm chuẩn — "hai mươi bảy nghìn" = 27000, "chín trăm" = 900, "hai nghìn không trăm lẻ
 *       sáu" = 2006 (có từ chỉ bậc: mươi/chục/trăm/nghìn/triệu).
 * Phân biệt bằng: có từ chỉ bậc (mươi/chục/trăm/nghìn/triệu) hoặc từ đệm (lẻ/linh) → đọc số đếm (b);
 * không có, và chuỗi dài ≥2 từ → đọc từng chữ số (a); chuỗi 1 từ → chính là 1 chữ số.
 */
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';

const DIGIT = { không: 0, một: 1, mốt: 1, hai: 2, ba: 3, bốn: 4, tư: 4, năm: 5, lăm: 5, nhăm: 5, sáu: 6, bảy: 7, bẩy: 7, tám: 8, chín: 9 };
const SCALE = { mươi: 10, chục: 10, trăm: 100, nghìn: 1000, ngàn: 1000, triệu: 1000000 };
const FILLER = new Set(['lẻ', 'linh']);
const MUOI = 'mười';

const strip = (w) => w.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');

/** "hai mươi bảy" / "chín trăm" / "không trăm lẻ sáu" / "mười" / "mười lăm" → number. Đệ quy theo bậc. */
function parseCardinal(tokens) {
  if (!tokens.length) return 0;
  // bậc triệu
  const mi = tokens.indexOf('triệu');
  if (mi >= 0) {
    const head = tokens.slice(0, mi);
    const rest = tokens.slice(mi + 1).filter((t) => !FILLER.has(t));
    return (parseCardinal(head) || 1) * 1e6 + parseCardinal(rest);
  }
  // bậc nghìn/ngàn
  const ki = tokens.findIndex((t) => t === 'nghìn' || t === 'ngàn');
  if (ki >= 0) {
    const head = tokens.slice(0, ki);
    const rest = tokens.slice(ki + 1).filter((t) => !FILLER.has(t));
    return (parseCardinal(head) || 1) * 1e3 + parseCardinal(rest);
  }
  // bậc trăm
  const hi = tokens.indexOf('trăm');
  if (hi >= 0) {
    const head = tokens.slice(0, hi);
    const rest = tokens.slice(hi + 1).filter((t) => !FILLER.has(t));
    const hundredDigit = head.length ? DIGIT[head[head.length - 1]] ?? 1 : 1;
    return hundredDigit * 100 + parseCardinal(rest);
  }
  // "mười" / "mười lăm"
  if (tokens[0] === MUOI) {
    const rest = tokens.slice(1);
    if (!rest.length) return 10;
    const u = rest[0];
    return 10 + (u === 'lăm' ? 5 : u === 'mốt' ? 1 : u === 'tư' ? 4 : DIGIT[u] ?? 0);
  }
  // "X mươi [Y]"
  if (tokens.length >= 2 && (tokens[1] === 'mươi' || tokens[1] === 'chục')) {
    const tensDigit = DIGIT[tokens[0]] ?? 0;
    const rest = tokens.slice(2);
    if (!rest.length) return tensDigit * 10;
    const u = rest[0];
    return tensDigit * 10 + (u === 'lăm' ? 5 : u === 'mốt' ? 1 : u === 'tư' ? 4 : DIGIT[u] ?? 0);
  }
  if (tokens.length === 1) return DIGIT[tokens[0]] ?? 0;
  // không khớp mẫu nào đã biết — coi như đọc từng chữ số
  return Number(tokens.map((t) => DIGIT[t] ?? '').join(''));
}

/** Một run các từ-số (đã tokenize, đã strip dấu câu) → chuỗi chữ số, hoặc null nếu không parse được. */
function runToDigits(tokens) {
  const hasScale = tokens.some((t) => t in SCALE || t === MUOI || FILLER.has(t));
  if (hasScale) {
    const n = parseCardinal(tokens);
    return Number.isFinite(n) ? String(n) : null;
  }
  if (tokens.length === 1) return tokens[0] in DIGIT ? String(DIGIT[tokens[0]]) : null;
  // đọc từng chữ số: "một chín bảy ba" → "1973"
  if (tokens.every((t) => t in DIGIT)) return tokens.map((t) => DIGIT[t]).join('');
  return null;
}

const NUMBER_WORD = new Set([...Object.keys(DIGIT), ...Object.keys(SCALE), MUOI, ...FILLER]);

/**
 * Trả về danh sách các cụm số viết bằng chữ trong `text`: { words, digits, start, end } — `start`/`end`
 * là chỉ số token trong `text.split(/\s+/)`. Chỉ báo cụm có ≥2 TỪ-SỐ liên tiếp, hoặc 1 từ nếu đứng cạnh
 * một đơn vị/bối cảnh số rõ ràng bị bỏ qua ở đây (giữ đơn giản: mọi từ-số độc lập cũng được báo, vì
 * Whisper phiên âm cả số đơn "hai", "bốn" thành chữ số — xem `align-health.mjs`).
 */
const SCALE_WORDS = new Set(['mươi', 'trăm', 'nghìn', 'ngàn', 'triệu']);

/**
 * "năm" là chữ số 5 hay chỉ là từ tiếng Việt bình thường ("năm" = year/năm tháng) — khác mọi DIGIT
 * khác vì nó CỰC KỲ phổ biến ngoài ngữ cảnh số. Chỉ coi là chữ số khi:
 *   - đứng NGAY TRƯỚC một từ chỉ bậc: "năm mươi"=50, "năm trăm"=500, "năm nghìn"=5000, "năm triệu";
 *   - HOẶC nằm trong một chuỗi ĐỌC RỜI TỪNG CHỮ SỐ dài ≥3 từ (không có từ chỉ bậc xen vào):
 *     "một chín bảy năm" = 1975.
 * CỐ Ý không coi "năm" ngay SAU mươi/mười là chữ số (dù một vài tài liệu ghép nó vào vị trí đơn vị của
 * hàng chục) — kịch bản thật ở đây dùng "X mươi năm" gần như luôn nghĩa "X0 năm" (số nhiều, đơn vị thời
 * gian), ví dụ demo-ai-history cue 37 "chờ hơn ba mươi năm" = 30 năm, không phải 35. Coi nó là chữ số sẽ
 * đọc sai theo hướng ngược lại — xem test `SELF_TEST` cuối file.
 */
function namEligible(words, boundary, i) {
  const next = i + 1 < words.length && !boundary[i] ? words[i + 1] : null;
  if (next && SCALE_WORDS.has(next)) return true;
  // chuỗi đọc rời ≥3 chữ số bao quanh vị trí i — chỉ gồm từ DIGIT liên tiếp, không từ chỉ bậc.
  let start = i;
  while (start > 0 && !boundary[start - 1] && words[start - 1] in DIGIT) start--;
  let end = i;
  while (end < words.length - 1 && !boundary[end] && words[end + 1] in DIGIT) end++;
  return (end - start + 1) >= 3;
}

export function findNumberWords(text) {
  const tokens = String(text || '').split(/\s+/);
  const words = tokens.map(strip);
  // token kết thúc bằng dấu ngắt câu (,.;:!?) là biên — không cho một cụm số chạy qua nó, vì
  // "thứ ba, hai mươi bảy nghìn" là HAI ý khác nhau, không phải một số ghép.
  const boundary = tokens.map((t) => /[,.;:!?…]$/.test(t));
  const isNumWord = (idx) => (words[idx] === 'năm' ? namEligible(words, boundary, idx) : NUMBER_WORD.has(words[idx]));
  const runs = [];
  let i = 0;
  while (i < words.length) {
    // "năm" đứng NGAY TRƯỚC một từ-số KHÁC-CHỮ-BẬC (một/hai/chín…) gần như luôn là nhãn "năm 1973",
    // không phải chữ số 5 — nhưng "năm mươi/năm trăm/năm nghìn/năm triệu" (từ theo sau là chỉ bậc) VẪN
    // là số, nên chỉ loại khi từ theo sau là DIGIT, không phải SCALE.
    if (words[i] === 'năm' && i + 1 < words.length && !boundary[i] && words[i + 1] in DIGIT) { i++; continue; }
    if (!isNumWord(i)) { i++; continue; }
    let j = i;
    while (j < words.length && isNumWord(j)) {
      j++;
      if (boundary[j - 1]) break; // dừng cụm ngay sau từ có dấu ngắt câu
    }
    const run = words.slice(i, j);
    const digits = runToDigits(run);
    if (digits != null) runs.push({ words: run, digits, start: i, end: j, source: tokens.slice(i, j).join(' ') });
    i = j;
  }
  return runs;
}

/** true nếu `text` chứa một số ≥2 chữ số viết hoàn toàn bằng chữ (rủi ro cho voice-risk). */
export function hasMultiDigitNumberWord(text) {
  return findNumberWords(text).some((r) => r.digits.length >= 2);
}

/** Thay các cụm số-viết-chữ trong `text` bằng dạng chữ số — chỉ dùng để SO SÁNH (align-health), không
 * dùng để sửa lời đọc thật. Chỉ thay cụm ≥2 chữ số: một từ-số đơn ("hai cái mốc", "thứ ba") thường là
 * lượng từ/thứ tự, Whisper không đổi nhất quán thành chữ số nên thay vào dễ tạo lệch giả. */
export function normalizeNumberWords(text) {
  const tokens = String(text || '').split(/\s+/);
  const runs = findNumberWords(text).filter((r) => r.digits.length >= 2);
  if (!runs.length) return text;
  const out = [...tokens];
  for (const r of runs) {
    out[r.start] = r.digits;
    for (let k = r.start + 1; k < r.end; k++) out[k] = '';
  }
  return out.filter((t) => t !== '').join(' ');
}

/** "27.000" / "1.973" (Whisper hay in số có dấu chấm ngăn nghìn kiểu VN) → "27000" / "1973". Chỉ áp cho
 * cụm ≥4 chữ số để không đụng ngày tháng "21.09" hay giá "4.5". */
export function stripThousandDots(text) {
  return String(text || '').replace(/\b(\d{1,3}(?:\.\d{3})+)\b/g, (m) => m.replace(/\./g, ''));
}

/**
 * Tự kiểm — chạy `node tools/lib/voice-numbers.mjs`. Không phải test runner của repo (chưa có), chỉ để
 * người sửa module này thấy ngay có phá case cũ không, đặc biệt các ca "năm" (số 5 vs từ "năm"=year).
 */
export const SELF_TEST = [
  { text: 'Rồi trong vỏn vẹn một năm, mọi thứ đã đổi khác.', want: null, note: 'một năm = 1 năm (year), không phải số 15' },
  { text: 'Lớp có năm mươi học sinh.', want: '50', note: 'năm mươi = 50 (năm trước từ chỉ bậc)' },
  { text: 'Giá vé năm mươi nghìn đồng.', want: '50000', note: 'năm mươi nghìn = 50000 (năm trước từ chỉ bậc, cả cụm có nghìn)' },
  { text: 'Lớp có hai mươi lăm học sinh.', want: '25', note: 'hai mươi lăm = 25 (không liên quan năm)' },
  { text: 'Đội đó thu về năm trăm đô.', want: '500', note: 'năm trăm = 500 (năm trước từ chỉ bậc)' },
  { text: 'Đó là năm một chín bảy năm, mọi thứ bắt đầu.', want: '1975', note: 'một chín bảy năm = 1975 (chuỗi đọc rời ≥3, năm=digit cuối); "năm" đứng trước bị loại vì là nhãn' },
  { text: 'Bắt đầu từ khoảng năm hai nghìn không trăm lẻ sáu.', want: '2006', note: 'năm (nhãn, loại) + hai nghìn không trăm lẻ sáu = 2006' },
  { text: 'Chỉ là họ phải chờ hơn ba mươi năm, đốm sáng đó mới đủ lớn.', want: '30', wantWordsLeft: 'năm', note: 'ba mươi năm = 30 NĂM (đơn vị thời gian) — không được nuốt "năm" thành digit 5 (tức KHÔNG được ra 35)' },
];

if (process.argv[1] && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])) {
  let fail = 0;
  for (const t of SELF_TEST) {
    const runs = findNumberWords(t.text).filter((r) => r.digits.length >= 2);
    const got = runs[0]?.digits ?? null;
    const ok = got === t.want;
    if (!ok) fail++;
    console.log(`${ok ? '✓' : '✗'} "${t.text}" → ${JSON.stringify(got)} (muốn ${JSON.stringify(t.want)}) — ${t.note}`);
  }
  console.log(fail ? `\n${fail}/${SELF_TEST.length} ca sai` : `\nTất cả ${SELF_TEST.length} ca đúng.`);
  process.exit(fail ? 1 : 0);
}
