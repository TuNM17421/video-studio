import { handle } from "@/lib/server/http";
import { clearGatewaySettings, diagnoseGateway, writeGatewaySettings } from "@/lib/server/gateway";

/** Settings panel for the 9router cost gateway: read/write the toggle, key name and Codex profile, always
 *  paired with a live diagnosis so the panel — and the status line by the agent picker — say which of
 *  "off / 9router not running / no such key / connected" actually applies right now. */
export const GET = handle(async () => Response.json(await diagnoseGateway()));

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean; keyName?: string; profile?: string };
  writeGatewaySettings(body);
  return Response.json(await diagnoseGateway());
});

export const DELETE = handle(async () => {
  clearGatewaySettings();
  return Response.json(await diagnoseGateway());
});
