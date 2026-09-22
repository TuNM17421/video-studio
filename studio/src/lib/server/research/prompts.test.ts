import { describe, expect, it } from "vitest";
import { blankClaim, type ClaimCheck, type Finding, type ResearchState, type ScriptCheck, type ScriptIssue, type SourceInfo } from "../../research";
import { applyEditPrompt, extractPrompt, fixableIssues, fixPrompt, lengthLine, researchPrompt, selfCheckCommand, writePrompt } from "./prompts";

const state = { id: "bai-1", options: { cues: 20 } } as unknown as ResearchState;
const issue = (patch: Partial<ScriptIssue>): ScriptIssue => ({ level: "warning", cue: 3, line: 12, message: "m", ...patch });

describe("độ dài báo trước cho người viết", () => {
  it("nói số câu, trần số câu, số từ mỗi câu và phút — đúng mức phần soát sẽ bắt", () => {
    const line = lengthLine(20);
    expect(line).toContain("khoảng 20 câu, tối đa 24");
    expect(line).toContain("15–30 từ");
    expect(line).toContain("480 từ");
    expect(line).toContain("~2,8 phút");
  });

  it("prompt viết mang dòng độ dài thay cho \"Khoảng N câu\" trơ trọi", () => {
    const prompt = writePrompt(state, { outline: [], claims: [], dropped: [] });
    expect(prompt).toContain(lengthLine(20));
    expect(prompt).not.toMatch(/Khoảng 20 câu\./);
  });
});

describe("dữ kiện hay đổi trong prompt viết", () => {
  const claim = { ...blankClaim("c4"), slides: [12], text: "GPT-4o giá 2,5 đô la", timeSensitive: true };
  const finding = { claim: "c4", verdict: "ok", answer: "GPT-4o giá 2,5 đô la mỗi triệu token đầu vào.", sources: [], evidence: [] } as Finding;
  const check = (published: string | null): ClaimCheck => ({
    claim: "c4", ok: true, verdict: "ok", quotes: { total: 1, verified: 1, unverifiable: 0 }, problems: [], warnings: [],
    sources: [{ ref: "s1", stance: "supports", status: "ok", note: null, publisher: null, domain: "openai.com", kind: "official", published }],
  });

  it("kèm mốc thời gian của nguồn mới nhất, cấm \"hiện nay\"", () => {
    const prompt = writePrompt(state, { outline: [], claims: [{ claim, check: check("2025-03-14"), finding }], dropped: [] });
    expect(prompt).toContain("tính đến tháng 3/2025");
    expect(prompt).toContain("không nói \"hiện nay\"");
  });

  it("nguồn không ghi ngày thì vẫn cấm \"hiện nay\", không bịa mốc", () => {
    const prompt = writePrompt(state, { outline: [], claims: [{ claim, check: check(null), finding }], dropped: [] });
    expect(prompt).toContain("nguồn không ghi ngày");
    expect(prompt).not.toContain("tính đến");
  });

  it("claim không hay đổi thì không kèm gì", () => {
    const prompt = writePrompt(state, { outline: [], claims: [{ claim: { ...claim, timeSensitive: false }, check: check("2025-03-14"), finding }], dropped: [] });
    expect(prompt).not.toContain("hay đổi");
  });
});

describe("lượt sửa", () => {
  it("không gửi việc của bước làm video (pronounce.json) cho agent sửa kịch bản", () => {
    const check = { issues: [issue({ code: "pronounce", message: "tên có chữ số (GPT-4)" }), issue({ message: "câu dài 50 từ" })] } as ScriptCheck;
    expect(fixableIssues(check).map((i) => i.message)).toEqual(["câu dài 50 từ"]);
  });

  it("lỗi độ dài thì bảo rút về mức đặt, giữ câu dẫn claim; luật cấm xoá thuật ngữ để hết cảnh báo luôn đi kèm", () => {
    const long = fixPrompt("bai-1", [issue({ level: "problem", cue: null, code: "length", message: "kịch bản dài 34 câu" })], 20);
    expect(long).toContain("rút về khoảng 20 câu (tối đa 24)");
    expect(long).toContain("giữ nguyên mã claim");
    expect(long).toContain("Đừng xoá thuật ngữ");
    const plain = fixPrompt("bai-1", [issue({ level: "problem", message: "thiếu dòng **Lời:**" })], 20);
    expect(plain).not.toContain("rút về");
    expect(plain).toContain("đừng tách thành nhiều câu");
  });

  it("sửa theo biên tập biết bài đang dài bao nhiêu — đã chạm trần thì không thêm câu", () => {
    const edit = { score: {}, issues: [{ cue: 2, type: "clarity", problem: "p", fix: "thêm một ví dụ" }] };
    expect(applyEditPrompt("bai-1", edit, [], { cues: 26, target: 20 })).toContain("không thêm câu nào");
    expect(applyEditPrompt("bai-1", edit, [], { cues: 18, target: 20 })).toContain("chỉ thêm câu khi góp ý thật sự cần");
    // Ít câu mà mỗi câu dài: số từ đã chạm mức thì cũng không thêm câu.
    expect(applyEditPrompt("bai-1", edit, [], { cues: 18, target: 20, ratio: 1.3 })).toContain("không thêm câu nào");
    const both = applyEditPrompt("bai-1", null, [issue({ level: "problem", message: "P" }), issue({ message: "W" })], { cues: 18, target: 20 });
    expect(both).toMatch(/phải sửa\):\n- câu 3: P/);
    expect(both).toMatch(/nên sửa nếu không làm hỏng ý\):\n- câu 3: W/);
  });
});

