import { MUSIC_ID, NO_MUSIC } from "@/lib/music";
import { baseUrl, handle } from "@/lib/server/http";
import { finishJob, isRunning, log } from "@/lib/server/jobs";
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
  const body = await req.json().catch(() => ({}) as { music?: string });
  if (typeof body.music === "string" && (body.music === NO_MUSIC || body.music === MUSIC_ID)) {
    updateState(id, (s) => { s.music = body.music as string; });
  }
  const base = baseUrl(req);
  void renderVideo(id, base).catch((error) => {
    log(id, "error", error instanceof Error ? error.message : String(error));
    setStage(id, "render", "error", "Render thất bại.");
    finishJob(id, "error");
  });
  return Response.json({ started: true }, { status: 202 });
});
