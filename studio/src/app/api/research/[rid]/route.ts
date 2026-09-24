import { handle } from "@/lib/server/http";
import { readView } from "@/lib/server/research/store";

export const dynamic = "force-dynamic";

/** Toàn bộ những gì trang cần về một lượt: trạng thái, claim, finding, soát, nguồn, kịch bản, nhật ký. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ rid: string }> }) => {
  const { rid } = await ctx.params;
  return Response.json(readView(rid));
});
