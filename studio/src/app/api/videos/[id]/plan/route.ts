import fs from "node:fs";
import path from "node:path";
import { handle } from "@/lib/server/http";
import { assertId, HttpError, REPO, stateDir } from "@/lib/server/paths";
import { writeImprovementPlan } from "@/lib/server/workflow";

/**
 * The generated IMPROVEMENT-PLAN.md, read-only. It lives under `.studio/`, which /files refuses on purpose
 * (dot paths hold state and .env) — so this route serves exactly that one file and nothing else.
 */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const file = path.join(stateDir(id), "IMPROVEMENT-PLAN.md");
  if (!fs.existsSync(file)) {
    if (!fs.existsSync(stateDir(id))) throw new HttpError(404, "Video chưa có improvement plan.");
    writeImprovementPlan(REPO, id);
  }
  return new Response(fs.readFileSync(file, "utf8"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
});
