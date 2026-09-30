import { runAgent } from "@/lib/server/agent";
import { baseUrl, handle } from "@/lib/server/http";
import { emit, isRunning, jobHandled, log } from "@/lib/server/jobs";
import { assertId, HttpError, REPO } from "@/lib/server/paths";
import { readState, setStage } from "@/lib/server/videos";
import { qaFindings, updateFeedback } from "@/lib/server/workflow";

const ACTIVE = new Set(["open", "planned", "applied"]);

/**
 * The user's decision on cross-review findings of the scenes stage, in one call:
 * - `skip`: [{ id, reason }] — wontfix with the reason on record; it stops blocking Duyệt and stays skipped
 *   even when a later review sees it again.
 * - `reopen`: [id] — undo a skip.
 * - `fix`: [id] (+ optional `note`) — one agent turn on exactly those findings, then the usual gates + review.
 * Minor findings never block Duyệt, but can ride along in a fix round when the user ticks "Sửa luôn".
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const body = (await req.json()) as { fix?: unknown; skip?: unknown; reopen?: unknown; note?: unknown };
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");

  const known = new Map(qaFindings(id).map((item) => [item.id, item]));
  const ids = (value: unknown) => (Array.isArray(value) ? value : []).map(String);
  const find = (fid: string) => {
    const item = known.get(fid);
    if (!item) throw new HttpError(400, `Không có lỗi review ${fid}.`);
    return item;
  };
  const fix = ids(body.fix).map(find);
  const reopen = ids(body.reopen).map(find);
  const skip = (Array.isArray(body.skip) ? body.skip : []).map((row) => {
    const r = row as { id?: unknown; reason?: unknown };
    const reason = String(r.reason ?? "").trim().slice(0, 500);
    if (!reason) throw new HttpError(400, "Bỏ qua một lỗi cần ghi lý do.");
    return { item: find(String(r.id)), reason };
  });
  const note = typeof body.note === "string" ? body.note.slice(0, 4000) : "";
  if (!fix.length && !skip.length && !reopen.length) throw new HttpError(400, "Chưa chọn lỗi nào.");
  for (const { item } of skip) if (!ACTIVE.has(item.status)) throw new HttpError(400, `Lỗi ${item.id} không còn mở.`);
  for (const item of fix) {
    if (!ACTIVE.has(item.status)) throw new HttpError(400, `Lỗi ${item.id} không còn mở.`);
  }
  if (fix.length) {
    if (!["review", "error"].includes(state.stages.scenes)) throw new HttpError(400, "Chỉ gửi sửa được khi dựng cảnh đang chờ duyệt hoặc vừa lỗi.");
    if (state.stages.voice !== "done") throw new HttpError(400, "Tạo giọng đọc trước khi dựng cảnh.");
  }

  const at = new Date().toISOString();
  for (const { item, reason } of skip) {
    updateFeedback(REPO, id, item.id, { status: "wontfix", skipReason: reason, decidedBy: "user", decidedAt: at });
  }
  for (const item of reopen) {
    if (item.status !== "wontfix") continue;
    updateFeedback(REPO, id, item.id, { status: "open", skipReason: null, decidedBy: "user", decidedAt: at });
  }
  if (skip.length) log(id, "system", `Bỏ qua ${skip.length} lỗi review: ${skip.map(({ item, reason }) => `${item.scope || item.id} · ${item.code || item.severity} (${reason})`).join("; ")}`);
  if (reopen.length) log(id, "system", `Mở lại ${reopen.length} lỗi review.`);
  emit(id, { type: "state" });

  if (!fix.length) return Response.json({ started: false });
  const base = baseUrl(req);
  void runAgent(id, "scenes", base, note || undefined, { focus: fix.map((item) => item.id) }).catch((error) => {
    if (jobHandled(error)) return;
    log(id, "error", error instanceof Error ? error.message : String(error));
    if (!isRunning(id)) setStage(id, "scenes", "error", "Không chạy được agent.");
  });
  return Response.json({ started: true }, { status: 202 });
});
