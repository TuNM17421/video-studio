import { describe, expect, it } from "vitest";
import { cleanItems, parseExtraction, parseFinding, SCRIPT_NODE, todoStates } from "./scout";

describe("làm sạch danh sách mục", () => {
  it("đánh lại mã liền nhau và bỏ mục không có tên", () => {
    const items = cleanItems([
      { id: "m7", title: "Số người dùng", claim: "100 triệu", kind: "so-lieu", slides: [3, "4", -1], queries: ["a", "b", "c", "d", "e"] },
      { id: "m7", title: "", claim: "" },
      { claim: "Một khẳng định không có tên nhưng có nội dung đủ dài", kind: "la" },
    ]);
    expect(items.map((it) => it.id)).toEqual(["m1", "m2"]);
    expect(items[0]).toMatchObject({ slides: [3, 4], kind: "so-lieu", selected: true });
    expect(items[0].queries).toHaveLength(4);
    // Không có tên thì lấy từ nội dung; loại lạ thì về "khang-dinh".
    expect(items[1]).toMatchObject({ kind: "khang-dinh" });
    expect(items[1].title.length).toBeGreaterThan(0);
  });

  it("giữ lựa chọn bỏ tick của người dùng", () => {
    expect(cleanItems([{ title: "A", selected: false }])[0].selected).toBe(false);
  });

  it("muc-research.json hỏng thì là null, không phải danh sách rỗng giả", () => {
    expect(parseExtraction(null, 3)).toBeNull();
    expect(parseExtraction({ items: [], outline: [] }, 3)).toBeNull();
    const ok = parseExtraction({ title: "Bài 1", slides: 9, outline: [{ slide: 1, heading: "Mở đầu", points: ["x"] }, { slide: 0 }], items: [] }, null);
    expect(ok).toMatchObject({ title: "Bài 1", slides: 9, items: [] });
    expect(ok!.outline).toHaveLength(1);
  });

  it("kết luận không có verdict hợp lệ thì bỏ", () => {
    expect(parseFinding({ verdict: "chac-chan" }, "m1")).toBeNull();
    expect(parseFinding({ verdict: "dieu-chinh", finding: "Đã hơn 200 triệu", sources: ["s1"] }, "m1")).toMatchObject({ id: "m1", verdict: "dieu-chinh" });
  });
});

describe("tiến độ theo TodoWrite", () => {
  const ids = ["m1", "m2"];

  it("đọc mã mục ở đầu mỗi việc và việc viết kịch bản", () => {
    const { states, active } = todoStates([
      { content: "m1 · Số người dùng", status: "completed" },
      { content: "[m2] Định nghĩa", status: "in_progress" },
      { content: "Viết kịch bản", status: "pending" },
    ], ids);
    expect(states).toEqual({ m1: "done", m2: "active", [SCRIPT_NODE]: "pending" });
    expect(active).toBe("m2");
  });

  it("bỏ qua việc phụ agent tự thêm và mã không có trong danh sách", () => {
    const { states, active } = todoStates([
      { content: "Đọc mẫu kịch bản", status: "in_progress" },
      { content: "m9 · không có", status: "in_progress" },
    ], ids);
    expect(states).toEqual({});
    expect(active).toBeNull();
  });

  it("đầu vào không phải danh sách thì không có gì", () => {
    expect(todoStates(undefined, ids)).toEqual({ states: {}, active: null });
  });
});
