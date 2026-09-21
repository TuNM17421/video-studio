import fs from "node:fs";
import path from "node:path";
import { agentProviderLabel } from "../agent-providers";
import type { AgentProvider, LogEntry } from "../types";
import { antigravityStepArgs, antigravityStdin, claudeStepArgs, codexStepArgs, sanitizedAgentEnv, type StepCall } from "./agent-cli";
import { createStreamParser, short, type AgentUsage } from "./agent-stream";
import { killChild, run, setProgress, wasStopped } from "./jobs";

/**
 * Một lượt agent không tương tác cho một chặng nhỏ (research, đề xuất ảnh…): gọi CLI của người dùng với đúng
 * quyền của chặng, đọc luồng sự kiện vào nhật ký, ghi số token, và dừng nó khi nó kẹt.
 *
 * Hàm này không biết mình đang phục vụ pipeline nào: nhật ký ghi vào đâu, lượt chạy lưu ở đâu, job nào trong
 * bộ đăng ký — đều do `StepHost` của người gọi quyết định.
 *
 * "Kẹt" không đo bằng đồng hồ cố định — bài dễ phải xong nhanh, bài khó được chạy lâu. Hai ngưỡng:
 * - `idleMs`: không có dòng nào từ agent trong chừng ấy thời gian (Claude gửi từng mẩu chữ nhờ
 *   `--include-partial-messages`, nên một lượt viết dài vẫn có hoạt động);
 * - `capMs`: trần an toàn tính theo khối lượng (số slide, số claim, số câu) — chỉ chặn chạy lạc.
 */

export type StepResult = "ok" | "failed" | "stalled" | "cap" | "stopped";

export interface StepOutcome {
  result: StepResult;
  text: string;
}

/** Nơi một lượt agent ghi lại mình: job trong bộ đăng ký, nhật ký, và bản ghi lượt chạy. */
export interface StepHost {
  /** Khoá job trong bộ đăng ký (`research:<rid>`, `<videoId>`…) — nút Dừng và tiến trình con đi theo nó. */
  key: string;
  log(kind: LogEntry["kind"], text: string): void;
  /** Lượt bắt đầu thật (sau khi đã tìm thấy CLI): ghi một bản ghi lượt chạy. */
  onStart(run: { agent: AgentProvider; model: string | null; startedAt: string }): void;
  /** Lượt kết thúc: hoàn tất đúng bản ghi `onStart` vừa tạo. */
  onEnd(end: { endedAt: string; result: StepResult; usage?: AgentUsage; costUsd?: number }): void;
}

export interface AgentStepSpec {
  /** Tên việc cho nhật ký và thanh tiến trình ("research c1, c2", "chọn chỗ cần ảnh"). */
  what: string;
  call: StepCall;
  idleMs: number;
  capMs: number;
}

/** Hai CLI kia không gửi từng mẩu chữ: một câu trả lời dài là một khoảng im lặng thật, nới ngưỡng ra. */
const IDLE_FACTOR: Record<AgentProvider, number> = { claude: 1, codex: 2.5, antigravity: 2.5 };
const TICK_MS = 5000;

const BIN_NAME: Record<AgentProvider, () => string> = {
  claude: () => process.env.CLAUDE_BIN || "claude",
  codex: () => process.env.CODEX_BIN || "codex",
  antigravity: () => process.env.ANTIGRAVITY_BIN || "agy",
};

/**
 * Đường dẫn chạy được của một CLI agent, hoặc null khi máy này không có. Trên Windows, một CLI cài qua npm
 * chỉ có `codex.cmd`: gọi tên trần thì libuv chỉ thử .com/.exe và hỏng với ENOENT, trong khi `where codex` vẫn
 * thấy — bộ chọn từng đưa ra một agent không chạy nổi. Ưu tiên .exe; chỉ có .cmd thì trả đường dẫn .cmd để
 * `jobs.run` chạy qua cmd.exe (đối số đã được đặt nháy đúng ở đó).
 */
export async function resolveAgentBin(provider: AgentProvider): Promise<string | null> {
  const bin = BIN_NAME[provider]();
  if (path.isAbsolute(bin)) return fs.existsSync(bin) ? bin : null;
  // Đọc thẳng PATH thay vì hỏi `where`: `where` in theo code page của console, và một thư mục có dấu
  // ("C:\Users\Tài\…") đọc thành UTF-8 là hỏng — agent có trên máy mà không chạy được.
  const dirs = (process.env.PATH ?? process.env.Path ?? "").split(path.delimiter).filter(Boolean);
  const exts = process.platform === "win32" ? [".exe", ".cmd", ".bat"] : [""];
  for (const ext of exts) {
    for (const dir of dirs) {
      const file = path.join(dir, `${bin}${ext}`);
      try {
        if (!fs.statSync(file).isFile()) continue;
        // macOS/Linux: một file cùng tên mà không có quyền chạy thì không phải cái ta cần — bỏ qua để còn
        // tìm tiếp trong các thư mục sau, thay vì trả về nó rồi hỏng lúc chạy với EACCES.
        if (process.platform !== "win32") fs.accessSync(file, fs.constants.X_OK);
        return file;
      } catch {}
    }
  }
  return null;
}

