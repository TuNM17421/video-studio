import { handle } from "@/lib/server/http";
import { readTelemetrySettings, registry } from "@/lib/server/jobs";
import { REPO } from "@/lib/server/paths";
import { readLocalTelemetry } from "@/lib/server/telemetry-local";

/** Read-only and offline: what this machine logged and what the uploader would send. The token is never echoed. */
export const GET = handle(() => {
  const settings = readTelemetrySettings();
  return Response.json(readLocalTelemetry(REPO, {
    sending: {
      url: settings.url,
      hasToken: Boolean(settings.token),
      autoSync: settings.autoSync,
      enabled: Boolean(settings.autoSync && settings.url && settings.token),
      syncing: Boolean(registry.telemetrySyncing),
    },
    aiLogsEnabled: process.env.STUDIO_TELEMETRY_AI_LOGS === "1",
  }));
});
