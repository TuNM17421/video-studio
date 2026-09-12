import { handle } from "@/lib/server/http";
import { clearKey, hasKey, setKey } from "@/lib/server/voice";

/** The ElevenLabs key lives in this server's memory only; the response never echoes it. */
export const GET = handle(() => Response.json({ hasKey: hasKey() }));
export const POST = handle(async (req: Request) => {
  const { key } = (await req.json()) as { key?: string };
  setKey(String(key || ""));
  return Response.json({ hasKey: true });
});
export const DELETE = handle(() => {
  clearKey();
  return Response.json({ hasKey: false });
});
