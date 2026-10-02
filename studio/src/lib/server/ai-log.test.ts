import { describe, expect, it, vi } from "vitest";
import { AI_LOG_MAX_BYTES, boundedAiLog, safelyRecordAiLog } from "./ai-log";

describe("optional AI transcript", () => {
  it.each(["x", "ệ", "😀"])("truncates UTF-8 %s within 256 KiB and marks the cut", (char) => {
    const result = boundedAiLog(char.repeat(300_000));
    expect(Buffer.byteLength(result)).toBeLessThanOrEqual(AI_LOG_MAX_BYTES);
    expect(result).toContain("[AI log truncated");
    expect(result).not.toContain("\ufffd");
  });
  it("keeps a short transcript exactly intact", () => {
    expect(boundedAiLog("Xin chào")).toBe("Xin chào");
  });
  it("passes a bounded transcript to the writer and reports truncation", () => {
    const write = vi.fn(); const warn = vi.fn();
    safelyRecordAiLog("x".repeat(300_000), write, warn);
    expect(Buffer.byteLength(write.mock.calls[0][0])).toBeLessThanOrEqual(AI_LOG_MAX_BYTES);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("đã cắt"));
  });
  it("contains writer failures without echoing their potentially sensitive details", () => {
    const warn = vi.fn();
    expect(() => safelyRecordAiLog("text", () => { throw Error("secret detail"); }, warn)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Không ghi được AI log"));
    expect(warn.mock.calls[0][0]).not.toContain("secret detail");
  });
});
