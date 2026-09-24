/**
 * Vietnamese names for the cross-review defect codes (tools/workflow-ledger.mjs → QA_CODES). Client-safe
 * copy of the list — the ledger itself reads the disk; a test keeps the two in step.
 */
export const QA_CODE_LABELS: Record<string, string> = {
  "text-overflow": "Chữ tràn khung",
  overlap: "Chồng lấn",
  unreadable: "Chữ khó đọc",
  "low-contrast": "Chữ chìm vào nền",
  "empty-layout": "Bố cục trống",
  clipped: "Bị xén mép",
  misaligned: "Lệch hàng",
  repetitive: "Lặp máy móc",
  "off-script": "Ngoài kịch bản",
  module: "Tiêu chí năng lực",
  style: "Tiêu chí style",
  other: "Khác",
};

export const qaCodeLabel = (code?: string) => (code && QA_CODE_LABELS[code]) || code || "Khác";

/** "cue-03" → 3; anything else → null. */
export function cueNumber(scope?: string) {
  const m = scope?.match(/cue-0*(\d+)/);
  return m ? Number(m[1]) : null;
}
