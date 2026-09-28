import type { Claim, ClaimCheck, EditReview, Finding, OutlineSlide, ResearchState, ScriptCheck, ScriptIssue, SourceInfo } from "../../research";
import { claimCap, DIFFICULTY_LABEL, SCRIPT_BUDGET, scriptBudget } from "../../research";
import { IGNORE_PERSONA_LINE } from "../agent-cli";

/**
 * Lời gọi agent cho từng chặng — cố tình ngắn. Cách làm nằm trong `.claude/skills/research-script/<chặng>.md`
 * (agent nào cũng đọc được, và người dùng gọi thẳng `/research-script` cũng đọc đúng file đó); ở đây chỉ
 * nói chặng nào, thư mục nào, việc cụ thể của lượt này. Mỗi dòng thừa ở đây là token trả cho mọi lượt.
 */

const SKILL = ".claude/skills/research-script";
const head = (rid: string, what: string) =>
  `${IGNORE_PERSONA_LINE}\nVideo Studio · pipeline research · lượt \`research/${rid}\` · ${what}. Trả lời bằng tiếng Việt, ngắn gọn.`;
const tail = "Studio tự soát sau khi bạn xong — không cần tự chạy lệnh soát. Xong thì dừng, tóm tắt một hai câu.";

function deckLines(state: ResearchState) {
  const rid = state.id;
  if (state.deck.outline === "code") {
    // Chữ từng trang đã bóc và dàn ý đã dựng bằng code: agent chỉ đọc chữ và chọn claim. Lượt thật đọc cả PDF 78 trang
    // (813k token đọc lại từ cache) rồi chép lại dàn ý bằng tay — hơn nửa chi phí chặng này, và còn đánh số lệch trang.
    const thin = state.deck.thinSlides ?? [];
    return [
      `Slide: chữ từng trang đã bóc sẵn ở \`research/${rid}/${state.deck.text}\` (${state.deck.slides ?? "?"} trang) — đọc file này, không đọc cả ${state.deck.format === "pdf" ? "PDF" : "file gốc"}.`,
      ...(thin.length ? [`Trang ít chữ (có thể chỉ có hình): ${thin.join(", ")}. Chỉ khi tiêu đề cho thấy trang đó có số liệu, bảng hay biểu đồ đáng kiểm thì Read đúng trang đó trong \`research/${rid}/${state.deck.file}\` (tham số pages).`] : []),
      "`outline.json` do Studio dựng từ chữ đó — đừng ghi lại.",
    ];
  }
  if (state.deck.text) return [`Slide: \`research/${rid}/${state.deck.text}\` (${state.deck.slides ?? "?"} slide, chữ + ghi chú đã bóc từ PPTX).`];
  return [`Slide: \`research/${rid}/${state.deck.file}\` (PDF${state.deck.slides ? `, ${state.deck.slides} trang` : ""}) — đọc bằng Read, mỗi lần tối đa 20 trang.`];
}

export function extractPrompt(state: ResearchState, problems: string[]) {
  const code = state.deck.outline === "code";
  return [
    head(state.id, "chặng 1 · bóc tách"),
    `Đọc \`${SKILL}/extract.md\` và làm đúng.`,
    ...deckLines(state),
    `Tối đa ${claimCap(state.options.cues)} claim: kịch bản khoảng ${state.options.cues} câu chỉ dùng được chừng đó dữ kiện — chọn điều người xem sẽ nghe và dễ sai hay đã cũ nhất.`,
    code
      ? `Chỉ ghi \`research/${state.id}/claims.json\` (thêm \`"skip": [số trang]\` cho trang không mang nội dung bài nếu cần).`
      : `Chỉ ghi \`research/${state.id}/outline.json\` và \`research/${state.id}/claims.json\`.`,
    ...(problems.length ? ["", "Lần trước hai file chưa đạt soát — sửa đúng các lỗi này:", ...problems.map((p) => `- ${p}`)] : []),
    tail,
  ].join("\n");
}

/** Kết quả soát lần trước của một claim phải research lại — nội tuyến vào prompt, không bắt agent tự đọc file. */
export interface RetryNote {
  claim: string;
  problems: string[];
  warnings: string[];
  sources: NonNullable<ClaimCheck["sources"]>;
}

/** Lệnh tự soát của chặng research — chỉ đọc; cùng chuỗi với dòng trong allowlist (runner.ts). */
export const selfCheckCommand = (rid: string, ids: string[]) => `node tools/research-verify.mjs research/${rid} --stage evidence --dry --claims ${ids.join(",")}`;

