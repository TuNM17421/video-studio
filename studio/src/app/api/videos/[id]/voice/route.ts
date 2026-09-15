import type { VoiceSettings, VoiceSource } from "@/lib/types";
import { handle } from "@/lib/server/http";
import { hasKaggleCreds } from "@/lib/server/kaggle-creds";
import { isRunning, log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";
import { readState, setStage, updateState } from "@/lib/server/videos";
import { dryRun, exportScript, generateVoice, generateVoiceKaggle, hasKey, importVoice, lastDryRun, lastImportReport, generateLocal, omnivoiceServer, omnivoiceStatus, scanImport, setupAlign, setupOmnivoice } from "@/lib/server/voice";

type Action = "source" | "export-script" | "dry-run" | "generate" | "generate-kaggle" | "scan-import" | "import" | "omnivoice-status" | "omnivoice-setup" | "omnivoice-server-start" | "omnivoice-server-stop" | "omnivoice-generate" | "align-setup";

const SOURCES: VoiceSource[] = ["elevenlabs", "kaggle", "import", "local"];

function settings(body: { settings?: VoiceSettings }, current: VoiceSettings): VoiceSettings {
  const s = body.settings;
  if (!s) throw new HttpError(400, "Thiếu cài đặt giọng.");
  return {
    source: SOURCES.includes(s.source) ? s.source : "elevenlabs",
    voiceId: String(s.voiceId || "").trim(),
    model: s.model,
    language: s.language,
    pause: Number(s.pause),
    importDir: String(s.importDir ?? current.importDir ?? "").trim(),
    kaggleRefAudio: String(s.kaggleRefAudio ?? current.kaggleRefAudio ?? "").trim(),
    kaggleRefText: String(s.kaggleRefText ?? current.kaggleRefText ?? ""),
    kaggleSpeed: Number(s.kaggleSpeed ?? current.kaggleSpeed ?? 1.0),
  };
}

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const body = (await req.json().catch(() => ({}))) as { action: Action; settings?: VoiceSettings; force?: boolean };
  // Trạng thái model local là của cả máy, không thuộc video nào: hỏi được cả khi video đang chạy job,
  // cả khi chưa duyệt cue. Chặn nó là panel trắng trơn giữa lúc đang cài.
  if (body.action === "omnivoice-status") return Response.json(await omnivoiceStatus());
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (state.stages.cues !== "done") throw new HttpError(400, "Duyệt lời & cue trước.");
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");

  // Remembering the chosen source must not demand a complete, valid setup for the other one.
  if (body.action === "source") {
    const requested = body.settings?.source;
    const source: VoiceSource = SOURCES.includes(requested as VoiceSource) ? (requested as VoiceSource) : "elevenlabs";
    return Response.json(updateState(id, (s) => { s.voice = { ...s.voice, source }; }).voice);
  }

  // Free and side-effect-light: run inline so the client gets the result in the response.
  if (body.action === "omnivoice-server-start") return Response.json(await omnivoiceServer("start"));
  if (body.action === "omnivoice-server-stop") return Response.json(await omnivoiceServer("stop"));
  if (body.action === "export-script") return Response.json(await exportScript(id));
  if (body.action === "dry-run") return Response.json(await dryRun(id, settings(body, state.voice)));
  if (body.action === "scan-import") {
    const v = settings(body, state.voice);
    return Response.json(await scanImport(id, v.importDir, v));
  }

  // Long-running: start the job and let the event stream carry progress.
  // Tải vài GB nên không chờ trong request; nhật ký và nút Dừng dùng chung với các job khác.
  if (body.action === "omnivoice-setup") {
    void setupOmnivoice(id).catch((error) => log(id, "error", error instanceof Error ? error.message : String(error)));
    return Response.json({ started: true }, { status: 202 });
  }
  // Whisper của bước nhập, không phải của OmniVoice — hai venv khác nhau, cài riêng.
  if (body.action === "align-setup") {
    void setupAlign(id).catch((error) => log(id, "error", error instanceof Error ? error.message : String(error)));
    return Response.json({ started: true }, { status: 202 });
  }
  // Sinh ra một thư mục wav thì chưa phải là "đã có giọng": bước Giọng đọc chỉ xong khi nhập xong, nên
  // hành động này không đụng vào trạng thái bước — đụng vào sẽ hạ cấp một video vốn đã có giọng rồi.
  if (body.action === "omnivoice-generate") {
    // Ghi giọng xuống state trước: nếu không, lần refresh kế tiếp kéo giọng cũ về và lượt sinh sau
    // lặng lẽ đọc bằng người khác. dry-run và scan-import cũng lưu theo cách này.
    const v = settings(body, state.voice);
    updateState(id, (s) => { s.voice = { ...s.voice, voiceId: v.voiceId }; });
    void generateLocal(id, v.voiceId)
      .catch((error) => log(id, "error", error instanceof Error ? error.message : String(error)));
    return Response.json({ started: true }, { status: 202 });
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
  // Push → poll → download → import → bind, all in one job; see kaggleCommand/generateVoiceKaggle for phases.
  if (body.action === "generate-kaggle") {
    if (!hasKaggleCreds()) throw new HttpError(400, "Nhập Kaggle username/key trước.");
    // No separate "kiểm tra" step for this source — persist what is on screen right before starting.
    updateState(id, (s) => { s.voice = settings(body, state.voice); });
    void generateVoiceKaggle(id).catch((error) => {
      log(id, "error", error instanceof Error ? error.message : String(error));
      setStage(id, "voice", "error", "Tạo giọng bằng OmniVoice thất bại.");
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
