/**
 * Các gate về CHỮ của một video — tách khỏi `tools/verify.mjs` để script lane chạy được trên bản
 * nháp TRƯỚC khi nộp (retro 21/09/2026, E4: 53 cue theo đúng từng dòng kịch bản làm đỏ
 * `maxShortRun` và `connector`, implement lane phải gộp 6 tách 3 sau khi wording đã khoá).
 *
 * Một định nghĩa một nơi: `verify.mjs` và `tools/text-gate.mjs` cùng import file này, nên không có
 * chuyện hai chỗ đếm "từ" theo hai kiểu rồi ra hai kết luận khác nhau.
 */

/** Bỏ dấu, bỏ mọi thứ không phải chữ/số, về chữ thường — để so hai đoạn chữ "có phải cùng một câu". */
export function normText(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Đếm "từ" = token cách nhau bởi khoảng trắng. Tiếng Việt viết rời từng âm tiết nên đây là âm tiết. */
export function narrationWordCount(cues) {
  return cues.reduce((sum, cue) => sum + (String(cue.text || '').trim().match(/\S+/g) || []).length, 0);
}

/**
 * Từ nối — dấu hiệu câu sau bắt vào câu trước.
 *
 * BIÊN TỪ PHẢI LÀ UNICODE. Bản đầu dùng `\b`, là biên ASCII: một từ kết thúc bằng ký tự có dấu
 * (`vì`, `thế`, `đó`, `giờ`, `thì`, `bây giờ`) thì `\b` sau nó KHÔNG BAO GIỜ khớp — 6/12 từ trong
 * danh sách là chữ chết, và một script đầy "vì… thì… đó…" vẫn trượt gate dù đọc rất liền mạch.
 * Đã kiểm lại trong node từng từ một trước khi sửa (xem `tools/text-gate.mjs --selftest`).
 *
 * Lookaround `\p{L}\p{N}` giữ đúng nghĩa "biên từ" mà không bắt nhầm trong từ ghép: `thìa` không
 * khớp `thì`, `đóng` không khớp `đó`.
 */
export const CONNECTOR =
  /(?<![\p{L}\p{N}])(nhưng|vì|nên|vậy|thế|đó|giờ|tiếp|còn|thì|cuối cùng|bây giờ)(?![\p{L}\p{N}])|quay lại|tuy vậy|ngược lại|thay vào đó/iu;

/** Bản `\b` cũ — giữ để `text-gate --selftest` chứng minh được chỗ hỏng, KHÔNG dùng để chấm. */
export const CONNECTOR_ASCII_BUG =
  /\b(nhưng|vì|nên|vậy|thế|đó|giờ|tiếp|còn|thì|cuối cùng|bây giờ)\b|quay lại|tuy vậy|ngược lại|thay vào đó/iu;

export function continuitySignals(cues, { connector = CONNECTOR } = {}) {
  const lengths = cues.map((cue) => (String(cue.text || '').match(/\S+/g) || []).length);
  const buckets = new Set(lengths.map((n) => (n <= 15 ? 'short' : n <= 22 ? 'medium' : 'long')));
  const connected = cues.filter((cue) => connector.test(String(cue.text || ''))).length;
  let shortRun = 0;
  let maxShortRun = 0;
  for (const n of lengths) {
    shortRun = n <= 15 ? shortRun + 1 : 0;
    maxShortRun = Math.max(maxShortRun, shortRun);
  }
  const openings = new Map();
  for (const cue of cues) {
    const opening = normText(String(cue.text || '')).split(' ').slice(0, 2).join(' ');
    if (opening) openings.set(opening, (openings.get(opening) || 0) + 1);
  }
  const repeatedOpening = [...openings.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
  /*
   * `repeatedOpening` đếm TOÀN BÀI, còn §3b của `script-craft.md:67` viết "ba câu **liên tiếp**
   * cùng cấu trúc hoặc cùng mở đầu là dấu hiệu phải viết lại". Hai thứ khác nhau, và chỉ cái đầu có
   * code — nên luật trong doc chưa bao giờ được kiểm. Đo thêm chuỗi LIÊN TIẾP ở đây để doc và code
   * nói cùng một thứ. Đo trên 11 video: dài nhất là 3 (d2-01-lab-v2), 10 video còn lại ≤2 — tức là
   * ngưỡng 3 của doc đúng là ngưỡng hiếm khi chạm, không phải ngưỡng đặt bừa.
   */
  let openRun = 1;
  let maxOpeningRun = cues.length ? 1 : 0;
  let openingRunWord = '';
  for (let i = 1; i < cues.length; i++) {
    const prev = normText(String(cues[i - 1].text || '')).split(' ')[0];
    const curr = normText(String(cues[i].text || '')).split(' ')[0];
    if (prev && prev === curr) {
      openRun += 1;
      if (openRun > maxOpeningRun) { maxOpeningRun = openRun; openingRunWord = prev; }
    } else openRun = 1;
  }
  return { buckets, connected, maxShortRun, repeatedOpening, maxOpeningRun, openingRunWord, lengths };
}

/**
 * Gate về NHỊP KỂ — áp cho mọi video, dài hay ngắn.
 *
 * Trước đây cả cụm này chỉ chạy khi `REQUEST.md` có ghi một khoảng phút bắt đầu từ 3 trở lên
 * (`verify.mjs:570,573`), tức là phần lớn video không bị gate chữ lần nào — kể cả video demo. Nhưng
 * "câu ngắn liên tiếp nghe như bullet rời" hay "6 câu cùng mở đầu giống nhau" không phải bệnh của
 * riêng bài dài. Hai check phụ thuộc độ dài thật (≥600 từ, ≥30 cue) tách ra sau cờ `longForm`.
 *
 * @param {object} opts  `longForm` bật hai check độ dài · `connector` thay regex (dùng cho report).
 */
export function textGateProblems(cues, where, opts = {}) {
  const { longForm = false } = opts;
  const problems = [];
  if (longForm) {
    const words = narrationWordCount(cues);
    if (words < 600) problems.push(`${where}: chỉ ${words} từ cho bài ≥3 phút — script quá ngắn`);
    if (cues.length < 30) problems.push(`${where}: chỉ ${cues.length} cues cho bài ≥3 phút — dễ thành các ý rời, thiếu nhịp kể`);
  }
  const q = continuitySignals(cues, opts);
  if (q.buckets.size < 3) problems.push(`${where}: script không có đủ nhịp câu ngắn/vừa/dài`);
  if (q.connected < Math.ceil(cues.length * 0.12)) problems.push(`${where}: chỉ ${q.connected}/${cues.length} cues có connector — kiểm tra narrative continuity`);
  if (q.maxShortRun > 3) problems.push(`${where}: có ${q.maxShortRun} câu rất ngắn liên tiếp — nghe như bullet rời`);
  if (q.repeatedOpening[1] > 4) problems.push(`${where}: ${q.repeatedOpening[1]} câu cùng mở bằng "${q.repeatedOpening[0]}" — dấu hiệu văn công thức`);
  return problems;
}

/**
 * Các gate áp cho bài ≥3 phút. Giữ nguyên tên và nguyên văn output cũ để `verify.mjs` và
 * `text-gate.mjs` không đổi hành vi với video đã có.
 */
export function longFormTextProblems(cues, where, opts = {}) {
  return textGateProblems(cues, where, { ...opts, longForm: true });
}

/*
 * ── Cue quá dài cho một hơi ────────────────────────────────────────────────────────────────────
 *
 * Nhịp trung vị ĐO ĐƯỢC của giọng harness: 5,12 âm tiết/giây (`tools/voice-pace.mjs`, 8 video
 * backend OmniVoice). Không lấy "từ/phút" của nguồn ngoài — xem lý do ở đầu voice-pace.mjs.
 *
 * NGƯỠNG 9 GIÂY lấy từ phân bố thật của 514 cue có `voice.js` (đo bằng `speechFrames`, tức phần
 * thật sự có tiếng, không tính khoảng nghỉ):
 *   p50 4,6 s · p75 5,9 s · p90 8,0 s · p95 10,3 s · p99 13,9 s · max 14,9 s
 *   >8 s: 50 cue (9,7%) · >9 s: 39 (7,6%) · >10 s: 29 (5,6%) · >12 s: 12 (2,3%)
 * Và 9 giây chia đôi rất sạch theo VIDEO, không chỉ theo cue: 8/11 video có ĐÚNG 0 cue vượt ngưỡng,
 * 36/39 cue vượt ngưỡng nằm gọn trong hai video mà audit đã chỉ tên (n5-06: 24 · d2-01-lab-v2: 12).
 * Hạ xuống 8 s thì kéo thêm n5-04 và n2-00 vào mà không thêm thông tin; nâng lên 10 s thì bỏ sót
 * đúng khoảng mà người đọc bắt đầu phải lấy hơi giữa câu.
 */
export const SYLLABLES_PER_SECOND = 5.12;
export const MAX_CUE_SECONDS = 9;

/**
 * Số giây NÓI của một cue. Ưu tiên số đo thật; chỉ ước lượng khi chưa có giọng.
 * Ba nguồn đo, theo thứ tự tin cậy:
 *   `timeline.js` → `duration` + `pause` (pause = duration − speechFrames)
 *   `voice.js`    → `speechFrames`
 *   `cues.js`     → `speech` (frame nói, đã bind sau khi có giọng)
 * Hết cả ba thì mới ước lượng bằng âm tiết ÷ nhịp — và `longCueProblems` nói rõ là ước lượng.
 */
export function cueSpeechSeconds(cue, { rate = SYLLABLES_PER_SECOND } = {}) {
  if (Number.isFinite(cue?.duration) && Number.isFinite(cue?.pause)) {
    return Math.max(0, cue.duration - cue.pause) / 30;
  }
  if (Number.isFinite(cue?.speechFrames)) return cue.speechFrames / 30;
  if (Number.isFinite(cue?.speech)) return cue.speech / 30;
  return (String(cue?.text || '').match(/\S+/g) || []).length / rate;
}

/** Cue nào dài hơn một hơi. Gộp thành MỘT dòng — 24 dòng rời sẽ lấp hết output. */
export function longCueProblems(cues, where, { max = MAX_CUE_SECONDS, rate = SYLLABLES_PER_SECOND } = {}) {
  const over = cues
    .map((cue) => ({ n: cue.n, seconds: cueSpeechSeconds(cue, { rate }) }))
    .filter((c) => c.seconds > max)
    .sort((a, b) => b.seconds - a.seconds);
  if (!over.length) return [];
  const measured = cues.some((c) => Number.isFinite(c?.pause) || Number.isFinite(c?.speechFrames) || Number.isFinite(c?.speech));
  const list = over.slice(0, 5).map((c) => `câu ${c.n} (${c.seconds.toFixed(1)} s)`).join(', ');
  return [
    `${where}: ${over.length}/${cues.length} cue dài hơn ${max} giây cho một hơi${measured ? '' : ' (ước lượng, chưa có voice.js)'}` +
      ` — dài nhất ${list}${over.length > 5 ? '…' : ''}`,
  ];
}

/*
 * ── Năm chỉ số "tính người" ────────────────────────────────────────────────────────────────────
 *
 * Nguồn: `reports/audit-2026-09-21/script.md` phát hiện #2. Đây là lớp lỗi duy nhất phải dựng lại
 * cả script SAU khi đã render (E10), và §3f của `script-craft.md` đã viết sẵn ngưỡng bằng văn xuôi
 * mà không có gì kiểm.
 *
 * ĐÂY LÀ CHỈ BÁO, KHÔNG PHẢI SỰ THẬT. Cả năm đều chạy ở mức CẢNH BÁO: một bản nháp trượt cả năm vẫn
 * có thể hay, và một bản đạt cả năm vẫn có thể nhạt. Chúng chỉ nói "chỗ này giống bản Thái đã chê".
 *
 * ĐỐI CHỨNG đã chạy — cặp `script-v1.md` (Thái chê "thiếu tính người") ↔ `script-v2.md` (bản sửa),
 * đo bằng chính code dưới đây (`node tools/text-gate.mjs --human --fixture`):
 *   chỉ số        v1      v2     audit ghi      khớp?
 *   mồ côi        69%     57%    71% → 51%      chiều đúng, lệch ≤6 điểm (danh sách 49 từ mở đầu
 *                                               dựng lại từ định nghĩa, audit không in đủ 48 mục)
 *   tiếng đệm     0.49    1.13   0.49 → 1.13    TRÙNG KHÍT
 *   ngôi xưng     0.97    1.85   0.97 → 1.85    TRÙNG KHÍT
 *   câu hỏi       2       5      2 → 5          TRÙNG KHÍT
 * Ngưỡng mồ côi đặt 60% (không phải 55% như audit đề xuất) vì thang đo ở đây lệch: 60% để v1 đỏ và
 * v2 xanh trên CHÍNH thước này — dùng số của audit trên thước này thì v2 cũng đỏ, tức là đo sai.
 *
 * MỌI REGEX PHẢI UNICODE-SAFE. `\b` là biên ASCII, không bao giờ khớp sau chữ có dấu — xem
 * CONNECTOR ở trên, 6/12 từ từng là chữ chết vì đúng lỗi này.
 */

/** Tiếng đệm cuối/giữa câu. Đúng danh sách audit đã đo: à·ừm·nhé·nha·lắm·đấy·thôi·chứ·đâu·nhỉ·cơ. */
export const FILLER = /(?<![\p{L}\p{N}])(à|ừm|nhé|nha|lắm|đấy|thôi|chứ|đâu|nhỉ|cơ)(?![\p{L}\p{N}])/giu;

/** Ngôi xưng — người nói tự xưng và gọi người nghe. */
export const PERSON = /(?<![\p{L}\p{N}])(mình|các bạn|bạn)(?![\p{L}\p{N}])/giu;

/**
 * Cue mở bằng từ nối hoặc hồi chiếu câu trước — tức là có móc vào câu vừa nói.
 * Bốn nhóm: từ nối · mở đoạn kiểu nói (§3f) · hồi chiếu (chỉ định/đại từ) · móc điều kiện–thời gian.
 */
export const OPENER =
  /^[""'«(\s…]*(và|nhưng|mà|rồi|nên|vì|còn|thì|vậy|thế|giờ|giờ thì|hoá ra|hóa ra|cho nên|thành ra|tức là|nghĩa là|tuy|dù|sau đó|cuối cùng|quay lại|ngược lại|thay vào đó|lần này|tiếp|à|à mà|ừ|ừ thì|thôi|được rồi|đó|đây|đấy|kia|nó|họ|cái đó|điều đó|chuyện đó|cả hai|cả ba|nếu|khi|lúc|đến khi|tới lúc)(?![\p{L}\p{N}])/iu;

/**
 * Câu mang phản ứng cá nhân (§3f: ngạc nhiên · hoài nghi · hào hứng · đồng cảm), đối lập với câu
 * trần thuật trung tính. Đây là phép ĐỐ CHỪNG bằng từ vựng — máy không đọc được cảm xúc; nó chỉ
 * đếm những dấu hiệu mà §3f nêu đích danh.
 *
 * CỐ Ý KHÔNG tính dấu `?`. Bản đầu có `|\?` trong regex này, và hậu quả là câu hỏi tu từ được cộng
 * vào CẢ chỉ số phản ứng lẫn chỉ số câu hỏi — hai cột đáng lẽ độc lập thì dính nhau, và `n5-02`
 * (audit đo 0 câu phản ứng / 54 cue) hiện ra là "đạt" chỉ nhờ mấy câu hỏi của nó.
 */
export const REACTION =
  /(?<![\p{L}\p{N}])(hoá ra|hóa ra|thật ra|thực ra|bất ngờ|nghe thì|tưởng là|tưởng rằng|ngỡ|không ngờ|khó tin|kỳ lạ|lạ ở chỗ|thú vị|đáng sợ|rất đau|đáng tiếc|may mà|khổ nỗi|mới là chỗ|chỗ hay|cái hay|điều hay|vấn đề là|đừng vội|nhớ giúp mình|ghi lại giúp mình|mình thích|mình nghĩ|mình thấy|mình tin|theo mình|nói thật|thú thật|đáng ngạc nhiên)(?![\p{L}\p{N}])/iu;

/** Ngưỡng CẢNH BÁO — xem khối chú thích ở trên để biết từng số ở đâu ra. */
export const HUMAN_THRESHOLDS = {
  orphanPct: 60,        // tối đa — cao hơn = câu nào cũng đứng rời, không móc vào câu trước
  fillerPer100: 0.8,    // tối thiểu
  personPer100: 1.5,    // tối thiểu
  cuesPerReaction: 10,  // tối đa — §3f: "ít nhất mỗi 8-10 cue một câu phản ứng cá nhân"
  cuesPerQuestion: 20,  // tối đa
};

/** Năm chỉ số + phán quyết cảnh báo. Không ném lỗi, không exit — chỉ trả số. */
export function humanSignals(cues, t = HUMAN_THRESHOLDS) {
  const texts = cues.map((c) => String(c?.text || ''));
  const words = narrationWordCount(cues);
  const count = (re) => texts.reduce((s, x) => s + (x.match(re) || []).length, 0);
  const orphan = texts.filter((x) => !OPENER.test(x.trim())).length;
  const reactions = texts.filter((x) => REACTION.test(x)).length;
  const questions = count(/\?/g);
  const per100 = (n) => (words ? (100 * n) / words : 0);
  const ratio = (n) => (n ? cues.length / n : Infinity);
  const m = {
    cues: cues.length,
    words,
    orphanPct: cues.length ? (100 * orphan) / cues.length : 0,
    fillerPer100: per100(count(FILLER)),
    personPer100: per100(count(PERSON)),
    reactions,
    cuesPerReaction: ratio(reactions),
    questions,
    cuesPerQuestion: ratio(questions),
  };
  m.flagged = {
    orphanPct: m.orphanPct > t.orphanPct,
    fillerPer100: m.fillerPer100 < t.fillerPer100,
    personPer100: m.personPer100 < t.personPer100,
    reactions: m.cuesPerReaction > t.cuesPerReaction,
    questions: m.cuesPerQuestion > t.cuesPerQuestion,
  };
  const text = {
    orphanPct: `${m.orphanPct.toFixed(0)}% cue mồ côi (trần ${t.orphanPct}%) — câu không móc vào câu trước, nghe như đọc danh sách`,
    fillerPer100: `tiếng đệm ${m.fillerPer100.toFixed(2)}/100 từ (cần ≥${t.fillerPer100}) — văn viết, không phải lời nói`,
    personPer100: `ngôi xưng ${m.personPer100.toFixed(2)}/100 từ (cần ≥${t.personPer100}) — không có ai đang nói với ai`,
    reactions: `${m.reactions} câu phản ứng cá nhân / ${m.cues} cue (§3f cần 1 mỗi ${t.cuesPerReaction}) — trần thuật đều đều`,
    questions: `${m.questions} câu hỏi / ${m.cues} cue (cần 1 mỗi ${t.cuesPerQuestion}) — không có chỗ nào kéo người nghe vào`,
  };
  m.warnings = Object.keys(m.flagged).filter((k) => m.flagged[k]).map((k) => text[k]);
  return m;
}

/**
 * Bóc cue ra từ bảng kịch bản markdown (§2 "Bảng kịch bản"), để chấm được bản nháp TRƯỚC khi nó
 * thành `cues.js` — và để `--fixture` chấm được cặp v1/v2 của audit. Mỗi dòng trong ô "lời dẫn"
 * (tách bằng `<br>`) là một cue, đúng như §2 mô tả; `(nghỉ 0.5s)` là chỉ dẫn, không phải lời.
 */
export function cuesFromScriptMarkdown(md) {
  const section = md.split(/^## /m).find((s) => /^2\./.test(s)) || md;
  const out = [];
  let n = 0;
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1);
    if (cells.length < 3 || /^\s*:?-+/.test(cells[0]) || /lời dẫn/i.test(cells[1])) continue;
    for (const raw of cells[1].split(/<br\s*\/?>/i)) {
      const text = raw.replace(/<\/?sub>/g, '').replace(/\(nghỉ[^)]*\)/gi, '').replace(/\*\*/g, '').trim();
      if (text) out.push({ n: ++n, text });
    }
  }
  return out;
}

/** Trang phụ đề > 78 ký tự. `paginate` truyền vào để module này không phụ thuộc design system. */
export function captionPageProblems(cues, paginate, where, max = 78) {
  const problems = [];
  for (const cue of cues) {
    for (const page of paginate(String(cue.text || ''), max)) {
      if ([...page].length > max) problems.push(`${where}: caption ${[...page].length} chars: ${page}`);
    }
  }
  return problems;
}

/**
 * ── CẤU TRÚC BẮT BUỘC CỦA MỘT VIDEO TRONG SERIES (`script-craft.md` §3i) ──────────────────────
 *
 * Ba thứ Thái chốt 22/09/2026 sau khi xem `d05-v06` 10:54: mở phải NỐI vào video liền trước, kết
 * phải GỢI phần sau, và cuối video có ba câu trắc nghiệm không giải thích. Cả ba là chỗ người học
 * rơi khỏi lộ trình nếu thiếu, và cả ba máy kiểm được.
 *
 * Check chỉ BẬT khi `REQUEST.md` khai trường tương ứng — video cũ (không khai `quiz:`) chỉ nhận
 * CẢNH BÁO, không bị chặn. Đây là luật chung của repo: check mới không được biến một video đã đạt
 * thành trượt.
 */
export const STRUCTURE_SCENES = Object.freeze({ intro: 'intro-link', outro: 'outro-next' });

/** Đọc `prev`/`next`/`quiz` từ REQUEST.md. Trả `{}` khi không có file — check tự tắt. */
export function structureSpec(requestMd) {
  if (!requestMd) return {};
  const line = (name) => requestMd.match(new RegExp(String.raw`^\s*[-*]\s*\*\*${name}\*\*\s*:\s*(.*)$`, 'm'))?.[1]?.trim();
  const spec = {};
  const prev = line('prev');
  const next = line('next');
  const quiz = line('quiz');
  // `<...>` là placeholder chưa điền — coi như chưa khai, đừng bắt lane chạy theo khung rỗng.
  const filled = (v) => v && !/^`?<[^>]*>`?/.test(v) && !/^\(/.test(v);
  if (filled(prev)) spec.prev = /KHÔNG CÓ/i.test(prev) ? null : prev;
  if (filled(next)) spec.next = /KHÔNG RÕ/i.test(next) ? null : next;
  const n = quiz && quiz.match(/`?(\d+)`?/);
  if (n) spec.quiz = Number(n[1]);
  return spec;
}

/**
 * Ba check cấu trúc. `level` là `'block'` khi REQUEST khai trường đó, `'warn'` khi không —
 * nên một video cũ không khai gì sẽ chỉ thấy cảnh báo.
 */
export function structureProblems(cues, where, spec = {}) {
  const problems = [];
  const warnings = [];
  const say = (on, msg) => (on ? problems : warnings).push(`${where}: ${msg}`);
  const sceneOf = (c) => String(c?.scene || '');

  const hasIntro = cues.some((c) => sceneOf(c) === STRUCTURE_SCENES.intro);
  if ('prev' in spec) {
    if (!hasIntro) say(true, `thiếu cảnh \`${STRUCTURE_SCENES.intro}\` — mở phải NỐI vào video liền trước (§3i.1)`);
    else if (spec.prev) {
      /*
       * Từ neo = các cụm TIẾNG VIỆT trong dấu nháy kép của dòng `prev:` — ví dụ "không hài lòng".
       * CỐ Ý loại thứ trong backtick: đó là id video (`n5-05-…`) và tên cảnh (`intro-link`), không
       * phải chữ sẽ xuất hiện trong lời đọc. Không lọc thì check báo oan trên chính video đã đạt
       * (đo 22/09/2026 trên `d05-v06`). Không khai cụm nào → bỏ qua phần này, chỉ kiểm có cảnh.
       */
      const anchors = [...String(spec.prev).matchAll(/["“]([^"”]{4,})["”]/g)]
        .map((m) => m[1].toLowerCase())
        .filter((a) => a.includes(' ') && !/[`/]/.test(a));
      const intro = cues.filter((c) => sceneOf(c) === STRUCTURE_SCENES.intro).map((c) => String(c.text || '').toLowerCase()).join(' ');
      if (anchors.length && !anchors.some((a) => intro.includes(a))) {
        say(true, `cảnh \`${STRUCTURE_SCENES.intro}\` không gọi lại ý nào đã khai ở \`prev:\` (${anchors.map((a) => `"${a}"`).join(', ')})`);
      }
    }
  } else if (!hasIntro) warnings.push(`${where}: chưa có cảnh \`${STRUCTURE_SCENES.intro}\` (§3i.1) — REQUEST.md chưa khai \`prev:\` nên chỉ cảnh báo`);

  const hasOutro = cues.some((c) => sceneOf(c) === STRUCTURE_SCENES.outro);
  if ('next' in spec) {
    if (!hasOutro) say(true, `thiếu cảnh \`${STRUCTURE_SCENES.outro}\` — kết phải GỢI phần sau (§3i.2)`);
  } else if (!hasOutro) warnings.push(`${where}: chưa có cảnh \`${STRUCTURE_SCENES.outro}\` (§3i.2) — REQUEST.md chưa khai \`next:\` nên chỉ cảnh báo`);

  const quizCues = cues.filter((c) => c?.quiz === true);
  const notSilent = quizCues.filter((c) => !c.silent || String(c.text || '').trim());
  for (const c of notSilent) {
    // `quiz: true` trên một cue CÓ LỜI là lỗi thật: `render.mjs` sẽ đè nhạc quiz lên tiếng nói.
    say(true, `cue ${c.n} đánh \`quiz: true\` nhưng KHÔNG phải cue lặng — nhạc quiz sẽ đè lên lời đọc`);
  }
  if (typeof spec.quiz === 'number') {
    if (quizCues.length !== spec.quiz) {
      say(true, `REQUEST.md khai \`quiz: ${spec.quiz}\` nhưng có ${quizCues.length} cue \`quiz: true\` (đặt ở cue LẶNG của mỗi câu)`);
    }
  } else if (quizCues.length) {
    warnings.push(`${where}: có ${quizCues.length} cue quiz nhưng REQUEST.md chưa khai \`quiz:\` — không đối chiếu được`);
  }
  return { problems, warnings };
}

/**
 * Tách phần TRẦN THUẬT khỏi phần quiz. Lý do đo được 22/09/2026: thêm 26 cue quiz (không có và
 * không nên có câu phản ứng cá nhân) làm `cuesPerReaction` TOÀN BÀI tụt 8,8 → 10,8 và trượt ngưỡng
 * **dù không sửa một chữ nào của phần cũ**. Không tách thì lane sau sẽ chêm tiếng đệm vào câu hỏi
 * trắc nghiệm cho "đủ chỉ số" — đúng thứ không nên làm.
 */
export function narrativeCues(cues) {
  return cues.filter((c) => !/^quiz-/.test(String(c?.scene || '')) && c?.quiz !== true && !c?.silent);
}
