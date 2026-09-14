import { describe, expect, it } from "vitest";
import { reportMatchesDir } from "./import-report";
import type { ImportReport } from "./types";

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
