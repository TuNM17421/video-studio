import { readBrief, writeBrief } from "@/lib/server/claude-design";
import { handle } from "@/lib/server/http";
import { emit, log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";
import { readState, updateState } from "@/lib/server/videos";

/**
 * Bàn giao sang Claude Design. `GET` trả brief đã sinh lần trước (hoặc `null`); `POST { action: "prompt" }`
 * sinh lại theo cues.js và thời lượng giọng hiện tại; `POST { action: "builder", value }` đổi chỗ dựng cảnh
 * khi người dùng đổi ý sau lúc tạo video.
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
  const body = (await req.json()) as { action?: string; value?: string };

  // Đổi chỗ dựng cảnh sau khi đã tạo video. Chỗ quyết chính vẫn là bước Kế hoạch; đây là đường sửa khi
  // đổi ý, và chỉ mở khi cảnh chưa được duyệt — đổi sau đó thì hai đường cùng ghi vào một thư mục video.
  if (body.action === "builder") {
    if (body.value !== "agent" && body.value !== "claude-design") throw new HttpError(400, "Chỗ dựng cảnh không hợp lệ.");
    const { state, managed } = readState(id);
    if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
    if (state.stages.scenes === "done") throw new HttpError(400, "Cảnh đã duyệt — đổi chỗ dựng thì phải mở lại bước Dựng cảnh.");
    if (state.stages.scenes === "running") throw new HttpError(409, "Đang dựng cảnh, dừng lại trước đã.");
    updateState(id, (s) => { s.request.sceneBuilder = body.value as "agent" | "claude-design"; });
    log(id, "system", `Dựng cảnh bằng: ${body.value === "claude-design" ? "Claude Design" : "agent ở máy"}.`);
    emit(id, { type: "state" });
    return Response.json({ sceneBuilder: body.value });
  }

  if (body.action !== "prompt") throw new HttpError(400, "Thao tác không hợp lệ.");

  const brief = await writeBrief(id);
  log(id, "system", `Brief Claude Design: ${brief.cues} câu · ${brief.frames.toLocaleString("vi-VN")} frame · thời lượng ${brief.measured ? "đo thật" : "ước lượng"} → ${brief.file}`);
  return Response.json({ brief });
});
