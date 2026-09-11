import { handle } from "@/lib/server/http";
import { stopJob } from "@/lib/server/jobs";
import { assertId } from "@/lib/server/paths";

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  return Response.json({ stopped: stopJob(id) });
});
