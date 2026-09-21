import { describe, expect, it } from "vitest";
import { readAgentConfig, resolveAgentProvider, reviewDefaults } from "./agent-config";

describe("Studio agent configuration", () => {
  it("keeps Claude as the backward-compatible default", () => {
    expect(readAgentConfig({})).toEqual({ defaultProvider: "claude", selectionLocked: false });
  });

  it("reads a locked Codex default from non-secret environment switches", () => {
    expect(readAgentConfig({ STUDIO_AGENT_PROVIDER: "codex", STUDIO_AGENT_PROVIDER_LOCKED: "1" }))
      .toEqual({ defaultProvider: "codex", selectionLocked: true });
  });

  it("accepts every provider the picker offers", () => {
    expect(readAgentConfig({ STUDIO_AGENT_PROVIDER: "antigravity" }))
      .toEqual({ defaultProvider: "antigravity", selectionLocked: false });
  });

  it("rejects invalid values instead of silently running a different agent", () => {
    // the message lists the providers that do exist, so a typo tells you what to write instead
    expect(() => readAgentConfig({ STUDIO_AGENT_PROVIDER: "other" })).toThrow(/claude, codex, antigravity/);
    expect(() => readAgentConfig({ STUDIO_AGENT_PROVIDER_LOCKED: "sometimes" })).toThrow(/true\/false/);
  });

  it("enforces the lock on the server-side selection", () => {
    const locked = { defaultProvider: "claude" as const, selectionLocked: true };
    expect(resolveAgentProvider(undefined, locked)).toBe("claude");
    expect(() => resolveAgentProvider("codex", locked)).toThrow(/khóa agent/);
  });
});

describe("cross-review defaults", () => {
  it("is on with an automatic reviewer unless configured", () => {
    expect(reviewDefaults({})).toEqual({ enabled: true, provider: "auto" });
  });

  it("follows STUDIO_REVIEW and STUDIO_QA_PROVIDER", () => {
    expect(reviewDefaults({ STUDIO_REVIEW: "0", STUDIO_QA_PROVIDER: "codex" })).toEqual({ enabled: false, provider: "codex" });
    expect(() => reviewDefaults({ STUDIO_QA_PROVIDER: "gemini" })).toThrow();
  });
});
