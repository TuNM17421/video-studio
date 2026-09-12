import { handle } from "@/lib/server/http";
import { emit, log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";
import { readState, setStage } from "@/lib/server/videos";

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
  setStage(id, stage, "done");
  log(id, "system", `Đã duyệt ${stage === "cues" ? "lời & cue" : "dựng cảnh"}.`);
  emit(id, { type: "state" });
  return Response.json({ ok: true, alreadyApproved: false });
});
