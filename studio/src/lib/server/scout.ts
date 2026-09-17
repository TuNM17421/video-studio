import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { Dossier, ScoutEvent, ScoutInput, ScoutRun, SourceCheck } from "../scout";
import { slugify } from "../scout";
import { claudeExecArgs } from "./agent-cli";
import { exists, REPO } from "./paths";

const execFileP = promisify(execFile);

/**
 * Thư mục của tính năng này. **Không** nằm trong `projects/`: `listVideos()` coi mỗi thư mục con ở đó là
 * một video, nên một lượt chạy thử sẽ hiện lên trang Các video như một video hỏng. Để riêng ra ngoài thì
 * luồng tạo video không nhìn thấy gì cả.
 */
export const SCOUT_ROOT = path.join(REPO, "scout");

/**
 * Bộ công cụ của lượt chạy này — và đây là chỗ duy nhất trong cả Studio mở WebSearch/WebFetch.
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

type LiveRun = ScoutRun & { child?: ChildProcess; stopped?: boolean };

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
 * Bản đọc được của lượt chạy hiện tại. Dựng từng trường một chứ không bóc phần thừa ra: `child` là một
 * ChildProcess, lọt vào `Response.json` là hỏng cả lượt trả về, nên danh sách trường phải là danh sách
 * cho phép chứ không phải danh sách loại trừ.
 */
export function currentScout(): ScoutRun | null {
  const run = registry.run;
  if (!run) return null;
  return {
    slug: run.slug,
    input: run.input,
    status: run.status,
    startedAt: run.startedAt,
    dir: run.dir,
    events: run.events,
    dossier: run.dossier,
    check: run.check,
    script: run.script,
  };
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

/**
 * Việc cần làm, viết cho agent.
 *
 * Hai ràng buộc đáng tiền nhất nằm ở bước 2 và 4: **tải trang về đĩa trước khi trích**, và **trích nguyên
 * văn**. Công cụ tìm kiếm của agent không để lại gì soát được, nên nếu không bắt ghi toàn văn xuống thì
 * `tools/scout-verify.mjs` chẳng có gì để đối chiếu và cả tính năng này chỉ còn là lời hứa.
 */
function prompt(input: ScoutInput, dir: string) {
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
    `   {"topic": "...", "createdAt": "<ISO>", "sources": [{"id":"s1","url":"...","title":"...",`,
    `   "publisher":"...","published":"YYYY-MM-DD hoặc null nếu trang không ghi","fetchedAt":"<ISO>",`,
    `   "file":"sources/s1.md","trust":"cao|vua|chua-kiem-chung","why":"vì sao tin được","quotes":["..."]}],`,
    `   "cues": {"1": ["s1","s2"], "2": ["s1"]}}`,
    `   - \`quotes\` là **trích nguyên văn** từ chính file đã tải, mỗi đoạn trên 40 ký tự. Chép, đừng diễn đạt lại.`,
    `   - \`published\` là null khi trang thật sự không ghi ngày. Đừng đoán — trang không ghi ngày là một`,
    `     thông tin người duyệt cần biết.`,
    `   - \`trust\` tự đánh giá thật, kèm \`why\`. Một trang không rõ tác giả thì là "chua-kiem-chung",`,
    `     dù nội dung nghe hợp lý.`,
    `4. **Viết kịch bản** \`${dir}/kich-ban.md\` theo đúng mẫu \`templates/kich-ban-co-ban.md\` (đọc file đó`,
    `   trước). Khoảng ${input.cues} câu, mỗi câu một mục \`### Câu N\`.`,
    `   - **Mỗi câu phải có ít nhất ${input.minSources} nguồn độc lập** trong \`cues\` của nguon.json.`,
    `     Độc lập nghĩa là khác tổ chức xuất bản, không phải hai trang cùng chép lại một thông cáo.`,
    `   - Không có con số, tên riêng hay kết quả nào mà nguồn không nói. Không đủ nguồn cho một ý thì bỏ ý`,
    `     đó đi, đừng viết cho đủ số câu.`,
    ``,
    `## Mâu thuẫn thì nói ra`,
    ``,
    `Hai nguồn nói khác nhau thì **đừng chọn bừa một bên**. Ghi cả hai vào hồ sơ, đặt \`trust\` cho đúng, và`,
    `viết câu theo cách trung thực với tình trạng đó — hoặc bỏ ý đó khỏi kịch bản.`,
    ``,
    `Xong thì dừng và tóm tắt ngắn: tìm được mấy nguồn, bỏ nguồn nào và vì sao, ý nào không đủ nguồn nên`,
    `đã bỏ, và chỗ nào bạn thấy người duyệt nên xem kỹ.`,
  ].join("\n");
}

