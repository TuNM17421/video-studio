import { isAgentProvider } from "@/lib/agent-providers";
import { normalizeReview } from "@/lib/review";
import { baseUrl, handle } from "@/lib/server/http";
import { emit, isRunning, jobHandled, log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";
import { runReviewJob } from "@/lib/server/qa";
import { readState, updateState } from "@/lib/server/videos";

/**
 * Cross-review of one video. `{ enabled, provider }` changes the setting — allowed at any time, it only
 * affects the next run. `{ action: "run" }` re-runs gate + review on the scenes as they are, with no agent.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const body = (await req.json()) as { action?: string; enabled?: unknown; provider?: unknown };
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");

  if (body.action === "run") {
    if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");
    if (!["review", "error"].includes(state.stages.scenes)) throw new HttpError(400, "Chỉ review lại được khi dựng cảnh đang chờ duyệt hoặc vừa lỗi.");
    if (state.stages.voice !== "done") throw new HttpError(400, "Tạo giọng đọc trước khi dựng cảnh.");
    void runReviewJob(id, baseUrl(req)).catch((error) => {
      if (!jobHandled(error)) log(id, "error", error instanceof Error ? error.message : String(error));
    });
    return Response.json({ started: true }, { status: 202 });
  }

  if (body.action !== undefined) throw new HttpError(400, "Thao tác không hợp lệ.");
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") throw new HttpError(400, "enabled phải là true/false.");
  if (body.provider !== undefined && body.provider !== "auto" && !isAgentProvider(body.provider)) throw new HttpError(400, "Người review không hợp lệ.");
  const next = normalizeReview({ enabled: body.enabled ?? state.review.enabled, provider: body.provider ?? state.review.provider }, state.review);
  updateState(id, (s) => { s.review = next; });
  log(id, "system", `Review chéo: ${next.enabled ? `bật · ${next.provider === "auto" ? "tự chọn" : next.provider}` : "tắt"}.`);
  emit(id, { type: "state" });
  return Response.json({ review: next });
});
