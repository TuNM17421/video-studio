/**
 * Onboarding tours — Griffin walks a new member of the production team through the Studio.
 *
 * Content only: the words, where each step points, and how the mascot looks while saying it. The engine
 * (components/tour.tsx) finds each target by its `data-tour` attribute, skips a step whose target is not on
 * screen, and remembers per browser which version of a tour was seen — raise `version` after changing a
 * tour's words and everyone sees it once more.
 *
 * Rules for writing a step: one idea, two sentences at most, say what the person does and what the Studio
 * does for them. Never have a tour click something that costs credit or starts an agent — point at it.
 */

export type TourMascot = {
  /** A pose of the Griffin pack (stand, wings, walk-left, walk-right, wave, welcome, rest) — see Thư viện · Mascot. */
  pose: string;
  mood: string;
  /** Optional prop drawn beside the head: lightbulb (a tip), exclamation (careful), question, sparkle. */
  prop?: "lightbulb" | "exclamation" | "question" | "sparkle";
};

/** A production step of the video page; a tour step naming one switches the Studio to it first. */
export type StudioStep = "plan" | "cues" | "voice" | "scenes" | "render";
/** Window event the tour sends to the video page (components/studio.tsx) to open a production step. */
export const STUDIO_STEP_EVENT = "video-studio:tour-step";

export type TourStep = {
  /** `data-tour` value of the element to point at; null = a centred card with no pointer. */
  target: string | null;
  /** Open this production step of the video page before pointing (practice tour). */
  studioStep?: StudioStep;
  title: string;
  body: string;
  mascot: TourMascot;
  placement?: "top" | "bottom" | "left" | "right";
};

export type TourDef = {
  id: string;
  version: number;
  /** Shown in the launcher menu. */
  label: string;
  /** Which pages the tour belongs to: exact pathnames. */
  routes: string[];
  /**
   * Starts on its own the first time one of its pages opens. When a page has several, they run in the
   * order of TOURS, each after the previous one is finished (closing with × stops the chain).
   */
  auto: boolean;
  /** The tour walks this video (`/?id=…`): the launcher opens it first. The practice sample is read-only. */
  video?: string;
  /** Offered by the launcher on every page, not only on `routes`. */
  everywhere?: boolean;
  steps: TourStep[];
};

