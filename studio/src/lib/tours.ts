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
  /** A pose of the Griffin pack (stand, sit, wings, turn, wave, welcome, cheer…) — see Thư viện · Mascot. */
  pose: string;
  mood: string;
  /** Optional prop drawn beside the head: lightbulb (a tip), exclamation (careful), question, sparkle. */
  prop?: "lightbulb" | "exclamation" | "question" | "sparkle";
};

export type TourStep = {
  /** `data-tour` value of the element to point at; null = a centred card with no pointer. */
  target: string | null;
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
  steps: TourStep[];
};

export const TOURS: TourDef[] = [
  {
    id: "welcome",
    version: 1,
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
        mascot: { pose: "sit", mood: "happy" },
        placement: "right",
      },
      {
        target: "nav.key",
        title: "Key ElevenLabs",
        body: "Chấm xanh là máy này đã có key để đọc giọng. Mỗi lần đọc bằng ElevenLabs đều tốn credit, nên duyệt kỹ lời đọc trước khi bấm.",
        mascot: { pose: "stand", mood: "surprised", prop: "exclamation" },
        placement: "right",
      },
      {
        target: "tour.launcher",
        title: "Cần mình thì gọi nhé",
        body: "Bấm vào mình ở góc màn hình bất cứ lúc nào để xem lại hướng dẫn của trang đang mở.",
        mascot: { pose: "cheer", mood: "neutral" },
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
];

export const tourById = (id: string) => TOURS.find((t) => t.id === id);
export const toursFor = (pathname: string) => TOURS.filter((t) => t.routes.includes(pathname));
