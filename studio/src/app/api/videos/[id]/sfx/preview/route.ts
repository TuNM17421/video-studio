import { handle } from "@/lib/server/http";
import { assertId, HttpError } from "@/lib/server/paths";
import { previewSpot } from "@/lib/server/sfx-plan";

/**
 * Nghe thử một chỗ: `?spot=<id>&sfx=1` cho bản có tiếng, `&sfx=0` cho đúng đoạn giọng đó để so A/B.
 * Trả WAV; đoạn chỉ dài vài giây nên không cần stream.
 */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const params = new URL(req.url).searchParams;
  const spot = params.get("spot");
  if (!spot) throw new HttpError(400, "Thiếu chỗ cần nghe thử.");
  const audio = await previewSpot(id, spot, params.get("sfx") !== "0");
  return new Response(new Uint8Array(audio), {
    headers: { "content-type": "audio/wav", "cache-control": "no-store", "content-length": String(audio.length) },
  });
});