export const TOURS: TourDef[] = [
  {
    id: "welcome",
    version: 3,
    label: "Làm quen với Video Studio",
    routes: ["/"],
    auto: true,
    steps: [
      {
        target: null,
        title: "Chào bạn, mình là Griffin!",
        body: "Mình dẫn bạn đi một vòng Video Studio — nơi một kịch bản thành video bài giảng hoàn chỉnh. Chỉ mất một phút.",
        mascot: { pose: "welcome", mood: "neutral" },
      },
      {
        target: "nav.new",
        title: "Bắt đầu một video mới",
        body: "Mọi video bắt đầu ở đây: chọn style, đặt mã video, thả kịch bản vào. Agent và Studio lo phần còn lại theo từng bước.",
        mascot: { pose: "wave", mood: "neutral" },
        placement: "right",
      },
      {
        target: "nav.videos",
        title: "Theo dõi các video đang làm",
        body: "Mỗi video đi qua năm bước: Kế hoạch → Lời & cue → Giọng đọc → Dựng cảnh → Render. Mở lại một video là về đúng bước đang dở.",
        mascot: { pose: "stand", mood: "thinking" },
        placement: "right",
      },
      {
        target: "nav.guide",
        title: "Quên quy trình? Xem Hướng dẫn",
        body: "Trang Hướng dẫn tóm năm bước bằng hình: bạn làm gì, máy làm gì, khi nào coi là xong.",
        mascot: { pose: "stand", mood: "wink", prop: "lightbulb" },
        placement: "right",
      },
      {
        target: "nav.library",
        title: "Thư viện: tra trước khi dựng",
        body: "Style, component, nhân vật, mascot và video mẫu — xem đúng như video sẽ vẽ, trước khi viết một dòng kịch bản.",
        mascot: { pose: "stand", mood: "happy" },
        placement: "right",
      },
      {
        target: "tour.launcher",
        title: "Cần mình thì gọi nhé",
        body: "Bấm vào mình ở góc màn hình để xem lại hướng dẫn, hoặc mở Chế độ tập: một video mẫu đã đi đủ năm bước.",
        mascot: { pose: "wings", mood: "happy" },
        placement: "left",
      },
    ],
  },
  {
    id: "plan",
    version: 1,
    label: "Trang Kế hoạch — tạo video mới",
    routes: ["/"],
    auto: true,
    steps: [
      {
        target: "plan.style",
        title: "Chọn style hình ảnh",
        body: "Style quyết định bảng màu và bộ component agent được dùng. Mở phần xem mẫu bên dưới để thấy cảnh thật của style đó.",
        mascot: { pose: "stand", mood: "thinking" },
        placement: "bottom",
      },
      {
        target: "plan.modules",
        title: "Tính năng nội dung",
        body: "Chỉ bật khi kịch bản cần: hội thoại nhiều người nói, hay quiz có khoảng chờ. Không bật gì là clip một người dẫn.",
        mascot: { pose: "stand", mood: "neutral", prop: "lightbulb" },
        placement: "top",
      },
      {
        target: "plan.id",
        title: "Đặt mã video",
        body: "Mã là tên thư mục của video: chữ thường, số và gạch ngang, ví dụ d2-01-lab-v3. Studio kiểm tra trùng ngay khi bạn gõ xong.",
        mascot: { pose: "stand", mood: "neutral" },
        placement: "bottom",
      },
      {
        target: "plan.script",
        title: "Thả kịch bản vào",
        body: "Tệp .md hoặc .txt viết theo mẫu templates/kich-ban-co-ban.md. Lời trong kịch bản được đọc nguyên văn, từng chữ.",
        mascot: { pose: "stand", mood: "wink" },
        placement: "top",
      },
      {
        target: "plan.submit",
        title: "Tạo video và chạy agent",
        body: "Bấm là agent bắt đầu bước Lời & cue thật. Xong mỗi bước, Studio dừng chờ bạn duyệt rồi mới đi tiếp.",
        mascot: { pose: "stand", mood: "surprised", prop: "exclamation" },
        placement: "top",
      },
    ],
  },
  {
    id: "practice",
    version: 2,
    label: "Chế độ tập — xem một video đi đủ năm bước",
    routes: ["/"],
    auto: false,
    video: "mau-huong-dan",
    everywhere: true,
    steps: [
      {
        target: "studio.sample",
        title: "Đây là chế độ tập",
        body: "Video mẫu này đã đi đủ năm bước. Mình dẫn bạn xem từng bước trông thế nào khi xong — chỉ xem, không tốn gì cả.",
        mascot: { pose: "welcome", mood: "neutral" },
        placement: "bottom",
      },
      {
        target: "studio.rail",
        title: "Luồng sản xuất",
        body: "Năm cổng đi lần lượt. Cổng có dấu tích là đã xong và đã được duyệt; bấm vào một cổng để xem lại nó.",
        mascot: { pose: "stand", mood: "thinking" },
        placement: "bottom",
      },
      {
        target: "studio.editor",
        studioStep: "plan",
        title: "Bước 1 · Kế hoạch",
        body: "Style, ngày, kịch bản và tính năng đã chọn lúc tạo video. Sau khi tạo, phần này giữ cố định.",
        mascot: { pose: "stand", mood: "neutral" },
        placement: "right",
      },
      {
        target: "studio.editor",
        studioStep: "cues",
        title: "Bước 2 · Lời & cue",
        body: "Agent cắt kịch bản thành từng câu, giữ nguyên văn. Bạn đọc lại ở đây, góp ý nếu cần, rồi duyệt.",
        mascot: { pose: "stand", mood: "wink" },
        placement: "right",
      },
      {
        target: "studio.editor",
        studioStep: "voice",
        title: "Bước 3 · Giọng đọc",
        body: "Chọn nguồn giọng và người đọc; bản thu nằm ngay bên dưới để nghe lại. Tạo giọng bằng ElevenLabs sẽ tốn credit.",
        mascot: { pose: "stand", mood: "surprised", prop: "exclamation" },
        placement: "right",
      },
      {
        // Chỉ có ở video bật "Video có ảnh tư liệu"; video khác không có panel này nên bước tự được bỏ qua.
        target: "studio.images",
        studioStep: "voice",
        title: "Ảnh đề xuất",
        body: "Trong lúc thu giọng, Studio đề xuất vài ảnh thật cho đúng những câu cần. Bạn chọn dùng, dùng làm tham khảo, hay bỏ — chỗ chưa chọn vẫn là animation.",
        mascot: { pose: "stand", mood: "happy", prop: "lightbulb" },
        placement: "top",
      },
      {
        target: "studio.editor",
        studioStep: "scenes",
        title: "Bước 4 · Dựng cảnh",
        body: "Agent dựng từng cảnh đúng theo độ dài giọng thật và tự chụp ảnh kiểm tra. Bạn xem ảnh, góp ý chỗ sai rồi duyệt.",
        mascot: { pose: "stand", mood: "happy", prop: "lightbulb" },
        placement: "right",
      },
      {
        target: "studio.editor",
        studioStep: "render",
        title: "Bước 5 · Render",
        body: "Chọn phụ đề và nhạc nền rồi render ra MP4, kèm transcript và file chương. Bấm phát để xem thành phẩm.",
        mascot: { pose: "wings", mood: "happy" },
        placement: "right",
      },
      {
        target: "nav.new",
        title: "Đến lượt bạn!",
        body: "Bấm Video mới ở thanh bên để làm video đầu tiên của bạn — mình sẽ đi cùng bạn ở trang Kế hoạch.",
        mascot: { pose: "wings", mood: "happy" },
        placement: "right",
      },
    ],
  },
  {
    id: "research",
    version: 1,
    label: "Trang Đóng gói kịch bản",
    routes: ["/research"],
    auto: true,
    steps: [
      {
        target: "research.strip",
        title: "Đường đi của một lượt",
        body: "Mỗi ô là một việc agent làm; hình thoi là chỗ Studio dừng lại chờ bạn. Bấm một ô để xem việc đó bên dưới.",
        mascot: { pose: "stand", mood: "thinking" },
        placement: "bottom",
      },
      {
        target: "research.gate",
        title: "Ba chỗ bạn quyết",
        body: "Duyệt danh sách điều cần kiểm, quyết điều còn thiếu căn cứ, và duyệt kịch bản. Ngoài ba chỗ này Studio tự chạy.",
        mascot: { pose: "stand", mood: "neutral", prop: "lightbulb" },
        placement: "bottom",
      },
      {
        target: "research.bar",
        title: "Việc của bạn luôn ở đây",
        body: "Thanh dưới cùng nói lượt đang làm gì và nút bạn cần bấm. Lúc agent chạy, bạn có thể rời trang.",
        mascot: { pose: "wave", mood: "happy" },
        placement: "top",
      },
      {
        target: "research.details",
        title: "Khi cần tra kỹ",
        body: "Nhật ký agent, chi phí, file và nút làm lại một bước nằm trong Chi tiết.",
        mascot: { pose: "stand", mood: "wink" },
        placement: "bottom",
      },
      {
        target: "research.new",
        title: "Bắt đầu một lượt",
        body: "Tải slide của giảng viên lên (.pdf hoặc .pptx) — Studio lo phần còn lại và gọi bạn ở từng hình thoi.",
        mascot: { pose: "wings", mood: "happy" },
        placement: "bottom",
      },
    ],
  },
];

export const tourById = (id: string) => TOURS.find((t) => t.id === id);
export const toursFor = (pathname: string) => TOURS.filter((t) => t.routes.includes(pathname));
