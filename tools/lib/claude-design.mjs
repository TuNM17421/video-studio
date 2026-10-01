/**
 * Build the hand-off prompt for Claude Design — the brief a member pastes into the design project so its
 * agent builds the scenes of one video, which we then pull back and render here with `tools/render.mjs`.
 *
 * Why a generator and not a hand-written file: the brief has to carry the **measured** length of every câu,
 * and those numbers only exist after the voice is recorded. Written by hand they go stale the moment a câu is
 * re-recorded; generated, they are always the ones in `voice.cues.json`.
 *
 * What the brief must NOT carry is the repo: the design project has no `ui_kits/`, no `spokenAt`, no
 * `styles/*.md`. A lesson-video style guide is written for the agent working *in this repo* and leaks those
 * names (the 2026-10-01 sync found four `.prompt.md` doing exactly that). So the style's half of the brief is
 * its own file, `styles/<id>.claude-design.md`, written for a reader who only has the design system —
 * and a new style adds a file, no code change, like every other style-specific thing in this repo.
 *
 * The parts that never change — the component contract, the nine colours, the frame-capture contract the
 * renderer needs — live here, because they are a property of the hand-off, not of the style.
 */

/** The capture contract `tools/render.mjs` drives: one tab, `vkSetFrame(n)` per frame, no page reload. */
export const CAPTURE_CONTRACT = `## Chế độ chụp frame

Mình render bằng headless Chrome rồi ghép ffmpeg, nên trang phải phơi ra đúng ba thứ:

- \`window.vkDuration\` — tổng số frame.
- \`window.vkSetFrame(n)\` — **trả về Promise**, resolve **sau khi** frame thứ n đã vẽ xong hẳn (chữ, ảnh, phông đều lên). Gọi liên tiếp trong cùng một tab phải chạy đúng, không rò trạng thái giữa các lần.
- \`?frame=N\` đóng băng frame N ở **1920×1080 tỉ lệ 1:1**, sát mép trái trên, ẩn thanh điều khiển, không bo góc, không viền đen, audio im. \`?captions=0\` bỏ thanh phụ đề. Khi vẽ xong đặt \`window.__frameReady = true\`.

Bộ chụp mở vài tab **một lần** rồi gọi \`vkSetFrame\` trong chính tab đó — **không tải lại trang cho mỗi frame**. Mở trang mới mỗi frame là nhân số lần nạp script lên bằng số frame.

Và **đừng nạp gì từ CDN ngoài**: React lấy từ \`../../_vendor/react.js\` và \`../../_vendor/react-dom.js\` (đúng bản design system được build cùng), JSX biên dịch sẵn thành JavaScript thường để trang không cần Babel. Chụp hàng chục nghìn frame mà mỗi frame phụ thuộc một CDN thì mạng chớp một nhịp là hỏng cả mẻ.`;

/** True for every style: use the real components, drive everything from the frame, keep to the nine colours. */
export const CORE_RULES = `## Ràng buộc bắt buộc

1. **Chỉ dùng component có sẵn trong design system này** (\`window.VK.*\`). Trước khi dựng, đọc \`<Tên>.prompt.md\` và \`<Tên>.d.ts\` của những component định dùng. **Không tự vẽ lại bằng \`div\` hay SVG thô một thứ design system đã có.** Thiếu component cho ý nào thì nói ra ở phần báo cáo — đừng chế một cái trông na ná.
2. **Mỗi cảnh là một hàm thuần của frame.** Đọc frame bằng \`useFrame()\`, mọi giá trị chuyển động đi qua \`appear\`, \`fade\`, \`pulse\`, \`interpolate\`, \`spring\`, \`smooth\`. **Không** CSS transition, \`setTimeout\`, thời gian thực hay \`Math.random\` — cùng một frame phải luôn cho ra cùng một khung hình.
3. **Màu chỉ lấy từ chín token \`C\`**: \`C.bg\`, \`C.bgAlt\`, \`C.text\`, \`C.textMuted\`, \`C.accent\`, \`C.accentStrong\`, \`C.red\`, \`C.redSoft\`, \`C.dotInactive\`. Nhạt thì \`alpha('red', 0.24)\`. **Không thêm mã màu hex mới, không gradient.**
4. **Không thêm con số, kết quả hay tên riêng nào không có trong danh sách câu dưới đây.** Ngược lại, dòng \`trên màn hình\` của mỗi câu là thứ cảnh **phải** cho thấy — người xem cần đọc được con số, không chỉ nghe. Dòng đó là của người viết kịch bản: chữ thì chép đúng, còn ý đồ hình (nếu có) là gợi ý, bạn dựng theo cách của bạn.
5. Chữ trong cảnh: dòng đầu là danh từ VIẾT HOA, dòng sau là giải thích chữ thường.`;

/** The five answers that make a run worth reading: what it used, where it stopped, what it had to give up. */
export const REPORT_ASKS = `## Báo lại cho mình ở cuối

1. **Dùng những component nào** của design system, và chỗ nào phải tự dựng vì không tìm thấy component phù hợp?
2. Có component nào **tài liệu nói một đằng, chạy một nẻo** không?
3. **Dựng được tới câu thứ bao nhiêu**? Nếu không đủ thì tắc ở đâu và vì sao?
4. Có chỗ nào bạn **tự thêm chữ ngoài danh sách câu** không? Liệt kê đủ, kèm số câu.
5. Có chỗ nào trong yêu cầu này mà design system **không làm nổi**, khiến bạn phải hạ yêu cầu xuống?`;

