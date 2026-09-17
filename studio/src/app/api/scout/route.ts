import type { ScoutInput } from "@/lib/scout";
import { handle } from "@/lib/server/http";
import { HttpError } from "@/lib/server/paths";
import { currentScout, startScout, stopScout } from "@/lib/server/scout";

/** Lượt chạy hiện tại (hoặc lượt gần nhất), để trang dựng lại được sau khi tải lại. */
export const GET = handle(() => Response.json(currentScout()));

export const POST = handle(async (req: Request) => {
  const body = (await req.json()) as { action?: string; input?: Partial<ScoutInput> };

  if (body.action === "stop") return Response.json({ stopped: stopScout() });

  const topic = String(body.input?.topic ?? "").trim();
  if (!topic) throw new HttpError(400, "Nhập chủ đề trước.");
  if (topic.length > 300) throw new HttpError(400, "Chủ đề dài quá 300 ký tự.");
  // Một nguồn thì không còn là "xác nhận chéo" nữa, mà mười nguồn mỗi câu thì lượt chạy không bao giờ xong.
  const minSources = Math.min(5, Math.max(1, Math.round(Number(body.input?.minSources) || 2)));
  const cues = Math.min(80, Math.max(5, Math.round(Number(body.input?.cues) || 20)));

  try {
    return Response.json(startScout({ topic, minSources, cues }), { status: 202 });
  } catch (error) {
    throw new HttpError(409, error instanceof Error ? error.message : "Không chạy được.");
  }
});
