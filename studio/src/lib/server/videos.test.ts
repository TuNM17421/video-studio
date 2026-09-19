import { describe, expect, it } from "vitest";
import { normalizeVideoState, requestMarkdown } from "./videos";

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
