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
  },
} as const;

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
  { token: "preview.panel", value: "296 px", usage: "Metadata theo cụm dọc, ưu tiên diện tích cho bàn dựng" },
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
] as const;
