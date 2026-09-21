import { describe, expect, it } from "vitest";
import { groupClaims, matchScore, reviewClaim, slideOptions } from "./claim-review";
import { blankClaim, type Claim, type OutlineSlide } from "./research";

// Chép từ một lượt thật (research/ai-llm-foundation-lms-2609211713, bị gitignore): 60 mục dàn ý đánh số 1–72,
// hai mục cùng số 47, slide 70 "Tài liệu tham khảo" đánh dấu không đọc.
const OUTLINE: OutlineSlide[] = [
  { slide: 7, heading: "Từ AI cổ điển đến Agentic AI", points: ["Perceptron (1957) → Deep Learning bùng nổ (2012) → Transformer (2017) → ChatGPT (2022) → AI Agents (2024–26)"] },
  { slide: 8, heading: "Vì sao 2024-2026 là bước ngoặt?", points: ["78% doanh nghiệp dùng AI", "$15.7T GDP toàn cầu từ AI (2030)", "3.7x ROI trung bình trên mỗi $1 đầu tư", "AI không còn chỉ là 'trả lời hay' nữa. Từ 2024 trở đi, doanh nghiệp quan tâm nhiều hơn đến AI biết hành động, kết nối công cụ và tạo ra ROI"] },
  { slide: 33, heading: "Token — Đơn vị cơ bản của LLM", points: ["Token — đơn vị nhỏ nhất mà LLM xử lý — khoảng 0.75 từ tiếng Anh, 0.5 từ tiếng Việt", "Tokenization: tách text thành subword units. Ví dụ: 'Hello world' → 2 tokens; 'Xin chào' → 3–4 tokens; 'anthropic' → 3 tokens; 'def func():' → 4 tokens"] },
  { slide: 39, heading: "Vì sao một số nội dung tốn nhiều token hơn?", points: ["Tiếng Việt — Unicode và từ bị tách nhỏ hơn: 'Tôi yêu Việt Nam' > 'I love Vietnam'", "Code — nhiều ký tự đặc biệt và khoảng trắng: def func(): → nhiều tokens", "Text có cấu trúc — JSON, URL, ID, số dài: user_id: 98347298347", "Rule of Thumb: Unicode + ký tự đặc biệt + cấu trúc phức tạp → tốn nhiều token hơn"] },
  { slide: 40, heading: "API Pricing Model — Cách tính chi phí", points: ["Input Tokens (prompt) + Output Tokens (response) = Total Cost ($/call)", "Giá tính theo 1 triệu tokens (1M tokens)", "Output tokens đắt hơn input tokens (3–5x)", "Giá giảm ~10x mỗi năm (GPT-4 level: $20/M → $2/M trong 2 năm)"] },
  { slide: 43, heading: "So sánh LLM phổ biến — Chọn gì cho đúng việc?", points: ["Bảng giá (per 1M token, In/Out), context window, loại (Closed/Open) và tình huống nên dùng của: Claude Opus 4.6 ($5.0/$25, 1M, Closed, reasoning/code khó), Claude Sonnet 4 ($3.0/$15, 1M, Closed, balanced choice), Claude Haiku 4.5 ($0.8/$4, 200K, Closed, fast/cheap/routing), GPT-4o ($5.0/$20, 128K, Closed, multimodal/ecosystem), Gemini 2.5 Pro ($1.25/$10, 1M, Closed, long-context tasks), Llama 4 Scout (Free/Free, 1M, Open, self-host/private data)", "Lưu ý: Closed = API hosted; Open = self-host/control nhiều hơn. Giá tham khảo tháng 3/2026"] },
  { slide: 47, heading: "Tính chi phí thực tế — Ví dụ", points: ["Scenario: chatbot hỗ trợ khách hàng, 1000 lượt/ngày."] },
  { slide: 47, heading: "Luồng một API call", points: ["Prompt → API Call → Token Stream → Response"] },
  { slide: 58, heading: "Tự host LLM lên local environment", points: ["Ví dụ code Python dùng transformers (AutoTokenizer, AutoModelForCausalLM) với model_name = 'Qwen/Qwen3-0.6B-Base', load tokenizer và model, generate text"] },
  { slide: 70, heading: "Tài liệu tham khảo", points: ["Vaswani et al. (2017). 'Attention Is All You Need'. arXiv:1706.03762", "Ouyang et al. (2022). 'InstructGPT / RLHF'. arXiv:2203.02155", "Rafailov et al. (2023). 'DPO'. arXiv:2305.18290"], skip: true },
];

