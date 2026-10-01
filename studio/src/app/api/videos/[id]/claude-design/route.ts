import { readBrief, writeBrief } from "@/lib/server/claude-design";
import { handle } from "@/lib/server/http";
import { log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";

/**
 * Bàn giao sang Claude Design. `GET` trả brief đã sinh lần trước (hoặc `null`); `POST { action: "prompt" }`
 * sinh lại theo cues.js và thời lượng giọng hiện tại.
 *
 * Không có thao tác "gửi": `DesignSync` không có method nào gửi prompt cho agent thiết kế, nên bước dán vẫn
 * là việc của người dùng. Đừng thêm thao tác giả vờ gửi được.
 */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  return Response.json({ brief: readBrief(id) });
});

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const body = (await req.json()) as { action?: string };
  if (body.action !== "prompt") throw new HttpError(400, "Thao tác không hợp lệ.");

  const brief = await writeBrief(id);
  log(id, "system", `Brief Claude Design: ${brief.cues} câu · ${brief.frames.toLocaleString("vi-VN")} frame · thời lượng ${brief.measured ? "đo thật" : "ước lượng"} → ${brief.file}`);
  return Response.json({ brief });
});
