import { describe, expect, it } from "vitest";
import type { AgentProvider } from "./types";
import { describeReviewer, normalizeReview, resolveReviewer } from "./review";

const ALL: AgentProvider[] = ["claude", "codex", "antigravity"];
const auto = { enabled: true, provider: "auto" as const };

describe("cross-review: who grades", () => {
  it("auto never picks the authoring provider when another one is installed", () => {
    for (const author of ALL) {
      const r = resolveReviewer(author, auto, ALL);
      expect(r.ok && r.provider !== author && r.cross).toBe(true);
    }
    expect(resolveReviewer("claude", auto, ["claude", "codex"])).toEqual({ ok: true, provider: "codex", cross: true });
  });

  it("auto falls back to the author on a machine that only has that one, and says so", () => {
    expect(resolveReviewer("claude", auto, ["claude"])).toEqual({ ok: true, provider: "claude", cross: false });
    expect(describeReviewer("claude", auto, ["claude"])).toMatch(/chưa có CLI nào khác/);
  });

  it("an explicit reviewer must be installed", () => {
    expect(resolveReviewer("claude", { enabled: true, provider: "codex" }, ALL)).toEqual({ ok: true, provider: "codex", cross: true });
    expect(resolveReviewer("claude", { enabled: true, provider: "antigravity" }, ["claude", "codex"]).ok).toBe(false);
  });

  it("nothing installed is an error, not a silent skip", () => {
    expect(resolveReviewer("claude", auto, []).ok).toBe(false);
  });

  it("switched off reads as off, whatever is installed", () => {
    expect(describeReviewer("claude", { enabled: false, provider: "auto" }, ALL)).toMatch(/^Tắt/);
  });
});

describe("cross-review settings in state.json", () => {
  it("videos made before the switch keep review on", () => {
    expect(normalizeReview(undefined)).toEqual({ enabled: true, provider: "auto" });
  });

  it("keeps a valid stored choice and drops an unknown provider", () => {
    expect(normalizeReview({ enabled: false, provider: "codex" })).toEqual({ enabled: false, provider: "codex" });
    expect(normalizeReview({ enabled: true, provider: "gemini" })).toEqual({ enabled: true, provider: "auto" });
  });
});
