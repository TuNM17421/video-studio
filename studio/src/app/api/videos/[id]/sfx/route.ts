import { handle } from "@/lib/server/http";
import { assertId, HttpError } from "@/lib/server/paths";
import { saveSfxState, sfxDryRun, sfxView } from "@/lib/server/sfx-plan";
import { readState } from "@/lib/server/videos";

/** Đề xuất + quyết định hiện tại của một video, kèm mốc và mức thật của những chỗ đã duyệt. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const view = await sfxView(id);
  // Danh sách đã duyệt được `sfx-mix` tính lại: panel hiện đúng số mà bản trộn dùng, không tự tính song song.
  const mix = view.ready ? await sfxDryRun(id).catch(() => ({ hits: [], beds: [] })) : { hits: [], beds: [] };
  return Response.json({ ...view, mix });
});

/** Lưu quyết định: `{ decisions: { "<spot>": { use, soundId? } }, beds: { "<phần>": "<id tiếng>" } }`. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  // Video mẫu và video làm ngoài Studio chỉ xem, không sửa — cùng luật với mọi bước khác.
  if (!readState(id).managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  const body = (await req.json().catch(() => null)) as { decisions?: unknown; beds?: unknown } | null;
  if (!body || typeof body !== "object") throw new HttpError(400, "Thiếu quyết định để lưu.");
  const view = await saveSfxState(id, {
    decisions: (body.decisions ?? {}) as Record<string, { use: boolean; soundId?: string }>,
    beds: (body.beds ?? {}) as Record<string, string>,
  });
  const mix = view.ready ? await sfxDryRun(id).catch(() => ({ hits: [], beds: [] })) : { hits: [], beds: [] };
  return Response.json({ ...view, mix });
});
