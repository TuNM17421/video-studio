import { byClaudeDesign, importBundle, readBrief, scenesStageFor, writeBrief } from "@/lib/server/claude-design";
import { handle } from "@/lib/server/http";
import { emit, isRunning, log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";
import { readState, setStage, updateState } from "@/lib/server/videos";

/**
 * Bàn giao sang Claude Design. `GET` trả brief đã sinh lần trước (hoặc `null`); `POST { action: "prompt" }`
 * sinh lại theo cues.js và thời lượng giọng hiện tại; `POST { action: "builder", value }` đổi chỗ dựng cảnh
 * khi người dùng đổi ý sau lúc tạo video; `POST { action: "scan" | "import", folder }` soát rồi chép thư
 * mục tải về từ Claude Design vào `ds-bundle/cd/<id>/`.
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
  const body = (await req.json()) as { action?: string; value?: string; folder?: string };

  // Đổi chỗ dựng cảnh sau khi đã tạo video. Chỗ quyết chính vẫn là bước Kế hoạch; đây là đường sửa khi
  // đổi ý, và chỉ mở khi cảnh chưa được duyệt — đổi sau đó thì hai đường cùng ghi vào một thư mục video.
  if (body.action === "builder") {
    if (body.value !== "agent" && body.value !== "claude-design") throw new HttpError(400, "Chỗ dựng cảnh không hợp lệ.");
    const { state, managed } = readState(id);
    if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
    if (state.stages.scenes === "done") throw new HttpError(400, "Cảnh đã duyệt — đổi chỗ dựng thì phải mở lại bước Dựng cảnh.");
    if (state.stages.scenes === "running") throw new HttpError(409, "Đang dựng cảnh, dừng lại trước đã.");
    const builder = body.value;
    // Mỗi đường duyệt bản của riêng nó. Giữ nguyên "chờ duyệt" của đường cũ là mời người dùng duyệt cảnh
    // agent dựng rồi render trang nhập về — hai bản khác nhau, không một lời báo.
    const next = scenesStageFor(id, builder);
    updateState(id, (s) => { s.request.sceneBuilder = builder; s.stages.scenes = next; s.lastError = null; });
    log(id, "system", `Dựng cảnh bằng: ${builder === "claude-design" ? "Claude Design" : "agent ở máy"}.`);
    emit(id, { type: "state" });
    return Response.json({ sceneBuilder: body.value });
  }

  if (body.action === "scan" || body.action === "import") {
    // Chép là xoá bản cũ trong ds-bundle/cd/<id>/ — đúng thư mục một lượt render đang chụp.
    if (body.action === "import" && isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy. Đợi xong hoặc dừng rồi nhập lại.");
    const report = await importBundle(id, String(body.folder || ""), body.action === "scan");
    if (body.action === "import") {
      log(id, "system", `Nhập cảnh từ Claude Design: ${report.copied} file → ${report.dest}`);
      // Nhập xong là có thứ để duyệt. Trước đây bước đứng yên ở "chưa chạy": không nút Duyệt, bước Render
      // khoá — đường Claude Design không có lối ra. Nhập lại sau khi đã duyệt cũng mở lại, vì bản đã đổi.
      const { state } = readState(id);
      if (byClaudeDesign(state)) {
        const reopened = state.stages.scenes === "done";
        setStage(id, "scenes", "review");
        if (reopened) log(id, "system", "Bản nhập mới thay bản đã duyệt — duyệt lại trước khi render.");
      }
      emit(id, { type: "state" });
    }
    return Response.json({ report });
  }

  if (body.action !== "prompt") throw new HttpError(400, "Thao tác không hợp lệ.");

  const brief = await writeBrief(id);
  log(id, "system", `Brief Claude Design: ${brief.cues} câu · ${brief.frames.toLocaleString("vi-VN")} frame · thời lượng ${brief.measured ? "đo thật" : "ước lượng"} → ${brief.file}`);
  return Response.json({ brief });
});
