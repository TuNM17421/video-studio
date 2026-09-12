import { describe, expect, it } from "vitest";
import type { StageId, StageStatus, VideoSummary } from "./types";
import { completedStages, matchesVideo, nextStageLabel, overallStageStatus } from "./video-status";

const stages = (patch: Partial<Record<StageId, StageStatus>> = {}): Record<StageId, StageStatus> => ({
  cues: "idle",
  voice: "idle",
  scenes: "idle",
  render: "idle",
  deliver: "idle",
  ...patch,
});

const video = (stageValues: Record<StageId, StageStatus>): VideoSummary => ({
  id: "d2-01-lab",
  day: "Day02",
  style: "lesson-lab",
  title: "Giải pháp hay vấn đề?",
  cueCount: 12,
  managed: true,
  stages: stageValues,
  artifacts: { script: true, cues: true, voice: false, voiceWav: null, voiceScript: false, scenes: false, mp4: null, transcript: null, chapters: null, prompts: null },
  running: false,
  updatedAt: null,
});

describe("video production status", () => {
  it("counts completed gates and identifies the next gate", () => {
    const value = stages({ cues: "done", voice: "done", scenes: "review" });
    expect(completedStages(value)).toBe(2);
    expect(nextStageLabel(value)).toBe("Dựng cảnh");
    expect(overallStageStatus(value)).toBe("review");
  });

  it("gives errors precedence over other active statuses", () => {
    expect(overallStageStatus(stages({ cues: "done", voice: "running", render: "error" }))).toBe("error");
  });

  it("matches Vietnamese-facing search fields and status filters", () => {
    const done = video(stages({ cues: "done", voice: "done", scenes: "done", render: "done", deliver: "done" }));
    expect(matchesVideo(done, "giải pháp", "all")).toBe(true);
    expect(matchesVideo(done, "day02", "done")).toBe(true);
    expect(matchesVideo(done, "day03", "all")).toBe(false);
    expect(matchesVideo(video(stages({ cues: "error" })), "", "attention")).toBe(true);
  });
});
