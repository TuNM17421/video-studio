import { clampCues, clampSources, type ScoutInput } from "@/lib/scout";
import { handle } from "@/lib/server/http";
import { HttpError } from "@/lib/server/paths";
import { confirmScout, currentScout, startScout, stopScout } from "@/lib/server/scout";

/** Lượt chạy hiện tại (hoặc lượt gần nhất), để trang dựng lại được sau khi tải lại. */
export const GET = handle(() => Response.json(currentScout()));

export const POST = handle(async (req: Request) => {
  const body = (await req.json()) as { action?: string; input?: Partial<ScoutInput>; items?: unknown };

  if (body.action === "stop") return Response.json({ stopped: stopScout() });

  if (body.action === "confirm") {
    try {
      return Response.json(confirmScout(body.items), { status: 202 });
    } catch (error) {
      throw new HttpError(409, error instanceof Error ? error.message : "Không chạy được.");
    }
  }

  const topic = String(body.input?.topic ?? "").trim();
  if (!topic) throw new HttpError(400, "Nhập chủ đề trước.");
  if (topic.length > 300) throw new HttpError(400, "Chủ đề dài quá 300 ký tự.");

  try {
    return Response.json(startScout({ topic, minSources: clampSources(body.input?.minSources), cues: clampCues(body.input?.cues) }), { status: 202 });
  } catch (error) {
    throw new HttpError(409, error instanceof Error ? error.message : "Không chạy được.");
  }
});
