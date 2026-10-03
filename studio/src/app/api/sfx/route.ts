import { handle } from "@/lib/server/http";
import { sfxCatalog } from "@/lib/server/sfx";

export const GET = handle(() => Response.json(sfxCatalog()));
