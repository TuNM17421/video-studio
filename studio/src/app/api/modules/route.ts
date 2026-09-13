import { handle } from "@/lib/server/http";
import { moduleInfos } from "@/lib/server/modules";

/** The capability catalog, one entry per `templates/modules/<id>.md`, sample videos resolved to URLs. */
export const GET = handle(() => Response.json(moduleInfos()));