const WORKING = `## Cách làm

Làm **lần lượt theo từng phần**, báo một dòng ngắn sau mỗi phần: phần mấy, bao nhiêu cảnh, dùng component nào. Mình muốn theo được tiến độ chứ không phải chờ tới cuối.

**Gặp giới hạn nào** — độ dài phản hồi, số file, thời gian — thì **dừng lại và nói rõ đang ở câu nào, vướng gì**. Đừng âm thầm rút gọn phạm vi, đừng gộp nhiều câu vào một cảnh cho đủ số, đừng làm cảnh qua loa cho xong. Dựng được một nửa rồi tắc là kết quả hữu ích; dựng đủ nhưng nửa sau làm dối thì không.`;

const FPS = 30;

/** "mười một phút bốn mươi hai giây" reads better in a brief than "702,2 s". Minutes and seconds, in words. */
const UNITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];
const small = (n) => (n <= 10 ? UNITS[n] : n < 20 ? `mười ${UNITS[n - 10]}` : n % 10 === 0 ? `${UNITS[n / 10]} mươi` : `${UNITS[Math.floor(n / 10)]} mươi ${UNITS[n % 10]}`);
export function durationWords(frames) {
  const total = Math.round(frames / FPS);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (!m) return `${small(s)} giây`;
  return s ? `${small(m)} phút ${small(s)} giây` : `${small(m)} phút`;
}

/**
 * One câu as the brief shows it: the narration (locked — the voice is already recorded), the text that must
 * appear, the scene title, and the length in frames. `visual` is the script's on-screen line; it is text the
 * scene must show, never a description of how to draw it — art direction belongs to whoever builds the scene.
 */
function cueLines(cue, measured) {
  const out = [`${cue.n}. [${measured ? '' : '~'}${cue.frames} frame]  ${cue.text}`];
  if (cue.visual) out.push(`    trên màn hình: ${cue.visual}`);
  if (cue.title) out.push(`    tiêu đề cảnh: ${cue.title}`);
  return out.join('\n');
}

/**
 * The whole brief. `cues` carry `{ n, section, text, title, visual, frames }`; `measured` says whether those
 * frames came from `voice.cues.json` (real) or from the script's estimate (the voice is not recorded yet).
 */
export function buildPrompt({ id, title, sections = [], cues, measured, styleName, styleBlock }) {
  if (!cues?.length) throw new Error('không có câu nào');
  const total = cues.reduce((sum, c) => sum + c.frames, 0);
  // Gom theo số phần của chính các câu, không theo danh sách tên: hai video trong repo có `section:` trên
  // từng câu mà không export SECTIONS, và nếu gom theo tên thì câu ở phần không có tên sẽ biến mất không
  // một lời báo — brief thiếu câu là thứ chỉ lộ ra khi đã dựng xong.
  const groups = [...new Set(cues.map((c) => c.section))].sort((a, b) => a - b)
    .map((n) => ({ n, name: sections[n - 1] || `Phần ${n}`, cues: cues.filter((c) => c.section === n) }));
  const head = [
    `Mình cần dựng một video bài giảng bằng đúng design system có sẵn trong project này.`,
    '',
    `**Quy mô.** ${cues.length} cảnh, tổng **${total.toLocaleString('vi-VN')} frame** ở ${FPS} hình mỗi giây (khoảng ${durationWords(total)}), chia làm ${groups.length} phần. Video: *${title || id}*.`,
    '',
    measured
      ? `**Thời lượng từng cảnh là số đo thật** từ file giọng đã thu, **không được đổi** — cảnh phải vừa đúng khung giờ của câu đang đọc.`
      : `**Giọng đọc chưa thu, nên thời lượng dưới đây là ước lượng** (khoảng 2,9 tiếng mỗi giây cộng nhịp nghỉ). Số thật sẽ khác, nên **đừng neo nhịp vào frame tuyệt đối** — neo vào *câu nào, cụm từ nào*, để khi có giọng thật chỉ cần thay bảng thời lượng là khớp lại.`,
    '',
    `**Sân khấu.** 1920×1080 ở ${FPS} hình mỗi giây. Vùng nội dung an toàn là y từ 250 đến 960; dưới y 984 là thanh phụ đề, đừng để gì quan trọng ở đó.`,
    '',
    `**Phần hình là của bạn.** Mình chỉ đưa ba thứ đã khoá: lời đang đọc, thời lượng cảnh, và chữ bắt buộc phải xuất hiện. Còn bố cục, chọn component, cách chuyển cảnh, có hay không một mạch hình xuyên suốt — bạn tự quyết. Đừng hỏi lại mình từng cảnh.`,
  ].join('\n');

  const body = groups.map(({ n, name, cues: group }) => {
    const frames = group.reduce((sum, c) => sum + c.frames, 0);
    return [
      `\n### Phần ${n} · ${name}  — ${group.length} cảnh, ${frames.toLocaleString('vi-VN')} frame\n`,
      ...group.map((c) => cueLines(c, measured)),
    ].join('\n');
  }).join('\n');

  return [
    head,
    CORE_RULES,
    styleBlock ? `## Style: ${styleName}\n\n${styleBlock.trim()}` : '',
    CAPTURE_CONTRACT,
    WORKING,
    `## Danh sách ${cues.length} cảnh\n\nĐịnh dạng: \`số thứ tự. [thời lượng]  lời đang đọc\`, rồi \`trên màn hình:\` là thứ cảnh phải cho thấy, và \`tiêu đề cảnh:\` là chữ truyền vào \`title\`.\n${body}`,
    REPORT_ASKS,
  ].filter(Boolean).join('\n\n');
}
