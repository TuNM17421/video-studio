import type { Finding, ResearchRun, ResearchStage, ResearchSummary, ResearchView, Verdict } from "./research";

/**
 * Trang Đóng gói kịch bản: phần tính toán không đụng tới React — trạng thái của bảy ô trên dải sơ đồ, kết quả từng
 * điều cần kiểm, câu chữ hiển thị. Tách ra đây để kiểm được bằng test trên dữ liệu lượt thật, và để mọi chỗ trên
 * trang (dải sơ đồ, thanh quyết định, danh sách, cột nguồn) dùng chung một bộ từ.
 */

// ── dải sơ đồ ─────────────────────────────────────────────────────────────────────

export type NodeId = "slide" | "gate1" | "research" | "gate2" | "script" | "gate3" | "video";
export type GateId = "gate1" | "gate2" | "gate3";
export const NODE_ORDER: NodeId[] = ["slide", "gate1", "research", "gate2", "script", "gate3", "video"];
const ORDER = Object.fromEntries(NODE_ORDER.map((n, i) => [n, i])) as Record<NodeId, number>;
export const isGate = (n: NodeId): n is GateId => n === "gate1" || n === "gate2" || n === "gate3";

export const STEP_NAME: Record<NodeId, string> = {
  slide: "Đọc slide",
  gate1: "Bạn duyệt",
  research: "Tra nguồn",
  gate2: "Bạn quyết",
  script: "Viết kịch bản",
  gate3: "Bạn duyệt",
  video: "Tạo video",
};

/** Lời giải thích từng bước — tooltip trên dải sơ đồ, và thân của bước chưa tới. */
export const STEP_HELP: Record<NodeId, string> = {
  slide: "Agent đọc từng slide, ghi dàn ý và chọn những điều nên kiểm trên web: số liệu, mốc năm, tên và giá sản phẩm.",
  gate1: "Bạn xem danh sách điều cần kiểm: bỏ điều không cần, sửa điều agent chép sai. Agent chỉ tra những điều bạn giữ.",
  research: "Agent tìm trang gốc cho từng điều và chép nguyên văn đoạn làm căn cứ. Studio tự mở trang đó để đối chiếu — trích dẫn không khớp thì agent tra lại.",
  gate2: "Studio chỉ dừng ở đây khi có điều chưa đủ căn cứ. Bạn chọn: giữ kết quả, tra lại hay bỏ khỏi kịch bản.",
  script: "Agent viết kịch bản theo mẫu, mỗi câu ghi nguồn. Studio kiểm tra mẫu, một agent khác đọc lại và góp ý, rồi agent sửa.",
  gate3: "Bạn đọc kịch bản, xem nguồn của từng câu, rồi duyệt — hoặc góp ý để agent sửa.",
  video: "Mở bước Kế hoạch của trang Video mới với kịch bản này điền sẵn.",
};

/** Dòng trạng thái của dải sơ đồ khi chưa chọn lượt nào. */
export const PREVIEW_STATUS: Partial<Record<NodeId, string>> = {
  slide: "chọn điều cần kiểm",
  research: "đối chiếu trang gốc",
  script: "có dẫn nguồn",
  video: "mở trang Video mới",
};

export function nodeOfStage(stage: ResearchStage): NodeId {
  if (stage === "extract") return "slide";
  if (stage === "write" || stage === "review" || stage === "revise") return "script";
  if (stage === "done") return "video";
  return stage;
}

export type NodeState = "done" | "auto" | "skipped" | "pending" | "waiting" | "running" | "error" | "stopped";

export function nodeStates(view: ResearchView, running: boolean): Record<NodeId, NodeState> {
  const { stage, status, error, gates } = view.state;
  const cur = nodeOfStage(stage);
  const out = {} as Record<NodeId, NodeState>;
  for (const n of NODE_ORDER) {
    if (stage === "done" || ORDER[n] < ORDER[cur]) {
      out[n] = n === "gate2" && gates.gate2?.auto ? "auto" : n === "research" && view.claims.length === 0 ? "skipped" : "done";
    } else if (ORDER[n] > ORDER[cur]) out[n] = "pending";
    else if (status === "waiting") out[n] = "waiting";
    else if (running || status === "running") out[n] = "running";
    else if (status === "failed" && error !== "Đã dừng.") out[n] = "error";
    else out[n] = "stopped";
  }
  return out;
}

