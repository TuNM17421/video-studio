import { MODULES, type ModuleInfo } from "@/lib/modules";
import { handle } from "@/lib/server/http";
import { mediaAsset } from "@/lib/server/media";

/** The capability list with its sample videos resolved — the form cannot reach the media manifest itself. */
export const GET = handle(() =>
  Response.json(
    MODULES.map((m): ModuleInfo => {
      const asset = m.previewKey ? mediaAsset(m.previewKey) : null;
      return { ...m, preview: asset ? { url: asset.url, type: asset.type } : null };
    }),
  ),
);
