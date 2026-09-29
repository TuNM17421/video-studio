import { baseUrl, handle } from "@/lib/server/http";
import { isRunning, jobHandled, log } from "@/lib/server/jobs";
import { isTrackId } from "@/lib/server/music";
import { isBuildNo } from "@/lib/qa-manifest";
import { assertId, HttpError } from "@/lib/server/paths";
import { renderPreflight, renderVideo } from "@/lib/server/render";
import { readState, setStage, updateState } from "@/lib/server/videos";

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
  // Checked again after the body was read, and before anything is written: a second click passed the first
  // check while this request awaited. Refused after writing, it left its captions/music/build in state.json
  // while the MP4 being made used the first click's (measured). From here to renderVideo's startJob nothing awaits.
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");
  updateState(id, (s) => {
    if (isTrackId(body.music, "background")) s.music = { ...s.music, background: body.music as string };
    if (isTrackId(body.quizMusic, "quiz")) s.music = { ...s.music, quiz: body.quizMusic as string };
    if (typeof body.captions === "boolean") s.captions = body.captions;
    // Which round of QA this MP4 is: the manifest beside it carries the number to the platform.
    if (isBuildNo(body.buildNo)) s.buildNo = body.buildNo;
  });
  const base = baseUrl(req);
  // A failure after the job started is ended and shown inside renderVideo; ending the job here instead ended
  // the *running* render when a second click was refused, and left no way to stop it. What is left to report
  // is a failure before the job started, which nothing else would show.
  void renderVideo(id, base).catch((error) => {
    if (jobHandled(error)) return;
    const message = error instanceof Error ? error.message : String(error);
    log(id, "error", message);
    if (!isRunning(id)) setStage(id, "render", "error", message);
  });
  return Response.json({ started: true }, { status: 202 });
});
