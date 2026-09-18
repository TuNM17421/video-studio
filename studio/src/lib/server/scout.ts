import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { Dossier, ItemResearch, NodeState, ResearchItem, ScoutEvent, ScoutInput, ScoutRun, ScoutStage, SlideDeck, SourceCheck, StepKey } from "../scout";
import {
  cleanItems, parseAssessments, parseCandidates, parseExtraction, parseFinding, parsePlan, parseQuotes, SCRIPT_NODE, slugify,
  stepOfFile, stepsDone, todoStates,
} from "../scout";
import { claudeExecArgs } from "./agent-cli";
import { exists, REPO } from "./paths";
import { pdfPageCount, pptxSlides, slidesMarkdown } from "./slides";

const execFileP = promisify(execFile);

/**
 * Thư mục của tính năng này. **Không** nằm trong `projects/`: `listVideos()` coi mỗi thư mục con ở đó là
 * một video, nên một lượt chạy thử sẽ hiện lên trang Các video như một video hỏng. Để riêng ra ngoài thì
 * luồng tạo video không nhìn thấy gì cả.
 */
export const SCOUT_ROOT = path.join(REPO, "scout");

/**
 * Bộ công cụ của bước research — và đây là chỗ duy nhất trong cả Studio mở WebSearch/WebFetch.
 *
 * `agent.ts` chặn cả hai cho mọi stage của luồng dựng video; danh sách dưới đây không đụng tới danh sách
 * đó, nó là một lượt gọi `claude` riêng với quyền riêng. Không có Bash/PowerShell: agent chỉ tìm, đọc
 * trang và ghi file trong thư mục của chính nó, không cần chạy lệnh nào.
 */
const ALLOWED = ["WebSearch", "WebFetch", "Read", "Write", "Glob", "Grep", "TodoWrite"];
const DENIED = [
  "Read(**/.env)", "Read(**/.env.*)",
  "Bash", "PowerShell", "Edit", "NotebookEdit", "Task", "Agent",
  "DesignSync", "RemoteTrigger", "CronCreate", "SendMessage",
];
/** Bước bóc tách slide chỉ đọc slide và ghi danh sách mục — chưa cần web, và không nên có. */
const EXTRACT_ALLOWED = ["Read", "Write", "Glob", "TodoWrite"];
const EXTRACT_DENIED = [...DENIED, "WebSearch", "WebFetch"];

type LiveRun = ScoutRun & {
  child?: ChildProcess;
  stopped?: boolean;
  /** Nút agent đang làm theo TodoWrite gần nhất — mọi sự kiện sau đó được gắn vào nó. */
  active: string | null;
};

interface Registry {
  run: LiveRun | null;
  listeners: Set<(event: ScoutEvent) => void>;
}
const g = globalThis as typeof globalThis & { __videoStudioScout?: Registry };
const registry: Registry = (g.__videoStudioScout ??= { run: null, listeners: new Set() });

const MAX_EVENTS = 800;

export function subscribeScout(fn: (event: ScoutEvent) => void) {
  registry.listeners.add(fn);
  return () => registry.listeners.delete(fn);
}

/**
 * Sự kiện luôn được ghi vào **đúng lượt sinh ra nó**, không phải "lượt hiện tại".
 *
 * Tiến trình con đóng lại không đồng bộ: bấm Dừng rồi chạy lượt mới ngay thì `close` của lượt cũ nổ ra
 * khi `registry.run` đã trỏ sang lượt mới. Đọc toàn cục ở đó là lượt cũ ghi đè trạng thái của lượt mới —
 * đã thấy thật một lần: một lượt chạy trọn vẹn bị đánh dấu "đã dừng". Chỉ phát ra ngoài khi lượt này vẫn
 * là lượt đang hiển thị, để trang không nhận sự kiện của một lượt đã bị thay.
 */
function push(run: LiveRun, event: ScoutEvent) {
  run.events.push(event);
  if (run.events.length > MAX_EVENTS) run.events.splice(0, run.events.length - MAX_EVENTS);
  if (registry.run !== run) return;
  for (const fn of registry.listeners) fn(event);
}

/**
 * Bản đọc được của một lượt. Dựng từng trường một chứ không bóc phần thừa ra: `child` là một
 * ChildProcess, lọt vào `Response.json` là hỏng cả lượt trả về, nên danh sách trường phải là danh sách
 * cho phép chứ không phải danh sách loại trừ.
 */
function snapshot(run: LiveRun): ScoutRun {
  return {
    slug: run.slug,
    input: run.input,
    mode: run.mode,
    stage: run.stage,
    status: run.status,
    startedAt: run.startedAt,
    dir: run.dir,
    events: run.events,
    deck: run.deck,
    extraction: run.extraction,
    items: run.items,
    itemStates: run.itemStates,
    findings: run.findings,
    itemSteps: run.itemSteps,
    research: run.research,
    dossier: run.dossier,
    check: run.check,
    script: run.script,
  };
}

