import { handle } from "@/lib/server/http";
import { assertId } from "@/lib/server/paths";
import { startSfxSuggest, stopSfxSuggest } from "@/lib/server/sfx-agent";

/** Chạy agent tìm chỗ đáng có tiếng. Tốn token, nên chỉ chạy khi người dùng bấm. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  startSfxSuggest(id);
  return Response.json({ started: true }, { status: 202 });
});

export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  stopSfxSuggest(id);
  return Response.json({ stopped: true });
});
