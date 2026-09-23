import { describe, expect, it } from "vitest";
import { createStreamParser } from "./agent-stream";

const line = (value: unknown) => JSON.stringify(value);

describe("đọc luồng của Claude", () => {
  it("phiên, lời nói, công cụ, lỗi công cụ và kết quả kèm token", () => {
    const parse = createStreamParser("claude");
    expect(parse(line({ type: "system", subtype: "init", session_id: "s1" }))).toEqual([{ type: "session", id: "s1" }]);
    expect(parse(line({ type: "assistant", message: { content: [{ type: "text", text: " Đang tìm " }, { type: "tool_use", name: "WebSearch", input: { query: "gpt-4 context" } }] } }))).toEqual([
      { type: "say", text: "Đang tìm" },
      { type: "tool", name: "WebSearch", detail: "Tìm web: gpt-4 context", input: { query: "gpt-4 context" } },
    ]);
    expect(parse(line({ type: "user", message: { content: [{ type: "tool_result", is_error: true, content: "denied" }] } }))).toEqual([{ type: "toolError", text: "denied" }]);
    const [result] = parse(line({ type: "result", subtype: "success", result: "Xong", num_turns: 4, total_cost_usd: 0.1, usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100 } }));
    expect(result).toMatchObject({ type: "result", ok: true, text: "Xong", turns: 4, usage: { input: 10, output: 5, cacheRead: 100, cacheWrite: 0 } });
  });

  it("bỏ qua dòng không phải JSON và sự kiện từng mẩu (partial messages)", () => {
    const parse = createStreamParser("claude");
    expect(parse("không phải json")).toEqual([]);
    expect(parse(line({ type: "stream_event", event: { type: "content_block_delta" } }))).toEqual([]);
  });
});

describe("đọc luồng của Codex", () => {
  it("lấy lời cuối làm nội dung kết quả, lệnh hỏng thành lỗi", () => {
    const parse = createStreamParser("codex");
    expect(parse(line({ type: "thread.started", thread_id: "t1" }))).toEqual([{ type: "session", id: "t1" }]);
    expect(parse(line({ type: "item.started", item: { type: "web_search", query: "x" } }))[0]).toMatchObject({ type: "tool", detail: "Tìm web: x" });
    expect(parse(line({ type: "item.completed", item: { type: "command_execution", command: "node a", exit_code: 2, aggregated_output: "hỏng" } }))).toEqual([{ type: "toolError", text: "hỏng" }]);
    parse(line({ type: "item.completed", item: { type: "agent_message", text: "Đã xong 3 claim" } }));
    expect(parse(line({ type: "turn.completed", usage: { input_tokens: 7, cached_input_tokens: 3, output_tokens: 2 } }))).toEqual([
      { type: "result", ok: true, text: "Đã xong 3 claim", status: "turn.completed", usage: { input: 7, output: 2, cacheRead: 3, cacheWrite: 0 } },
    ]);
    expect(parse(line({ type: "turn.failed", error: { message: "quota" } }))[0]).toMatchObject({ ok: false, text: "quota" });
  });
});

describe("đọc luồng của Antigravity", () => {
  it("gom text_delta theo bước, chỉ đọc công cụ ở bản DONE", () => {
    const parse = createStreamParser("antigravity");
    expect(parse(line({ event: "step_update", step_update: { step_index: 1, step_type: "agent_response", state: "ACTIVE", text_delta: "Xin " } }))).toEqual([]);
    expect(parse(line({ event: "step_update", step_update: { step_index: 1, step_type: "agent_response", state: "DONE", text_delta: "chào\n" } }))).toEqual([{ type: "say", text: "Xin chào" }]);
    expect(parse(line({ event: "step_update", step_update: { step_type: "tool", state: "ACTIVE", tool_info: { name: "run_command" } } }))).toEqual([]);
    expect(parse(line({ event: "step_update", step_update: { step_type: "tool", state: "DONE", tool_info: { name: "run_command", parameters: { CommandLine: "node tools/page.mjs" }, error: { message: "exit 2" } } } }))).toEqual([
      { type: "tool", name: "run_command", detail: "$ node tools/page.mjs", input: { CommandLine: "node tools/page.mjs" } },
      { type: "toolError", text: "exit 2" },
    ]);
    expect(parse(line({ event: "result", result: { conversation_id: "c9", status: "ERROR", error: "hết hạn mức", num_turns: 2 } }))).toEqual([
      { type: "session", id: "c9" },
      { type: "result", ok: false, text: "hết hạn mức", turns: 2, status: "ERROR" },
    ]);
  });
});
