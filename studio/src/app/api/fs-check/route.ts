import fs from "node:fs";
import path from "node:path";
import { handle } from "@/lib/server/http";

/** Does a local source the user typed exist? (feedback / old videos live outside the repo). */
export const GET = handle((req: Request) => {
  const p = new URL(req.url).searchParams.get("path") || "";
  if (!path.isAbsolute(p) || !fs.existsSync(/* turbopackIgnore: true */ p)) return Response.json({ exists: false });
  const stat = fs.statSync(/* turbopackIgnore: true */ p);
  const files = stat.isDirectory() ? fs.readdirSync(/* turbopackIgnore: true */ p).filter((f) => !f.startsWith(".")).length : 1;
  return Response.json({ exists: true, dir: stat.isDirectory(), files, name: path.basename(p), size: stat.isFile() ? stat.size : undefined });
});
