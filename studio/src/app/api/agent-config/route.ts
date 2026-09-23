import { handle } from "@/lib/server/http";
import { readStudioConfig } from "@/lib/server/agent-config";

/** Only non-secret UI policy is exposed; CLI credentials and environment values stay server-side. */
export const GET = handle(() => Response.json(readStudioConfig()));