const claim = (id: string, slides: number[], text: string): Claim => ({ ...blankClaim(id), slides, text });
const CLAIMS: Claim[] = [
  claim("c1", [7], "Timeline AI cổ điển đến Agentic AI: Perceptron (1957) → Deep Learning bùng nổ (2012) → Transformer (2017) → ChatGPT (2022) → AI Agents (2024–26)"),
  claim("c2", [8], "78% doanh nghiệp dùng AI"),
  claim("c3", [8], "$15.7T GDP toàn cầu từ AI (2030)"),
  claim("c4", [8], "ROI trung bình 3.7x trên mỗi $1 đầu tư vào AI"),
  claim("c5", [70], "Vaswani et al. (2017). \"Attention Is All You Need\". arXiv:1706.03762"),
  claim("c6", [70], "Ouyang et al. (2022). \"InstructGPT / RLHF\". arXiv:2203.02155"),
  claim("c7", [70], "Rafailov et al. (2023). \"DPO\". arXiv:2305.18290"),
  claim("c8", [43], "Bảng so sánh giá/context của các LLM phổ biến (tháng 3/2026): Claude Opus 4.6 $5.0/$25 per 1M, 1M ctx; Claude Sonnet 4 $3.0/$15, 1M ctx; Claude Haiku 4.5 $0.8/$4, 200K ctx; GPT-4o $5.0/$20, 128K ctx; Gemini 2.5 Pro $1.25/$10, 1M ctx; Llama 4 Scout Free/Free, 1M ctx"),
  claim("c9", [40], "Giá giảm ~10x mỗi năm (GPT-4 level: $20/M → $2/M trong 2 năm)"),
  claim("c10", [33], "Một token tương đương khoảng 0.75 từ tiếng Anh, 0.5 từ tiếng Việt"),
  claim("c11", [58], "Ví dụ tự host model \"Qwen/Qwen3-0.6B-Base\" bằng transformers (AutoTokenizer, AutoModelForCausalLM)"),
  claim("c12", [39, 40], "Output tokens đắt hơn input tokens 3–5 lần"),
];
const byId = (id: string) => CLAIMS.find((c) => c.id === id)!;
const review = (id: string) => reviewClaim(byId(id), OUTLINE);

describe("claim ở ý nào của slide", () => {
  it("chép nguyên văn thì khớp trọn", () => {
    expect(review("c2").anchors).toEqual([{ slide: 8, inOutline: true, point: 0, score: 1, onHeading: false }]);
  });

  it("dấu nháy khác nhau giữa claim và dàn ý không làm lệch", () => {
    expect(review("c5").anchors[0]).toMatchObject({ point: 0, score: 1 });
  });

  it("claim thêm lời dẫn trước ý slide vẫn khớp trọn", () => {
    expect(review("c1").anchors[0]).toMatchObject({ point: 0, score: 1 });
  });

  it("claim diễn lại ý slide thì khớp một phần, đủ để đặt đúng chỗ", () => {
    for (const id of ["c4", "c8", "c10", "c11"]) {
      const a = review(id).anchors[0];
      expect(a.score, id).toBeGreaterThanOrEqual(0.5);
      expect(a.score, id).toBeLessThan(1);
      expect(a.point, id).not.toBeNull();
    }
  });

  it("claim gắn hai slide về nhà ở slide có câu đó, và slide kia không được tính là khớp", () => {
    const r = review("c12");
    expect(r.home).toBe(40);
    expect(r.anchors.find((a) => a.slide === 39)).toMatchObject({ point: null });
    expect(r.anchors.find((a) => a.slide === 39)!.score).toBeLessThan(0.5);
    expect(r.anchors.find((a) => a.slide === 40)).toMatchObject({ point: 2 });
  });

  it("chỉ đánh dấu ý khớp nhất, không đánh dấu mọi ý na ná", () => {
    // Ý 4 của slide 8 cũng nói "doanh nghiệp … AI" nhưng c2 là đúng ý 1.
    expect(matchScore(byId("c2").text, OUTLINE[1].points![3])).toBeGreaterThanOrEqual(0.5);
    expect(review("c2").anchors[0].point).toBe(0);
  });

  it("không gắn slide nào thì không có nhà, không có neo", () => {
    expect(reviewClaim({ text: "Một điều gì đó", slides: [] }, OUTLINE)).toEqual({ home: null, anchors: [], missingNumbers: [] });
  });

  it("slide không có trong dàn ý thì nói rõ", () => {
    expect(reviewClaim({ text: "Một điều gì đó", slides: [15] }, OUTLINE).anchors).toEqual([{ slide: 15, inOutline: false, point: null, score: 0, onHeading: false }]);
  });

  it("một ý quá ngắn không được tính là nằm trong claim", () => {
    expect(matchScore("Chatbot dùng AI để trả lời khách", "AI")).toBeLessThan(1);
  });

  it("hoà điểm thì slide ghi trước thắng", () => {
    const outline: OutlineSlide[] = [{ slide: 3, points: ["Mô hình ngôn ngữ lớn"] }, { slide: 5, points: ["Mô hình ngôn ngữ lớn"] }];
    expect(reviewClaim({ text: "Mô hình ngôn ngữ lớn", slides: [5, 3] }, outline).home).toBe(5);
  });

  it("claim nói đúng tiêu đề slide thì có trên slide, dù không khớp ý nào", () => {
    const a = reviewClaim({ text: "2024-2026 là bước ngoặt của AI", slides: [8] }, OUTLINE).anchors[0];
    expect(a).toMatchObject({ point: null, onHeading: true });
  });

  it("tiêu đề khớp kéo claim về đúng slide khi nó dẫn hai slide", () => {
    expect(reviewClaim({ text: "Token là đơn vị cơ bản của LLM", slides: [39, 33] }, OUTLINE).home).toBe(33);
  });

  it("hai mục cùng số slide được gộp ý", () => {
    const r = reviewClaim({ text: "Prompt → API Call → Token Stream → Response", slides: [47] }, OUTLINE);
    expect(r.anchors[0]).toMatchObject({ point: 1, score: 1 });
  });
});

