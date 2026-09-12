import type { VoiceSettings } from "@/lib/types";
import { handle } from "@/lib/server/http";
import { isRunning, log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";
import { readState, setStage, updateState } from "@/lib/server/videos";
import { dryRun, exportScript, generateVoice, hasKey, importVoice, lastDryRun, lastImportReport, scanImport } from "@/lib/server/voice";

type Action = "source" | "export-script" | "dry-run" | "generate" | "scan-import" | "import";

function settings(body: { settings?: VoiceSettings }, current: VoiceSettings): VoiceSettings {
  const s = body.settings;
  if (!s) throw new HttpError(400, "Thiếu cài đặt giọng.");
  return {
    source: s.source === "import" ? "import" : "elevenlabs",
    voiceId: String(s.voiceId || "").trim(),
    model: s.model,
    language: s.language,
    pause: Number(s.pause),
    importDir: String(s.importDir ?? current.importDir ?? "").trim(),
  };
}

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");
  const body = (await req.json()) as { action: Action; settings?: VoiceSettings; force?: boolean };
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (state.stages.cues !== "done") throw new HttpError(400, "Duyệt lời & cue trước.");

  // Remembering the chosen source must not demand a complete, valid setup for the other one.
  if (body.action === "source") {
    const source = body.settings?.source === "import" ? "import" : "elevenlabs";
    return Response.json(updateState(id, (s) => { s.voice = { ...s.voice, source }; }).voice);
  }

  // Free and side-effect-light: run inline so the client gets the result in the response.
  if (body.action === "export-script") return Response.json(await exportScript(id));
  if (body.action === "dry-run") return Response.json(await dryRun(id, settings(body, state.voice)));
  if (body.action === "scan-import") {
    const v = settings(body, state.voice);
    return Response.json(await scanImport(id, v.importDir, v));
  }

  // Long-running: start the job and let the event stream carry progress.
  if (body.action === "generate") {
    if (!hasKey()) throw new HttpError(400, "Nhập API key ElevenLabs trước.");
    if (!lastDryRun(id)) throw new HttpError(400, "Chạy kiểm tra (dry-run) trước khi tạo giọng.");
    void generateVoice(id).catch((error) => {
      log(id, "error", error instanceof Error ? error.message : String(error));
      setStage(id, "voice", "error", "Tạo giọng thất bại.");
    });
    return Response.json({ started: true }, { status: 202 });
  }
  if (body.action === "import") {
    const report = lastImportReport(id);
    if (!report) throw new HttpError(400, "Kiểm tra thư mục audio trước khi nhập.");
    if (!report.ok && !body.force) throw new HttpError(400, "Thư mục còn câu chưa dùng được. Sửa rồi kiểm tra lại.");
    void importVoice(id, Boolean(body.force)).catch((error) => {
      log(id, "error", error instanceof Error ? error.message : String(error));
      setStage(id, "voice", "error", "Nhập giọng thất bại.");
    });
    return Response.json({ started: true }, { status: 202 });
  }
  throw new HttpError(400, "Thao tác không hợp lệ.");
});
