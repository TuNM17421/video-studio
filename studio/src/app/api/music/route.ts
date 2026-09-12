import { handle } from "@/lib/server/http";
import { musicCatalog } from "@/lib/server/music";

export const GET = handle(() => Response.json(musicCatalog()));
