import { afterEach, describe, expect, it, vi } from "vitest";
import { currentJob, registry, setProgress, startJob } from "./jobs";

const ID = "test-eta";

afterEach(() => {
  registry.jobs.delete(ID);
  vi.useRealTimers();
});

/** Only the countdown is exercised here — starting a real job never touches the filesystem. */
describe("job countdown", () => {
  it("has no estimate before the job reports a percent", () => {
    startJob(ID, "render");
    setProgress(ID, null, "Build design system");
    expect(currentJob(ID)?.progress?.etaMs).toBeNull();
  });

  it("measures from the first percent, not from the job's start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    startJob(ID, "render");
    // 60 s of design-system build move no percent; counting it as capture would double the estimate
    vi.setSystemTime(60_000);
    setProgress(ID, 0, "Render 0/100 frame");
    vi.setSystemTime(70_000);
    setProgress(ID, 25, "Render 25/100 frame");
    // 25 % took 10 s, so the remaining 75 % is 30 s — the build must not be in that arithmetic
    expect(currentJob(ID)?.progress?.etaMs).toBe(30_000);
  });

  it("reaches zero at the end", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    startJob(ID, "render");
    setProgress(ID, 0, "bắt đầu");
    vi.setSystemTime(40_000);
    setProgress(ID, 100, "xong");
    expect(currentJob(ID)?.progress?.etaMs).toBe(0);
  });

  it("gives no estimate while the percent has not moved", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    startJob(ID, "render");
    setProgress(ID, 12, "Render 12/100 frame");
    vi.setSystemTime(5_000);
    setProgress(ID, 12, "Render 12/100 frame");
    expect(currentJob(ID)?.progress?.etaMs).toBeNull();
  });
});

describe("arguments through a Windows .cmd shim", () => {
  it.runIf(process.platform === "win32")("reach the program exactly as passed, spaces, parentheses and quotes included", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vs shim "));
    const shim = path.join(dir, "argv.cmd");
    const out = path.join(dir, "argv.json");
    // The shim forwards %* to node, exactly as npm's generated shims do.
    fs.writeFileSync(shim, `@echo off\r\nnode -e "require('fs').writeFileSync(process.argv[1], JSON.stringify(process.argv.slice(2)))" "${out}" %*\r\n`);
    const args = ["--allowedTools", "Read", "Bash(node tools/page.mjs *)", "Write(research/x/**)", "-c", 'approval_policy="never"', "a&b", "", "C:\\dir\\"];
    const { run } = await import("./jobs");
    const code = await run("test-shim", shim, args);
    expect(code).toBe(0);
    expect(JSON.parse(fs.readFileSync(out, "utf8"))).toEqual(args);
  });
});