/**
 * Ghi trạng thái lượt chạy xuống `run.json`. Lượt từ slide dừng lại chờ người dùng duyệt — có thể qua cả
 * một lần khởi động lại Studio — nên danh sách mục không được chỉ sống trong bộ nhớ.
 */
function persist(run: LiveRun) {
  try {
    fs.writeFileSync(path.join(REPO, run.dir, "run.json"), JSON.stringify(snapshot(run)));
  } catch {
    // Không ghi được thì lượt vẫn chạy tiếp; chỉ mất khả năng dựng lại sau khi khởi động lại.
  }
}

/** Lượt gần nhất trên đĩa, khi bộ nhớ trống (Studio vừa khởi động lại). Lượt đang chạy dở thì đã chết theo. */
function restoreLatest(): LiveRun | null {
  if (!exists(SCOUT_ROOT)) return null;
  let latest: { file: string; mtime: number } | null = null;
  for (const name of fs.readdirSync(SCOUT_ROOT)) {
    const file = path.join(SCOUT_ROOT, name, "run.json");
    try {
      const mtime = fs.statSync(file).mtimeMs;
      if (!latest || mtime > latest.mtime) latest = { file, mtime };
    } catch {}
  }
  if (!latest) return null;
  try {
    const run = JSON.parse(fs.readFileSync(latest.file, "utf8")) as ScoutRun;
    return {
      ...run,
      // run.json của bản trước chưa có hai trường này.
      itemSteps: run.itemSteps ?? {},
      research: run.research ?? {},
      status: run.status === "running" ? "stopped" : run.status,
      active: null,
    };
  } catch {
    return null;
  }
}

export function currentScout(): ScoutRun | null {
  registry.run ??= restoreLatest();
  return registry.run ? snapshot(registry.run) : null;
}

export function scoutRunning() {
  return registry.run?.status === "running";
}

export function stopScout() {
  const run = registry.run;
  if (!run || run.status !== "running") return false;
  run.stopped = true;
  const pid = run.child?.pid;
  if (!pid) return true;
  // Giống jobs.ts: trên Windows SIGTERM không dọn được tiến trình cháu, phải nhờ taskkill /T.
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" }).on("error", () => run.child?.kill());
  else run.child?.kill("SIGTERM");
  return true;
}

