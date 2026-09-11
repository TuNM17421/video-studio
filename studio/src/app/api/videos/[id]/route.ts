import type { VideoDetail } from "@/lib/types";
import { handle } from "@/lib/server/http";
import { currentJob, logs } from "@/lib/server/jobs";
import { assertId } from "@/lib/server/paths";
import { lastDryRun } from "@/lib/server/voice";
import { artifacts, cuesInfo, qaImages, readState } from "@/lib/server/videos";

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
  };
  return Response.json(detail);
});
