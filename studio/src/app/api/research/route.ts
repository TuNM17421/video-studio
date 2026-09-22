import path from "node:path";
import { readAgentConfig, resolveAgentProvider } from "@/lib/server/agent-config";
import { handle } from "@/lib/server/http";
import { HttpError } from "@/lib/server/paths";
import { createRun, installedAgents } from "@/lib/server/research/runner";
import { listRuns } from "@/lib/server/research/store";

const MAX_SLIDE_BYTES = 50 * 1024 * 1024;

/** Các lượt research trên máy này, cùng những agent chạy được (để bộ chọn không đưa ra agent chưa cài). */
export const GET = handle(async () => Response.json({ runs: listRuns(), agents: await installedAgents(), config: readAgentConfig() }));

/** Tạo lượt mới từ slide tải lên (.pdf / .pptx) và bắt đầu chặng bóc tách. */
export const POST = handle(async (req: Request) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "Chưa chọn file slide.");
  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (ext !== "pdf" && ext !== "pptx") throw new HttpError(400, "Chỉ nhận slide .pdf hoặc .pptx.");
  if (file.size > MAX_SLIDE_BYTES) throw new HttpError(413, `Slide lớn quá ${MAX_SLIDE_BYTES / 1024 / 1024} MB.`);
  let agent;
  try {
    agent = resolveAgentProvider(form?.get("agent") || undefined, readAgentConfig());
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Agent không hợp lệ.");
  }
  const title = String(form?.get("title") ?? "").trim().slice(0, 300) || file.name.slice(0, file.name.length - ext.length - 1);
  const cues = Math.min(80, Math.max(5, Number(form?.get("cues")) || 20));
  const id = await createRun({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }, { title, agent, cues });
  return Response.json({ id }, { status: 201 });
});