const short = (value: unknown, max = 200) => {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

/** Đường dẫn agent ghi ra là tuyệt đối; trang chỉ cần phần trong thư mục lượt chạy. */
const insideRun = (file: string, dir: string) => {
  const normalized = String(file).replace(/\\/g, "/");
  const marker = `/${dir}/`;
  const at = normalized.indexOf(marker);
  return at === -1 ? normalized.split("/").slice(-2).join("/") : normalized.slice(at + marker.length);
};

// ── lời dặn agent ────────────────────────────────────────────────────────────────

/**
 * Lượt từ một chủ đề gõ tay: một agent vừa tìm vừa viết.
 *
 * Hai ràng buộc đáng tiền nhất nằm ở bước 2 và 4: **tải trang về đĩa trước khi trích**, và **trích nguyên
 * văn**. Công cụ tìm kiếm của agent không để lại gì soát được, nên nếu không bắt ghi toàn văn xuống thì
 * `tools/scout-verify.mjs` chẳng có gì để đối chiếu và cả tính năng này chỉ còn là lời hứa.
 */
function topicPrompt(input: ScoutInput, dir: string) {
  return [
    `Bạn đang chạy trong Video Studio, tính năng "Đóng gói kịch bản" (beta). Trả lời bằng tiếng Việt.`,
    ``,
    `Chủ đề: ${input.topic}`,
    `Thư mục làm việc của lượt này: \`${dir}/\` — **chỉ ghi file trong đó**, không sửa gì khác trong repo.`,
    ``,
    `## Việc cần làm`,
    ``,
    `1. **Tìm tài liệu.** Dùng WebSearch vài lượt với các cách hỏi khác nhau. Ưu tiên nguồn gốc (tài liệu`,
    `   chính thức, bài báo có tác giả và ngày đăng, nghiên cứu) hơn bài tổng hợp lại.`,
    `2. **Tải trang về đĩa.** Với mỗi nguồn định dùng: WebFetch lấy nội dung, rồi **Write toàn văn** vào`,
    `   \`${dir}/sources/<id>.md\` (id là s1, s2, …). Bước này bắt buộc — trích đoạn nào không nằm trong file`,
    `   đã tải sẽ bị \`tools/scout-verify.mjs\` đánh trượt.`,
    `3. **Viết hồ sơ nguồn** \`${dir}/nguon.json\`:`,
    ...DOSSIER_SCHEMA,
    `4. **Viết kịch bản** \`${dir}/kich-ban.md\` theo đúng mẫu \`templates/kich-ban-co-ban.md\` (đọc file đó`,
    `   trước). Khoảng ${input.cues} câu, mỗi câu một mục \`### Câu N\`.`,
    `   - **Mỗi câu phải có ít nhất ${input.minSources} nguồn độc lập** trong \`cues\` của nguon.json.`,
    `     Độc lập nghĩa là khác tổ chức xuất bản, không phải hai trang cùng chép lại một thông cáo.`,
    `   - Không có con số, tên riêng hay kết quả nào mà nguồn không nói. Không đủ nguồn cho một ý thì bỏ ý`,
    `     đó đi, đừng viết cho đủ số câu.`,
    ``,
    ...CONFLICTS,
    ``,
    `Xong thì dừng và tóm tắt ngắn: tìm được mấy nguồn, bỏ nguồn nào và vì sao, ý nào không đủ nguồn nên`,
    `đã bỏ, và chỗ nào bạn thấy người duyệt nên xem kỹ.`,
  ].join("\n");
}

const DOSSIER_SCHEMA = [
  `   {"topic": "...", "createdAt": "<ISO>", "sources": [{"id":"s1","url":"...","title":"...",`,
  `   "publisher":"...","published":"YYYY-MM-DD hoặc null nếu trang không ghi","fetchedAt":"<ISO>",`,
  `   "file":"sources/s1.md","trust":"cao|vua|chua-kiem-chung","why":"vì sao tin được","quotes":["..."]}],`,
  `   "cues": {"1": ["s1","s2"], "2": ["s1"]}}`,
  `   - \`quotes\` là **trích nguyên văn** từ chính file đã tải, mỗi đoạn trên 40 ký tự. Chép, đừng diễn đạt lại.`,
  `   - \`published\` là null khi trang thật sự không ghi ngày. Đừng đoán — trang không ghi ngày là một`,
  `     thông tin người duyệt cần biết.`,
  `   - \`trust\` tự đánh giá thật, kèm \`why\`. Một trang không rõ tác giả thì là "chua-kiem-chung",`,
  `     dù nội dung nghe hợp lý.`,
];

const CONFLICTS = [
  `## Mâu thuẫn thì nói ra`,
  ``,
  `Hai nguồn nói khác nhau thì **đừng chọn bừa một bên**. Ghi cả hai vào hồ sơ, đặt \`trust\` cho đúng, và`,
  `viết câu theo cách trung thực với tình trạng đó — hoặc bỏ ý đó khỏi kịch bản.`,
];

/** Cách đọc slide gốc, tuỳ định dạng — PDF thì Read đọc thẳng nhưng tối đa 20 trang mỗi lần. */
function deckLines(deck: SlideDeck, dir: string) {
  if (deck.format === "pptx") {
    return [
      `Slide của giảng viên: \`${dir}/${deck.file}\` (PPTX, ${deck.slides ?? "?"} slide). Chữ và ghi chú của từng`,
      `slide đã được bóc sẵn vào \`${dir}/${deck.text}\` — đọc file đó (Read không mở được PPTX). Hình và sơ đồ`,
      `trong PPTX không đi theo; slide nào chỉ có hình thì ghi rõ là không đọc được nội dung.`,
    ];
  }
  const pages = deck.slides ? `${deck.slides} trang` : "chưa rõ số trang";
  return [
    `Slide của giảng viên: \`${dir}/${deck.file}\` (PDF, ${pages}). Đọc bằng Read, **mỗi lần tối đa 20 trang**`,
    `qua tham số \`pages\` ("1-20", "21-40", …)${deck.slides ? "" : " cho tới khi hết trang"}. Đọc cả chữ trong hình và sơ đồ.`,
  ];
}

/** Bước 1 của lượt từ slide: đọc slide, chọn chỗ cần research. Không có web. */
function extractPrompt(deck: SlideDeck, dir: string) {
  return [
    `Bạn đang chạy trong Video Studio, tính năng "Đóng gói kịch bản" (beta), bước **bóc tách slide**. Trả lời`,
    `bằng tiếng Việt. Bước này không tìm web — chỉ đọc slide và lập danh sách.`,
    ``,
    ...deckLines(deck, dir),
    `Thư mục làm việc: \`${dir}/\` — **chỉ ghi file trong đó**.`,
    ``,
    `## Việc cần làm`,
    ``,
    `1. **Đọc hết slide** và lập dàn ý: mỗi slide một mục — số slide, tiêu đề, các ý chính (chép sát lời slide,`,
    `   không thêm ý của bạn).`,
    `2. **Chọn những chỗ cần research trên web** trước khi dựng thành video:`,
    `   - "so-lieu": số liệu, năm, tỉ lệ, xếp hạng — có thể đã cũ hoặc slide không ghi nguồn;`,
    `   - "khang-dinh": khẳng định gán cho một nghiên cứu, tổ chức, người, hoặc nghe như sự thật mà không có nguồn;`,
    `   - "cap-nhat": chỗ nói "mới nhất", "hiện nay", "gần đây", tên sản phẩm, phiên bản — dễ đã lỗi thời;`,
    `   - "dinh-nghia": khái niệm nên có một định nghĩa chuẩn có nguồn;`,
    `   - "vi-du": ý trừu tượng cần một ví dụ thật để minh hoạ.`,
    `   Không đưa vào: kiến thức phổ thông, nhận định riêng của giảng viên, bài tập, lời dẫn. Gộp các chỗ trùng`,
    `   nhau. Thường 3–12 mục, ít hơn cũng được nếu slide ít chỗ cần kiểm — đừng đặt ra cho đủ số.`,
    `3. **Ghi \`${dir}/muc-research.json\`** (JSON hợp lệ, UTF-8):`,
    `   {"title": "tên bài giảng", "slides": <số slide>,`,
    `    "outline": [{"slide": 1, "heading": "...", "points": ["..."]}],`,
    `    "items": [{"id": "m1", "slides": [3], "title": "tên ngắn, dưới 60 ký tự",`,
    `      "claim": "slide nói gì / cần kiểm điều gì — chép sát lời slide nếu là một khẳng định trên slide",`,
    `      "kind": "so-lieu|khang-dinh|cap-nhat|dinh-nghia|vi-du", "why": "vì sao cần research",`,
    `      "queries": ["từ khoá tìm 1", "từ khoá tìm 2"]}]}`,
    ``,
    `Người dùng sẽ duyệt danh sách này trước khi research, nên viết \`title\` và \`why\` cho người đọc hiểu ngay.`,
    `Xong thì dừng và tóm tắt ngắn: bao nhiêu slide, bao nhiêu mục, mục nào quan trọng nhất.`,
  ].join("\n");
}

/** Bước 2: research lần lượt từng mục người dùng đã duyệt, rồi viết kịch bản theo mạch của slide. */
function researchPrompt(run: LiveRun) {
  const { dir, input, deck, items } = run;
  const list = items.length
    ? items.map((it) => {
        const where = it.slides.length ? `slide ${it.slides.join(", ")}` : "cả bài";
        const hints = it.queries.length ? `; gợi ý tìm: ${it.queries.join(" / ")}` : "";
        return `- **${it.id}** · [${it.kind}] ${it.title} — ${where}: ${it.claim}${it.why ? ` (vì: ${it.why}${hints})` : hints ? ` (${hints.slice(2)})` : ""}`;
      })
    : ["- (không có mục nào — người dùng chọn viết kịch bản chỉ từ slide, không research)"];
  return [
    `Bạn đang chạy trong Video Studio, tính năng "Đóng gói kịch bản" (beta), bước **research và viết kịch bản**`,
    `từ slide của giảng viên. Trả lời bằng tiếng Việt.`,
    ``,
    ...(deck ? deckLines(deck, dir) : []),
    `Dàn ý đã bóc ở bước trước nằm trong \`${dir}/muc-research.json\` (mục \`outline\`) — dùng nó; chỉ mở lại`,
    `slide gốc khi cần xem kỹ một slide.`,
    `Thư mục làm việc: \`${dir}/\` — **chỉ ghi file trong đó**, không sửa gì khác trong repo.`,
    ``,
    `## Các mục người dùng đã duyệt — làm lần lượt, đúng thứ tự`,
    ``,
    ...list,
    ``,
    `## Việc cần làm`,
    ``,
    `1. **Ngay đầu tiên, lập danh sách việc bằng TodoWrite**: mỗi mục một việc, nội dung **bắt đầu đúng bằng mã`,
    `   mục** ("m1 · <tên>"), cuối cùng là việc "Viết kịch bản". Chuyển việc sang in_progress khi bắt đầu và`,
    `   completed khi xong, mỗi lần một việc — Studio đọc đúng danh sách này để hiện bạn đang làm mục nào.`,
    `2. **Research từng mục qua đúng 7 bước**, xong bước nào ghi file của bước đó vào \`${dir}/items/<mã>/\` ngay —`,
    `   Studio hiện tiến độ từng bước từ chính các file này, và người duyệt đọc lại chúng để biết bạn đã làm gì:`,
    `   1. **Lập kế hoạch** → \`ke-hoach.json\`: {"questions": ["câu hỏi cần trả lời"], "queries": ["truy vấn"]}.`,
    `      2–4 câu hỏi cụ thể; truy vấn cả tiếng Việt lẫn tiếng Anh khi chủ đề có tài liệu tiếng Anh tốt hơn.`,
    `   2. **Tìm kiếm**: WebSearch theo từng truy vấn trong kế hoạch.`,
    `   3. **Lọc nguồn** → \`loc-nguon.json\`: {"candidates": [{"url": "...", "title": "...", "keep": true|false,`,
    `      "why": "vì sao giữ / loại"}]} — mọi kết quả đáng cân nhắc, kể cả cái bị loại. Ưu tiên nguồn gốc (tài liệu`,
    `      chính thức, bài có tác giả và ngày đăng, nghiên cứu); loại bài chép lại, trang không rõ ai viết.`,
    `   4. **Tải và lưu**: với mỗi nguồn giữ lại, WebFetch rồi **Write toàn văn** vào \`${dir}/sources/<id>.md\``,
    `      (s1, s2, … đánh số chung cho cả lượt, không trùng giữa các mục).`,
    `   5. **Trích dẫn** → \`trich-dan.json\`: {"quotes": [{"source": "s1", "quote": "chép nguyên văn từ file đã tải,`,
    `      trên 40 ký tự"}]} — những đoạn trả lời đúng câu hỏi của kế hoạch.`,
    `   6. **Đánh giá và đối chiếu** → \`danh-gia.json\`: {"assessments": [{"source": "s1", "trust":`,
    `      "cao|vua|chua-kiem-chung", "stance": "ung-ho|mot-phan|trai-nguoc", "why": "ai viết, khi nào, có độc lập`,
    `      với nguồn khác không, khớp hay khác slide ở đâu"}]} — mỗi nguồn đã tải một dòng.`,
    `   7. **Kết luận** → \`ket-luan.json\`: {"id": "m1", "verdict": "xac-nhan|dieu-chinh|mau-thuan|khong-du-nguon",`,
    `      "finding": "kết luận 1–3 câu", "sources": ["s1", "s2"]}.`,
    `      - xac-nhan: nguồn khớp với slide. dieu-chinh: nguồn cho thông tin mới hơn hoặc khác slide — ghi rõ khác gì.`,
    `      - mau-thuan: các nguồn nói khác nhau. khong-du-nguon: không có ${input.minSources} nguồn độc lập.`,
    `      - \`sources\` chỉ gồm nguồn đã tải và có trích đoạn trong \`trich-dan.json\` — Studio soát đúng điều này.`,
    `   Mục "cap-nhat" (có thể đã cũ) cần ít nhất một nguồn đăng trong 12 tháng gần đây; không có thì nói rõ trong`,
    `   kết luận. Nguồn độc lập nghĩa là khác tổ chức xuất bản — hai trang cùng một báo chỉ là một nguồn.`,
    `3. **Hồ sơ nguồn** \`${dir}/nguon.json\`:`,
    ...DOSSIER_SCHEMA,
    `   - Trong \`cues\`, câu dựa trên nội dung của chính slide ghi \`"slide:<số>"\` (vd \`"slide:3"\`); câu dùng`,
    `     kết quả research ghi id nguồn. Một câu có thể có cả hai.`,
    `4. **Kịch bản** \`${dir}/kich-ban.md\` theo đúng mẫu \`templates/kich-ban-co-ban.md\` (đọc file đó trước),`,
    `   khoảng ${input.cues} câu, mỗi câu một mục \`### Câu N\`:`,
    `   - Đi theo mạch của slide và giảng lại nội dung của giảng viên — không đổi chủ đề, không thêm phần mà`,
    `     slide không có.`,
    `   - Chỗ có mục research thì dùng kết luận đã soát: dieu-chinh → dùng thông tin đúng; mau-thuan hoặc`,
    `     khong-du-nguon → không khẳng định, nói trung thực tình trạng đó hoặc bỏ ý.`,
    `   - Câu dùng số liệu hay khẳng định lấy từ research phải có ít nhất ${input.minSources} nguồn độc lập trong`,
    `     \`cues\` (khác tổ chức xuất bản, không phải hai trang chép lại một thông cáo).`,
    `   - Không có con số, tên riêng hay kết quả nào mà slide hoặc nguồn không nói.`,
    `   - Mỗi slide có nội dung trong dàn ý phải được ít nhất một câu dựa vào (\`"slide:<số>"\` trong \`cues\`) —`,
    `     Studio soát độ phủ này; slide nào cố ý bỏ thì nói lý do trong phần tóm tắt.`,
    ``,
    ...CONFLICTS,
    ``,
    `Xong thì dừng và tóm tắt ngắn: mục nào khớp slide, mục nào slide cần sửa, mục nào không đủ nguồn, và chỗ`,
    `người duyệt nên xem kỹ.`,
  ].join("\n");
}

// ── chạy agent ───────────────────────────────────────────────────────────────────

interface StreamBlock {
  type?: string;
  id?: string;
  tool_use_id?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  is_error?: boolean;
  content?: unknown;
}
interface StreamMessage {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  message?: { content?: StreamBlock[] };
}

/** Một lần gọi công cụ → một dòng trên trang. WebSearch và WebFetch được gọi tên riêng vì chúng là thứ
 *  trang này sinh ra để cho xem. */
function toolEvent(name: string, input: Record<string, unknown>, dir: string): ScoutEvent {
  const t = Date.now();
  if (name === "WebSearch") return { t, kind: "search", query: short(input.query, 160) };
  if (name === "WebFetch") return { t, kind: "fetch", url: String(input.url ?? ""), ask: short(input.prompt, 120) };
  if (name === "Write") return { t, kind: "save", file: insideRun(String(input.file_path ?? ""), path.basename(dir)) };
  if (name === "Read") return { t, kind: "tool", name, detail: short(input.file_path, 120) };
  if (name === "Glob" || name === "Grep") return { t, kind: "tool", name, detail: short(input.pattern, 120) };
  if (name === "TodoWrite") return { t, kind: "tool", name, detail: "Cập nhật danh sách việc" };
  return { t, kind: "tool", name, detail: "" };
}

/** Đổi trạng thái vài nút rồi báo trang một lần. */
function setStates(run: LiveRun, changes: Record<string, NodeState>) {
  let changed = false;
  for (const [node, state] of Object.entries(changes)) {
    if (!(node in run.itemStates) || run.itemStates[node] === state) continue;
    run.itemStates[node] = state;
    changed = true;
  }
  if (changed) push(run, { t: Date.now(), kind: "progress", stage: run.stage, states: { ...run.itemStates } });
}

/**
 * Tiến độ theo từng mục. TodoWrite của agent là nguồn chính; file nó ghi là nguồn phụ — một agent quên
 * cập nhật danh sách việc nhưng đã ghi `items/m2.json` thì mục đó vẫn là xong.
 */
function track(run: LiveRun, name: string, input: Record<string, unknown>) {
  if (run.stage !== "research" || run.mode !== "slide") return;
  if (name === "TodoWrite") {
    const { states, active } = todoStates(input.todos, run.items.map((it) => it.id));
    run.active = active;
    setStates(run, states);
    return;
  }
  if (name === "Write") {
    const file = insideRun(String(input.file_path ?? ""), path.basename(run.dir));
    if (file === "kich-ban.md") {
      run.active = SCRIPT_NODE;
      setStates(run, { [SCRIPT_NODE]: "active" });
    }
  }
}

const readJson = (file: string): unknown => {
  try { return exists(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null; } catch { return null; }
};

/** Đọc lại mọi file agent đã ghi cho một mục, suy ra các bước đã xong. */
function loadItem(run: LiveRun, id: string): { research: ItemResearch; steps: StepKey[] } {
  const dir = path.join(REPO, run.dir, "items", id);
  const read = (file: string) => readJson(path.join(dir, file));
  const has = (file: string) => exists(path.join(dir, file));
  const research: ItemResearch = {
    plan: parsePlan(read("ke-hoach.json")),
    candidates: parseCandidates(read("loc-nguon.json")),
    quotes: parseQuotes(read("trich-dan.json")),
    assessments: parseAssessments(read("danh-gia.json")),
    finding: parseFinding(read("ket-luan.json"), id),
  };
  const steps = stepsDone({
    "ke-hoach": has("ke-hoach.json"), loc: has("loc-nguon.json"), trich: has("trich-dan.json"),
    "danh-gia": has("danh-gia.json"), "ket-luan": has("ket-luan.json"),
  });
  run.research[id] = research;
  run.itemSteps[id] = steps;
  if (research.finding) run.findings[id] = research.finding;
  return { research, steps };
}

/**
 * Một lời gọi công cụ đã chạy xong (có `tool_result`). Chỉ ở đây file vừa ghi mới chắc chắn đã nằm trên
 * đĩa — lúc agent gọi Write thì chưa. Ghi xong một file bước của mục nào thì đọc lại mục đó và báo trang.
 */
function toolDone(run: LiveRun, name: string, input: Record<string, unknown>) {
  if (name !== "Write" || run.mode !== "slide" || run.stage !== "research") return;
  const file = insideRun(String(input.file_path ?? ""), path.basename(run.dir));
  const match = /^items\/(m\d+)\/([a-z-]+\.json)$/.exec(file);
  if (!match || !stepOfFile(match[2]) || !run.items.some((it) => it.id === match[1])) return;
  const id = match[1];
  const { research, steps } = loadItem(run, id);
  push(run, { t: Date.now(), kind: "research", stage: "research", item: id, research, steps });
  if (steps.includes("ket-luan")) setStates(run, { [id]: "done" });
}

/**
 * Chạy một agent cho một giai đoạn của lượt. Trả về ngay; `finish` chạy khi tiến trình đóng lại, với
 * `ok` là agent tự báo thành công và không bị Dừng.
 */
function runAgent(self: LiveRun, stage: ScoutStage, text: string, allowed: string[], denied: string[], finish: (ok: boolean, summary: string) => Promise<void>) {
  self.stage = stage;
  self.status = "running";
  self.active = null;
  self.stopped = false;

  const bin = process.env.CLAUDE_BIN || "claude";
  // Cùng lý do với jobs.ts: trên Windows một CLI cài qua npm là .cmd, spawn thẳng sẽ EINVAL.
  const shell = process.platform === "win32" && /\.(cmd|bat)$/i.test(bin);
  const child = spawn(bin, claudeExecArgs(randomUUID(), false, allowed, denied), {
    cwd: REPO,
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
    shell,
  });
  self.child = child;

  const tag = (event: ScoutEvent): ScoutEvent => ({ ...event, stage, ...(self.active ? { item: self.active } : {}) });
  /** id của lời gọi công cụ → tên và đầu vào, chờ `tool_result` của nó. */
  const pending = new Map<string, { name: string; input: Record<string, unknown> }>();
  let ok = false;
  let summary = "";
  let buf = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buf += chunk.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let msg: StreamMessage;
      try { msg = JSON.parse(line) as StreamMessage; } catch { continue; }
      if (msg.type === "assistant") {
        for (const block of msg.message?.content || []) {
          if (block.type === "text" && block.text?.trim()) push(self, tag({ t: Date.now(), kind: "say", text: block.text.trim() }));
          if (block.type === "tool_use" && block.name) {
            // Cập nhật mục đang làm trước, để chính lời gọi TodoWrite chuyển mục đã thuộc về mục mới.
            track(self, block.name, block.input || {});
            push(self, tag(toolEvent(block.name, block.input || {}, self.dir)));
            if (block.id) pending.set(block.id, { name: block.name, input: block.input || {} });
          }
        }
      } else if (msg.type === "user") {
        for (const block of msg.message?.content || []) {
          if (block.type !== "tool_result") continue;
          const call = block.tool_use_id ? pending.get(block.tool_use_id) : undefined;
          if (block.tool_use_id) pending.delete(block.tool_use_id);
          if (block.is_error) {
            push(self, tag({ t: Date.now(), kind: "error", text: short(typeof block.content === "string" ? block.content : JSON.stringify(block.content), 300) }));
          } else if (call) {
            toolDone(self, call.name, call.input);
          }
        }
      } else if (msg.type === "result") {
        ok = msg.subtype === "success" && !msg.is_error;
        summary = msg.result?.trim() || "";
      }
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    const out = chunk.toString().trim();
    if (out) push(self, tag({ t: Date.now(), kind: "error", text: short(out, 300) }));
  });
  child.on("error", (error) => {
    push(self, tag({ t: Date.now(), kind: "error", text: `${bin}: ${error.message}` }));
  });
  child.on("close", () => {
    self.child = undefined;
    self.active = null;
    void finish(ok && !self.stopped, summary).then(() => persist(self));
  });
  child.stdin.end(text);
}

