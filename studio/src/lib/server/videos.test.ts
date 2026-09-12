import { describe, expect, it } from "vitest";
import { normalizeVideoState } from "./videos";

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
});
