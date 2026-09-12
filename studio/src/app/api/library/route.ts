import { getLibrary } from "@/lib/server/catalog";
import { handle } from "@/lib/server/http";

export const GET = handle(() => Response.json(getLibrary()));
