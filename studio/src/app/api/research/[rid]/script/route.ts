import { handle } from "@/lib/server/http";
import { scriptForVideo } from "@/lib/server/research/runner";

/** Kịch bản của một lượt, đưa sang form tạo video (bước Kế hoạch) — không tự tạo gì trong projects/. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ rid: string }> }) => {
  const { rid } = await ctx.params;
  return Response.json(scriptForVideo(rid));
});
