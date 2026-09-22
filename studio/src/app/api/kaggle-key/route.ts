import { handle } from "@/lib/server/http";
import { clearKaggleCreds, hasKaggleCreds, parseKaggleJson, setKaggleCreds } from "@/lib/server/kaggle-creds";

/** The Kaggle username/key live in this server's memory only; the response never echoes them. */
export const GET = handle(() => Response.json({ hasCreds: hasKaggleCreds() }));

export const POST = handle(async (req: Request) => {
  const body = (await req.json()) as { username?: string; key?: string; json?: string };
  if (body.json !== undefined) {
    const { username, key } = parseKaggleJson(body.json);
    setKaggleCreds(username, key);
  } else {
    setKaggleCreds(String(body.username || ""), String(body.key || ""));
  }
  return Response.json({ hasCreds: true });
});

export const DELETE = handle(() => {
  clearKaggleCreds();
  return Response.json({ hasCreds: false });
});