/** Đọc lại hồ sơ, kịch bản và kết luận từng mục agent vừa ghi, rồi soát bằng đúng CLI người dùng chạy tay được. */
async function collect(run: LiveRun) {
  const abs = path.join(REPO, run.dir);
  const dossier = readJson(path.join(abs, "nguon.json")) as Dossier | null;
  let check: SourceCheck | null = null;
  try {
    // Mã thoát khác 0 nghĩa là "chưa đạt", không phải "chạy hỏng" — báo cáo vẫn nằm ở stdout.
    const { stdout } = await execFileP(process.execPath, ["tools/scout-verify.mjs", run.dir, "--json", "--min", String(run.input.minSources)], { cwd: REPO, maxBuffer: 8 * 1024 * 1024 })
      .catch((error: { stdout?: string }) => ({ stdout: error.stdout ?? "" }));
    if (stdout.trim()) check = JSON.parse(stdout) as SourceCheck;
  } catch {
    check = null;
  }
  for (const it of run.items) loadItem(run, it.id);
  const script = exists(path.join(abs, "kich-ban.md")) ? `${run.dir}/kich-ban.md` : null;
  return { dossier, check, script };
}

/** Kết thúc bước research — dùng chung cho lượt chủ đề và lượt từ slide. */
function finishResearch(self: LiveRun) {
  return async (ok: boolean, summary: string) => {
    // Lượt bị dừng giữa chừng vẫn có thể đã ghi được vài nguồn — đọc lại hết, đừng vứt đi.
    const { dossier, check, script } = await collect(self);
    self.dossier = dossier;
    self.check = check;
    self.script = script;
    const findings = self.findings;
    // Mục đã có kết luận là xong, dù agent quên đánh dấu trong TodoWrite; mục còn "đang làm" khi lượt đã
    // đóng thì không còn đang làm nữa.
    for (const node of Object.keys(self.itemStates)) {
      self.itemStates[node] = findings[node] || (node === SCRIPT_NODE && script) ? "done" : self.itemStates[node] === "done" ? "done" : "pending";
    }
    self.status = self.stopped ? "stopped" : ok ? "done" : "error";
    push(self, {
      t: Date.now(),
      kind: "done",
      stage: "research",
      ok,
      summary: self.stopped ? "Đã dừng lượt chạy." : summary || (ok ? "Agent đã dừng." : "Agent kết thúc mà không báo thành công."),
    });
  };
}

