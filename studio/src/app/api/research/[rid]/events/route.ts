import { handle } from "@/lib/server/http";
import { subscribe } from "@/lib/server/jobs";
import { assertRunId, jobKey } from "@/lib/server/research/store";

export const dynamic = "force-dynamic";

/** Server-sent events của một lượt research: dòng nhật ký, tiến độ job, "trạng thái đổi — tải lại". */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ rid: string }> }) => {
  const { rid } = await ctx.params;
  assertRunId(rid);
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
      const unsubscribe = subscribe(jobKey(rid), (data) => enqueue(`data: ${JSON.stringify(data)}\n\n`));
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
