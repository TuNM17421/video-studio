import { describe, expect, it } from "vitest";
import { blankClaim, type Claim } from "../../research";
import { claudeResearchArgs, codexResearchArgs } from "../agent-cli";
import { batches, cleanClaims, withProvenance } from "./runner";

const claim = (id: string, patch: Partial<Claim> = {}): Claim => ({ ...blankClaim(id), text: `claim ${id}`, question: `hỏi ${id}`, ...patch });

describe("chia lô claim cho từng lượt agent", () => {
  it("claim khó đi lô nhỏ, claim dễ đi lô lớn, ưu tiên cao lên trước", () => {
    const list = [
      ...["c1", "c2", "c3"].map((id) => claim(id, { difficulty: "hard" })),
      ...["c4", "c5", "c6", "c7", "c8", "c9", "c10"].map((id) => claim(id, { difficulty: "easy" })),
      claim("c11", { difficulty: "easy", priority: "high" }),
    ];
    const out = batches(list).map((b) => b.map((c) => c.id));
    expect(out).toEqual([["c1", "c2"], ["c3"], ["c11", "c4", "c5", "c6", "c7", "c8"], ["c9", "c10"]]);
  });
});

describe("danh sách claim người duyệt gửi về", () => {
  it("giữ mã cũ, cấp mã mới cho claim thêm tay, bỏ dòng trống, lọc số slide không có thật", () => {
    const out = cleanClaims([
      claim("c2", { slides: [1, 9, 1] }),
      { ...claim("new-1"), id: "new-1" },
      claim("c2"),
      { text: "   " },
      { text: "Chỉ có nội dung", kind: "lạ", difficulty: "siêu khó" },
    ], 4);
    expect(out.map((c) => c.id)).toEqual(["c2", "c3", "c4", "c5"]);
    expect(out[0].slides).toEqual([1]);
    expect(out[3]).toMatchObject({ question: "Chỉ có nội dung", kind: "technical", difficulty: "normal", priority: "normal", key: "chỉ có nội dung" });
  });

  it("tối đa 25 claim", () => {
    expect(cleanClaims(Array.from({ length: 40 }, (_, i) => claim(`c${i + 1}`)), null)).toHaveLength(25);
  });
});

describe("cờ CLI của một chặng research", () => {
  const call = { tools: ["Read", "Write"], allowed: ["Read", "Write"], web: false, shell: false, model: "sonnet", effort: "low" as const };

  it("Claude: không phiên, không MCP, chỉ công cụ của chặng, chặn web và shell khi chặng không cần", () => {
    const args = claudeResearchArgs(call);
    for (const flag of ["--no-session-persistence", "--strict-mcp-config", "--include-partial-messages"]) expect(args).toContain(flag);
    expect(args.slice(args.indexOf("--tools"), args.indexOf("--tools") + 2)).toEqual(["--tools", "Read,Write"]);
    expect(args.slice(args.indexOf("--model"), args.indexOf("--model") + 2)).toEqual(["--model", "sonnet"]);
    const denied = args.slice(args.indexOf("--disallowedTools") + 1);
    expect(denied).toEqual(expect.arrayContaining(["WebSearch", "WebFetch", "Bash", "PowerShell"]));
    const web = claudeResearchArgs({ ...call, web: true, shell: true, model: null });
    expect(web).not.toContain("--model");
    expect(web.slice(web.indexOf("--disallowedTools") + 1)).not.toContain("WebSearch");
  });

  it("Codex: tắt tìm web và mạng trong sandbox trừ khi chặng cần", () => {
    expect(codexResearchArgs(call)).toContain('web_search="disabled"');
    expect(codexResearchArgs(call).join(" ")).not.toContain("network_access");
    const web = codexResearchArgs({ ...call, web: true, shell: true });
    expect(web).toContain('web_search="live"');
    expect(web).toContain("sandbox_workspace_write.network_access=true");
  });
});

describe("claim người duyệt sửa ở cổng 1", () => {
  it("được khoá thư viện dữ kiện mới khi câu hoặc câu hỏi đổi; giữ nguyên khi không đổi", async () => {
    const { rekeyEdited } = await import("./runner");
    const extracted = [claim("c1", { key: "gpt-4 context window" }), claim("c2", { key: "chatgpt users" })];
    const out = rekeyEdited([
      { ...extracted[0], question: "Cửa sổ ngữ cảnh của GPT-4o?" },
      extracted[1],
      claim("c3", { key: "", question: "Câu hỏi mới" }),
    ], extracted);
    expect(out[0].key).toBe("cửa sổ ngữ cảnh của gpt-4o?");
    expect(out[1].key).toBe("chatgpt users");
    expect(out[2].key).toBe("câu hỏi mới");
  });

  it("độ khó lạ vẫn được chia lô (coi như vừa) — không để vòng research quay mãi", () => {
    const out = batches([claim("c1", { difficulty: "medium" as never })]);
    expect(out.map((b) => b.map((c) => c.id))).toEqual([["c1"]]);
  });
});

describe("quyền ghi của từng chặng", () => {
  it("không chặng nào ghi được vào sources/ — chữ trang gốc là thứ phần soát đối chiếu", async () => {
    const { WRITABLE } = await import("./runner");
    const all = Object.values(WRITABLE).flatMap((f) => f("bai-1"));
    expect(all.every((g) => g.startsWith("research/bai-1/"))).toBe(true);
    expect(all.some((g) => g.includes("sources") || g.includes("state.json") || g.includes("evidence"))).toBe(false);
    expect(WRITABLE.research("bai-1")).toEqual(["research/bai-1/claims/**"]);
    expect(WRITABLE.edit("bai-1")).toEqual(["research/bai-1/checks/edit.json"]);
  });
});

describe("dòng nguồn kịch bản khi bàn giao sang pipeline video", () => {
  const line = "- **Nguồn kịch bản:** đóng gói từ `research/bai-2`, duyệt ngày 2026-09-20, 4/4 claim qua soát bằng chứng.";
  const script = ["# Bài 2 · LLM", "", "- **Mục tiêu:** hiểu mô hình đoán chữ.", "- **Thời lượng dự kiến:** khoảng hai phút.", "", "## 1 · Mở đầu", "", "### Câu 1", "- **Lời:** Xin chào."].join("\n");

  it("đặt dòng nguồn vào cuối phần đầu, không chen vào giữa các phần", () => {
    const out = withProvenance(script, line).split("\n");
    expect(out[4]).toBe(line);
    expect(out[out.indexOf("## 1 · Mở đầu") - 1]).toBe("");
    // Không đụng tới tiêu đề và thân kịch bản.
    expect(out[0]).toBe("# Bài 2 · LLM");
    expect(out.filter((l) => l.startsWith("### Câu"))).toHaveLength(1);
  });

  it("không thêm lần thứ hai khi kịch bản đã có dòng đó", () => {
    const once = withProvenance(script, line);
    expect(withProvenance(once, line)).toBe(once);
  });

  it("kịch bản không có phần `##` nào thì thêm vào cuối, không mất nội dung", () => {
    const out = withProvenance("# Chỉ có tiêu đề\n\n- **Mục tiêu:** x.", line);
    expect(out.endsWith(line)).toBe(true);
    expect(out).toContain("- **Mục tiêu:** x.");
  });
});
