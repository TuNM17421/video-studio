import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanModules, listModules } from "./modules";
import { REPO } from "./paths";
import { normalizeVideoState, requestMarkdown } from "./videos";

describe("capability catalog read from templates/modules", () => {
  it("lists dialogue and quiz from their files, not README", () => {
    const ids = listModules().map((m) => m.id);
    expect(ids).toEqual(["dialogue", "quiz"]);
    const dialogue = listModules()[0];
    expect(dialogue.name).toBe("Video có hội thoại");
    expect(dialogue.template).toBe("templates/modules/dialogue.md");
    expect(dialogue.previewKey).toBe("modules/hoi-thoai-mau-v2.mp4");
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
