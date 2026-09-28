import { describe, expect, it } from "vitest";
import type { LocalTelemetry } from "./types";
import { formatDuration, formatUsd, receiptNote, sendingSummary } from "./telemetry-ui";

function data(patch: { sending?: Partial<LocalTelemetry["sending"]>; receipts?: Partial<LocalTelemetry["receipts"]>; counts?: Partial<LocalTelemetry["counts"]> } = {}): LocalTelemetry {
  return {
    outbox: { total: 2, unreadableLines: 0, byType: {} },
    counts: { acked: 1, pending: 1, blocked: 0, ...patch.counts },
    receipts: { found: true, lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null, ...patch.receipts },
    sending: { url: "https://x", hasToken: true, autoSync: true, enabled: true, syncing: false, ...patch.sending },
    aiLogs: { count: 0, enabled: false },
    videos: [],
    preview: [],
    previewLimit: 50,
  };
}

describe("sendingSummary", () => {
  it("says sending is off and names what is missing", () => {
    const s = sendingSummary(data({ sending: { url: "", hasToken: false, autoSync: false, enabled: false } }));
    expect(s.title).toBe("Gửi đang tắt");
    expect(s.detail).toContain("URL, token, tự động gửi");
  });

  it("reports a failure only when it is newer than the last success", () => {
    const failed = sendingSummary(data({ receipts: { lastSuccessAt: "2026-09-28T01:00:00Z", lastFailureAt: "2026-09-28T02:00:00Z", lastError: "HTTP 503" } }));
    expect(failed).toMatchObject({ tone: "error", title: "Lần gửi gần nhất thất bại" });
    expect(failed.detail).toContain("HTTP 503");
    const recovered = sendingSummary(data({ receipts: { lastSuccessAt: "2026-09-28T03:00:00Z", lastFailureAt: "2026-09-28T02:00:00Z" } }));
    expect(recovered.title).toBe("Còn event chờ gửi");
  });

  it("claims all sent only when nothing is pending or blocked", () => {
    expect(sendingSummary(data({ counts: { pending: 0, blocked: 0 } })).title).toBe("Đã gửi hết");
    expect(sendingSummary(data({ counts: { pending: 0, blocked: 1 } })).title).toBe("Còn event chờ gửi");
  });

  it("never claims sent without a receipt file", () => {
    expect(sendingSummary(data({ receipts: { found: false }, counts: { pending: 0 } })).title).toBe("Chưa có biên nhận");
    expect(receiptNote(data({ receipts: { found: false } }))).toContain("chưa có file biên nhận");
    expect(receiptNote(data())).toBeNull();
  });
});

describe("formatters", () => {
  it("show unmeasured values as a dash, never zero", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(0.1234)).toBe("$0.123");
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(75_000)).toBe("1m 15s");
  });
});
