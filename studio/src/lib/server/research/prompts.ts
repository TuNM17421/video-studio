import type { Claim, ClaimCheck, EditReview, Finding, OutlineSlide, ResearchState, ScriptIssue } from "../../research";
import { DIFFICULTY_LABEL } from "../../research";

/**
 * Lời gọi agent cho từng chặng — cố tình ngắn. Cách làm nằm trong `.claude/skills/research-script/<chặng>.md`
 * (agent nào cũng đọc được, và người dùng gọi thẳng `/research-script` cũng đọc đúng file đó); ở đây chỉ
 * nói chặng nào, thư mục nào, việc cụ thể của lượt này. Mỗi dòng thừa ở đây là token trả cho mọi lượt.
 */

const SKILL = ".claude/skills/research-script";
const head = (rid: string, what: string) =>
  `Video Studio · pipeline research · lượt \`research/${rid}\` · ${what}. Trả lời bằng tiếng Việt, ngắn gọn.`;
const tail = "Studio tự soát sau khi bạn xong — không cần tự chạy lệnh soát. Xong thì dừng, tóm tắt một hai câu.";

function deckLine(state: ResearchState) {
  const rid = state.id;
  if (state.deck.text) return `Slide: \`research/${rid}/${state.deck.text}\` (${state.deck.slides ?? "?"} slide, chữ + ghi chú đã bóc từ PPTX).`;
  return `Slide: \`research/${rid}/${state.deck.file}\` (PDF${state.deck.slides ? `, ${state.deck.slides} trang` : ""}) — đọc bằng Read, mỗi lần tối đa 20 trang.`;
}

export function extractPrompt(state: ResearchState, problems: string[]) {
  return [
    head(state.id, "chặng 1 · bóc tách"),
    `Đọc \`${SKILL}/extract.md\` và làm đúng.`,
    deckLine(state),
    `Chỉ ghi \`research/${state.id}/outline.json\` và \`research/${state.id}/claims.json\`.`,
    ...(problems.length ? ["", "Lần trước hai file chưa đạt soát — sửa đúng các lỗi này:", ...problems.map((p) => `- ${p}`)] : []),
    tail,
  ].join("\n");
}

/** Claim được giao kèm luôn nội dung, để agent khỏi tốn một lượt đọc claims.json. */
export function researchPrompt(rid: string, claims: Claim[], retry: string[]) {
  return [
    head(rid, `chặng 2 · research ${claims.map((c) => c.id).join(", ")}`),
    `Đọc \`${SKILL}/research.md\` và làm đúng. Chỉ làm các claim sau:`,
    ...claims.map((c) => `- ${c.id} · ${DIFFICULTY_LABEL[c.difficulty].toLowerCase()}${c.timeSensitive ? " · hay đổi" : ""} · slide ${c.slides.join(", ") || "?"}: "${c.text}" → ${c.question}`),
    `Đọc trang: \`node tools/page.mjs research/${rid} <url> --find "từ khoá|từ khoá"\`.`,
    `Ghi \`research/${rid}/claims/<mã>/finding.json\` cho từng claim.`,
    ...(retry.length ? [
      `Lần trước ${retry.join(", ")} trượt soát — đọc \`claims/<mã>/feedback.json\` và sửa **đúng** lỗi ghi trong đó.`,
      "File đó có sẵn bảng nguồn (nguồn nào bị loại vì lý do gì) và danh sách trang lượt này **đã tải về**:"
      + " gọi `node tools/page.mjs` cho một URL đã có là đọc từ đĩa, không tốn lượt tìm web nào."
      + " Xem bảng đó trước, chỉ tìm web thêm khi thật sự thiếu nguồn.",
    ] : []),
    tail,
  ].join("\n");
}

/**
 * Ngữ cảnh chặng viết và chặng biên tập, nội tuyến thẳng vào prompt.
 *
 * Đo trên lượt thật: chặng viết làm 12 thao tác, 11 trong đó là `Read` (outline.json, claims.json,
 * checks/evidence.json, 4 × finding.json…) trước khi ghi đúng một file — mỗi lần Read là một vòng gọi mô hình
 * với toàn bộ hội thoại gửi lại. Cả khối đó chỉ ~3,5k token; trả một lần trong prompt rẻ hơn hẳn. Agent vẫn
 * được Read nếu muốn xem trích đoạn gốc.
 */
export interface WriteContext {
  outline: OutlineSlide[];
  claims: { claim: Claim; check: ClaimCheck | undefined; finding: Finding | null }[];
  /** Ý người duyệt đã bỏ ở cổng 2 — còn trên slide nhưng không được khẳng định. */
  dropped: { id: string; text: string; slides: number[] }[];
}

const outlineLines = (outline: OutlineSlide[]) => outline
  .filter((o) => !o.skip)
  .map((o) => `- slide ${o.slide}${o.heading ? ` · ${o.heading}` : ""}: ${(o.points ?? []).join(" · ") || "(không có ý)"}`);

