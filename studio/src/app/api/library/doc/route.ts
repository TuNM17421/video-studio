import { componentDoc } from "@/lib/server/catalog";
import { handle } from "@/lib/server/http";
import { HttpError } from "@/lib/server/paths";

export const GET = handle((req: Request) => {
  const text = componentDoc(new URL(req.url).searchParams.get("doc") || "");
  if (text === null) throw new HttpError(404, "Không có tài liệu.");
  return new Response(text, { headers: { "content-type": "text/markdown; charset=utf-8" } });
});
