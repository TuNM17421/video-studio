import { describe, expect, it } from "vitest";
import { stageLogs } from "./stage-logs";
import type { LogEntry } from "./types";

const sys = (text: string): LogEntry => ({ t: 0, kind: "system", text });
const say = (text: string): LogEntry => ({ t: 0, kind: "result", text });

const LOG: LogEntry[] = [
  sys("Bắt đầu agent · scenes · Claude Code"),
  say("scenes\nĐã dựng 8 cảnh"),
  sys("Build design system"), // the scenes gate, not a render
  sys(`Review lại dựng cảnh (không gọi agent)`),
  say("review done"),
  sys("Bắt đầu render · phụ đề có"),
  sys("Build design system"),
  sys("Bắt đầu agent · deliver · Claude Code"),
  say("deliver\nĐã viết file chương"),
];

describe("stageLogs", () => {
  it("stops at the next stage's run instead of running to the end of the log", () => {
    const scenes = stageLogs(LOG, ["scenes"]);
    expect(scenes[0].text).toBe("Review lại dựng cảnh (không gọi agent)");
    expect(scenes.some((e) => e.text.startsWith("deliver"))).toBe(false);
  });

  it("keeps the gate's Build line inside the scenes run", () => {
    const first = stageLogs(LOG.slice(0, 3), ["scenes"]);
    expect(first.map((e) => e.text)).toContain("Build design system");
  });

  it("joins render and the deliver run that follows it", () => {
    const render = stageLogs(LOG, ["render", "deliver"]);
    expect(render[0].text).toBe("Bắt đầu render · phụ đề có");
    expect(render.at(-1)?.text).toBe("deliver\nĐã viết file chương");
  });

  it("is empty when the stage never ran", () => {
    expect(stageLogs(LOG, ["voice"])).toEqual([]);
  });
});