function newRun(input: ScoutInput, mode: ScoutRun["mode"], dir: string, slug: string): LiveRun {
  return {
    slug, input, mode, stage: mode === "slide" ? "extract" : "research", status: "running", startedAt: Date.now(), dir,
    events: [], deck: null, extraction: null, items: [], itemStates: {}, findings: {}, itemSteps: {}, research: {},
    dossier: null, check: null, script: null, active: null,
  };
}

/** `scout/<slug>`, thêm hậu tố khi đã có — slide cùng tên nộp lại không được trộn nguồn với lượt trước. */
function freshDir(base: string) {
  let slug = base;
  for (let i = 2; exists(path.join(SCOUT_ROOT, slug)); i++) slug = `${base}-${i}`;
  return slug;
}

/**
 * Lượt từ một chủ đề gõ tay: một agent tìm tài liệu rồi viết luôn. Trả về ngay; tiến trình chạy nền và
 * các sự kiện đi ra qua `subscribeScout`.
 *
 * Mỗi lúc chỉ một lượt: đây là trang beta để xem agent làm việc, không phải hàng đợi.
 */
export function startScout(input: ScoutInput) {
  if (scoutRunning()) throw new Error("Đang có một lượt chạy. Chờ xong hoặc bấm Dừng.");
  const slug = slugify(input.topic);
  const dir = `scout/${slug}`;
  fs.mkdirSync(path.join(REPO, dir, "sources"), { recursive: true });

  // `self` là cái mọi closure bên dưới bám vào. `registry.run` chỉ nói "lượt nào đang hiển thị" và có
  // thể đã trỏ đi chỗ khác vào lúc tiến trình này đóng lại.
  const self = newRun(input, "topic", dir, slug);
  registry.run = self;
  push(self, { t: Date.now(), kind: "start", stage: "research", topic: input.topic, dir });
  runAgent(self, "research", topicPrompt(input, dir), ALLOWED, DENIED, finishResearch(self));
  persist(self);
  return currentScout()!;
}

