import { describe, expect, it } from "vitest";
import { blankClaim, type ClaimCheck, type Finding, type ResearchRun, type ResearchStage, type ResearchStatus, type ResearchView } from "./research";
import {
  bestQuote, citingCues, claimOutcome, defaultNode, edgeState, gateLabel, nodeStates, parseScript, plainReason, researchProgress, runsSummary,
  runStatus, slideRefs, stripAgentText,
} from "./research-ui";

const check = (claim: string, patch: Partial<ClaimCheck> = {}): ClaimCheck => ({
  claim, ok: true, verdict: "ok", quotes: { total: 1, verified: 1, unverifiable: 0 }, problems: [], warnings: [], ...patch,
});
const finding = (claim: string, verdict: Finding["verdict"], evidence: Finding["evidence"] = []): Finding => ({ claim, verdict, answer: "", sources: [], evidence });

function view(stage: ResearchStage, status: ResearchStatus, patch: Partial<ResearchView> = {}, state: Partial<ResearchView["state"]> = {}): ResearchView {
  return {
    state: {
      version: 1, id: "bai-1", title: "Bài 1", createdAt: "2026-09-22T05:56:18Z", agent: "claude", options: { cues: 20 },
      deck: { name: "x.pdf", format: "pdf", file: "input/slide.pdf", text: null, slides: 78, bytes: 1 },
      stage, status, error: null, gates: {}, attempts: {}, runs: [], ...state,
    },
    outline: [], claims: [blankClaim("c1"), blankClaim("c2")], findings: {}, evidence: {}, sources: {}, script: null, scriptCheck: null, edit: null, job: null, logs: [],
    ...patch,
  };
}

describe("dải sơ đồ: trạng thái bảy ô theo chặng", () => {
  it("đang đọc slide: ô đầu chạy, còn lại chưa tới", () => {
    const s = nodeStates(view("extract", "running"), true);
    expect(s).toEqual({ slide: "running", gate1: "pending", research: "pending", gate2: "pending", script: "pending", gate3: "pending", video: "pending" });
  });

  it("chờ cổng 1: ô trước xong, hình thoi chờ", () => {
    const s = nodeStates(view("gate1", "waiting"), false);
    expect([s.slide, s.gate1, s.research]).toEqual(["done", "waiting", "pending"]);
  });

  it("cổng 2 tự qua và tra nguồn bỏ qua khi không có điều nào", () => {
    const auto = nodeStates(view("gate3", "waiting", {}, { gates: { gate2: { at: "x", auto: true } } }), false);
    expect([auto.gate2, auto.script, auto.gate3]).toEqual(["auto", "done", "waiting"]);
    expect(nodeStates(view("gate3", "waiting", { claims: [] }), false).research).toBe("skipped");
  });

  it("lỗi và dừng: \"Đã dừng.\" là dừng, còn lại là lỗi", () => {
    expect(nodeStates(view("research", "failed", {}, { error: "Claude Code chưa đăng nhập" }), false).research).toBe("error");
    expect(nodeStates(view("research", "failed", {}, { error: "Đã dừng." }), false).research).toBe("stopped");
    expect(nodeStates(view("write", "idle"), false).script).toBe("stopped");
  });

  it("xong: mọi ô xong; ô mặc định theo chặng", () => {
    expect(Object.values(nodeStates(view("done", "done"), false)).every((s) => s === "done")).toBe(true);
    expect(defaultNode(view("review", "running"))).toBe("script");
    expect(defaultNode(view("done", "done"))).toBe("video");
    expect(defaultNode(view("gate2", "waiting"))).toBe("gate2");
  });

  it("đường nối và nhãn hình thoi", () => {
    expect([edgeState("running"), edgeState("waiting"), edgeState("pending"), edgeState("auto")]).toEqual(["is-active", "is-waiting", "is-pending", "is-done"]);
    expect([gateLabel("gate2", "auto"), gateLabel("gate1", "waiting"), gateLabel("gate3", "pending")]).toEqual(["Tự qua", "Chờ bạn duyệt", "Bạn duyệt"]);
  });
});

