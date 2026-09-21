import { handle, sendFile } from "@/lib/server/http";
import { HttpError, REPO, safeJoin } from "@/lib/server/paths";

/** Read-only access to video outputs: MP4, QA stills, transcripts, chapters, notes, style previews. */
const ROOTS = new Set(["projects", "transcripts", "chapters", "styles", "assets"]);

export const GET = handle(async (req: Request, ctx: { params: Promise<{ path: string[] }> }) => {
  const { path } = await ctx.params;
  // The narration master only, never anything else beside it (tts-elevenlabs/.env holds the CLI key).
  // Masters live in voice/out/<id>/ now; tts-elevenlabs/out/ is where older videos still have theirs.
  const voice = path.length === 4 && ["voice", "tts-elevenlabs"].includes(path[0]) && path[1] === "out" && path[3] === "voice.wav";
  if ((!ROOTS.has(path[0]) && !voice) || path.some((p) => p.startsWith("."))) throw new HttpError(403, "Không được phép.");
  return sendFile(req, safeJoin(REPO, path.join("/")));
});
