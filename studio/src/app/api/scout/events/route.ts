import { handle } from "@/lib/server/http";
import { subscribeScout } from "@/lib/server/scout";

export const dynamic = "force-dynamic";

/** Từng lần agent gọi công cụ, gửi thẳng ra trang — đây là thứ dựng nên "flow" trên màn hình. */
export const GET = handle(async (req: Request) => {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let cleaned = false;
      const enqueue = (value: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(value)); }
        catch { closed = true; cleanup(); }
      };
      const unsubscribe = subscribeScout((event) => enqueue(`data: ${JSON.stringify(event)}\n\n`));
      const ping = setInterval(() => enqueue(": ping\n\n"), 15000);
      cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        unsubscribe();
        clearInterval(ping);
      };
      req.signal.addEventListener("abort", () => {
        if (closed) return;
        closed = true;
        cleanup();
        try { controller.close(); } catch {}
      }, { once: true });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
});
