import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanModules, listModules } from "./modules";
import { REPO } from "./paths";
import { normalizeVideoState, requestMarkdown } from "./videos";

describe("capability catalog read from templates/modules", () => {
  it("lists every capability from its file, not README", () => {
    const ids = listModules().map((m) => m.id);
    expect(ids).toEqual(["dialogue", "quiz", "mascot", "images", "sfx"]);
    const dialogue = listModules()[0];
    expect(dialogue.name).toBe("Video có hội thoại");
    expect(dialogue.template).toBe("templates/modules/dialogue.md");
    expect(dialogue.previewKey).toBe("modules/hoi-thoai-mau-v2.mp4");
  });

  it("bật tiếng động thì REQUEST.md mang theo cả danh mục tiếng, vì agent không được bịa id", () => {
    const state = normalizeVideoState({
      id: "x", createdAt: "", updatedAt: "", stages: {}, lastError: null,
      request: { style: "lesson-lab", day: "Day04", title: "", scriptName: "", feedbackDir: "", oldVideoDir: "", notes: "", modules: [],
        scope: { scenes: true, voice: true, render: true, transcript: true, chapters: true } },
    });
    const md = requestMarkdown("x", { ...state.request, modules: ["sfx"] }, "Claude");
    expect(md).toContain("## Tiếng động");
    // tên lớp + trần của lớp, để agent biết luật trước khi chọn chỗ
    expect(md).toContain("trần cứng 4 lần cả video");
    expect(md).toContain("ngân sách 12 sự kiện mỗi phút");
    // id có thật kèm câu "khi nào dùng" của chính catalog
    expect(md).toContain("`ding`");
    expect(md).toContain("`wind`");
    // video không bật thì không một dòng nào của danh mục lọt vào
    // tắt thì REQUEST.md vẫn có mục, nhưng là một câu cấm — agent không tự thêm tiếng
    const off = requestMarkdown("x", { ...state.request, modules: [] }, "Claude");
    expect(off).toContain("Video này **không** có tiếng động");
    expect(off).not.toContain("`ding`");
  });

  it("drops ids that have no file", () => {
    expect(cleanModules(["quiz", "khong-co", "quiz", 3])).toEqual(["quiz"]);
  });

  it("a new file is a new capability, and REQUEST.md points the agent at it — no code change", () => {
    const file = path.join(REPO, "templates", "modules", "zz-vitest-module.md");
    fs.writeFileSync(file, "---\nname: Năng lực thử\nsummary: Chỉ tồn tại trong test.\norder: 999\n---\n\n# Thử\n");
    try {
      const added = listModules().find((m) => m.id === "zz-vitest-module");
      expect(added?.name).toBe("Năng lực thử");
      expect(added?.icon).toBe("");
      expect(cleanModules(["zz-vitest-module"])).toEqual(["zz-vitest-module"]);

      const state = normalizeVideoState({
        id: "x", createdAt: "", updatedAt: "", stages: {}, lastError: null,
        request: { style: "lesson-lab", day: "Day04", title: "", scriptName: "", feedbackDir: "", oldVideoDir: "", notes: "", modules: [],
          scope: { scenes: true, voice: true, render: true, transcript: true, chapters: true } },
      });
      const md = requestMarkdown("x", { ...state.request, modules: ["zz-vitest-module"] }, "Claude");
      expect(md).toContain("`templates/kich-ban-co-ban.md`");
      expect(md).toContain("Năng lực thử");
      expect(md).toContain("`templates/modules/zz-vitest-module.md`");
    } finally {
      fs.rmSync(file, { force: true });
    }
    expect(listModules().some((m) => m.id === "zz-vitest-module")).toBe(false);
  });
});
