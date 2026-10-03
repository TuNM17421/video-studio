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

/**
 * The capture contract `tools/render.mjs` drives: one tab, `vkSetFrame(n)` per frame, no page reload.
 *
 * Hai thứ ở đây đi theo video chứ không cố định: cỡ khung (khổ dọc là 1080×1920, và render chỉ mở đúng cỡ
 * khi trang khai `window.vkFormat` — thiếu thì nó về 1920×1080 mà không báo), và frame lẻ (render 60 fps hỏi
 * frame 40, 40,5, 41 trên cùng cái đồng hồ 30 fps; trang làm tròn thì mỗi hình bị ghi hai lần).
 */
export const captureContract = (format = LANDSCAPE) => `## Chế độ chụp frame

Mình render bằng headless Chrome rồi ghép ffmpeg, nên trang phải phơi ra đúng những thứ sau:

- \`window.vkDuration\` — tổng số frame.
- \`window.vkSetFrame(n)\` — **trả về Promise**, resolve **sau khi** frame thứ n đã vẽ xong hẳn (chữ, ảnh, phông đều lên). Gọi liên tiếp trong cùng một tab phải chạy đúng, không rò trạng thái giữa các lần. **\`n\` có thể là số lẻ** (40,5) khi mình xuất 60 hình mỗi giây: vẽ đúng hình ở giữa hai frame, đừng làm tròn.${format.id === '16x9' ? '' : `
- \`window.vkFormat = { id: '${format.id}', width: ${format.width}, height: ${format.height} }\` — bộ chụp đọc cỡ khung từ đây. **Thiếu dòng này thì nó mở khung 1920×1080** và cảnh bị cắt.`}
- \`?frame=N\` đóng băng frame N ở **${format.width}×${format.height} tỉ lệ 1:1**, sát mép trái trên, ẩn thanh điều khiển, không bo góc, không viền đen, audio im. \`?captions=0\` bỏ thanh phụ đề. Khi vẽ xong đặt \`window.__frameReady = true\`.

Bộ chụp mở vài tab **một lần** rồi gọi \`vkSetFrame\` trong chính tab đó — **không tải lại trang cho mỗi frame**. Mở trang mới mỗi frame là nhân số lần nạp script lên bằng số frame.

Và **đừng nạp gì từ CDN ngoài**: React lấy từ \`../../_vendor/react.js\` và \`../../_vendor/react-dom.js\` (đúng bản design system được build cùng), JSX biên dịch sẵn thành JavaScript thường để trang không cần Babel. Chụp hàng chục nghìn frame mà mỗi frame phụ thuộc một CDN thì mạng chớp một nhịp là hỏng cả mẻ.`;

/** Khổ ngang — mặc định của design system (`FORMATS['16x9']` trong lib/tokens.js), khi người gọi không truyền khổ. */
const LANDSCAPE = { id: '16x9', width: 1920, height: 1080, layout: { contentTop: 250, contentBottom: 960, captionTop: 984 } };
export const CAPTURE_CONTRACT = captureContract();

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
  const said = cue.silent ? '(im lặng — không có lời, khoảng chờ người xem suy nghĩ)' : cue.text;
  const out = [`${cue.n}. [${measured ? '' : '~'}${cue.frames} frame]  ${cue.tag ? `[${cue.tag}] ` : ''}${said}`];
  if (cue.speaker) out.push(`    người nói: ${cue.speaker}`);
  if (cue.visual) out.push(`    trên màn hình: ${cue.visual}`);
  if (cue.title) out.push(`    tiêu đề cảnh: ${cue.title}`);
  return out.join('\n');
}

/**
 * The whole brief. `cues` carry `{ n, section, text, title, visual, frames }`; `measured` says whether those
 * frames came from `voice.cues.json` (real) or from the script's estimate (the voice is not recorded yet).
 */
/**
 * Sân khấu theo khổ. Khổ ngang giữ nguyên câu cũ; khổ dọc phải nói cả *cách bày* chứ không chỉ cỡ khung —
 * dựng ngang rồi cắt vào khung dọc mất gần nửa hình (#62 đã đo), và người dựng bên kia không có REQUEST.md.
 */
