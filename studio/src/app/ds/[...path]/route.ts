import { handle, sendFile } from "@/lib/server/http";
import { DS, safeJoin } from "@/lib/server/paths";

/** The design system, served like `npm run serve` (scene previews, players, and render/QA frames). */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ path: string[] }> }) => {
  const { path } = await ctx.params;
  return sendFile(req, safeJoin(DS, path.join("/")));
});