describe("kết quả từng điều cần kiểm", () => {
  const v = view("gate3", "waiting", {
    claims: ["c1", "c3", "c4", "c9", "c11", "c12"].map(blankClaim),
    findings: { c1: finding("c1", "ok"), c3: finding("c3", "fix"), c4: finding("c4", "insufficient"), c9: finding("c9", "wrong") },
    evidence: {
      c1: check("c1"), c3: check("c3", { verdict: "fix" }), c4: check("c4", { verdict: "insufficient" }), c9: check("c9", { verdict: "wrong" }),
      c11: check("c11", { ok: false }),
    },
  });

  it("khớp · sửa theo nguồn (cả fix lẫn wrong) · chưa đủ nguồn · chưa khớp trang gốc · chưa có", () => {
    expect(["c1", "c3", "c4", "c9", "c11", "c12"].map((c) => claimOutcome(v, c))).toEqual(["ok", "fixed", "thin", "fixed", "bad", "none"]);
  });

  it("đang tra thắng mọi kết quả; trước cổng 2 thì \"chờ tra\" chứ không phải \"chưa có\"", () => {
    expect(claimOutcome(v, "c1", new Set(["c1"]))).toBe("busy");
    expect(claimOutcome(view("research", "running"), "c1")).toBe("wait");
  });

  it("tiến độ: đạt soát, hoặc đã tra đủ hai lần", () => {
    const p = researchProgress({ ...v, state: { ...v.state, attempts: { c11: 2 } } });
    expect(p).toEqual({ done: 5, total: 6 });
  });

  it("trích dẫn tiêu biểu: kết luận sửa thì câu khác slide", () => {
    const f = finding("c3", "fix", [{ source: "s1", quote: "a", stance: "supports" }, { source: "s2", quote: "b", stance: "contradicts" }]);
    expect(bestQuote(f)?.quote).toBe("b");
    expect(bestQuote(finding("c1", "ok", [{ source: "s1", quote: "a", stance: "context" }, { source: "s1", quote: "c", stance: "supports" }]))?.quote).toBe("c");
    expect(bestQuote(finding("c4", "insufficient"))).toBeNull();
  });
});

describe("lý do bằng lời người đọc", () => {
  it.each([
    ["trượt soát bằng chứng", "Trích dẫn agent đưa ra chưa khớp trang gốc, kể cả sau lần tra lại."],
    ["chưa có finding.json", "Agent chưa trả kết quả cho điều này (lượt bị dừng giữa chừng)."],
    ["agent báo không tìm đủ nguồn", "Agent không tìm được nguồn đủ tin cậy."],
    ["dùng lại dữ kiện đã soát ngày 2026-09-22", "Kết quả lấy lại từ lần kiểm ngày 22/9/2026 — dữ kiện hay đổi, nên xem lại nguồn."],
    ["claim khó nhưng không nguồn căn cứ nào là chính thức/nghiên cứu/tham khảo — toàn báo", "Chỉ có báo hoặc blog thuật lại, chưa thấy nguồn gốc (trang chính thức, bài nghiên cứu)."],
    ["dữ kiện hay đổi nhưng không nguồn căn cứ nào ghi ngày — người duyệt nên xem độ mới", "Dữ kiện hay đổi mà không nguồn nào ghi ngày đăng — chưa chắc còn mới."],
    ["dữ kiện hay đổi nhưng nguồn mới nhất là 2024-05-13 — cần nguồn trong 12 tháng", "Nguồn mới nhất từ 13/5/2024 — quá 12 tháng với dữ kiện hay đổi."],
    ['kết luận "ok" nhưng có trích đoạn phản bác — người duyệt nên xem', "Có nguồn nói ngược với kết luận."],
    ['chỉ có 1 nơi xuất bản và nhãn "official" là do agent tự khai (llama.com) — người duyệt', "Chỉ có một nguồn, và agent tự nhận đó là trang chính thức (llama.com) — nên xem lại."],
    ["claim thường cần 2 nơi xuất bản độc lập hoặc 1 nguồn chính thức — mới có 1 nơi", "Cần 2 nơi xuất bản độc lập hoặc 1 nguồn chính thức — mới có 1."],
    ["claim dễ cần 1 nguồn chính thức/tham khảo, hoặc 2 nguồn ở hai nơi xuất bản", "Cần 1 nguồn chính thức, hoặc 2 nguồn ở hai nơi xuất bản khác nhau."],
    ["trích đoạn 3 (s12): không có nguyên văn trong trang gốc", "Trích dẫn 3 không có nguyên văn trong trang gốc."],
    ["trích đoạn 1 (s6): không đọc được trang gốc (HTTP 403)", "Không tải được trang gốc để đối chiếu trích dẫn 1."],
    ["trích đoạn 1 (s33): trích đoạn ngắn quá (dưới 25 ký tự) để chứng minh điều gì", "Trích dẫn 1 ngắn quá để làm căn cứ."],
    ["không có trích đoạn nào (`evidence`)", "Không có trích dẫn nào đối chiếu được với trang gốc."],
    ["dữ kiện dùng lại đã hết hạn hoặc không còn khớp claim — research lại", "Kết quả dùng lại đã hết hạn — cần tra lại."],
    ['cờ "dùng lại dữ kiện" không khớp dữ kiện nào trong thư viện', "Kết quả ghi là dùng lại nhưng không khớp thư viện — Studio đã đối chiếu lại như thường."],
  ])("%s", (raw, plain) => expect(plainReason(raw)).toBe(plain));

  it("câu chưa có trong bảng thì hiện nguyên văn, không giấu", () => {
    expect(plainReason("một lỗi mới")).toBe("Studio ghi: một lỗi mới");
  });
});

