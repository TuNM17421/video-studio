import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { countText, friendlyNote, importCounts, importVerdict, issueSpans, reportMatchesDir } from "./import-report";
import type { ImportReport, ImportRow } from "./types";

const report = (from: string) => ({ from } as ImportReport);

describe("khớp báo cáo kiểm với thư mục đang xem", () => {
  // Đây là ca thật đã làm hỏng bước 4: tool ghi tương đối + dấu /, state giữ tuyệt đối + dấu \.
  it("khớp đường dẫn Windows tuyệt đối với đường dẫn tương đối trong báo cáo", () => {
    expect(reportMatchesDir(
      report("projects/12te/voice-script/omnivoice"),
      "C:\\Users\\Tai\\Desktop\\repo\\projects\\12te\\voice-script\\omnivoice",
    )).toBe(true);
  });

  it("khớp trên máy dùng dấu /", () => {
    expect(reportMatchesDir(
      report("projects/12te/voice-script/omnivoice"),
      "/home/tai/repo/projects/12te/voice-script/omnivoice",
    )).toBe(true);
  });

  it("không nhận báo cáo của video khác", () => {
    expect(reportMatchesDir(
      report("projects/aaaa/voice-script/omnivoice"),
      "/repo/projects/12te/voice-script/omnivoice",
    )).toBe(false);
  });

  // Nếu chỉ dùng endsWith trần thì "projects/12te" nuốt luôn "projects/x12te".
  it("không khớp khi tên video chỉ là đuôi của tên khác", () => {
    expect(reportMatchesDir(
      report("projects/12te/voice-script/omnivoice"),
      "/repo/projects/x12te/voice-script/omnivoice",
    )).toBe(false);
  });

  it("bỏ qua dấu gạch thừa ở cuối", () => {
    expect(reportMatchesDir(
      report("projects/12te/voice-script/omnivoice/"),
      "/repo/projects/12te/voice-script/omnivoice",
    )).toBe(true);
  });

  it("chưa kiểm thì không khớp gì cả", () => {
    expect(reportMatchesDir(null, "/repo/projects/12te")).toBe(false);
    expect(reportMatchesDir(report(""), "/repo/projects/12te")).toBe(false);
    expect(reportMatchesDir(report("projects/12te"), "")).toBe(false);
  });
});

const row = (over: Partial<ImportRow> = {}): ImportRow => ({
  n: 5, key: "05", file: "05.wav", silent: false, text: "", expectedSeconds: 6, level: "ok", notes: [], ...over,
});
const scan = (rows: ImportRow[], used = true) => ({ rows, align: { used, model: "small", note: null } } as unknown as ImportReport);

describe("đếm và kết luận của bảng Nghe từng câu", () => {
  it("khoảng dừng không tính là câu", () => {
    const c = importCounts(scan([row(), row({ n: 6, silent: true, file: null }), row({ n: 7 })]));
    expect(c).toMatchObject({ spoken: 2, pauses: 1, ok: 2 });
    expect(countText(c)).toBe("2 câu + 1 khoảng dừng · đều ổn");
  });

  it("không nói “ổn” khi máy chưa nghe lại nội dung", () => {
    const v = importVerdict(importCounts(scan([row(), row({ n: 6 })], false)));
    expect(v.headline).toBe("Đủ tệp cho 2 câu");
    expect(v.hint).toContain("chưa nghe lại");
  });

  it("cảnh báo nói rõ là không chặn việc nhập", () => {
    const v = importVerdict(importCounts(scan([row({ level: "warn" }), row({ n: 6 })])));
    expect(v).toMatchObject({ tone: "warn", headline: "1 câu nên nghe lại", rest: "1 câu ổn" });
    expect(v.hint).toContain("không chặn");
  });

  it("lỗi đứng trước cảnh báo", () => {
    const c = importCounts(scan([row({ level: "error" }), row({ n: 6, level: "warn" }), row({ n: 7 })]));
    expect(importVerdict(c)).toMatchObject({ tone: "error", headline: "1 câu cần sửa", rest: "1 câu nên nghe lại · 1 câu ổn" });
    expect(countText(c)).toBe("3 câu · 1 câu cần sửa · 1 câu nên nghe lại");
  });
});