/**
 * Claim được giao kèm luôn nội dung, để agent khỏi tốn một lượt đọc claims.json. Lượt research lại nhận luôn lỗi
 * lần trước, bảng nguồn và các trang đã tải — trước đây nó phải tự đọc feedback.json của từng claim (lượt thật thử
 * `cat` bốn file, bị chặn, rồi mới Read), và danh sách trang đã tải bị chép lặp trong mọi feedback.json.
 */
export function researchPrompt(rid: string, claims: Claim[], retry: RetryNote[] = [], loaded: SourceInfo[] = []) {
  const ids = claims.map((c) => c.id);
  const ok = loaded.filter((s) => s.ok);
  const failed = loaded.filter((s) => !s.ok);
  return [
    head(rid, `chặng 2 · research ${ids.join(", ")}`),
    `Đọc \`${SKILL}/research.md\` và làm đúng. Chỉ làm các claim sau:`,
    ...claims.map((c) => `- ${c.id} · ${DIFFICULTY_LABEL[c.difficulty].toLowerCase()}${c.timeSensitive ? " · hay đổi" : ""} · slide ${c.slides.join(", ") || "?"}: "${c.text}" → ${c.question}`),
    `Đọc trang: \`node tools/page.mjs research/${rid} <url> --find "từ khoá|từ khoá"\` (trong --find đừng dùng ký tự $: viết 2.50, không viết $2.50).`,
    `Ghi \`research/${rid}/claims/<mã>/finding.json\` cho từng claim — Write tự tạo thư mục.`,
    "Lệnh shell phải bắt đầu đúng bằng `node tools/…`: thêm `cd … &&`, `mkdir`, `cat`, `ls` là bị chặn và mất một lượt. Đọc file bằng Read.",
    ...(retry.length ? [
      "",
      "Lần trước các claim dưới đây trượt soát — sửa **đúng** các lỗi ✗, giữ phần đã đạt. Bảng nguồn là kết quả soát từng trích đoạn:",
      ...retry.flatMap((r) => [
        `- ${r.claim}:`,
        ...r.problems.map((p) => `  ✗ ${p}`),
        ...r.warnings.map((w) => `  ⚠ ${w}`),
        ...r.sources.map((s) => `  · ${s.ref || "?"} ${s.status}${s.note ? ` (${s.note})` : ""} · ${s.publisher ?? s.domain ?? "?"} · ${s.kind ?? "?"} · ${s.published ?? "không ghi ngày"}`),
      ]),
      ...(ok.length ? [
        "Trang lượt này đã tải — gọi lại `node tools/page.mjs` với URL này là đọc từ đĩa, không tốn lượt tìm web; chỉ tìm web thêm khi thật sự thiếu nguồn:",
        ...ok.map((s) => `  ${s.id} ${s.url}${s.publisher ? ` · ${s.publisher}` : ""}${s.published ? ` · ${s.published.slice(0, 10)}` : ""}`),
      ] : []),
      ...(failed.length ? [`Không đọc được, đừng thử lại: ${failed.map((s) => s.url).join(" · ")}`] : []),
    ] : []),
    "",
    `Trước khi dừng, tự soát (không tải web, không ghi file): \`${selfCheckCommand(rid, ids)}\` — sửa hết dòng ✗ rồi soát lại, tối đa hai lần. Không tìm thêm được nguồn thì ghi verdict \`insufficient\` kèm \`reason\`, đừng để finding trượt.`,
    "Xong thì dừng, mỗi claim một dòng: mã, kết luận, số nguồn.",
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

/**
 * Mốc để kịch bản nói "tính đến …": `asOf` của phần soát (nguồn mới nhất, hoặc ngày Studio tải trang giá/docs chính thức
 * — tài liệu sống không ghi ngày), không có thì ngày mới nhất trong các nguồn đã soát được.
 */
function newestSource(check: ClaimCheck | undefined) {
  const dates = [check?.asOf ?? null, ...(check?.sources ?? []).filter((s) => s.status === "ok").map((s) => s.published)]
    .filter((d): d is string => Boolean(d)).map((d) => Date.parse(d)).filter(Number.isFinite);
  if (!dates.length) return null;
  const d = new Date(Math.max(...dates));
  return `tháng ${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

/**
 * Dữ kiện hay đổi (giá, bảng xếp hạng, phiên bản mới nhất) mà kịch bản nói "hiện nay" thì sai ngay khi video lên
 * sóng: lượt thật viết "GPT-4o hiện là hai phẩy năm đô la" từ một trang giá không ghi ngày.
 */
function timeNote(claim: Claim, check: ClaimCheck | undefined) {
  if (!claim.timeSensitive) return "";
  const date = newestSource(check);
  return date
    ? ` [hay đổi: nói kèm mốc "tính đến ${date}", không nói "hiện nay", "mới nhất"]`
    : ` [hay đổi, nguồn không ghi ngày: không nói "hiện nay", "mới nhất" — nói "theo công bố của …"]`;
}

/** Một dòng cho mỗi claim: kết luận và câu đúng để đặt vào kịch bản. */
function claimLines(claims: WriteContext["claims"]) {
  return claims.map(({ claim, check, finding }) => {
    const verdict = check?.verdict ?? finding?.verdict ?? null;
    const head = `- ${claim.id} · slide ${claim.slides.join(", ") || "?"} · "${claim.text}"`;
    if (!check?.ok) return `${head} → CHƯA QUA SOÁT — không được dùng.`;
    if (verdict === "insufficient") return `${head} → không đủ nguồn — chỉ được nói chừng mực, không khẳng định con số nào.`;
    const time = timeNote(claim, check);
    if (verdict === "ok") return `${`${head} → slide đúng. ${finding?.answer ?? ""}`.trim()}${time}`;
    return `${head} → SLIDE ${verdict === "wrong" ? "SAI" : "CẦN SỬA"}, viết theo câu này: "${finding?.corrected ?? finding?.answer ?? ""}"${time}`;
  });
}

const minutesText = (m: number) => `${String(m).replace(".", ",")} phút`;

/**
 * Mức độ dài báo trước cho người viết — đúng con số phần soát sẽ bắt (research-check.mjs). Lượt thật chỉ nhận
 * "khoảng 20 câu" rồi viết 34 câu, mỗi câu trung vị 33 từ: dài gấp đôi, và cả bảng giá được đọc thành lời.
 */
export function lengthLine(cues: number) {
  const b = scriptBudget(cues);
  return `Độ dài: khoảng ${b.cues} câu, tối đa ${b.maxCues}; mỗi câu ${SCRIPT_BUDGET.minWords}–${SCRIPT_BUDGET.maxWords} từ — cả bài khoảng ${b.words} từ, tức ~${minutesText(b.minutes)} lời đọc.`
    + " Slide nhiều hơn số câu thì gộp: một câu dựa được vào vài slide (`slide:3, slide:4`); giữ ý chính và các chỗ research đã sửa, bỏ ví dụ phụ.";
}

export function writePrompt(state: ResearchState, ctx: WriteContext) {
  return [
    head(state.id, "chặng 4 · viết kịch bản"),
    `Đọc \`${SKILL}/write.md\` và làm đúng. Không bật năng lực bổ sung nào (clip thường, một người dẫn).`,
    lengthLine(state.options.cues),
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

/**
 * Luật của mọi lượt sửa. Mỗi dòng là một cách lượt sửa thật đã làm hỏng kịch bản để "hết cảnh báo": bỏ "LLM" và
 * "API" khỏi cả bài giảng về LLM, và tách câu dài thành hai (26 lên 34 câu).
 */
const FIX_RULES = [
  "Khi sửa: làm đúng điều được nêu. Đừng xoá thuật ngữ, tên riêng hay con số chỉ để hết cảnh báo — không sửa cho đúng được thì để nguyên.",
  "Câu dài thì cắt ý phụ, đừng tách thành nhiều câu. Thêm/bớt câu thì đánh số lại liên tục từ đó.",
];

/**
 * Cảnh báo gửi được cho agent sửa kịch bản. Bỏ loại `pronounce` ("tên có chữ số — khai pronounce.json"): đó là việc
 * của bước làm video, sửa kịch bản không giải quyết được, chỉ dụ agent viết lại hay xoá tên riêng.
 */
export const fixableIssues = (check: ScriptCheck | null) => check?.issues?.filter((i) => i.code !== "pronounce") ?? [];

export function fixPrompt(rid: string, issues: ScriptIssue[], cues: number) {
  const long = issues.some((i) => i.code === "length");
  return [
    head(rid, "sửa kịch bản theo lỗi soát"),
    long
      ? `Sửa \`research/${rid}/output/kich-ban.md\` (quy tắc: \`${SKILL}/write.md\`). Kịch bản dài quá mức đặt: rút về khoảng ${cues} câu (tối đa ${scriptBudget(cues).maxCues}) — `
        + "gộp các câu cùng ý, cắt ý phụ và ví dụ thừa; giữ câu mở đầu, câu chốt mỗi phần và mọi câu dẫn claim (giữ nguyên mã claim ở dòng Nguồn). Rồi sửa các lỗi còn lại:"
      : `Sửa \`research/${rid}/output/kich-ban.md\` — chỉ đúng các chỗ sau, giữ nguyên phần còn lại (quy tắc: \`${SKILL}/write.md\`):`,
    ...issues.map((i) => `- ${where(i)}: ${i.message}`),
    ...FIX_RULES,
    tail,
  ].join("\n");
}

export function editPrompt(rid: string, ctx: WriteContext, length: { cues: number; target: number }) {
  return [
    head(rid, "chặng 5 · biên tập"),
    `Đọc \`${SKILL}/edit.md\` và làm đúng. Không sửa kịch bản; chỉ ghi \`research/${rid}/checks/edit.json\`.`,
    `Độ dài: bài có ${length.cues} câu, mức đặt khoảng ${length.target} (tối đa ${scriptBudget(length.target).maxCues}).`,
    "",
    "Kết luận research để đối chiếu từng câu (không cần đọc lại `finding.json`):",
    ...claimLines(ctx.claims),
    ...(ctx.dropped.length ? ["", "Ý đã bị bỏ ở cổng 2 — kịch bản nhắc tới là lỗi:", ...ctx.dropped.map((d) => `- "${d.text}"`)] : []),
    tail,
  ].join("\n");
}

/**
 * Một lượt sửa gom cả góp ý của biên tập lẫn cảnh báo của code (câu quá dài, cùng một kiểu đọc quá lâu…):
 * cảnh báo không chặn pipeline, nhưng để tới cổng 3 mới sửa thì người duyệt phải làm thay. Kèm độ dài hiện tại:
 * góp ý "thêm ví dụ", "thêm câu nối" cộng lại là cách một kịch bản đúng mức bị đẩy quá mức.
 */
export function applyEditPrompt(rid: string, edit: EditReview | null, issues: ScriptIssue[], length: { cues: number; target: number; ratio?: number }) {
  const b = scriptBudget(length.target);
  // Đủ câu, hoặc ít câu mà nhiều chữ (`ratio` tính cả số từ) — cả hai đều là "đã chạm mức".
  const full = length.cues >= b.maxCues || (length.ratio ?? 0) >= 1;
  const problems = issues.filter((i) => i.level === "problem");
  const warnings = issues.filter((i) => i.level === "warning");
  return [
    head(rid, "sửa kịch bản theo biên tập"),
    `Sửa \`research/${rid}/output/kich-ban.md\` — chỉ các câu được nêu, giữ nguyên phần còn lại (quy tắc: \`${SKILL}/write.md\`).`,
    `Độ dài: bài đang có ${length.cues} câu, mức đặt khoảng ${b.cues} (tối đa ${b.maxCues}) — ${full ? "không thêm câu nào; góp ý cần thêm ý thì gộp vào câu sẵn có" : "chỉ thêm câu khi góp ý thật sự cần"}.`,
    ...(edit?.issues.length ? ["Góp ý của biên tập:", ...edit.issues.map((i) => `- ${i.cue ? `câu ${i.cue}` : "chung"} [${i.type}]: ${i.problem} → ${i.fix}`)] : []),
    ...(problems.length ? ["Lỗi soát tự động còn lại (phải sửa):", ...problems.map((i) => `- ${where(i)}: ${i.message}`)] : []),
    ...(warnings.length ? ["Cảnh báo của phần soát tự động (nên sửa nếu không làm hỏng ý):", ...warnings.map((i) => `- ${where(i)}: ${i.message}`)] : []),
    ...FIX_RULES,
    tail,
  ].join("\n");
}

export function revisePrompt(rid: string, feedback: string, edit: EditReview | null, cues: number) {
  return [
    head(rid, "sửa kịch bản theo góp ý người duyệt"),
    `Sửa \`research/${rid}/output/kich-ban.md\` theo góp ý dưới đây (quy tắc: \`${SKILL}/write.md\`). Góp ý của người duyệt được ưu tiên hơn mọi gợi ý khác.`,
    `"""${feedback.trim()}"""`,
    ...(edit?.issues.length ? ["Nếu cần tham khảo, góp ý biên tập trước đó nằm ở `checks/edit.json`."] : []),
    "Dữ kiện mới vẫn chỉ được lấy từ slide và finding đã qua soát.",
    `Mức đặt khoảng ${cues} câu (tối đa ${scriptBudget(cues).maxCues}) — giữ trong khoảng đó, trừ khi góp ý yêu cầu khác.`,
    FIX_RULES[0],
    tail,
  ].join("\n");
}