describe("con số trong claim", () => {
  it("claim thật không có số nào nằm ngoài slide", () => {
    for (const c of CLAIMS) expect(reviewClaim(c, OUTLINE).missingNumbers, c.id).toEqual([]);
  });

  it("bắt số chép sai", () => {
    expect(reviewClaim({ text: "ROI trung bình 37x", slides: [8] }, OUTLINE).missingNumbers).toEqual(["37"]);
  });

  it("dấu phẩy thập phân bằng dấu chấm", () => {
    expect(reviewClaim({ text: "ROI trung bình 3,7x", slides: [8] }, OUTLINE).missingNumbers).toEqual([]);
  });

  it("cùng giá trị thì không phải số lạ, dù viết khác", () => {
    const outline: OutlineSlide[] = [{ slide: 1, points: ["Chatbot 1000 lượt/ngày, giá $5.0, tháng 3/2026, tỉ lệ 0.750"] }];
    for (const text of ["1.000 lượt mỗi ngày", "1,000 lượt", "giá $5", "tháng 03/2026", "tỉ lệ 0,75"]) {
      expect(reviewClaim({ text, slides: [1] }, outline).missingNumbers, text).toEqual([]);
    }
  });

  it("báo số đúng như claim viết, không phải dạng đã chuẩn hoá", () => {
    const outline: OutlineSlide[] = [{ slide: 1, points: ["Chatbot 1000 lượt/ngày"] }];
    expect(reviewClaim({ text: "Chatbot 1,500 lượt/ngày, 1,500 người", slides: [1] }, outline).missingNumbers).toEqual(["1,500"]);
  });

  it("không soát số khi không slide nào được dẫn có trong dàn ý", () => {
    expect(reviewClaim({ text: "99% ai cũng dùng", slides: [15] }, OUTLINE).missingNumbers).toEqual([]);
  });
});

describe("gom claim theo slide", () => {
  const reviews = new Map(CLAIMS.map((c) => [c.id, reviewClaim(c, OUTLINE)]));

  it("xếp theo số slide, nhóm Cả bài cuối cùng, giữ thứ tự claim trong nhóm", () => {
    const loose = { ...blankClaim("c13"), text: "Claim thêm tay" };
    const all = [...CLAIMS, loose];
    const groups = groupClaims(all, OUTLINE, new Map([...reviews, ["c13", reviewClaim(loose, OUTLINE)]]));
    expect(groups.map((g) => g.slide)).toEqual([7, 8, 33, 40, 43, 58, 70, null]);
    expect(groups.find((g) => g.slide === 8)!.claims.map((c) => c.id)).toEqual(["c2", "c3", "c4"]);
    expect(groups.find((g) => g.slide === 40)!.claims.map((c) => c.id)).toEqual(["c9", "c12"]);
    expect(groups.at(-1)).toMatchObject({ key: "whole", inOutline: false, claims: [loose] });
  });

  it("slide không đọc được đánh dấu", () => {
    const groups = groupClaims(CLAIMS, OUTLINE, reviews);
    expect(groups.find((g) => g.slide === 70)!.skip).toBe(true);
    expect(groups.find((g) => g.slide === 8)!.skip).toBe(false);
  });

  it("hai mục cùng số 47 thành một nhóm, tên nối hai tiêu đề", () => {
    const c = { ...blankClaim("c13"), slides: [47], text: "Luồng một API call" };
    const [g] = groupClaims([c], OUTLINE, new Map([["c13", reviewClaim(c, OUTLINE)]]));
    expect(g.title).toBe("Tính chi phí thực tế — Ví dụ / Luồng một API call");
    expect(g.points).toHaveLength(2);
  });
});

describe("lựa chọn slide", () => {
  it("không lặp số, xếp tăng, giữ số đang dẫn dù dàn ý không có", () => {
    const opts = slideOptions(OUTLINE, [15]);
    expect(opts.map((o) => o.value)).toEqual([7, 8, 15, 33, 39, 40, 43, 47, 58, 70]);
    expect(opts.find((o) => o.value === 15)!.label).toBe("15 · (không có trong dàn ý)");
    expect(opts.find((o) => o.value === 47)!.label).toBe("47 · Tính chi phí thực tế — Ví dụ / Luồng một API call");
  });
});
