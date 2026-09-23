import fs from "node:fs";
import path from "node:path";
import { KIND_LABEL, type Claim, type ClaimCheck, type EditReview, type Finding, type OutlineSlide, type ResearchState, type ResearchSummary, type ResearchView, type ScriptCheck, type SourceInfo } from "../../research";
import type { LogEntry } from "../../types";
import { currentJob, emit, isRunning, registry } from "../jobs";
import { exists, HttpError, REPO, safeJoin } from "../paths";

/**
 * Thư mục của pipeline research. **Không** nằm trong `projects/`: `listVideos()` coi mỗi thư mục con ở đó là
 * một video. Cả thư mục bị gitignore. Lượt mẫu chỉ-xem sẽ ở `research/template-research/` (git add -f từng
 * file, `"sample": true` trong state.json) — chưa có, chờ chọn slide được phép commit.
 */
export const RESEARCH_ROOT = path.join(REPO, "research");
export const RUN_ID_RE = /^[a-z0-9][a-z0-9-]{1,80}$/;

/** Khoá của một lượt trong bộ đăng ký job/nhật ký chung — không trùng được với mã video (có dấu hai chấm). */
export const jobKey = (rid: string) => `research:${rid}`;

export function assertRunId(rid: string) {
  if (!RUN_ID_RE.test(rid) || rid.startsWith("_")) throw new HttpError(400, "Mã lượt research không hợp lệ.");
}

export function runDir(rid: string) {
  assertRunId(rid);
  return safeJoin(RESEARCH_ROOT, rid);
}

/** Đường dẫn tính từ gốc repo — thứ agent và công cụ dòng lệnh nhận. */
export const runRel = (rid: string) => `research/${rid}`;

function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as T; } catch { return fallback; }
}

const RENAME_RETRY_MS = 1500;

/**
 * Ghi qua file tạm rồi đổi tên, để trang (hay công cụ dòng lệnh) không bao giờ đọc thấy nửa file. Trên Windows
 * đổi tên đè lên file đang có tiến trình khác mở để đọc thì hỏng với EPERM/EACCES/EBUSY — thử lại trong chốc
 * lát (như `tools/lib/research-store.mjs`), vẫn hỏng thì dọn file tạm rồi báo lỗi.
 */
