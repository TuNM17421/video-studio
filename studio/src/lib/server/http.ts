import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { HttpError } from "./paths";

/**
 * The studio runs commands on this machine, so every write request must come from the studio's own
 * page: a same-origin Origin header (browsers send it on POST/DELETE) and a loopback Host.
 */
export function guard(req: Request) {
  const host = req.headers.get("host") || "";
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) throw new HttpError(403, "Chỉ nhận yêu cầu từ máy này.");
  const origin = req.headers.get("origin");
  if (req.method !== "GET" && (!origin || new URL(origin).host !== host)) throw new HttpError(403, "Yêu cầu không đến từ Video Studio.");
}

/** Base URL of this server as the browser reached it (render + QA load frames from <base>/ds). */
export function baseUrl(req: Request) {
  return new URL(req.url).origin;
}

export function handle<T extends unknown[]>(fn: (req: Request, ...rest: T) => Promise<Response> | Response) {
  return async (req: Request, ...rest: T) => {
    try {
      guard(req);
      return await fn(req, ...rest);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : "Lỗi không xác định.";
      return Response.json({ error: message }, { status });
    }
  };
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ttf": "font/ttf", ".woff2": "font/woff2", ".woff": "font/woff", ".mp4": "video/mp4", ".wav": "audio/wav",
  ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8",
};

/** Serve one file, with Range support so <video> can seek in a rendered MP4. */
export function sendFile(req: Request, file: string) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response("Not found", { status: 404 });
  const size = fs.statSync(file).size;
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  const headers: Record<string, string> = { "content-type": type, "accept-ranges": "bytes", "cache-control": "no-store" };
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { headers: { ...headers, "content-length": String(size) } });
}
