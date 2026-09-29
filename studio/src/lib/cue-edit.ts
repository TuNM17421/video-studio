/**
 * Editing one câu by hand in the cues step — the rule for when it is allowed and the words for what happened.
 * One module for the API (lib/server/cue-edit.ts) and the page, so the button shows exactly when the edit
 * would be accepted.
 */
import type { CueEditField, CueEditResult } from "./types";

export const CUE_FIELD_LABEL: Record<CueEditField, string> = { text: "lời đọc", title: "chữ trên màn hình", visual: "ý đồ hình" };

/**
 * Why a câu cannot be edited right now, or null. The words are editable until a recording is made of them
 * (same window as feedback on the cues), and also when the dry-run stopped the cues — the fix is often one câu.
 */
export function cueEditBlocked(stages: { cues: string; voice: string }): string | null {
  if (stages.voice === "done") return "Giọng đã được ghi theo lời hiện tại, nên lời không sửa trực tiếp được nữa: đổi lời thì phải thu lại giọng cho câu đó.";
  if (stages.cues === "running") return "Lời & cue đang được viết — chờ xong rồi sửa.";
  if (!["review", "done", "error"].includes(stages.cues)) return "Chưa có lời & cue để sửa.";
  return null;
}

/** What to tell the member after an edit: the tone of the message and its sentence. */
export function editNotice(result: CueEditResult): { tone: "success" | "warning" | "error"; text: string } {
  const fields = (Object.keys(result.changed) as CueEditField[]).map((field) => CUE_FIELD_LABEL[field]);
  if (!fields.length) return { tone: "warning", text: `Câu ${result.n} không có gì khác với bản đang có — chưa sửa gì.` };
  const what = `Đã sửa câu ${result.n}: ${fields.join(", ")}.`;
  if (result.gate === "failed") return { tone: "error", text: `${what} Nhưng kiểm tra TTS dry-run chưa qua: ${result.gateError || "xem nhật ký"}` };
  const script = result.script === "updated" ? " Kịch bản gốc đã sửa theo."
    : result.script === "not-found" ? " Không thấy lời cũ trong kịch bản gốc (kich-ban-goc.md) nên kịch bản giữ nguyên — sửa tay nếu cần."
    : result.script === "ambiguous" ? " Lời cũ xuất hiện ở nhiều chỗ trong kịch bản gốc nên kịch bản giữ nguyên — sửa tay nếu cần."
    : "";
  return { tone: result.script === "not-found" || result.script === "ambiguous" ? "warning" : "success", text: `${what}${script}` };
}