/** Một dòng cho mỗi claim: kết luận và câu đúng để đặt vào kịch bản. */
function claimLines(claims: WriteContext["claims"]) {
  return claims.map(({ claim, check, finding }) => {
    const verdict = check?.verdict ?? finding?.verdict ?? null;
    const head = `- ${claim.id} · slide ${claim.slides.join(", ") || "?"} · "${claim.text}"`;
    if (!check?.ok) return `${head} → CHƯA QUA SOÁT — không được dùng.`;
    if (verdict === "ok") return `${head} → slide đúng. ${finding?.answer ?? ""}`.trim();
    if (verdict === "insufficient") return `${head} → không đủ nguồn — chỉ được nói chừng mực, không khẳng định con số nào.`;
    return `${head} → SLIDE ${verdict === "wrong" ? "SAI" : "CẦN SỬA"}, viết theo câu này: "${finding?.corrected ?? finding?.answer ?? ""}"`;
  });
}

export function writePrompt(state: ResearchState, ctx: WriteContext) {
  return [
    head(state.id, "chặng 4 · viết kịch bản"),
    `Đọc \`${SKILL}/write.md\` và làm đúng. Khoảng ${state.options.cues} câu. Không bật năng lực bổ sung nào (clip thường, một người dẫn).`,
    "",
    "Dàn ý slide (đã bóc sẵn, không cần đọc lại `outline.json`):",
    ...outlineLines(ctx.outline),
    "",
    "Kết quả research (không cần đọc lại `claims.json` hay `finding.json`; muốn xem trích đoạn gốc thì mới Read):",
    ...claimLines(ctx.claims),
    ...(ctx.dropped.length ? [
      "",
      "Người duyệt đã **bỏ** những ý sau vì không kiểm được — slide có nhưng kịch bản không được khẳng định, cũng đừng nói lại bằng chữ khác:",
      ...ctx.dropped.map((d) => `- "${d.text}"${d.slides.length ? ` (slide ${d.slides.join(", ")})` : ""}`),
    ] : []),
    "",
    `Ghi \`research/${state.id}/output/kich-ban.md\`.`,
    tail,
  ].join("\n");
}

const where = (i: ScriptIssue) => (i.cue ? `câu ${i.cue}` : i.line ? `dòng ${i.line}` : "chung");

export function fixPrompt(rid: string, issues: ScriptIssue[]) {
  return [
    head(rid, "sửa kịch bản theo lỗi soát"),
    `Sửa \`research/${rid}/output/kich-ban.md\` — chỉ đúng các chỗ sau, giữ nguyên phần còn lại (quy tắc: \`${SKILL}/write.md\`):`,
    ...issues.map((i) => `- ${where(i)}: ${i.message}`),
    tail,
  ].join("\n");
}

export function editPrompt(rid: string, ctx: WriteContext) {
  return [
    head(rid, "chặng 5 · biên tập"),
    `Đọc \`${SKILL}/edit.md\` và làm đúng. Không sửa kịch bản; chỉ ghi \`research/${rid}/checks/edit.json\`.`,
    "",
    "Kết luận research để đối chiếu từng câu (không cần đọc lại `finding.json`):",
    ...claimLines(ctx.claims),
    ...(ctx.dropped.length ? ["", "Ý đã bị bỏ ở cổng 2 — kịch bản nhắc tới là lỗi:", ...ctx.dropped.map((d) => `- "${d.text}"`)] : []),
    tail,
  ].join("\n");
}

/**
 * Một lượt sửa gom cả góp ý của biên tập lẫn cảnh báo của code (câu quá dài, cùng một kiểu đọc quá lâu…):
 * cảnh báo không chặn pipeline, nhưng để tới cổng 3 mới sửa thì người duyệt phải làm thay.
 */
export function applyEditPrompt(rid: string, edit: EditReview | null, warnings: ScriptIssue[]) {
  return [
    head(rid, "sửa kịch bản theo biên tập"),
    `Sửa \`research/${rid}/output/kich-ban.md\` — chỉ các câu được nêu, giữ nguyên phần còn lại (quy tắc: \`${SKILL}/write.md\`).`,
    ...(edit?.issues.length ? ["Góp ý của biên tập:", ...edit.issues.map((i) => `- ${i.cue ? `câu ${i.cue}` : "chung"} [${i.type}]: ${i.problem} → ${i.fix}`)] : []),
    ...(warnings.length ? ["Cảnh báo của phần soát tự động (nên sửa nếu không làm hỏng ý):", ...warnings.map((i) => `- ${where(i)}: ${i.message}`)] : []),
    tail,
  ].join("\n");
}

export function revisePrompt(rid: string, feedback: string, edit: EditReview | null) {
  return [
    head(rid, "sửa kịch bản theo góp ý người duyệt"),
    `Sửa \`research/${rid}/output/kich-ban.md\` theo góp ý dưới đây (quy tắc: \`${SKILL}/write.md\`). Góp ý của người duyệt được ưu tiên hơn mọi gợi ý khác.`,
    `"""${feedback.trim()}"""`,
    ...(edit?.issues.length ? ["Nếu cần tham khảo, góp ý biên tập trước đó nằm ở `checks/edit.json`."] : []),
    "Dữ kiện mới vẫn chỉ được lấy từ slide và finding đã qua soát.",
    tail,
  ].join("\n");
}