describe("ghi chú của máy nói lại cho người dựng video", () => {
  it("độ dài bất thường đọc ra giây, không còn dấu ~", () => {
    expect(friendlyNote("ngắn bất thường (2,7s so với ~7,0s)", row())).toBe("Ngắn hơn dự kiến: 2,7 giây, thường khoảng 7,0 giây.");
    expect(friendlyNote("dài bất thường (9,8s so với ~6,0s)", row())).toBe("Dài hơn dự kiến: 9,8 giây, thường khoảng 6,0 giây.");
  });

  it("khớp một phần lời: im khi đã có lỗi cụ thể, nói phần trăm khi không", () => {
    const note = "chỉ khớp một phần lời — nghe lại câu này trước khi nhập";
    expect(friendlyNote(note, row({ issues: [{ code: "dropped", words: "a b c", start: 1, end: 2 }] }))).toBeNull();
    expect(friendlyNote(note, row({ matchRatio: 0.52 }))).toBe("Máy chỉ nghe ra 52% lời của câu — nghe cả câu cho chắc.");
  });

  it("tên tệp lệch kiểu 01.wav: nói đúng là lệch kiểu, không phải thiếu số câu", () => {
    expect(friendlyNote("tên không theo quy ước 01.wav", row({ file: "1.wav" }))).toBe("Tệp 1.wav chưa đặt tên đúng kiểu 01.wav — vẫn dùng được.");
  });

  it("khoảng dừng không cần ghi chú; câu lạ giữ nguyên, viết hoa chữ đầu", () => {
    expect(friendlyNote("khoảng dừng 2s, không cần file", row())).toBeNull();
    expect(friendlyNote("đường dẫn giọng mẫu không tồn tại", row())).toBe("Đường dẫn giọng mẫu không tồn tại");
  });

  // Bảng đọc ghi chú theo tiền tố. Tool đổi chữ mà quên bảng thì ghi chú rơi về dạng thô — test này đỏ trước.
  it("mọi tiền tố bảng dựa vào vẫn có trong tools/voice-import.mjs", () => {
    const tool = fs.readFileSync(path.join(__dirname, "..", "..", "..", "tools", "voice-import.mjs"), "utf8");
    for (const prefix of [
      "khoảng dừng ${", "'thiếu file audio'", "`tên không theo quy ước ", "`ngắn bất thường (${", "`dài bất thường (${",
      " so với ~${", "`không giải mã được", "'không nhận diện được giọng", "`nội dung nghe được không khớp lời", "'chỉ khớp một phần lời",
    ]) expect(tool, prefix).toContain(prefix);
  });
});

describe("gạch chân chữ máy nghi trong lời của câu", () => {
  const text = "Trong lĩnh vực này, có những hệ thống giải bài toán bằng kiến thức và quy tắc do con người viết sẵn.";

  it("mất đuôi: lấy chỗ khớp cuối, bỏ qua dấu câu", () => {
    const [[a, b, code]] = issueSpans(text, [{ code: "truncation", words: "do con người viết sẵn", start: 3, end: null }]);
    expect(code).toBe("truncation");
    expect(text.slice(a, b)).toBe("do con người viết sẵn");
  });

  it("lặp chữ: không phân biệt hoa thường, qua được dấu phẩy giữa hai chữ", () => {
    const t = "Nhập lệnh, gõ thêm một dòng.";
    const [[a, b]] = issueSpans(t, [{ code: "repeat", words: "LỆNH GÕ", start: 1, end: 2 }]);
    expect(t.slice(a, b)).toBe("lệnh, gõ");
  });

  it("chỉ gạch trọn chữ: “ra” không gạch đuôi của “trang”", () => {
    const t = "Mở trang web ra xem.";
    const [[a, b]] = issueSpans(t, [{ code: "repeat", words: "ra", start: 1, end: 2 }]);
    expect(t.slice(a, b)).toBe("ra");
    expect(a).toBe(t.indexOf(" ra ") + 1);
  });

  it("không tìm thấy thì không gạch, và hai chỗ không chồng nhau", () => {
    expect(issueSpans(text, [{ code: "dropped", words: "không có trong câu", start: 1, end: 2 }])).toEqual([]);
    const spans = issueSpans(text, [
      { code: "dropped", words: "hệ thống giải", start: 1, end: 2 },
      { code: "repeat", words: "thống giải bài", start: 1, end: 2 },
    ]);
    expect(spans).toHaveLength(1);
  });
});
