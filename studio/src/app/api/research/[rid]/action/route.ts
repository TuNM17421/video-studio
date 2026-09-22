import type { Gate2Decision } from "@/lib/research";
import { isAgentProvider } from "@/lib/agent-providers";
import { readAgentConfig, resolveAgentProvider } from "@/lib/server/agent-config";
import { handle } from "@/lib/server/http";
import { HttpError } from "@/lib/server/paths";
import { approveClaims, approveScript, decideGate2, rerun, resume, sendFeedback, stop, type RerunStep } from "@/lib/server/research/runner";
import { readView } from "@/lib/server/research/store";

const RERUN: RerunStep[] = ["extract", "research", "write", "review"];
const DECISIONS: Gate2Decision[] = ["drop", "retry", "accept"];

/**
 * Mọi thao tác của người dùng trên một lượt: duyệt ba cổng, góp ý, chạy lại, chạy tiếp, dừng.
 * Trả về trạng thái mới của lượt để trang vẽ lại ngay, không chờ SSE.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ rid: string }> }) => {
  const { rid } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; claims?: unknown; decisions?: Record<string, string>; feedback?: string; step?: string; only?: string[]; agent?: string };
  switch (body.action) {
    case "approve-claims":
      approveClaims(rid, body.claims);
      break;
    case "gate2": {
      const decisions: Record<string, Gate2Decision> = {};
      for (const [id, d] of Object.entries(body.decisions ?? {})) if (DECISIONS.includes(d as Gate2Decision)) decisions[id] = d as Gate2Decision;
      await decideGate2(rid, decisions);
      break;
    }
    case "approve-script":
      approveScript(rid);
      break;
    case "feedback":
      sendFeedback(rid, String(body.feedback ?? ""));
      break;
    case "rerun": {
      if (!RERUN.includes(body.step as RerunStep)) throw new HttpError(400, "Chặng không hợp lệ.");
      let agent;
      if (body.agent !== undefined) {
        if (!isAgentProvider(body.agent)) throw new HttpError(400, "Agent không hợp lệ.");
        try { agent = resolveAgentProvider(body.agent, readAgentConfig()); } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : "Agent không hợp lệ."); }
      }
      rerun(rid, body.step as RerunStep, Array.isArray(body.only) ? body.only.map(String) : [], agent);
      break;
    }
    case "resume":
      resume(rid);
      break;
    case "stop":
      stop(rid);
      break;
    default:
      throw new HttpError(400, "Thao tác không hợp lệ.");
  }
  return Response.json(readView(rid));
});
