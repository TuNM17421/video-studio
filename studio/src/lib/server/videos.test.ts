import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isLedgerOnlyProject, normalizeVideoState, requestMarkdown, styleUnsupportedModules } from "./videos";

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