function stageLine(format) {
  const l = format.layout || {};
  if (format.id === '16x9') {
    return `**Sân khấu.** 1920×1080 ở ${FPS} hình mỗi giây. Vùng nội dung an toàn là y từ 250 đến 960; dưới y 984 là thanh phụ đề, đừng để gì quan trọng ở đó.`;
  }
  const x0 = l.contentXMin ?? 48;
  return [
    `**Sân khấu.** Khổ **dọc ${format.aspect || '9:16'}**, ${format.width}×${format.height} ở ${FPS} hình mỗi giây.`,
    `Vùng nội dung an toàn là x từ ${x0} đến ${format.width - x0}, y từ ${l.contentTop} đến ${l.contentBottom}; dưới y ${l.captionTop} là thanh phụ đề${l.captionMaxChars ? ` (mỗi dòng tối đa ${l.captionMaxChars} ký tự)` : ''}, đừng để gì quan trọng ở đó.`,
    `**Bày theo cột, từ trên xuống**: mũi tên đi xuống, so sánh là hai thẻ chồng nhau, mỗi màn ít khối hơn khổ ngang vì bề ngang chỉ còn hơn một nửa. **Đừng dựng ngang rồi thu hay cắt vào khung dọc.**`,
    `Design system có sẵn khổ này (\`FORMATS['${format.id}']\`, \`useLayout()\`) thì lấy toạ độ từ đó thay vì tự đặt số.`,
  ].join(' ');
}

/** Tên năng lực như Studio gọi; `sfx` trộn vào tiếng lúc render nên không có gì để nói với người dựng hình. */
function capabilityLines(modules, cues) {
  if (!Array.isArray(modules)) return [];
  const has = (id) => modules.includes(id);
  const out = [];
  if (has('dialogue') || cues.some((c) => c.speaker)) {
    out.push('- **Hội thoại.** Câu nào có dòng `người nói` là lời của nhân vật đó. Dùng thẻ thoại của design system, mỗi nhân vật giữ một phía suốt video; đừng đổi tên hay thêm nhân vật.');
  }
  if (has('quiz') || cues.some((c) => c.quiz)) {
    out.push('- **Quiz.** Câu gắn `[CÂU HỎI]` là câu hỏi; câu `im lặng` ngay sau là khoảng chờ — giữ câu hỏi trên màn hình cùng đồng hồ đếm, **chưa hiện đáp án**. Đáp án chỉ xuất hiện ở câu kế tiếp.');
  }
  out.push(has('mascot')
    ? '- **Linh vật Griffin.** Video có Griffin: dùng `Griffin` / `GriffinBadge` của design system ở những câu Griffin nói hoặc dòng `trên màn hình` nhắc tới Griffin; câu khác thì không vẽ.'
    : '- **Không có linh vật.** Đừng dùng `Griffin` / `GriffinBadge` ở bất kỳ cảnh nào.');
  return out;
}

/**
 * Ảnh người dựng video đã duyệt. Bên kia không thấy máy này, nên brief phải nói đủ ba thứ: file nào, câu nào,
 * dòng ghi nguồn nào — và rằng không được tự thêm ảnh. `src` dựng từ vị trí trang để chạy được cả ở project
 * bên đó lẫn sau khi chép về (PhotoCard để nguyên một URL tuyệt đối).
 */
function imageLines(images) {
  const list = (images || []).filter((i) => i && i.file);
  if (!list.length) return '';
  const row = (i) => {
    const where = i.cues?.length ? `câu ${i.cues.join(', ')}` : 'chưa gắn câu';
    const size = i.width && i.height ? ` (${i.width}×${i.height})` : '';
    return i.kind === 'use'
      ? `- ${where}: \`img/${i.file}\`${size} — ${i.subject || 'ảnh tư liệu'}. Ghi nguồn, chép nguyên: «${i.credit || ''}»${i.caption ? `. Chú thích: «${i.caption}»` : ''}`
      : `- ${where}: \`img/${i.file}\` — ${i.subject || 'ảnh tham khảo'}. **Chỉ để xem rồi vẽ lại** bằng component, không đưa ảnh này vào cảnh.`;
  };
  return [
    `## Ảnh tư liệu`,
    '',
    `Người dựng video đã duyệt ${list.length} ảnh. Mình tải các file này vào thư mục \`img/\` cạnh trang; nạp bằng \`new URL('img/<tên file>', location.href).href\` rồi truyền vào \`src\` của \`PhotoCard\`. Ảnh chỉ xuất hiện ở đúng câu ghi dưới đây, dòng ghi nguồn phải đọc được, và **không thêm ảnh nào khác** — kể cả ảnh minh hoạ tự tìm.`,
    '',
    ...list.map(row),
  ].join('\n');
}

export function buildPrompt({ id, title, sections = [], cues, measured, styleName, styleBlock, format = LANDSCAPE, modules = null, images = [] }) {
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
    stageLine(format),
    '',
    `**Phần hình là của bạn.** Mình chỉ đưa ba thứ đã khoá: lời đang đọc, thời lượng cảnh, và chữ bắt buộc phải xuất hiện. Còn bố cục, chọn component, cách chuyển cảnh, có hay không một mạch hình xuyên suốt — bạn tự quyết. Đừng hỏi lại mình từng cảnh.`,
  ].join('\n');

  const capabilities = capabilityLines(modules, cues);

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
    capabilities.length ? `## Năng lực của video\n\n${capabilities.join('\n')}` : '',
    imageLines(images),
    captureContract(format),
    WORKING,
    `## Danh sách ${cues.length} cảnh\n\nĐịnh dạng: \`số thứ tự. [thời lượng]  lời đang đọc\`, rồi \`trên màn hình:\` là thứ cảnh phải cho thấy, và \`tiêu đề cảnh:\` là chữ truyền vào \`title\`.\n${body}`,
    REPORT_ASKS,
  ].filter(Boolean).join('\n\n');
}