function invocation(provider: AgentProvider, bin: string, call: StepCall, prompt: string) {
  if (provider === "codex") return { bin, args: codexStepArgs(call), input: prompt };
  if (provider === "antigravity") return { bin, args: antigravityStepArgs(call), input: antigravityStdin(prompt) };
  return { bin, args: claudeStepArgs(call), input: prompt };
}

export async function runAgentStep(host: StepHost, provider: AgentProvider, spec: AgentStepSpec, prompt: string): Promise<StepOutcome> {
  const { key, log } = host;
  const label = agentProviderLabel(provider);
  const { what } = spec;
  const parse = createStreamParser(provider);
  // Bấm Dừng giữa hai lượt agent (lúc đang soát) thì không khởi động lượt kế tiếp.
  if (wasStopped(key)) return { result: "stopped", text: "" };
  const resolved = await resolveAgentBin(provider);
  if (!resolved) {
    log("error", `Không tìm thấy ${label} trên máy này (${BIN_NAME[provider]()}). Cài CLI hoặc đặt biến môi trường trỏ tới nó.`);
    return { result: "failed", text: `không tìm thấy ${BIN_NAME[provider]()}` };
  }
  if (wasStopped(key)) return { result: "stopped", text: "" };
  const { bin, args, input } = invocation(provider, resolved, spec.call, prompt);

  host.onStart({ agent: provider, model: spec.call.model, startedAt: new Date().toISOString() });
  log("system", `Bắt đầu ${what} · ${label}${spec.call.model ? ` · ${spec.call.model}` : ""} · effort ${spec.call.effort}`);
  setProgress(key, null, `${label} · ${what}`);

  const started = Date.now();
  let last = started;
  let killed: "stalled" | "cap" | null = null;
  let ok = false;
  let text = "";
  let usage: AgentUsage | undefined;
  let costUsd: number | undefined;
  let tools = 0;
  const idleMs = spec.idleMs * IDLE_FACTOR[provider];
  const timer = setInterval(() => {
    const now = Date.now();
    const reason = now - last > idleMs ? "stalled" : now - started > spec.capMs ? "cap" : null;
    if (!reason || killed) return;
    killed = reason;
    log("error", reason === "stalled"
      ? `${label} không có hoạt động nào trong ${Math.round(idleMs / 60000)} phút — dừng lượt ${what}.`
      : `${label} chạy quá ${Math.round(spec.capMs / 60000)} phút cho ${what} (trần theo khối lượng) — dừng.`);
    killChild(key);
  }, TICK_MS);

  const code = await run(key, bin, args, {
    env: sanitizedAgentEnv(),
    input,
    onLine(line, stream) {
      last = Date.now();
      if (stream === "stderr") return log(provider === "claude" ? "error" : "system", short(line, 400));
      for (const e of parse(line)) {
        if (e.type === "say") log("agent", e.text);
        else if (e.type === "tool") {
          tools++;
          log("tool", e.detail);
          setProgress(key, null, `${label} · ${what} · ${tools} thao tác`);
        } else if (e.type === "toolError" || e.type === "error") log("error", e.text);
        else if (e.type === "result") {
          ok = e.ok;
          text = e.text;
          usage = e.usage;
          costUsd = e.costUsd;
        }
      }
    },
  }).finally(() => clearInterval(timer));

  // Bộ canh kẹt chỉ giết tiến trình (killChild), không đánh dấu job là đã dừng — một lượt agent đứng im
  // không phải là người dùng bấm Dừng. Người dùng bấm Dừng thật thì dấu đó còn nguyên và được ưu tiên.
  const result: StepResult = wasStopped(key) ? "stopped" : killed ?? (ok && code === 0 ? "ok" : "failed");

  host.onEnd({ endedAt: new Date().toISOString(), result, ...(usage ? { usage } : {}), ...(typeof costUsd === "number" ? { costUsd } : {}) });
  const tokens = usage ? ` · ${Math.round((usage.input + usage.cacheWrite + usage.output) / 100) / 10}k token (+${Math.round(usage.cacheRead / 1000)}k đọc từ cache)` : "";
  log(result === "ok" ? "result" : "error", `${label} xong ${what}: ${result}${tokens}${text ? `\n${text}` : ""}`);
  return { result, text };
}
