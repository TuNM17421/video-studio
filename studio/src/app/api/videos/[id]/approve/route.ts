import { handle } from "@/lib/server/http";
import { emit, log } from "@/lib/server/jobs";
import { assertId, HttpError, REPO } from "@/lib/server/paths";
import { readState, setStage } from "@/lib/server/videos";
import { blockersFor, updateFeedbackWhere } from "@/lib/server/workflow";

/** The user accepts what the agent made in a review stage (cues, scenes). */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const { stage } = (await req.json()) as { stage: "cues" | "scenes" };
  if (!["cues", "scenes"].includes(stage)) throw new HttpError(400, "Stage không hợp lệ.");
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (state.stages[stage] === "done") {
    emit(id, { type: "state" });
    return Response.json({ ok: true, alreadyApproved: true });
  }
  if (state.stages[stage] !== "review") throw new HttpError(400, "Stage này chưa sẵn sàng để duyệt.");
  const blockers = blockersFor(id, stage, state);
  if (blockers.length) {
    // Say which ones: a bare count leaves the user nothing to act on.
    const list = blockers.map((item: { severity: string; scope?: string; code?: string; message: string }) =>
      `[${item.severity}]${item.scope ? ` ${item.scope}` : ""}${item.code ? ` · ${item.code}` : ""}: ${item.message.replace(/[.。]+$/, "")}`).join(" — ");
    throw new HttpError(409, `Còn ${blockers.length} feedback blocker/major chưa xử lý: ${list}. Chọn Sửa hoặc Bỏ qua (kèm lý do) ở mục Kiểm tra tự động.`);
  }
  setStage(id, stage, "done");
  updateFeedbackWhere(
    REPO,
    id,
    (item: { stage: string; status: string }) => item.stage === stage && ["open", "planned", "applied"].includes(item.status),
    { status: "verified", evidence: "Người dùng duyệt stage trong Video Studio." },
  );
  log(id, "system", `Đã duyệt ${stage === "cues" ? "lời & cue" : "dựng cảnh"}.`);
  emit(id, { type: "state" });
  return Response.json({ ok: true, alreadyApproved: false });
});