/**
 * Soát một thư mục tải về từ Claude Design trước khi chép vào chỗ render.
 *
 * Ba thứ dưới đây mà sai thì render ra rác chứ không báo lỗi, nên chặn ở đây — cùng tinh thần với phép quét
 * thư mục audio của `voice-import`, thứ chặn thẳng một thư mục lệch một câu thay vì để lộ sau khi render xong:
 *
 *   · thiếu file trang hoặc thiếu đúng file mà trang nạp → trang trắng, mà `render.mjs` vẫn chụp đủ frame;
 *   · không phơi `vkSetFrame`/`vkDuration` → bộ chụp không điều khiển được frame nào;
 *   · nạp script từ CDN ngoài → mạng chớp một nhịp giữa hàng chục nghìn frame là hỏng cả mẻ.
 *
 * Trả về danh sách kiểm, không ném lỗi: người gọi quyết định cái nào là chặn, cái nào là cảnh báo.
 */
export function inspectBundle({ files, page, pageHtml, scripts, format = null }) {
  const checks = [];
  const add = (name, ok, detail, level = 'problem') => checks.push({ name, ok, detail, level: ok ? 'ok' : level });

  add('trang', Boolean(page), page ? page : 'không thấy file .html nào trong thư mục');
  if (!page) return { ok: false, checks };

  // Trang nạp gì thì thứ đó phải có mặt — thiếu một file là trang trắng, mà bộ chụp vẫn chụp đủ frame.
  const local = [...pageHtml.matchAll(/(?:src|href)="(\.[^"]+)"/g)].map((m) => m[1].replace(/^\.\//, ''));
  const missing = local.filter((rel) => !rel.startsWith('../') && !files.includes(rel));
  add('file trang cần', missing.length === 0, missing.length ? `thiếu: ${missing.join(', ')}` : `đủ ${local.length} file`);

  // Script ngoài: với một lượt chụp hàng chục nghìn frame thì mỗi phụ thuộc mạng là một chỗ hỏng.
  const remote = [...pageHtml.matchAll(/src="(https?:\/\/[^"]+)"/g)].map((m) => new URL(m[1]).host);
  add('không phụ thuộc CDN', remote.length === 0,
    remote.length ? `trang nạp script từ ${[...new Set(remote)].join(', ')} — render hàng chục nghìn frame sẽ phụ thuộc mạng` : 'mọi script nằm trong project',
    'warning');

  // Hợp đồng chụp frame: thiếu là không chụp được frame nào.
  const js = scripts.join('\n');
  for (const [name, needle] of [['vkSetFrame', 'vkSetFrame'], ['vkDuration', 'vkDuration'], ['__frameReady', '__frameReady']]) {
    add(`phơi ${name}`, js.includes(needle), js.includes(needle) ? 'có' : 'không tìm thấy trong mã trang');
  }
  // Khổ dọc: render lấy cỡ khung từ `window.vkFormat`. Trang không khai thì khung mở 1920×1080 và MP4 ra
  // ngang với cảnh dọc bị cắt — vẫn đủ frame, không lỗi nào báo.
  if (format && format.id !== '16x9') {
    const declared = new RegExp(`vkFormat[\\s\\S]{0,200}?${format.width}[\\s\\S]{0,80}?${format.height}`).test(js + pageHtml);
    add(`khai khổ ${format.id}`, declared,
      declared ? `window.vkFormat ${format.width}×${format.height}` : `trang không khai window.vkFormat ${format.width}×${format.height} — render sẽ mở khung 1920×1080 và cắt cảnh`);
  }
  add('chế độ ?frame=N', /[?&]frame=|['"]frame['"]/.test(js + pageHtml), 'tham số đóng băng frame', 'warning');

  return { ok: checks.every((c) => c.ok || c.level === 'warning'), checks };
}

/** Tổng frame bên kia khai, nếu đọc được — lệch với giọng bên này là cảnh trôi so với lời. */
export function bundleFrames(scripts) {
  const parts = /PARTS\s*=\s*\[([\s\S]*?)\]\s*;/.exec(scripts.join('\n'));
  if (!parts) return null;
  const frames = [...parts[1].matchAll(/frames:\s*(\d+)/g)].map((m) => Number(m[1]));
  return frames.length ? frames.reduce((a, b) => a + b, 0) : null;
}
