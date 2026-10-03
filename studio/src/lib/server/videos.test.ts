import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { VideoRequest } from "../types";
import { isLedgerOnlyProject, normalizeVideoState, requestMarkdown, styleUnsupportedModules, videoRequestFromBody } from "./videos";

const storedState = {
  id: "d2-01-lab",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  request: {
    style: "lesson-lab", day: "Day02", title: "", scriptName: "script.md", feedbackDir: "", oldVideoDir: "", notes: "",
    scope: { scenes: true, voice: true, render: true, transcript: true, chapters: true },
  },
  stages: { cues: "done", voice: "done", scenes: "review", render: "idle", deliver: "idle" },
  voice: { voiceId: "", model: "eleven_turbo_v2_5", language: "vi", pause: 1.4 },
  lastError: null,
};

describe("video agent binding migration", () => {
  it("binds an old Studio video and its existing session to Claude", () => {
    const state = normalizeVideoState({ ...storedState, sessionId: "claude-session" });
    expect(state.agent).toEqual({ provider: "claude", sessionId: "claude-session" });
    expect("sessionId" in state).toBe(false);
  });

  it("preserves an explicit Codex binding", () => {
    const state = normalizeVideoState({ ...storedState, agent: { provider: "codex", sessionId: "codex-thread" } });
    expect(state.agent).toEqual({ provider: "codex", sessionId: "codex-thread" });
  });

  it("migrates an existing quiz music choice into the quiz capability", () => {
    const state = normalizeVideoState({ ...storedState, music: { background: "none", quiz: "quiz-timer" } });
    expect(state.request.modules).toContain("quiz");
    expect(state.music.quiz).toBe("quiz-timer");
  });

  it("keeps captions on for states saved before captions were optional", () => {
    expect(normalizeVideoState(storedState).captions).toBe(true);
    expect(normalizeVideoState({ ...storedState, captions: false }).captions).toBe(false);
  });
});

describe("VideoRequest của video mới", () => {
  // Lỗi thật: route dựng lại `request` theo từng trường và bỏ sót `format`, nên chọn "Dọc 9:16" ở bước Kế
  // hoạch không có tác dụng gì — state.json không lưu khổ, REQUEST.md dặn agent dựng ngang. requestMarkdown
  // vốn đã xử lý đúng, nên chỉ test nó thì không bắt được gì; phải test chính chỗ dựng lại.
  const body = {
    style: "lesson", format: "9x16", modules: ["quiz"], day: "Day03", itemId: "  10.1  ", title: "Tên",
    scriptName: "bị bỏ qua.md", feedbackDir: "/tmp/fb", oldVideoDir: "/tmp/old", notes: "ghi chú",
    scope: { scenes: true, voice: true, render: true, transcript: false, chapters: true },
  } as VideoRequest;
  const opts = { modules: ["quiz"], scriptName: "that.md" };

  it("giữ khổ hình người dùng chọn", () => {
    expect(videoRequestFromBody(body, opts).format).toBe("9x16");
    expect(videoRequestFromBody({ ...body, format: "16x9" }, opts).format).toBe("16x9");
    expect(videoRequestFromBody({ ...body, format: undefined }, opts).format).toBe("16x9");
  });

  it("khổ lạ bị từ chối, không im lặng về 16:9", () => {
    for (const bad of ["16:9", "9X16", "4x3", "", 0, null]) {
      expect(() => videoRequestFromBody({ ...body, format: bad as never }, opts)).toThrow(/khổ hình/i);
    }
  });

  // Chốt ngược lại cái lỗi gốc: liệt kê từng trường là dễ quên một trường, nên test đòi ĐỦ khoá của
  // VideoRequest. Thêm trường mới vào type mà quên ở đây thì test này đỏ.
  it("không đánh rơi trường nào của VideoRequest", () => {
    const out = videoRequestFromBody(body, opts);
    expect(Object.keys(out).sort()).toEqual(Object.keys(body).sort());
    expect(out).toEqual({
      style: "lesson", format: "9x16", modules: ["quiz"], day: "Day03", itemId: "10.1", title: "Tên",
      scriptName: "that.md", feedbackDir: "/tmp/fb", oldVideoDir: "/tmp/old", notes: "ghi chú",
      scope: { scenes: true, voice: true, render: true, transcript: false, chapters: true },
    });
  });

  it("khổ dọc thành luật dựng cảnh trong REQUEST.md, khổ ngang thì không", () => {
    const doc = requestMarkdown("zz-doc", videoRequestFromBody(body, opts), "Claude");
    expect(doc).toContain("Dọc 9:16");
    expect(doc).toContain("9x16");
    const ngang = requestMarkdown("zz-ngang", videoRequestFromBody({ ...body, format: "16x9" }, opts), "Claude");
    expect(ngang).toContain("Ngang 16:9");
    expect(ngang).not.toContain("theo cột");
  });
});

describe("quiz request contract", () => {
  it("tells the agent to mark quiz cues and leaves the track to the render step", () => {
    const state = normalizeVideoState(storedState);
    const markdown = requestMarkdown("d2-quiz", { ...state.request, modules: ["quiz"] }, "Codex");
    expect(markdown).toContain("## Quiz");
    expect(markdown).toContain("`quiz: true`");
    expect(markdown).toContain("chọn ở bước Render");
  });
});