describe("chữ của agent, lượt và chi phí", () => {
  it("câu agent vừa nói gọn một dòng, bỏ markdown", () => {
    const said = "- **c9** — fix, 2 nguồn: giá GPT-4o hiện tại là `$2.50/$10` mỗi 1M token (không phải $5/$20), context 128K đúng.";
    expect(stripAgentText(said)).toBe("c9 — fix, 2 nguồn: giá GPT-4o hiện tại là $2.50/$10 mỗi 1M token (không phải $5/$20), context 128K đúng.");
    expect(stripAgentText("a ".repeat(200), 20).endsWith("…")).toBe(true);
  });

  it("trạng thái lượt trong bộ chọn", () => {
    expect(runStatus({ status: "waiting", stage: "gate3", sample: false }).word).toBe("Chờ bạn");
    expect(runStatus({ status: "failed", stage: "research", sample: false }).word).toBe("Dừng giữa chừng");
    expect(runStatus({ status: "done", stage: "done", sample: true }).word).toBe("Mẫu · chỉ xem");
  });

  it("tổng lần gọi, phút agent chạy, token và chi phí", () => {
    const run = (n: number, min: number, usd: number): ResearchRun => ({
      n, step: "research", agent: "claude", startedAt: "2026-09-22T06:00:00Z", endedAt: new Date(Date.parse("2026-09-22T06:00:00Z") + min * 60_000).toISOString(),
      result: "ok", usage: { input: 10, output: 20, cacheRead: 30, cacheWrite: 40 }, costUsd: usd,
    });
    expect(runsSummary([run(1, 3, 0.5), run(2, 5, 1.25)])).toEqual({ calls: 2, minutes: 8, tokens: 200, usd: 1.75 });
  });
});

describe("đọc kịch bản", () => {
  const md = [
    "# Bài", "", "## 1 · Mở đầu", "", "### Câu 22", "- **Kiểu:** giảng", "- **Lời:** Một token tiếng Anh", "  khoảng ba phần tư từ.",
    "- **Trên màn hình:** 1 token ≈ 0.75 từ", "- **Nguồn:** slide:37, c6", "", "### Câu 23", "- **Lời:** Tiếng Việt thì tốn hơn.", "- **Nguồn:** slide:37, slide: 38, C6",
  ].join("\n");
  const cues = parseScript(md);

  it("gom dòng tiếp nối, đọc mã nguồn và slide", () => {
    expect(cues[0].fields["lời"]).toBe("Một token tiếng Anh khoảng ba phần tư từ.");
    expect(cues[0].section).toBe("1 · Mở đầu");
    expect(citingCues(cues, "c6")).toEqual([22, 23]);
    expect(slideRefs(cues[1])).toEqual([37, 38]);
  });
});
