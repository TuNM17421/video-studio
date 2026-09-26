import type { VoiceSettings, VoiceSource } from "@/lib/types";
import { handle } from "@/lib/server/http";
import { isRunning, log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";
import { readState, setStage, updateState } from "@/lib/server/videos";
import { dryRun, exportScript, generateKaggle, generateVoice, hasKey, importVoice, kaggleStatus, lastDryRun, lastImportReport, generateLocal, omnivoiceCast, omnivoiceServer, omnivoiceStatus, beginRetake, scanImport, setupAlign, setupKaggle, setupOmnivoice } from "@/lib/server/voice";

type Action = "source" | "export-script" | "dry-run" | "generate" | "scan-import" | "import" | "omnivoice-status" | "omnivoice-setup" | "omnivoice-server-start" | "omnivoice-server-stop" | "omnivoice-cast" | "omnivoice-generate" | "align-setup" | "kaggle-status" | "kaggle-setup" | "kaggle-generate" | "retake" | "retake-pick";

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
    speakers: cast(s.speakers ?? current.speakers),
  };
}

/** Giọng chọn riêng cho từng vai: chỉ nhận chuỗi, bỏ mọi khoá rỗng — nó sẽ thành đối số dòng lệnh. */
function cast(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [who, voice] of Object.entries(value as Record<string, unknown>)) {
    if (typeof voice !== "string" || !voice.trim()) continue;
    // Không có gạch nối "=" trong tên vai thì `--speaker "Tên=giọng"` mới tách lại đúng được.
    if (who.includes("=")) continue;
    out[who] = voice.trim();
  }
  return out;
}

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const body = (await req.json().catch(() => ({}))) as { action: Action; settings?: VoiceSettings; force?: boolean; n?: number; takes?: number; take?: string };
  // Trạng thái model local là của cả máy, không thuộc video nào: hỏi được cả khi video đang chạy job,
  // cả khi chưa duyệt cue. Chặn nó là panel trắng trơn giữa lúc đang cài.
  if (body.action === "omnivoice-status") return Response.json(await omnivoiceStatus());
  // Kaggle CLI + credentials cũng là của cả máy/phiên Studio, không của riêng video nào.
  if (body.action === "kaggle-status") return Response.json(await kaggleStatus());
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (state.stages.cues !== "done") throw new HttpError(400, "Duyệt lời & cue trước.");
  // Dàn vai chỉ đọc cues.js + voices.json, không đụng vào gì: trả lời được cả khi video đang sinh giọng,
  // nếu không thì panel trắng bảng chọn giọng suốt lượt chạy dài nhất của cả luồng.
  if (body.action === "omnivoice-cast") {
    return Response.json(await omnivoiceCast(id, body.settings ? settings(body, state.voice) : state.voice));
  }
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
    updateState(id, (s) => { s.voice = { ...s.voice, voiceId: v.voiceId, speakers: v.speakers }; });
    void generateLocal(id, v)
      .catch((error) => log(id, "error", error instanceof Error ? error.message : String(error)));
    return Response.json({ started: true }, { status: 202 });
  }
  if (body.action === "kaggle-setup") {
    void setupKaggle(id).catch((error) => log(id, "error", error instanceof Error ? error.message : String(error)));
    return Response.json({ started: true }, { status: 202 });
  }
  // Như model local: sinh xong mới chỉ là một thư mục wav; bước Giọng đọc xong khi nhập xong (tự nhập
  // chỉ khi Whisper thấy mọi câu đều sạch), nên hành động này không đụng trạng thái bước.
  if (body.action === "kaggle-generate") {
    const v = settings(body, state.voice);
    updateState(id, (s) => { s.voice = { ...s.voice, voiceId: v.voiceId, speakers: v.speakers, pause: v.pause }; });
    void generateKaggle(id, v)
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
  // Sinh lại một câu (vài bản, tự chọn bản đạt) hoặc đặt bản người dùng đã nghe và chọn. Đều đụng GPU hoặc
  // ghi đè một file trong thư mục giọng, nên chạy như một job: có nhật ký, có nút Dừng.
  if (body.action === "retake" || body.action === "retake-pick") {
    const n = Number(body.n);
    const report = lastImportReport(id);
    const row = report?.rows.find((r) => r.n === n);
    if (!Number.isInteger(n) || !row || row.silent) throw new HttpError(400, "Câu này không có lời để sinh lại.");
    let what: { takes: number } | { pick: string };
    if (body.action === "retake") {
      const takes = Number(body.takes ?? 3);
      if (!Number.isInteger(takes) || takes < 1 || takes > 6) throw new HttpError(400, "Số bản phải từ 1 tới 6.");
      what = { takes };
    } else {
      const take = String(body.take || "");
      if (!/^(t\d{1,2}|orig|prev)$/.test(take)) throw new HttpError(400, "Bản không hợp lệ.");
      what = { pick: take };
    }
    // Preflight and the job claim happen before the answer: a missing model or a busy card shows on screen,
    // and a second click gets a 409 instead of racing the first.
    const { done } = await beginRetake(id, n, what);
    void done.catch((error) => log(id, "error", error instanceof Error ? error.message : String(error)));
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