export const defaultNode = (view: ResearchView): NodeId => nodeOfStage(view.state.stage);

/** Đường nối đi vào một ô, theo trạng thái của ô đó. */
export function edgeState(s: NodeState): "is-done" | "is-active" | "is-waiting" | "is-pending" {
  if (s === "running") return "is-active";
  if (s === "waiting") return "is-waiting";
  if (s === "pending") return "is-pending";
  return "is-done";
}

export const GATE_LABEL: Record<GateId, Record<"pending" | "waiting" | "done" | "auto", string>> = {
  gate1: { pending: "Bạn duyệt", waiting: "Chờ bạn duyệt", done: "Đã duyệt", auto: "Đã duyệt" },
  gate2: { pending: "Bạn quyết", waiting: "Chờ bạn quyết", done: "Đã quyết", auto: "Tự qua" },
  gate3: { pending: "Bạn duyệt", waiting: "Chờ bạn duyệt", done: "Đã duyệt", auto: "Đã duyệt" },
};

export function gateLabel(gate: GateId, s: NodeState) {
  const labels = GATE_LABEL[gate];
  if (s === "waiting") return labels.waiting;
  if (s === "auto") return labels.auto;
  if (s === "pending" || s === "running") return labels.pending;
  return labels.done;
}

/** Chặng đã tới — một bước chỉ làm lại được khi lượt đã đi qua nó (máy chủ cũng chặn đúng như vậy). */
export const REACHED: Record<ResearchStage, number> = { extract: 0, gate1: 1, research: 2, gate2: 3, write: 4, review: 5, revise: 5, gate3: 6, done: 7 };

/** Tên bước người đọc hiểu, theo chặng của máy chủ. */
export function stageStepName(stage: ResearchStage) {
  if (stage === "extract" || stage === "gate1") return "Đọc slide";
  if (stage === "research" || stage === "gate2") return "Tra nguồn";
  return "Viết kịch bản";
}

// ── kết quả từng điều cần kiểm ────────────────────────────────────────────────────

export type Outcome = "wait" | "busy" | "ok" | "fixed" | "thin" | "bad" | "none";

export const OUTCOME_LABEL: Record<Outcome, string> = {
  wait: "Chờ tra",
  busy: "Đang tra",
  ok: "Khớp slide",
  fixed: "Sửa theo nguồn",
  thin: "Chưa đủ nguồn",
  bad: "Chưa khớp trang gốc",
  none: "Chưa có kết quả",
};

/** Bảng từ (tooltip gạch chấm): cùng một câu giải thích ở mọi chỗ từ đó xuất hiện. */
export const GLOSSARY: Record<string, string> = {
  "Khớp slide": "Nguồn xác nhận điều slide ghi. Kịch bản giữ như slide.",
  "Sửa theo nguồn": "Nguồn cho số hoặc tên khác slide (slide cũ hoặc sai). Kịch bản nói theo nguồn — video sẽ khác slide ở chỗ này.",
  "Chưa đủ nguồn": "Không tìm được nguồn đủ tin cậy. Kịch bản nhắc ý này nhưng không khẳng định con số hay dữ kiện.",
  "Chưa khớp trang gốc": "Trích dẫn agent đưa ra không có nguyên văn trong trang gốc Studio tự tải — cần tra lại hoặc bạn quyết.",
  "điều cần kiểm": "Một câu trên slide có thể sai hoặc đã cũ: số liệu, mốc năm, tên, giá hay phiên bản sản phẩm, trích lời. Mã c1, c2… ở cuối câu kịch bản trỏ về điều đó.",
  "Ghi chú dựng video": "Kiểu câu, slide gốc và lưu ý cách đọc tên riêng của từng câu — cần khi dựng video, không cần khi duyệt nội dung.",
  "lần gọi agent": "Mỗi lần Studio giao một việc cho agent coding trên máy bạn: đọc slide, tra một nhóm điều, viết, biên tập, sửa.",
};

