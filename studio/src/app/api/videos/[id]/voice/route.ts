import type { VoiceSettings } from "@/lib/types";
import { handle } from "@/lib/server/http";
import { isRunning, log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";
import { readState, setStage } from "@/lib/server/videos";
import { dryRun, generateVoice, hasKey, lastDryRun } from "@/lib/server/voice";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");
  const body = (await req.json()) as { action: "dry-run" | "generate"; settings?: VoiceSettings };
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (state.stages.cues !== "done") throw new HttpError(400, "Duyệt lời & cue trước.");
  if (body.action === "dry-run") {
    const s = body.settings;
    if (!s) throw new HttpError(400, "Thiếu cài đặt giọng.");
    return Response.json(await dryRun(id, { voiceId: String(s.voiceId || "").trim(), model: s.model, language: s.language, pause: Number(s.pause) }));
  }
  if (body.action === "generate") {
    if (!hasKey()) throw new HttpError(400, "Nhập API key ElevenLabs trước.");
    if (!lastDryRun(id)) throw new HttpError(400, "Chạy kiểm tra (dry-run) trước khi tạo giọng.");
    void generateVoice(id).catch((error) => {
      log(id, "error", error instanceof Error ? error.message : String(error));
      setStage(id, "voice", "error", "Tạo giọng thất bại.");
    });
    return Response.json({ started: true }, { status: 202 });
  }
  throw new HttpError(400, "Thao tác không hợp lệ.");
});