describe("mascot request contract", () => {
  it("points the agent at Griffin only when the capability is on", () => {
    const state = normalizeVideoState(storedState);
    const on = requestMarkdown("d2-griffin", { ...state.request, modules: ["mascot"] }, "Claude");
    expect(on).toContain("## Linh vật Griffin");
    expect(on).toContain("templates/modules/mascot.md");
    expect(on).toContain("`speaker: 'Griffin'`");
  });

  it("forbids Griffin when the capability is off, so the agent does not add it on its own", () => {
    const state = normalizeVideoState(storedState);
    const off = requestMarkdown("d2-plain", { ...state.request, modules: [] }, "Claude");
    expect(off).toContain("**không** có linh vật");
    expect(off).not.toContain("## Linh vật Griffin");
  });
});

describe("style capabilities", () => {
  it("reads the capabilities a style cannot build from styles/<id>.json", () => {
    expect(styleUnsupportedModules("whiteboard")).toEqual(expect.arrayContaining(["dialogue", "quiz", "mascot"]));
    expect(styleUnsupportedModules("lesson-lab")).toEqual([]);
    expect(styleUnsupportedModules("no-such-style")).toEqual([]);
  });
});

describe("style guides", () => {
  it("chains a guide to the one it extends, parent first", async () => {
    const { styleGuides, styleQaCriteria } = await import("./style-guides");
    expect(styleGuides("lesson-lab")).toEqual(["styles/lesson.md", "styles/lesson-lab.md"]);
    // the whiteboard borrows Lesson's palette (JSON extends) but none of its scene rules
    expect(styleGuides("whiteboard")).toEqual(["styles/whiteboard.md"]);
    expect(styleGuides("no-such-style")).toEqual([]);
    expect(styleQaCriteria("lesson-lab").map((c) => c.name)).toEqual(["Style · lesson", "Style · lesson-lab"]);
  });

  it("names the guides in REQUEST.md", () => {
    const state = normalizeVideoState(storedState);
    const md = requestMarkdown("wb", { ...state.request, style: "whiteboard" }, "Claude");
    expect(md).toContain("`styles/whiteboard.md`");
    expect(md).not.toContain("styles/lesson.md");
  });
});

describe("what counts as a video in projects/", () => {
  const roots: string[] = [];
  afterEach(() => { for (const d of roots.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

  function fixture(entries: string[]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "list-videos-"));
    roots.push(root);
    const project = path.join(root, "projects", "x");
    for (const entry of entries) {
      fs.mkdirSync(path.join(project, entry), { recursive: true });
    }
    if (!entries.length) fs.mkdirSync(project, { recursive: true });
    return { project, scenes: path.join(root, "ds", "x"), state: path.join(project, ".studio", "state.json") };
  }

  it("skips a directory the workflow ledger made for a non-video run (research-<rid>)", () => {
    expect(isLedgerOnlyProject(fixture([".studio"]))).toBe(true);
  });

  it("keeps a video made outside Studio: no state.json, but a script or scenes of its own", () => {
    expect(isLedgerOnlyProject(fixture([".studio", "render"]))).toBe(false);
    const scenesOnly = fixture([".studio"]);
    fs.mkdirSync(scenesOnly.scenes, { recursive: true });
    expect(isLedgerOnlyProject(scenesOnly)).toBe(false);
  });

  it("keeps a Studio video whose only directory is .studio, because state.json is in it", () => {
    const managed = fixture([".studio"]);
    fs.writeFileSync(managed.state, "{}");
    expect(isLedgerOnlyProject(managed)).toBe(false);
  });
});

describe("khổ hình trong REQUEST.md", () => {
  const base = { ...storedState.request, modules: [] as string[], itemId: "" };

  it("khổ ngang là mặc định và không bắt agent khai gì thêm", () => {
    const md = requestMarkdown("d2-01-lab", { ...base } as never);
    expect(md).toContain("- Khổ hình: Ngang 16:9");
    expect(md).toContain("không cần khai `format`");
    expect(md).not.toContain("DỌC 9:16");
  });

  it("khổ dọc nói rõ ba thứ agent không thể tự đoán: meta.format, vùng nội dung, số ký tự phụ đề", () => {
    const md = requestMarkdown("d2-01-lab", { ...base, format: "9x16" } as never);
    expect(md).toContain("- Khổ hình: Dọc 9:16");
    expect(md).toContain("## Khổ hình — DỌC 9:16");
    expect(md).toContain("format: '9x16'");
    // Vùng nội dung và bề rộng phụ đề là hai con số agent sẽ đặt sai nếu không được bảo.
    expect(md).toContain("x 48–1032, y 360–1740");
    expect(md).toContain("46 ký tự");
    // Và lý do, để agent không chỉ đổi số mà bày lại thật.
    expect(md).toContain("Bày theo cột, không theo hàng");
  });

  it("video cũ không có trường format thì vẫn ra khổ ngang, không vỡ", () => {
    const md = requestMarkdown("cu", { ...base, format: undefined } as never);
    expect(md).toContain("- Khổ hình: Ngang 16:9");
  });
});