/** Điều cần kiểm đang được một lần gọi agent tra (lần gọi cuối, chưa xong). */
export function busyClaims(view: ResearchView, running: boolean) {
  const last = view.state.runs.at(-1);
  return new Set(running && last && !last.endedAt && last.step === "research" ? last.claims ?? [] : []);
}

export function claimOutcome(view: ResearchView, cid: string, busy: Set<string> = new Set()): Outcome {
  if (busy.has(cid)) return "busy";
  const ev = view.evidence[cid];
  if (!ev || ev.missing) return REACHED[view.state.stage] >= REACHED.gate2 ? "none" : "wait";
  if (!ev.ok) return "bad";
  const verdict = view.findings[cid]?.verdict ?? ev.verdict;
  if (verdict === "ok") return "ok";
  if (verdict === "fix" || verdict === "wrong") return "fixed";
  if (verdict === "insufficient") return "thin";
  return "none";
}

/** Bao nhiêu điều đã có kết quả cuối: đạt soát, hoặc đã tra đủ hai lần. */
export function researchProgress(view: ResearchView) {
  const done = view.claims.filter((c) => {
    const ev = view.evidence[c.id];
    return ev && !ev.missing && (ev.ok || (view.state.attempts[c.id] ?? 0) >= 2);
  }).length;
  return { done, total: view.claims.length };
}

export function tally(view: ResearchView, busy: Set<string> = new Set()) {
  const out: Record<Outcome, number> = { wait: 0, busy: 0, ok: 0, fixed: 0, thin: 0, bad: 0, none: 0 };
  for (const c of view.claims) out[claimOutcome(view, c.id, busy)]++;
  return out;
}

/** Tiêu đề của phần "nguồn" một điều — nói kết quả và kịch bản đã làm gì với nó. */
export function verdictTitle(outcome: Outcome, verdict: Verdict | null | undefined) {
  if (outcome === "bad") return "Trích dẫn chưa khớp trang gốc";
  if (verdict === "ok") return "Khớp slide — kịch bản giữ như slide";
  if (verdict === "fix") return "Slide cần cập nhật — kịch bản viết theo nguồn";
  if (verdict === "wrong") return "Slide sai — kịch bản viết theo nguồn";
  if (verdict === "insufficient") return "Chưa đủ nguồn — kịch bản không khẳng định điều này";
  return "Chưa có kết quả tra nguồn";
}

export const STANCE_WORD = { supports: "khớp slide", contradicts: "khác slide", context: "bối cảnh" } as const;

/** Trích dẫn tiêu biểu: kết luận sửa/sai thì câu nói khác slide, kết luận khớp thì câu ủng hộ. */
export function bestQuote(finding: Finding | undefined) {
  const list = Array.isArray(finding?.evidence) ? finding.evidence : [];
  if (!list.length) return null;
  const want = finding!.verdict === "fix" || finding!.verdict === "wrong" ? "contradicts" : finding!.verdict === "ok" ? "supports" : null;
  return (want && list.find((e) => e.stance === want)) || list[0];
}

const dmy = (y: string, m: string, d: string) => `${Number(d)}/${Number(m)}/${y}`;

/**
 * Câu của bộ soát (tools/lib/research-check.mjs, research-verify.mjs) viết cho người đọc — cùng dữ kiện, bớt từ kỹ
 * thuật. Câu nào chưa có trong bảng thì hiện nguyên văn kèm "Studio ghi:", không giấu đi.
 */
