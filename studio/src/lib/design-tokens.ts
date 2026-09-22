/**
 * Studio UI foundations.
 *
 * The two brand anchors come from the live VinUni website stylesheet. The
 * lesson colors stay separate because they belong to the approved video
 * language rather than the university marketing website.
 */
export const STUDIO_COLORS = {
  brand: {
    primary: "#134d8b",
    primaryHover: "#0e3a69",
    primaryActive: "#0d345e",
    secondary: "#c72127",
    secondaryHover: "#a61c21",
    secondaryActive: "#9b1a1e",
    infoSurface: "#f2f6f9",
  },
  lesson: {
    ink: "#0b2a4d",
    surface: "#f2f7fc",
    rail: "#e0edf8",
    data: "#1d6199",
  },
  neutral: {
    0: "#ffffff",
    50: "#f8f9fa",
    100: "#f4f4f4",
    200: "#eeeeef",
    300: "#d9d9d9",
    500: "#848484",
    600: "#666666",
    700: "#4a4a4a",
    800: "#2e2e2e",
    900: "#171717",
  },
  status: {
    success: "#0e623a",
    successSurface: "#effaf3",
    warning: "#874e00",
    warningSurface: "#fff8e8",
    // the pale ground for danger; the danger ink itself is brand.secondary
    dangerSurface: "#fff2f2",
  },
  /* Màu đứng yên. Ảnh preview của design system là PNG đã nướng sẵn nền sáng — chúng không đổi theo chế
     độ tối, nên nhãn đè lên chúng cũng không được đổi, nếu không sẽ thành chữ sáng trên nền trắng. Đây
     là nhóm duy nhất mà bảng tối cố ý chép y nguyên bảng sáng; đừng "sửa" cho khác đi. */
  media: {
    // the sheet a baked preview sits on: the PNG's own white, so the frame and the image read as one
    surface: "#ffffff",
    chipSurface: "#ffffff",
    chipBorder: "#e0edf8",
    chipText: "#0b2a4d",
  },
} as const;

/**
 * Cùng bộ vai trò, giá trị cho nền tối. Phải là màu thật chứ không phải biến CSS: antd suy khoảng sáu
 * mươi token dẫn xuất từ mấy hạt giống này, nên nó cần số đọc được lúc dựng theme.
 *
 * Giữ đúng thứ tự vai trò của bản sáng (`neutral[0]` vẫn là "giấy", `neutral[900]` vẫn là "mực"), chỉ đảo
 * hướng sáng/tối — khớp với khối `:root[data-theme="dark"]` trong vinuni-tokens.css. Đổi một bên thì phải
 * đổi bên kia, nếu không giao diện antd sẽ lệch màu với phần CSS tự viết.
 */
export const STUDIO_COLORS_DARK = {
  brand: {
    primary: "#5fa3dc",
    primaryHover: "#7fb8e8",
    primaryActive: "#9acbf2",
    secondary: "#f0666b",
    secondaryHover: "#f58085",
    secondaryActive: "#f89a9e",
    infoSurface: "#1a2430",
  },
  lesson: {
    ink: "#e3f0fb",
    surface: "#141f2b",
    rail: "#1c2c3d",
    data: "#6bb0e4",
  },
  neutral: {
    0: "#16181c",
    50: "#1a1d21",
    100: "#1f2226",
    200: "#262a2f",
    300: "#343940",
    500: "#8b939c",
    600: "#a7aeb6",
    700: "#c5cbd2",
    800: "#e4e8ec",
    900: "#f5f7f9",
  },
  status: {
    success: "#4fbf85",
    successSurface: "#12241a",
    warning: "#e0a63a",
    warningSurface: "#26200f",
    dangerSurface: "#2a1416",
  },
  /* Chép y nguyên bảng sáng — cố ý. Xem chú thích ở STUDIO_COLORS.media. */
  media: {
    // the sheet a baked preview sits on: the PNG's own white, so the frame and the image read as one
    surface: "#ffffff",
    chipSurface: "#ffffff",
    chipBorder: "#e0edf8",
    chipText: "#0b2a4d",
  },
} as const;

/**
 * Nút chuyển (Ant Segmented) — nguồn duy nhất cho mọi Segmented trong Studio: nguồn giọng, Sửa | Bỏ qua,
 * Tất cả | Có lỗi, Phụ đề Có | Không. Phần được chọn là nền brand.primary chữ trắng — cùng tín hiệu "đang
 * chọn" với nút primary và cổng đang mở trên rail; nền trắng trên rãnh xám từng làm lựa chọn gần như vô hình.
 * ui-provider.tsx đưa các giá trị này vào theme của Ant, nên không component nào phải tự viết CSS.
 */
