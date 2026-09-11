import { handle } from "@/lib/server/http";
import { subscribe } from "@/lib/server/jobs";
import { assertId } from "@/lib/server/paths";

export const dynamic = "force-dynamic";

/** Server-sent events: agent / tool log lines, job progress, "state changed — refetch". */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      const unsubscribe = subscribe(id, send);
      const ping = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 15000);
      cleanup = () => { unsubscribe(); clearInterval(ping); };
      req.signal.addEventListener("abort", () => { cleanup(); try { controller.close(); } catch {} });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
});