export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 1)}\n`);
  const deadline = Date.now() + RENAME_RETRY_MS;
  const nap = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (!["EPERM", "EACCES", "EBUSY"].includes(code) || Date.now() > deadline) {
        fs.rmSync(tmp, { force: true });
        throw error;
      }
      Atomics.wait(nap, 0, 0, 20);
    }
  }
}

export function readState(rid: string): ResearchState {
  const file = path.join(runDir(rid), "state.json");
  if (!exists(file)) throw new HttpError(404, `Không có lượt research ${rid}.`);
  const state = readJson<ResearchState | null>(file, null);
  if (!state) throw new HttpError(500, `state.json của ${rid} hỏng.`);
  // Studio khởi động lại giữa lúc agent chạy: tiến trình đã chết theo, đừng để trang tưởng nó còn chạy.
  if (state.status === "running" && !isRunning(jobKey(rid))) {
    return { ...state, status: "failed", error: "Studio đã khởi động lại giữa chừng — bấm Chạy tiếp." };
  }
  return state;
}

export function updateState(rid: string, patch: (state: ResearchState) => void) {
  const state = readState(rid);
  patch(state);
  writeJson(path.join(runDir(rid), "state.json"), state);
  emit(jobKey(rid), { type: "state" });
  return state;
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const DIFFICULTIES = ["easy", "normal", "hard"];
const PRIORITIES = ["high", "normal", "low"];
const KINDS = Object.keys(KIND_LABEL);
const text = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

/**
 * claims.json như agent ghi — có thể thiếu trường hay sai giá trị (agent không phải lúc nào cũng theo đúng
 * hợp đồng, và Antigravity không có ép cấu trúc). Chuẩn hoá ở một chỗ để không phần nào phía sau vấp: một
 * độ khó lạ từng làm vòng research quay mãi không có lô nào để chạy; một claim thiếu `priority` từng hiện
 * "Cao" ở cổng 1 mà bấm "Cao" không ăn (ô chọn tự lấy lựa chọn đầu khi giá trị trống).
 */
export const readClaims = (rid: string): Claim[] =>
  arr<Claim>(readJson<{ claims?: unknown }>(path.join(runDir(rid), "claims.json"), {}).claims)
    .filter((c) => c && typeof c === "object" && /^c\d{1,3}$/.test(String(c.id)))
    .map((c) => ({
      ...c,
      slides: arr<unknown>(c.slides).filter((n): n is number => Number.isInteger(n)),
      text: text(c.text),
      question: text(c.question),
      kind: KINDS.includes(c.kind) ? c.kind : "technical",
      difficulty: DIFFICULTIES.includes(c.difficulty) ? c.difficulty : "normal",
      priority: PRIORITIES.includes(c.priority) ? c.priority : "normal",
      timeSensitive: c.timeSensitive === true,
    }));

/** finding.json của agent, với các mảng luôn là mảng — trang đọc thẳng `evidence.length`. */
export function readFinding(rid: string, cid: string): Finding | null {
  if (!/^c\d{1,3}$/.test(cid)) return null;
  const f = readJson<Finding | null>(path.join(runDir(rid), "claims", cid, "finding.json"), null);
  if (!f || typeof f !== "object") return null;
  return { ...f, sources: arr(f.sources), evidence: arr<Finding["evidence"][number]>(f.evidence).filter((e) => e && typeof e === "object") };
}

/** Mọi nguồn lượt này đã tải — để nói cho agent biết trang nào có sẵn, gọi page.mjs là đọc từ đĩa. */
export const readSources = (rid: string): SourceInfo[] =>
  Object.values(readJson<{ sources?: Record<string, SourceInfo> }>(path.join(runDir(rid), "sources", "index.json"), {}).sources ?? {});

/**
 * outline.json đúng hình dạng trang và prompt dùng, `null` khi chưa có. Soát bóc tách chỉ nhắc khi mục thiếu tiêu
 * đề hay ý, không soát kiểu — một năm agent ghi thành số (2030) hay một ý `null` từng làm cổng 1 vỡ trắng trang.
 */
function outlineOf(rid: string): OutlineSlide[] | null {
  const raw = readJson<{ outline?: unknown } | null>(path.join(runDir(rid), "outline.json"), null);
  if (!raw || !Array.isArray(raw.outline)) return null;
  return arr<Record<string, unknown>>(raw.outline)
    .filter((o) => o && typeof o === "object" && Number.isInteger(o.slide))
    .map((o) => ({
      slide: o.slide as number,
      ...(text(o.heading) ? { heading: text(o.heading) } : {}),
      points: arr<unknown>(o.points).map(text).filter((p) => p.trim()),
      ...(o.skip === true ? { skip: true } : {}),
    }));
}

/** Dàn ý slide chặng bóc tách ghi ra — chặng viết nhận nó qua prompt thay vì tự Read. */
export const readOutline = (rid: string): OutlineSlide[] => outlineOf(rid) ?? [];

export const readEvidence = (rid: string): Record<string, ClaimCheck> =>
  readJson<{ claims?: Record<string, ClaimCheck> }>(path.join(runDir(rid), "checks", "evidence.json"), {}).claims ?? {};

export function readScriptCheck(rid: string): ScriptCheck | null {
  const r = readJson<ScriptCheck | null>(path.join(runDir(rid), "checks", "script.json"), null);
  return r && Array.isArray(r.issues) && r.stats ? r : null;
}

/** checks/edit.json do agent biên tập ghi — thiếu `issues` hay `score` thì coi như không có góp ý. */
export function readEdit(rid: string): EditReview | null {
  const r = readJson<Partial<EditReview> | null>(path.join(runDir(rid), "checks", "edit.json"), null);
  if (!r || typeof r !== "object") return null;
  const score = r.score && typeof r.score === "object" && !Array.isArray(r.score) ? r.score : {};
  return { score, issues: arr<EditReview["issues"][number]>(r.issues).filter((i) => i && typeof i === "object") };
}

/**
 * Xoá kết quả research của vài claim — finding, phản hồi soát, và dòng của chúng trong checks/evidence.json.
 * Mã claim (c1, c2…) được dùng lại khi bóc tách lại: kết quả cũ mà còn thì claim mới mang nhầm kết luận
 * của claim cũ cùng mã.
 */
export function dropClaimResults(rid: string, ids: string[]) {
  if (!ids.length) return;
  const dir = runDir(rid);
  for (const id of ids) if (/^c\d{1,3}$/.test(id)) fs.rmSync(path.join(dir, "claims", id), { recursive: true, force: true });
  const file = path.join(dir, "checks", "evidence.json");
  const report = readJson<{ claims?: Record<string, unknown> } | null>(file, null);
  if (report?.claims) {
    for (const id of ids) delete report.claims[id];
    writeJson(file, report);
  }
}

/** Mọi thứ sinh ra từ chặng bóc tách trở đi — dọn sạch khi bóc tách lại từ đầu. */
export function clearFromExtract(rid: string) {
  const dir = runDir(rid);
  for (const rel of ["outline.json", "claims.json", "claims", "checks", "output"]) fs.rmSync(path.join(dir, rel), { recursive: true, force: true });
}

/** Kết quả soát và biên tập kịch bản — dọn khi viết lại từ đầu. */
export function clearScript(rid: string) {
  const dir = runDir(rid);
  for (const rel of ["output", path.join("checks", "script.json"), path.join("checks", "edit.json")]) fs.rmSync(path.join(dir, rel), { recursive: true, force: true });
}

export function readScript(rid: string) {
  try { return fs.readFileSync(path.join(runDir(rid), "output", "kich-ban.md"), "utf8"); } catch { return null; }
}

// ── nhật ký ───────────────────────────────────────────────────────────────────────

const MAX_LOGS = 1500;

/**
 * Nhật ký của một lượt: `research/<rid>/log.jsonl` trên đĩa, bản gần nhất trong bộ nhớ chung với job, và
 * phát ra trang qua cùng kênh SSE. Không dùng `jobs.log` — hàm đó ghi vào `projects/<id>/.studio/`.
 */
export function researchLog(rid: string, kind: LogEntry["kind"], text: string) {
  const entry: LogEntry = { t: Date.now(), kind, text };
  const list = researchLogs(rid);
  list.push(entry);
  if (list.length > MAX_LOGS) list.splice(0, list.length - MAX_LOGS);
  try { fs.appendFileSync(path.join(runDir(rid), "log.jsonl"), `${JSON.stringify(entry)}\n`); } catch {}
  emit(jobKey(rid), { type: "log", entry });
}

export function researchLogs(rid: string) {
  const key = jobKey(rid);
  let list = registry.logs.get(key);
  if (!list) {
    list = [];
    const file = path.join(runDir(rid), "log.jsonl");
    if (exists(file)) {
      for (const line of fs.readFileSync(file, "utf8").trim().split("\n").slice(-400)) {
        try { list.push(JSON.parse(line)); } catch {}
      }
    }
    registry.logs.set(key, list);
  }
  return list;
}

// ── đọc cho trang ─────────────────────────────────────────────────────────────────

export function readView(rid: string): ResearchView {
  const dir = runDir(rid);
  const state = readState(rid);
  const claims = readClaims(rid);
  const findings: Record<string, Finding> = {};
  for (const c of claims) {
    const f = readFinding(rid, c.id);
    if (f) findings[c.id] = f;
  }
  const index = readJson<{ sources?: Record<string, SourceInfo> }>(path.join(dir, "sources", "index.json"), {});
  const outline = outlineOf(rid);
  return {
    state,
    outline,
    claims,
    findings,
    evidence: readEvidence(rid),
    sources: index.sources ?? {},
    script: readScript(rid),
    scriptCheck: readScriptCheck(rid),
    edit: readEdit(rid),
    job: currentJob(jobKey(rid)),
    logs: researchLogs(rid).slice(-400),
  };
}

export function listRuns(): ResearchSummary[] {
  if (!exists(RESEARCH_ROOT)) return [];
  const out: ResearchSummary[] = [];
  for (const name of fs.readdirSync(RESEARCH_ROOT)) {
    if (!RUN_ID_RE.test(name) || name.startsWith("_")) continue;
    try {
      const state = readState(name);
      const evidence = readEvidence(name);
      const claims = readClaims(name);
      out.push({
        id: state.id, title: state.title, createdAt: state.createdAt, stage: state.stage, status: state.status, agent: state.agent,
        claims: claims.length, passed: claims.filter((c) => evidence[c.id]?.ok).length, sample: Boolean(state.sample),
      });
    } catch {
      // Thư mục dở dang (không có state.json) không phải một lượt — bỏ qua, đừng làm hỏng cả danh sách.
    }
  }
  // Mẫu luôn nằm cuối: nó là tài liệu tham khảo, không phải việc đang làm.
  return out.sort((a, b) => Number(a.sample) - Number(b.sample) || b.createdAt.localeCompare(a.createdAt));
}

/** Lượt mẫu chỉ để xem: mọi thao tác chạy agent hay sửa đều bị chặn ở đây. */
export function assertEditable(state: ResearchState) {
  if (state.sample) throw new HttpError(403, "Đây là lượt mẫu — chỉ xem, không chạy lại được. Tạo lượt mới từ slide của bạn.");
}
