/**
 * N2-00 · Giới thiệu ngày 2 — xác định đúng việc cần giải quyết.
 * Source: projects/n2-00-gioi-thieu-ngay-2/kich-ban-goc.md (bản rà ngày 10/09/2026), 16 câu, 02:48.
 *
 * One cue = one narrated sentence = one scene. Frames (30 fps) follow the script's estimate
 * (≈ 3 tiếng / giây + 1 giây nghỉ sau câu). When the real voice is recorded, keep these as the
 * authored durations and pass the measured ones to Series (`authoredDuration`) — do not re-author.
 * `mapPart` = the day-map part lit in this scene (0 = none). `text` is the locked narration.
 */
const RAW = [
  {
    n: 1, seconds: 11, section: 1, mapPart: 0,
    title: 'Bắt đầu từ đâu?', tag: 'MINH HỌA',
    text: 'Nếu được nhờ làm một trợ lý trí tuệ nhân tạo, bạn sẽ bắt đầu bằng việc chọn công cụ hay tìm hiểu người dùng đang gặp khó khăn gì?',
    screen: 'Bắt đầu từ đâu?',
    visual: 'Hai thẻ Chọn công cụ và Hiểu khó khăn hiện cạnh một yêu cầu mơ hồ; gắn MINH HỌA.',
  },
  {
    n: 2, seconds: 8, section: 1, mapPart: 0,
    title: 'Ngày 2 · Xác định đúng vấn đề',
    text: 'Chào bạn, ngày hai giúp chúng ta làm rõ vấn đề trước khi quyết định dùng công nghệ để giải quyết.',
    screen: 'Ngày 2 · Xác định đúng vấn đề',
    visual: 'Hiện tiêu đề Ngày 2, nối biểu tượng người dùng tới một công việc cần hoàn thành.',
  },
  {
    n: 3, seconds: 11, section: 1, mapPart: 0,
    title: 'Lộ trình ngày 2',
    text: 'Bạn sẽ học cách xác định việc cần cải thiện, chọn cách giải quyết và kiểm tra xem đã đủ điều kiện để bắt đầu làm hay chưa.',
    screen: 'Cần cải thiện gì? · Làm thế nào? · Đã sẵn sàng chưa?',
    visual: 'Mở bản đồ bằng ba thẻ Xác định việc, Chọn cách, Kiểm tra điều kiện; chưa đưa đáp án.',
  },
  {
    n: 4, seconds: 9, section: 2, mapPart: 1,
    title: '1 · Tìm khó khăn đằng sau lời đề nghị', tag: 'MINH HỌA',
    text: 'Đầu tiên, bạn sẽ học cách tìm khó khăn thật sự đằng sau một đề nghị như làm trợ lý hỗ trợ học viên.',
    screen: '1 · Tìm khó khăn đằng sau lời đề nghị',
    visual: 'Tô phần 1; đặt đề nghị Làm trợ lý cạnh hình học viên tìm hướng dẫn nộp bài chưa thấy, gắn MINH HỌA.',
  },
  {
    n: 5, seconds: 11, section: 2, mapPart: 1,
    title: 'Quan sát họ tìm ở đâu · Hỏi bước làm mất thời gian', titleSize: 44, tag: 'MINH HỌA',
    text: 'Qua ví dụ một học viên tìm hướng dẫn nộp bài, bạn sẽ quan sát họ tìm ở đâu và hỏi bước nào khiến họ mất thời gian.',
    screen: 'Quan sát họ tìm ở đâu · Hỏi bước làm mất thời gian',
    visual: 'Học viên mở các trang hướng dẫn; người quan sát ghi lại trang đã tìm và bước khiến học viên dừng lại, rồi đặt câu hỏi; giữ nhãn MINH HỌA.',
  },
  {
    n: 6, seconds: 10, section: 2, mapPart: 2,
    title: '2 · Viết rõ người, việc và ảnh hưởng',
    text: 'Phần hai giúp bạn viết rõ ai đang gặp khó, họ vướng ở bước nào và việc đó gây chậm trễ hoặc sai sót gì.',
    screen: '2 · Viết rõ người, việc và ảnh hưởng',
    visual: 'Tô phần 2; một phiếu hiện Ai gặp khó?, Vướng bước nào?, Chậm hoặc sai ở đâu?; các ô chưa có kết quả đo.',
  },
  {
    n: 7, seconds: 11, section: 2, mapPart: 2,
    title: 'Đo hiện tại · Chọn mục tiêu · Đo lại',
    text: 'Bạn sẽ ghi lại hiện nay học viên mất bao lâu để tìm đúng hướng dẫn, chọn thời gian muốn rút ngắn, rồi đo lại sau khi cải thiện.',
    screen: 'Đo hiện tại · Chọn mục tiêu · Đo lại',
    visual: 'Ba thẻ lần lượt hiện: Mất bao lâu hiện nay? → Muốn rút ngắn còn bao lâu? → Đo lại sau khi cải thiện; không điền số.',
  },
  {
    n: 8, seconds: 9, section: 2, mapPart: 3,
    title: '3 · Trí tuệ nhân tạo (AI) có giúp ích?',
    text: 'Phần ba đặt câu hỏi: trí tuệ nhân tạo, hay AI, có thực sự giúp ích cho công việc ấy hay không.',
    screen: '3 · Trí tuệ nhân tạo (AI) có giúp ích?',
    visual: 'Tô phần 3; đặt câu hỏi về lợi ích bên cạnh công việc người dùng cần làm; hiện nhãn Trí tuệ nhân tạo (AI).',
  },
  {
    n: 9, seconds: 9, section: 2, mapPart: 3,
    title: 'Chọn vai trò của AI trong từng việc',
    text: 'Bạn sẽ cân nhắc những việc có thể giao AI làm thay và những việc AI nên hỗ trợ để con người quyết định.',
    screen: 'Chọn vai trò của AI trong từng việc',
    visual: 'Hai nhánh AI làm thay và AI hỗ trợ người quyết định xuất hiện ngang nhau.',
  },
  {
    n: 10, seconds: 14, section: 2, mapPart: 4,
    title: '4 · Con người đặt sẵn bước làm · AI chọn bước tiếp', titleSize: 44,
    text: 'Ở phần bốn, bạn sẽ so sánh hai cách tổ chức công việc: con người đặt sẵn quy tắc và các bước xử lý, hoặc để AI chọn bước tiếp theo dựa trên kết quả vừa nhận được.',
    screen: '4 · Con người đặt sẵn bước làm · AI chọn bước tiếp',
    visual: 'Tô phần 4; hiện hai thẻ: Con người đặt quy tắc và các bước xử lý; AI nhận kết quả → Chọn bước tiếp. Giữ nhãn Trong phạm vi cho phép dưới thẻ AI.',
  },
  {
    n: 11, seconds: 9, section: 2, mapPart: 4,
    title: 'Đủ dùng và phù hợp',
    text: 'Mục đích là chọn cách đủ giải quyết công việc, đồng thời cân nhắc chi phí, thời gian chờ và rủi ro.',
    screen: 'Đủ dùng và phù hợp',
    visual: 'Công việc cần làm đặt giữa ba tiêu chí Chi phí, Thời gian, Rủi ro.',
  },
  {
    n: 12, seconds: 10, section: 2, mapPart: 5,
    title: '5 · Đánh giá kết quả AI và xử lý sai',
    text: 'Phần năm giúp bạn xác định thế nào là kết quả đạt yêu cầu và cần làm gì khi hệ thống AI cho ra kết quả sai.',
    screen: '5 · Đánh giá kết quả AI và xử lý sai',
    visual: 'Tô phần 5; kết quả của hệ thống AI đi tới hai đường Đạt yêu cầu và Cần xử lý.',
  },
  {
    n: 13, seconds: 12, section: 2, mapPart: 5,
    title: 'Báo nhầm người không cần giúp · Bỏ sót người cần giúp', titleSize: 42, tag: 'MINH HỌA',
    text: 'Bạn sẽ xem hai lỗi thường gặp: hệ thống AI báo nhầm rằng một người cần giúp dù họ không gặp khó, hoặc bỏ sót người thật sự đang cần hỗ trợ.',
    screen: 'Báo nhầm người không cần giúp · Bỏ sót người cần giúp',
    visual: 'Hai tình huống minh họa: AI báo nhầm Người không cần giúp; AI bỏ sót Người đang cần giúp. Nối mỗi tình huống tới người chịu ảnh hưởng, gắn MINH HỌA.',
  },
  {
    n: 14, seconds: 10, section: 2, mapPart: 6,
    title: '6 · Hoàn chỉnh mô tả để ra quyết định',
    text: 'Phần sáu giúp bạn hoàn chỉnh bản mô tả vấn đề, cách giải quyết dự kiến và những điều phải kiểm tra trước khi bắt đầu làm.',
    screen: '6 · Hoàn chỉnh mô tả để ra quyết định',
    visual: 'Tô phần 6; ghép các phiếu thành tài liệu gồm Vấn đề, Cách dự kiến, Điều cần kiểm tra.',
  },
  {
    n: 15, seconds: 10, section: 2, mapPart: 6,
    title: 'Chọn hướng đi và giải thích lý do',
    text: 'Bạn sẽ cân nhắc đi tiếp, chuẩn bị thêm hoặc dừng đề xuất, dựa vào lợi ích dự kiến và khả năng kiểm soát rủi ro.',
    screen: 'Chọn hướng đi và giải thích lý do',
    visual: 'Tài liệu nối tới ba nhánh Đi tiếp, Chuẩn bị thêm, Dừng đề xuất; dưới mỗi nhánh có ô Lý do.',
  },
  {
    n: 16, seconds: 14, section: 3, mapPart: 0,
    title: 'Sau hôm nay',
    text: 'Sau hôm nay, bạn sẽ biết bài toán nào thật sự cần AI, AI nên làm thay hay hỗ trợ con người, và khi nào nên làm tiếp, chuẩn bị thêm hoặc dừng ý tưởng sản phẩm đó.',
    screen: 'Sau hôm nay · Cần AI? · AI làm gì? · Làm tiếp hay dừng?',
    visual: 'Quay lại ba thẻ Bài toán có cần AI? → AI làm thay hay hỗ trợ? → Làm tiếp, chuẩn bị thêm hay dừng?; làm sáng từng thẻ theo nhịp, không hiện quyết định cụ thể.',
  },
];

const FPS = 30;
let cursor = 0;
export const CUES = RAW.map((c) => {
  const start = cursor;
  cursor += c.seconds * FPS;
  return { ...c, start, end: cursor };
});
export const DURATION = cursor;

/** Frames per spoken syllable at the script's estimate of 3 syllables per second. */
export const SYLLABLE_FRAMES = FPS / 3;
const syllables = (s) =>
  s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((n, w) => n + (/^\(?AI[,.)?:]*$/.test(w) ? 2 : 1), 0);

/**
 * Estimated scene-local frame at which `phrase` starts being spoken in cue `n` (≈ 3 syllables / s;
 * "AI" counts as two). Use it to sync beats: a card appears 4–6 frames before its words.
 */
export function spokenAt(n, phrase) {
  const text = RAW[n - 1].text;
  const i = text.indexOf(phrase);
  if (i < 0) throw new Error(`"${phrase}" is not in the narration of câu ${n}`);
  return Math.round(syllables(text.slice(0, i)) * SYLLABLE_FRAMES);
}