export function segmentedTheme(c: { brand: { primary: string }; lesson: { surface: string; rail: string }; neutral: { 0: string; 100: string; 700: string } }) {
  return {
    trackBg: c.neutral[100],
    itemColor: c.neutral[700],
    itemHoverColor: c.brand.primary,
    itemHoverBg: c.lesson.surface,
    itemActiveBg: c.lesson.rail,
    // neutral.0 is white in light mode and near-black in dark, so the chosen item keeps its contrast in both
    itemSelectedBg: c.brand.primary,
    itemSelectedColor: c.neutral[0],
  };
}

export const STUDIO_SEGMENTED_SPEC = [
  { part: "Rãnh", token: "neutral.100", usage: "Nền chung của cả nhóm lựa chọn" },
  { part: "Mục thường", token: "neutral.700", usage: "Chữ của lựa chọn chưa chọn" },
  { part: "Hover", token: "lesson.surface · brand.primary", usage: "Nền xanh nhạt, chữ xanh — báo là bấm được" },
  { part: "Đang chọn", token: "brand.primary · neutral.0", usage: "Nền xanh dương VinUni, chữ trắng (chế độ tối: xanh sáng, chữ tối); không dùng đỏ — đỏ dành cho lỗi" },
  { part: "Tắt", token: "neutral.500", usage: "Lựa chọn không dùng được lúc này, vd. Sửa khi bước không chờ duyệt" },
] as const;

export const STUDIO_TYPOGRAPHY = [
  {
    role: "Display & brand",
    family: "Montserrat",
    usage: "Tên sản phẩm, tiêu đề trang, nhãn cổng sản xuất",
    weights: "600 / 700",
  },
  {
    role: "Product UI",
    family: "Be Vietnam Pro",
    usage: "Nội dung, biểu mẫu, bảng, phản hồi trạng thái",
    weights: "400 / 500 / 600 / 700",
  },
  {
    role: "Technical",
    family: "IBM Plex Mono",
    usage: "Mã video, timecode, số frame và nhật ký agent",
    weights: "400 / 500 / 600",
  },
] as const;

export const STUDIO_LAYOUT = [
  { token: "shell.sidebar.desktop", value: "232 px", usage: "Đủ khoảng thở giữa wordmark và control nhưng vẫn giữ bàn dựng rộng" },
  { token: "shell.sidebar.collapsed", value: "72 px", usage: "Rail điều hướng rõ khối; nhãn chuyển sang tooltip" },
  { token: "shell.sidebar.rail-item", value: "44 px", usage: "Điểm chạm icon cân giữa rail; active state không co theo glyph" },
  { token: "shell.sidebar.tablet", value: "196 px", usage: "Dành thêm chiều ngang cho bàn dựng ở 1024 px" },
  { token: "workflow.header", value: "28 px", usage: "Nhãn luồng là định hướng phụ, không cạnh tranh với tên bước" },
  { token: "workflow.step", value: "68 px", usage: "Giảm khoảng 18% so với rail cũ" },
  { token: "field.counter.row", value: "24 px", usage: "Giữ bộ đếm ký tự ở một hàng riêng dưới textarea" },
  { token: "style.card.min", value: "280 px", usage: "Hai lựa chọn tự giãn kín hàng thay vì để cột trống" },
  { token: "style.card.padding", value: "14 px", usage: "Tách nội dung và metadata khỏi viền chọn của card" },
  { token: "style.specimen", value: "156 px", usage: "Mini-scene khóa chiều cao, hiển thị trọn ba component mà không kéo giãn card" },
  { token: "header.agent.width", value: "440 px", usage: "Cô lập lựa chọn agent ở cấp trang mà không lấn tiêu đề video" },
  { token: "header.agent.min-height", value: "84 px", usage: "Giữ khối agent cân với heading ở trạng thái chọn và khóa" },
  { token: "header.agent.control", value: "224 px", usage: "Đủ chỗ cho tên provider, nhãn trạng thái (“Thử nghiệm”) và dấu mở danh sách" },
  { token: "capability.card.min", value: "280 px", usage: "Card tính năng tự chuyển từ hai cột xuống một cột khi không đủ chỗ" },
  { token: "capability.card.min-height", value: "148 px", usage: "Giữ các card tính năng cân hàng dù nội dung và preview khác nhau" },
  { token: "capability.card.padding", value: "16 px", usage: "Giữ checkbox, glyph và mô tả tách khỏi viền chọn" },
  { token: "preview.panel", value: "296 px", usage: "Metadata theo cụm dọc, ưu tiên diện tích cho bàn dựng" },
  { token: "step.bar", value: "64 px", usage: "Thanh quyết định dính đáy mỗi bước: trạng thái, hành động chính, Quay lại / Tiếp" },
  { token: "finding.still", value: "280 px", usage: "Ảnh cảnh của lỗi cần xử lý đủ lớn để thấy lỗi mà không phải mở" },
  { token: "finding.still.compact", value: "128 px", usage: "Ảnh nhỏ cho lỗi minor và lỗi đã xử lý" },
  { token: "research.sources", value: "400 px", usage: "Cột Claim & nguồn của trang research: đủ cho trích đoạn và bảng nguồn, dính cạnh kịch bản khi cuộn" },
  { token: "mascot.matrix.cell", value: "84 px", usage: "Ô ảnh của bảng tư thế × biểu cảm (Thư viện · Mascot): đủ nhận ra nét mặt, bảy cột vẫn vừa khung" },
  { token: "tour.panel", value: "440 px", usage: "Khung lời thoại của tour hướng dẫn: đủ cho Griffin bên trái và hai câu ngắn bên phải" },
  { token: "tour.mascot", value: "104 px", usage: "Chiều cao Griffin trong khung tour — nhận ra nét mặt mà không lấn chữ" },
  { token: "tour.launcher", value: "56 px", usage: "Nút Griffin ở góc màn hình mở lại hướng dẫn của trang" },
] as const;

