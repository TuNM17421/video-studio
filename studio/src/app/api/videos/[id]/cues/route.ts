import type { CueEditField } from "@/lib/types";
import { CUE_EDIT_FIELDS, editCue } from "@/lib/server/cue-edit";
import { handle } from "@/lib/server/http";
import { assertId, HttpError } from "@/lib/server/paths";

/** Longer than any câu a script would hold; a pasted page is a mistake, not a câu. */
const MAX_LENGTH = 2000;

/**
 * Edit one câu by hand: `{ n, text?, title?, visual? }`. Answers once the edit and its dry-run are done
 * (a second or two), with what changed and whether the script was updated to match.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const n = Number(body.n);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, "Số câu không hợp lệ.");
  const changes: Partial<Record<CueEditField, string>> = {};
  for (const field of CUE_EDIT_FIELDS) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "string") throw new HttpError(400, `${field} phải là chữ.`);
    if ((body[field] as string).length > MAX_LENGTH) throw new HttpError(400, `${field} dài quá ${MAX_LENGTH} ký tự.`);
    // U+FFFD is what a wrongly-encoded request leaves where the Vietnamese letters were; written into cues.js it
    // would be read aloud and shown on screen. Seen from a terminal sending cp1252 — refuse rather than store it.
    if ((body[field] as string).includes("�")) throw new HttpError(400, "Chữ gửi lên bị lỗi mã hoá (có ký tự �). Gõ lại trong Studio.");
    changes[field] = body[field] as string;
  }
  if (!Object.keys(changes).length) throw new HttpError(400, "Không có gì để sửa.");
  return Response.json(await editCue(id, n, changes));
});