interface StreamBlock {
  type?: string;
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

/** Đọc lại hồ sơ và kịch bản agent vừa ghi, rồi soát bằng đúng CLI mà người dùng chạy tay được. */
async function collect(dir: string, minSources: number) {
  const abs = path.join(REPO, dir);
  let dossier: Dossier | null = null;
  try {
    const file = path.join(abs, "nguon.json");
    if (exists(file)) dossier = JSON.parse(fs.readFileSync(file, "utf8")) as Dossier;
  } catch {
    dossier = null;
  }
  let check: SourceCheck | null = null;
  try {
    // Mã thoát khác 0 nghĩa là "chưa đạt", không phải "chạy hỏng" — báo cáo vẫn nằm ở stdout.
    const { stdout } = await execFileP(process.execPath, ["tools/scout-verify.mjs", dir, "--json", "--min", String(minSources)], { cwd: REPO, maxBuffer: 8 * 1024 * 1024 })
      .catch((error: { stdout?: string }) => ({ stdout: error.stdout ?? "" }));
    if (stdout.trim()) check = JSON.parse(stdout) as SourceCheck;
  } catch {
    check = null;
  }
  const script = exists(path.join(abs, "kich-ban.md")) ? `${dir}/kich-ban.md` : null;
  return { dossier, check, script };
}

/**
 * Chạy một lượt. Trả về ngay; tiến trình chạy nền và các sự kiện đi ra qua `subscribeScout`.
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
  const self: LiveRun = {
    slug, input, status: "running", startedAt: Date.now(), dir,
    events: [], dossier: null, check: null, script: null,
  };
  registry.run = self;
  push(self, { t: Date.now(), kind: "start", topic: input.topic, dir });

  const bin = process.env.CLAUDE_BIN || "claude";
  // Cùng lý do với jobs.ts: trên Windows một CLI cài qua npm là .cmd, spawn thẳng sẽ EINVAL.
  const shell = process.platform === "win32" && /\.(cmd|bat)$/i.test(bin);
  const child = spawn(bin, claudeExecArgs(randomUUID(), false, ALLOWED, DENIED), {
    cwd: REPO,
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
    shell,
  });
  self.child = child;

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
          if (block.type === "text" && block.text?.trim()) push(self, { t: Date.now(), kind: "say", text: block.text.trim() });
          if (block.type === "tool_use" && block.name) push(self, toolEvent(block.name, block.input || {}, dir));
        }
      } else if (msg.type === "user") {
        for (const block of msg.message?.content || []) {
          if (block.type === "tool_result" && block.is_error) {
            push(self, { t: Date.now(), kind: "error", text: short(typeof block.content === "string" ? block.content : JSON.stringify(block.content), 300) });
          }
        }
      } else if (msg.type === "result") {
        ok = msg.subtype === "success" && !msg.is_error;
        summary = msg.result?.trim() || "";
      }
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) push(self, { t: Date.now(), kind: "error", text: short(text, 300) });
  });
  child.on("error", (error) => {
    push(self, { t: Date.now(), kind: "error", text: `${bin}: ${error.message}` });
  });
  child.on("close", () => {
    void (async () => {
      const stopped = Boolean(self.stopped);
      // Lượt bị dừng giữa chừng vẫn có thể đã ghi được vài nguồn — đọc lại hết, đừng vứt đi.
      const { dossier, check, script } = await collect(dir, input.minSources);
      self.status = stopped ? "stopped" : ok ? "done" : "error";
      self.child = undefined;
      self.dossier = dossier;
      self.check = check;
      self.script = script;
      push(self, {
        t: Date.now(),
        kind: "done",
        ok: ok && !stopped,
        summary: stopped ? "Đã dừng lượt chạy." : summary || (ok ? "Agent đã dừng." : "Agent kết thúc mà không báo thành công."),
      });
    })();
  });
  child.stdin.end(prompt(input, dir));

  return currentScout()!;
}
