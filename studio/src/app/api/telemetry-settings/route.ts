import { handle } from "@/lib/server/http";
import { readTelemetrySettings, writeTelemetrySettings, type TelemetrySettings } from "@/lib/server/jobs";

/** `<url>/health` needs no token (server.mjs answers it before the auth check) — a plain liveness probe. */
async function checkCollector(url: string): Promise<{ ok: boolean; message: string }> {
  if (!url) return { ok: false, message: "Chưa đặt URL hệ thống log." };
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(4000) });
    return res.ok ? { ok: true, message: "Đã kết nối." } : { ok: false, message: `Máy chủ trả lời ${res.status}.` };
  } catch (error) {
    return { ok: false, message: `Không kết nối được (${(error as Error).message}).` };
  }
}

/** The token is a credential: never echoed back, same rule as the ElevenLabs/Kaggle key routes. */
const publicView = (s: TelemetrySettings) => ({ url: s.url, hasToken: Boolean(s.token), autoSync: s.autoSync });

export const GET = handle(async () => {
  const settings = readTelemetrySettings();
  return Response.json({ ...publicView(settings), ...(await checkCollector(settings.url)) });
});

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { url?: string; token?: string; autoSync?: boolean };
  const settings = writeTelemetrySettings(body);
  return Response.json({ ...publicView(settings), ...(await checkCollector(settings.url)) });
});
