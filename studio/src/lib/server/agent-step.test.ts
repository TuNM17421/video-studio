import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runAgentStep, type StepHost } from "./agent-step";

const call = { tools: ["Read"], allowed: ["Read"], web: false, shell: false, model: "sonnet", effort: "low" as const };
const spec = { what: "thử", call, idleMs: 60_000, capMs: 60_000 };

/** Một CLI giả: in đúng các dòng stream-json cho trước rồi thoát với mã cho trước. */
function fakeClaude(lines: object[], exitCode = 0) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-step-"));
  const bin = path.join(dir, "claude");
  const out = lines.map((l) => JSON.stringify(l)).join("\n");
  fs.writeFileSync(bin, `#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on("end",()=>{process.stdout.write(${JSON.stringify(out)}+"\\n");process.exit(${exitCode});});\n`);
  fs.chmodSync(bin, 0o755);
  return bin;
}

function recorder(key: string) {
  const logs: [string, string][] = [];
  const events: string[] = [];
  let end: Parameters<StepHost["onEnd"]>[0] | null = null;
  const host: StepHost = {
    key,
    log: (kind, text) => { logs.push([kind, text]); },
    onStart: ({ agent, model }) => { events.push(`start ${agent} ${model}`); },
    onEnd: (e) => { end = e; events.push(`end ${e.result}`); },
  };
  return { host, logs, events, end: () => end };
}

const saved = process.env.CLAUDE_BIN;
afterEach(() => {
  if (saved === undefined) delete process.env.CLAUDE_BIN;
  else process.env.CLAUDE_BIN = saved;
});

// Shebang scripts do not run as-is on Windows; the Windows shim path is covered in jobs.test.ts.
describe.skipIf(process.platform === "win32")("một lượt agent qua StepHost", () => {
  it("ghi bản ghi lượt chạy, nhật ký và số token qua host — không đụng tới research", async () => {
    process.env.CLAUDE_BIN = fakeClaude([
      { type: "assistant", message: { content: [{ type: "text", text: "Đang chọn chỗ cần ảnh." }, { type: "tool_use", name: "Read", input: { file_path: "cues.js" } }] } },
      { type: "result", subtype: "success", is_error: false, result: "Xong: 2 chỗ.", total_cost_usd: 0.01, usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 5000, cache_creation_input_tokens: 0 } },
    ]);
    const r = recorder("test-agent-step-ok");
    const outcome = await runAgentStep(r.host, "claude", spec, "prompt");
    expect(outcome).toEqual({ result: "ok", text: "Xong: 2 chỗ." });
    expect(r.events).toEqual(["start claude sonnet", "end ok"]);
    expect(r.end()).toMatchObject({ result: "ok", costUsd: 0.01, usage: { input: 1000, output: 200, cacheRead: 5000, cacheWrite: 0 } });
    expect(r.logs.map(([k]) => k)).toEqual(["system", "agent", "tool", "result"]);
  }, 20_000);

  it("CLI thoát lỗi mà không có kết quả → failed, vẫn đóng bản ghi lượt chạy", async () => {
    process.env.CLAUDE_BIN = fakeClaude([{ type: "assistant", message: { content: [{ type: "text", text: "..." }] } }], 1);
    const r = recorder("test-agent-step-fail");
    expect((await runAgentStep(r.host, "claude", spec, "prompt")).result).toBe("failed");
    expect(r.events).toEqual(["start claude sonnet", "end failed"]);
  }, 20_000);

  it("không có CLI trên máy → failed, không tạo bản ghi lượt chạy", async () => {
    process.env.CLAUDE_BIN = path.join(os.tmpdir(), "khong-co-claude-o-day");
    const r = recorder("test-agent-step-missing");
    expect((await runAgentStep(r.host, "claude", spec, "prompt")).result).toBe("failed");
    expect(r.events).toEqual([]);
    expect(r.logs[0][1]).toMatch(/Không tìm thấy/);
  });
});