/**
 * Lượt từ slide, bước 1: lưu slide, bóc chữ nếu là PPTX, rồi cho một agent (không web) đọc slide và lập
 * danh sách mục cần research. Xong thì lượt dừng ở trạng thái `review` chờ người dùng duyệt.
 */
export function startSlideScout(input: ScoutInput, upload: { name: string; bytes: Uint8Array }) {
  if (scoutRunning()) throw new Error("Đang có một lượt chạy. Chờ xong hoặc bấm Dừng.");
  const ext = path.extname(upload.name).slice(1).toLowerCase();
  if (ext !== "pdf" && ext !== "pptx") throw new Error("Chỉ nhận slide .pdf hoặc .pptx.");

  // Đọc và kiểm file trước khi tạo gì trên đĩa: một file hỏng không được để lại thư mục rác.
  const parsed = ext === "pptx" ? pptxSlides(upload.bytes) : null;
  const pages = ext === "pdf" ? pdfPageCount(upload.bytes) : null;

  const slug = freshDir(slugify(input.topic));
  const dir = `scout/${slug}`;
  const abs = path.join(REPO, dir);
  fs.mkdirSync(path.join(abs, "sources"), { recursive: true });
  const file = `slide.${ext}`;
  fs.writeFileSync(path.join(abs, file), upload.bytes);
  let text: string | null = null;
  if (parsed) {
    text = "slide.md";
    fs.writeFileSync(path.join(abs, text), slidesMarkdown(input.topic, parsed));
  }
  const deck: SlideDeck = { name: upload.name, format: ext, file, text, slides: parsed ? parsed.length : pages, bytes: upload.bytes.length };

  const self = newRun(input, "slide", dir, slug);
  self.deck = deck;
  registry.run = self;
  push(self, { t: Date.now(), kind: "start", stage: "extract", topic: input.topic, dir });
  runAgent(self, "extract", extractPrompt(deck, dir), EXTRACT_ALLOWED, EXTRACT_DENIED, async (ok, summary) => {
    const extraction = parseExtraction(readJson(path.join(abs, "muc-research.json")), deck.slides);
    if (ok && extraction) {
      self.extraction = extraction;
      self.status = "review";
      push(self, { t: Date.now(), kind: "review", stage: "extract", items: extraction.items.length });
      return;
    }
    self.status = self.stopped ? "stopped" : "error";
    push(self, {
      t: Date.now(),
      kind: "done",
      stage: "extract",
      ok: false,
      summary: self.stopped
        ? "Đã dừng lượt chạy."
        : ok ? "Agent đọc xong nhưng không ghi được muc-research.json dùng được." : summary || "Agent kết thúc mà không báo thành công.",
    });
  });
  persist(self);
  return currentScout()!;
}

