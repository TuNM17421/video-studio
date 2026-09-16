import { baseUrl, handle } from "@/lib/server/http";
import { finishJob, isRunning, log } from "@/lib/server/jobs";
import { isTrackId } from "@/lib/server/music";
import { assertId, HttpError } from "@/lib/server/paths";
import { renderVideo } from "@/lib/server/render";
import { readState, setStage, updateState } from "@/lib/server/videos";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (state.stages.scenes !== "done") throw new HttpError(400, "Duyệt phần dựng cảnh trước khi render.");
  // Both tracks are finishing decisions and are only chosen here. What had to be settled early is *which
  // câu* the question covers — the plan's "Video có quiz" tick — and cues.js already carries that.
  const body = await req.json().catch(() => ({}) as { music?: unknown; quizMusic?: unknown });
  updateState(id, (s) => {
    if (isTrackId(body.music, "background")) s.music = { ...s.music, background: body.music as string };
    if (isTrackId(body.quizMusic, "quiz")) s.music = { ...s.music, quiz: body.quizMusic as string };
  });
  const base = baseUrl(req);
  void renderVideo(id, base).catch((error) => {
    log(id, "error", error instanceof Error ? error.message : String(error));
    setStage(id, "render", "error", "Render thất bại.");
    finishJob(id, "error");
  });
  return Response.json({ started: true }, { status: 202 });
});
