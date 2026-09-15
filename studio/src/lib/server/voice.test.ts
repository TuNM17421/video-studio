import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { VoiceSettings } from "../types";
import { parseKaggleStatus, resolveKaggleAudioDir, validateVoice } from "./voice";

const kaggleSettings = (overrides: Partial<VoiceSettings> = {}): VoiceSettings => ({
  source: "kaggle",
  voiceId: "",
  model: "",
  language: "",
  pause: 1.4,
  importDir: "",
  kaggleRefAudio: "/tmp/ref.wav",
  kaggleRefText: "Xin chào các bạn.",
  kaggleSpeed: 1.0,
  ...overrides,
});

describe("validateVoice — kaggle source", () => {
  it("accepts a valid kaggle setup without demanding an ElevenLabs voice id", () => {
    expect(() => validateVoice(kaggleSettings())).not.toThrow();
  });

  it("rejects an empty reference text — nothing to match the clone against", () => {
    expect(() => validateVoice(kaggleSettings({ kaggleRefText: "  " }))).toThrow();
  });

  it("rejects a non-positive or absurdly high speed", () => {
    expect(() => validateVoice(kaggleSettings({ kaggleSpeed: 0 }))).toThrow();
    expect(() => validateVoice(kaggleSettings({ kaggleSpeed: 10 }))).toThrow();
  });

  it("still enforces the shared pause bound", () => {
    expect(() => validateVoice(kaggleSettings({ pause: 9 }))).toThrow();
  });
});

describe("parseKaggleStatus", () => {
  it("reads the status kaggle's CLI names in its free-text line", () => {
    expect(parseKaggleStatus('kernel "thai/n5-01-voice" has status "complete"')).toBe("complete");
    expect(parseKaggleStatus('kernel "thai/n5-01-voice" has status "running"')).toBe("running");
    expect(parseKaggleStatus("KernelWorkerStatus.ERROR")).toBe("error");
  });

  it("returns null when the line names none of the known terms", () => {
    expect(parseKaggleStatus("some unrelated log line")).toBeNull();
  });
});

describe("resolveKaggleAudioDir", () => {
  function tmp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "kaggle-dl-"));
  }

  it("prefers the run.py-written out/ subfolder when it has WAVs", () => {
    const dir = tmp();
    fs.mkdirSync(path.join(dir, "out"));
    fs.writeFileSync(path.join(dir, "out", "01.wav"), "");
    expect(resolveKaggleAudioDir(dir)).toBe(path.join(dir, "out"));
  });

  it("falls back to a flat download when there is no out/ subfolder", () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, "01.wav"), "");
    expect(resolveKaggleAudioDir(dir)).toBe(dir);
  });
});