const REASONS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^trượt soát bằng chứng/, () => "Trích dẫn agent đưa ra chưa khớp trang gốc, kể cả sau lần tra lại."],
  [/^chưa có kết quả research|^chưa có finding\.json/, () => "Agent chưa trả kết quả cho điều này (lượt bị dừng giữa chừng)."],
  [/^agent báo không tìm đủ nguồn/, () => "Agent không tìm được nguồn đủ tin cậy."],
  [/^dùng lại dữ kiện đã soát ngày (\d{4})-(\d{2})-(\d{2})/, (m) => `Kết quả lấy lại từ lần kiểm ngày ${dmy(m[1], m[2], m[3])} — dữ kiện hay đổi, nên xem lại nguồn.`],
  [/^claim khó nhưng không nguồn căn cứ nào là chính thức/, () => "Chỉ có báo hoặc blog thuật lại, chưa thấy nguồn gốc (trang chính thức, bài nghiên cứu)."],
  [/^dữ kiện hay đổi nhưng không nguồn căn cứ nào ghi ngày/, () => "Dữ kiện hay đổi mà không nguồn nào ghi ngày đăng — chưa chắc còn mới."],
  [/^dữ kiện hay đổi nhưng nguồn mới nhất là (\d{4})-(\d{2})-(\d{2})/, (m) => `Nguồn mới nhất từ ${dmy(m[1], m[2], m[3])} — quá 12 tháng với dữ kiện hay đổi.`],
  [/^kết luận "ok" nhưng có trích đoạn phản bác/, () => "Có nguồn nói ngược với kết luận."],
  [/^chỉ có 1 nơi xuất bản và nhãn "official" là do agent tự khai \(([^)]*)\)/, (m) => `Chỉ có một nguồn, và agent tự nhận đó là trang chính thức (${m[1]}) — nên xem lại.`],
  [/^claim (?:khó|thường) cần 2 nơi xuất bản độc lập hoặc 1 nguồn chính thức — mới có (\d+)/, (m) => `Cần 2 nơi xuất bản độc lập hoặc 1 nguồn chính thức — mới có ${m[1]}.`],
  [/^claim dễ cần 1 nguồn chính thức/, () => "Cần 1 nguồn chính thức, hoặc 2 nguồn ở hai nơi xuất bản khác nhau."],
  [/^trích đoạn (\d+) \([^)]*\): không có nguyên văn trong trang gốc/, (m) => `Trích dẫn ${m[1]} không có nguyên văn trong trang gốc.`],
  [/^trích đoạn (\d+) \([^)]*\): không đọc được trang gốc/, (m) => `Không tải được trang gốc để đối chiếu trích dẫn ${m[1]}.`],
  [/^trích đoạn (\d+) \([^)]*\): trích đoạn ngắn quá/, (m) => `Trích dẫn ${m[1]} ngắn quá để làm căn cứ.`],
  [/^không có trích đoạn/, () => "Không có trích dẫn nào đối chiếu được với trang gốc."],
  [/^dữ kiện dùng lại đã hết hạn/, () => "Kết quả dùng lại đã hết hạn — cần tra lại."],
  [/^cờ "dùng lại dữ kiện" không khớp/, () => "Kết quả ghi là dùng lại nhưng không khớp thư viện — Studio đã đối chiếu lại như thường."],
  [/^finding của c\d+ bị ghi lại ngoài lượt research/, () => "Kết quả bị ghi lại ngoài lần tra của nó — Studio đã đối chiếu lại."],
];

export function plainReason(raw: string) {
  for (const [re, say] of REASONS) {
    const m = re.exec(raw);
    if (m) return say(m);
  }
  return `Studio ghi: ${raw}`;
}

// ── câu chữ của agent, lượt, chi phí ─────────────────────────────────────────────

