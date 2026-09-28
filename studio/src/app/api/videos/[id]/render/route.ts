import { baseUrl, handle } from "@/lib/server/http";
import { isRunning } from "@/lib/server/jobs";
import { isTrackId } from "@/lib/server/music";
import { isBuildNo } from "@/lib/qa-manifest";
import { assertId, HttpError } from "@/lib/server/paths";
import { renderPreflight, renderVideo } from "@/lib/server/render";
import { readState, updateState } from "@/lib/server/videos";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (state.stages.scenes !== "done") throw new HttpError(400, "Duyệt phần dựng cảnh trước khi render.");
  renderPreflight(id);
  // Both tracks are finishing decisions and are only chosen here. What had to be settled early is *which
  // câu* the question covers — the plan's "Video có quiz" tick — and cues.js already carries that.
  const body = await req.json().catch(() => ({}) as { music?: unknown; quizMusic?: unknown; captions?: unknown; buildNo?: unknown });
  updateState(id, (s) => {
    if (isTrackId(body.music, "background")) s.music = { ...s.music, background: body.music as string };
    if (isTrackId(body.quizMusic, "quiz")) s.music = { ...s.music, quiz: body.quizMusic as string };
    if (typeof body.captions === "boolean") s.captions = body.captions;
    // Which round of QA this MP4 is: the manifest beside it carries the number to the platform.
    if (isBuildNo(body.buildNo)) s.buildNo = body.buildNo;
  });
  // Checked again after the body was read: a second click passed the first check while this request
  // awaited, and would otherwise reach the render. From here to renderVideo's startJob nothing awaits.
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");
  const base = baseUrl(req);
  // A failure ends the job and marks the stage inside renderVideo; ending it here instead ended the
  // *running* render when a second click was refused, and left no way to stop it.
  void renderVideo(id, base).catch(() => {});
  return Response.json({ started: true }, { status: 202 });
});