/**
 * Lượt từ slide, bước 2: người dùng đã duyệt (sửa, bỏ, thêm) danh sách mục. Một agent research lần lượt
 * từng mục rồi viết kịch bản.
 */
export function confirmScout(rawItems: unknown) {
  const self = registry.run;
  if (!self || self.mode !== "slide" || self.status !== "review") throw new Error("Không có lượt nào đang chờ duyệt.");
  // Chỉ giữ mục được chọn và đánh lại mã liền nhau, để TodoWrite và items/<mã>.json của agent khớp đúng.
  const items: ResearchItem[] = cleanItems(rawItems)
    .filter((it) => it.selected)
    .map((it, i) => ({ ...it, id: `m${i + 1}` }));
  self.items = items;
  self.itemStates = Object.fromEntries([...items.map((it) => [it.id, "pending" as NodeState]), [SCRIPT_NODE, "pending" as NodeState]]);
  self.findings = {};
  self.itemSteps = Object.fromEntries(items.map((it) => [it.id, [] as StepKey[]]));
  self.research = {};
  for (const it of items) fs.mkdirSync(path.join(REPO, self.dir, "items", it.id), { recursive: true });
  push(self, { t: Date.now(), kind: "progress", stage: "research", states: { ...self.itemStates } });
  runAgent(self, "research", researchPrompt(self), ALLOWED, DENIED, finishResearch(self));
  persist(self);
  return currentScout()!;
}