export const STUDIO_WORKFLOW_EMPHASIS = [
  { state: "Active", value: "100%", usage: "Cổng người dùng đang thao tác" },
  { state: "Completed", value: "70%", usage: "Giữ dấu vết tiến độ nhưng lùi khỏi spotlight" },
  { state: "Future", value: "35%", usage: "Giảm icon, mô tả và connector; nhãn chữ vẫn giữ contrast đọc được" },
] as const;

export const STUDIO_COLOR_GROUPS = [
  {
    title: "VinUni brand anchors",
    note: "Khớp stylesheet đang dùng trên vinuni.edu.vn.",
    colors: [
      { name: "Primary", token: "brand.primary", value: STUDIO_COLORS.brand.primary, dark: true },
      { name: "Secondary", token: "brand.secondary", value: STUDIO_COLORS.brand.secondary, dark: true },
      { name: "Ink", token: "neutral.800", value: STUDIO_COLORS.neutral[800], dark: true },
      { name: "Canvas", token: "neutral.0", value: STUDIO_COLORS.neutral[0], dark: false },
      { name: "Subtle surface", token: "neutral.100", value: STUDIO_COLORS.neutral[100], dark: false },
      { name: "Info surface", token: "brand.infoSurface", value: STUDIO_COLORS.brand.infoSurface, dark: false },
    ],
  },
  {
    title: "Lesson product language",
    note: "Dùng để nối Studio với hình ảnh của video, không gắn nhãn là màu website VinUni.",
    colors: [
      { name: "Lesson ink", token: "lesson.ink", value: STUDIO_COLORS.lesson.ink, dark: true },
      { name: "Lesson surface", token: "lesson.surface", value: STUDIO_COLORS.lesson.surface, dark: false },
      { name: "Production rail", token: "lesson.rail", value: STUDIO_COLORS.lesson.rail, dark: false },
      { name: "Data blue", token: "lesson.data", value: STUDIO_COLORS.lesson.data, dark: true },
      { name: "Success", token: "status.success", value: STUDIO_COLORS.status.success, dark: true },
      { name: "Review", token: "status.warning", value: STUDIO_COLORS.status.warning, dark: true },
    ],
  },
] as const;

export const STUDIO_MOTION = [
  { token: "fast", value: "120 ms", usage: "Hover, focus, trạng thái control" },
  { token: "normal", value: "180 ms", usage: "Panel, drawer, phản hồi thao tác" },
  { token: "slow", value: "240 ms", usage: "Chuyển cổng và production rail" },
  { token: "idle", value: "2200 ms", usage: "Nhịp lặp chậm của Griffin trong tour (thở, đạo cụ bồng bềnh) — đủ chậm để không hút mắt khỏi chữ" },
] as const;
