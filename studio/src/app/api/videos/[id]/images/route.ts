import type { ImageDecision } from "@/lib/images";
import { handle } from "@/lib/server/http";
import { decideImage, startImages, stopImages } from "@/lib/server/images";
import { assertId, HttpError } from "@/lib/server/paths";

type Body =
  | { action: "run"; slots?: string[] }
  | { action: "stop" }
  | { action: "decide"; slot: string; decision: ImageDecision | null };

/**
 * Đề xuất ảnh của một video: chạy (cả video, hoặc tìm lại vài chỗ), dừng, và ghi lựa chọn của người dựng.
 * Trạng thái đọc qua GET /api/videos/[id] (trường `images`), như mọi bước khác.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const body = (await req.json()) as Body;
  if (body.action === "run") {
    const slots = Array.isArray(body.slots) ? body.slots.filter((s) => typeof s === "string" && /^s\d{1,4}$/.test(s)) : undefined;
    startImages(id, { slots });
    return Response.json({ ok: true });
  }
  if (body.action === "stop") {
    stopImages(id);
    return Response.json({ ok: true });
  }
  if (body.action === "decide") {
    if (typeof body.slot !== "string" || !/^s\d{1,4}$/.test(body.slot)) throw new HttpError(400, "Chỗ không hợp lệ.");
    await decideImage(id, body.slot, body.decision ?? null);
    return Response.json({ ok: true });
  }
  throw new HttpError(400, "Thao tác không hợp lệ.");
});
