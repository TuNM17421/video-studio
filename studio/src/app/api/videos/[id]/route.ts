import type { VideoDetail } from "@/lib/types";
import { handle } from "@/lib/server/http";
import { currentJob, isRunning, logs } from "@/lib/server/jobs";
import { assertId, HttpError, rel, REPO } from "@/lib/server/paths";
import { trashVideo } from "@/lib/server/trash-video";
import { lastDryRun, lastImportReport } from "@/lib/server/voice";
import { artifacts, cuesInfo, qaImages, readState } from "@/lib/server/videos";
import { workflowReport } from "@/lib/server/workflow";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const { state, managed } = readState(id);
  const detail: VideoDetail = {
    state, managed,
    cues: await cuesInfo(id),
    qa: qaImages(id),
    artifacts: artifacts(id, state.request.day),
    job: currentJob(id),
    logs: logs(id).slice(-300),
    dryRun: lastDryRun(id),
    importReport: lastImportReport(id),
    workflow: workflowReport(REPO, id) as VideoDetail["workflow"],
  };
  return Response.json(detail);
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  if (isRunning(id)) throw new HttpError(409, "Video đang có tác vụ chạy. Hãy dừng tác vụ rồi thử xóa lại.");
  const targets = await trashVideo(id);
  return Response.json({ id, trashed: targets.map((target) => ({ kind: target.kind, path: rel(target.path) })) });
});
