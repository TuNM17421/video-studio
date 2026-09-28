import type { LocalTelemetry, TelemetryEventStatus } from "./types";

export type Tone = "success" | "warning" | "error" | "default" | "processing";

/** Per-event label: only what a receipt establishes. There is no per-event "failed". */
export const EVENT_STATUS: Record<TelemetryEventStatus, { label: string; tone: Tone }> = {
  acked: { label: "Đã có biên nhận", tone: "success" },
  pending: { label: "Chờ gửi", tone: "processing" },
  blocked: { label: "Bị chặn", tone: "error" },
};

/** One headline for the send channel, from config + the last attempt the uploader recorded. */
export function sendingSummary(data: LocalTelemetry): { tone: Tone; title: string; detail: string } {
  const { sending, receipts, counts } = data;
  if (sending.syncing) return { tone: "processing", title: "Đang gửi", detail: "Tiến trình gửi đang chạy." };
  if (!sending.enabled) {
    const missing = [!sending.url && "URL", !sending.hasToken && "token", !sending.autoSync && "tự động gửi"].filter(Boolean).join(", ");
    return {
      tone: "default",
      title: "Gửi đang tắt",
      detail: `Studio không mở kết nối mạng nào (thiếu: ${missing}). Số liệu chỉ nằm trên máy này.`,
    };
  }
  if (receipts.lastFailureAt && (!receipts.lastSuccessAt || receipts.lastFailureAt > receipts.lastSuccessAt)) {
    return { tone: "error", title: "Lần gửi gần nhất thất bại", detail: `${receipts.lastError ?? "Không rõ lỗi."} Event chưa có biên nhận vẫn chờ gửi lại.` };
  }
  if (!receipts.found) return { tone: "warning", title: "Chưa có biên nhận", detail: "Chưa lần gửi nào ghi biên nhận trên máy này." };
  if (counts.pending === 0 && counts.blocked === 0) return { tone: "success", title: "Đã gửi hết", detail: "Mọi event đều có biên nhận của máy chủ." };
  return { tone: "warning", title: "Còn event chờ gửi", detail: "Sẽ gửi ở lần kết thúc job tiếp theo." };
}

/** No receipt file means "not known to be sent" — never "never sent": older uploads kept no receipts. */
export function receiptNote(data: LocalTelemetry): string | null {
  return data.receipts.found
    ? null
    : "Máy này chưa có file biên nhận: event đã gửi bằng bản cũ (không lưu biên nhận) cũng hiện là chờ gửi. Máy chủ bỏ qua event trùng mã nên gửi lại không nhân đôi số liệu.";
}

export const formatUsd = (value: number | null) => (value === null ? "—" : `$${value.toFixed(value < 1 ? 3 : 2)}`);
export const formatCount = (value: number | null) => (value === null ? "—" : value.toLocaleString("vi-VN"));

export function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}
