import { runAgent, type AgentStage } from "@/lib/server/agent";
import { baseUrl, handle } from "@/lib/server/http";
import { isRunning, jobHandled, log } from "@/lib/server/jobs";
import { assertId, HttpError } from "@/lib/server/paths";
import { assertLocalScenes } from "@/lib/server/claude-design";
import { readState, setStage } from "@/lib/server/videos";

const PREREQ: Record<AgentStage, (s: ReturnType<typeof readState>["state"]) => string | null> = {
  cues: () => null,
  scenes: (s) => (s.stages.voice === "done" ? null : "Tạo giọng đọc trước khi dựng cảnh."),
  deliver: (s) => (s.stages.render === "done" ? null : "Render video trước."),
};

/** Start an agent stage, or send feedback on it (message). Returns at once; progress arrives over SSE. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");
  const { stage, message } = (await req.json()) as { stage: AgentStage; message?: string };
  if (!["cues", "scenes", "deliver"].includes(stage)) throw new HttpError(400, "Stage không hợp lệ.");
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (stage === "scenes") assertLocalScenes(state);
  const blocked = PREREQ[stage](state);
  if (blocked) throw new HttpError(400, blocked);
  if (message !== undefined && !message.trim()) throw new HttpError(400, "Góp ý đang trống.");
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy.");
  const base = baseUrl(req);
  // A failure after the agent's job started is already logged and on the stage, with its real cause.
  void runAgent(id, stage, base, message).catch((error) => {
    if (jobHandled(error)) return;
    const messageText = error instanceof Error ? error.message : String(error);
    log(id, "error", messageText);
    if (isRunning(id)) return;
    setStage(id, stage, "error", "Không chạy được agent.");
  });
  return Response.json({ started: true }, { status: 202 });
});