describe("prompt research", () => {
  const claim = { ...blankClaim("c9"), slides: [44], text: "GPT-4o giá 5/20 đô la", question: "Giá GPT-4o hiện nay?", timeSensitive: true };

  it("dặn tự soát đúng lô trước khi dừng, và các lệnh hay bị chặn", () => {
    const p = researchPrompt("bai-1", [claim, { ...claim, id: "c10" }]);
    expect(p).toContain(selfCheckCommand("bai-1", ["c9", "c10"]));
    expect(selfCheckCommand("bai-1", ["c9", "c10"])).toBe("node tools/research-verify.mjs research/bai-1 --stage evidence --dry --claims c9,c10");
    expect(p).toContain("đừng dùng ký tự $");
    expect(p).toMatch(/`cd … &&`, `mkdir`, `cat`/);
    expect(p).not.toContain("Studio tự soát sau khi bạn xong — không cần tự chạy lệnh soát");
  });

  it("lượt làm lại nhận lỗi, bảng nguồn và trang đã tải ngay trong prompt — không phải tự đọc feedback.json", () => {
    const loaded: SourceInfo[] = [
      { id: "s3", url: "https://openai.com/api/pricing", publisher: "OpenAI", published: null, ok: true },
      { id: "s8", url: "https://example.com/blocked", ok: false, error: "HTTP 403" },
    ];
    const p = researchPrompt("bai-1", [claim], [{
      claim: "c9",
      problems: ["claim thường cần 2 nơi xuất bản độc lập hoặc 1 nguồn chính thức — mới có 1 nơi"],
      warnings: [],
      sources: [{ ref: "s5", stance: "supports", status: "bad", note: "không có nguyên văn trong trang gốc", publisher: "Blog", domain: "blog.dev", kind: "blog", published: "2024-05-13" }],
    }], loaded);
    expect(p).toContain("  ✗ claim thường cần 2 nơi xuất bản");
    expect(p).toContain("s5 bad (không có nguyên văn trong trang gốc)");
    expect(p).toContain("s3 https://openai.com/api/pricing · OpenAI");
    expect(p).toContain("Không đọc được, đừng thử lại: https://example.com/blocked");
    expect(p).not.toContain("feedback.json");
  });

  it("dàn ý do code dựng: đọc chữ đã bóc, không đọc cả PDF, chỉ mở trang ít chữ khi cần, chỉ ghi claims.json", () => {
    const s = { id: "bai-1", options: { cues: 20 }, deck: { name: "x.pdf", format: "pdf", file: "input/slide.pdf", text: "input/slide.md", outline: "code", slides: 78, thinSlides: [18, 72] } } as unknown as ResearchState;
    const p = extractPrompt(s, []);
    expect(p).toContain("`research/bai-1/input/slide.md` (78 trang) — đọc file này, không đọc cả PDF");
    expect(p).toContain("Trang ít chữ (có thể chỉ có hình): 18, 72");
    expect(p).toContain("`outline.json` do Studio dựng");
    expect(p).toContain("Chỉ ghi `research/bai-1/claims.json`");
    expect(p).not.toContain("outline.json` và");
  });

  it("bóc tách được báo trần số claim theo số câu", () => {
    const s = { id: "bai-1", options: { cues: 20 }, deck: { name: "x.pdf", file: "input/slide.pdf", slides: 78 } } as unknown as ResearchState;
    expect(extractPrompt(s, [])).toContain("Tối đa 10 claim");
  });
});