/** Câu agent vừa nói, gọn một dòng: bỏ dấu markdown, gộp khoảng trắng, cắt ở ranh giới từ. */
export function stripAgentText(text: string, max = 160) {
  const flat = String(text ?? "")
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+)/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,;:·—-]\s*$/, "")}…`;
}

/** Trạng thái một lượt trong bộ chọn — "Chờ bạn" nổi lên trước. */
export function runStatus(r: Pick<ResearchSummary, "status" | "stage" | "sample">): { word: string; tone: "waiting" | "running" | "error" | "idle" | "done" } {
  if (r.sample) return { word: "Mẫu · chỉ xem", tone: "idle" };
  if (r.stage === "done") return { word: "Xong", tone: "done" };
  if (r.status === "waiting") return { word: "Chờ bạn", tone: "waiting" };
  if (r.status === "running") return { word: "Đang chạy", tone: "running" };
  if (r.status === "failed") return { word: "Dừng giữa chừng", tone: "error" };
  return { word: "Đã dừng", tone: "idle" };
}

export const RUN_STEP_LABEL: Record<ResearchRun["step"], string> = {
  extract: "Đọc slide",
  research: "Tra nguồn",
  write: "Viết kịch bản",
  fix: "Sửa kịch bản",
  edit: "Biên tập",
};

const runMs = (r: ResearchRun) => (r.endedAt ? Math.max(0, Date.parse(r.endedAt) - Date.parse(r.startedAt)) : 0);

export function runsSummary(runs: ResearchRun[]) {
  const tokens = runs.reduce((sum, r) => sum + (r.usage ? r.usage.input + r.usage.cacheWrite + r.usage.cacheRead + r.usage.output : 0), 0);
  return {
    calls: runs.length,
    minutes: Math.round(runs.reduce((sum, r) => sum + runMs(r), 0) / 60_000),
    tokens,
    usd: runs.reduce((sum, r) => sum + (r.costUsd ?? 0), 0),
  };
}

export const runClock = (r: ResearchRun) => {
  if (!r.endedAt) return "đang chạy";
  const s = Math.round(runMs(r) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const plainTokens = (n: number) =>
  n >= 1e6 ? `≈ ${(n / 1e6).toFixed(1).replace(".", ",")} triệu token` : n >= 1e3 ? `≈ ${Math.round(n / 1e3)} nghìn token` : `${n} token`;

export const usdText = (n: number) => `${n.toFixed(2).replace(".", ",")} USD`;

const pad = (n: number) => String(n).padStart(2, "0");
/** `hh:mm d/m` theo giờ máy. */
export function fmtTime(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? `${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getDate()}/${d.getMonth() + 1}` : "";
}

// ── kịch bản ──────────────────────────────────────────────────────────────────────

export interface ScriptCue { n: number; section: string | null; fields: Record<string, string> }

/** Đọc kịch bản theo mẫu để hiển thị — bản đầy đủ (dùng để soát) nằm ở tools/lib/script-lint.mjs. */
export function parseScript(md: string): ScriptCue[] {
  const cues: ScriptCue[] = [];
  let section: string | null = null;
  let cue: ScriptCue | null = null;
  let last: string | null = null;
  for (const raw of String(md ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line) && !/^###/.test(line)) { section = line.replace(/^##\s+/, "").trim(); cue = null; last = null; continue; }
    const h = /^###\s+Câu\s+(\d+)/i.exec(line);
    if (h) { cue = { n: Number(h[1]), section, fields: {} }; cues.push(cue); last = null; continue; }
    const f = /^\s*-\s*\*\*([^*:]+?):?\*\*:?\s*(.*)$/.exec(line);
    if (f && cue) { last = f[1].trim().toLowerCase(); cue.fields[last] = f[2].trim(); continue; }
    // dòng tiếp nối của một trường (thụt lề, không phải gạch đầu dòng mới)
    if (cue && last && /^\s{2,}\S/.test(raw) && !/^\s*-\s/.test(raw)) { cue.fields[last] = `${cue.fields[last]} ${line.trim()}`.trim(); continue; }
    if (!line.trim()) last = null;
  }
  return cues;
}

const refs = (cue: ScriptCue) => (cue.fields["nguồn"] ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
export const claimRefs = (cue: ScriptCue) => refs(cue).filter((r) => /^c\d+$/i.test(r)).map((r) => r.toLowerCase());
export const slideRefs = (cue: ScriptCue) => refs(cue).map((r) => /^slide\s*:?\s*(\d+)$/i.exec(r)?.[1]).filter((n): n is string => Boolean(n)).map(Number);
export const citingCues = (cues: ScriptCue[], cid: string) => cues.filter((c) => claimRefs(c).includes(cid)).map((c) => c.n);
