import { describe, expect, it } from "vitest";
import { inferDay } from "./day";

// Header of the script that was delivered into Day02/ although every line of it says day 1.
const D1_HEADER = `# N1-01 · Phân biệt trí tuệ nhân tạo, học máy, tạo sinh và mô hình ngôn ngữ lớn

[Mục lục 5 ngày](00-muc-luc-va-huong-dan.md)

- **Phiên bản:** Rà từng câu — 07/09/2026.
- **Ngày:** 1
- **Thời lượng dựng dự kiến:** 05:29 (329 giây).
`;

describe("suy ra ngày của kịch bản", () => {
  it("đọc các cách viết ngày thường gặp trong tên tệp", () => {
    expect(inferDay("ngay-01-video-01-phan-biet-ai-ml-genai-llm (1).md", "")).toBe("Day01");
    expect(inferDay("ngay01.md", "")).toBe("Day01");
    expect(inferDay("ngày 01.md", "")).toBe("Day01");
    expect(inferDay("Ngày 1 - Giới thiệu.md", "")).toBe("Day01");
    expect(inferDay("day-01.md", "")).toBe("Day01");
    expect(inferDay("day01.txt", "")).toBe("Day01");
    expect(inferDay("Day 1.md", "")).toBe("Day01");
    expect(inferDay("D01 - mo dau.md", "")).toBe("Day01");
    expect(inferDay("N1-01.md", "")).toBe("Day01");
    expect(inferDay("N01-02.md", "")).toBe("Day01");
    expect(inferDay("n2-00-gioi-thieu-ngay-2.md", "")).toBe("Day02");
  });

  it("đọc phần đầu nội dung khi tên tệp không nói gì", () => {
    expect(inferDay("kich-ban.md", D1_HEADER)).toBe("Day01");
    expect(inferDay("kich-ban.md", "Bài học\n\nNgày 3: Prompt có cấu trúc")).toBe("Day03");
    expect(inferDay("kich-ban.md", "- **Ngày:** 12")).toBe("Day12");
  });

  it("tin tên tệp hơn nội dung", () => {
    expect(inferDay("ngay-02-video-03.md", D1_HEADER)).toBe("Day02");
  });

  it("chỉ nhìn 40 dòng đầu của nội dung", () => {
    const late = `${"\n".repeat(45)}Ngày 3`;
    expect(inferDay("kich-ban.md", late)).toBeNull();
    expect(inferDay("kich-ban.md", `${"\n".repeat(30)}Ngày 3`)).toBe("Day03");
  });

  it("trả về null khi không có gì để suy", () => {
    expect(inferDay("kich-ban.md", "Xin chào, hôm nay ta học về AI.")).toBeNull();
    expect(inferDay("", "")).toBeNull();
  });

  it("không nhầm số thứ tự video, mã video hay ngày tháng với ngày học", () => {
    expect(inferDay("video-01.md", "")).toBeNull();
    expect(inferDay("d1.md", "")).toBeNull();
    expect(inferDay("d2-01-lab.md", "")).toBeNull();
    expect(inferDay("kich-ban.md", "Cập nhật ngày 15/3/2026")).toBeNull();
    // a date written out before the real day line must not win over it
    expect(inferDay("kich-ban.md", "Cập nhật ngày 7 tháng 9\n- **Ngày:** 1")).toBe("Day01");
    expect(inferDay("kich-ban.md", "Rà lại ngày 7-9-2026\n- **Ngày:** 1")).toBe("Day01");
    expect(inferDay("kich-ban.md", "Ngày 45: ôn tập")).toBeNull();
    expect(inferDay("kich-ban.md", "Monday 3")).toBeNull();
    expect(inferDay("kich-ban.md", "Mục lục 5 ngày")).toBeNull();
    expect(inferDay("Day 0.md", "")).toBeNull();
  });

  it("giữ hai chữ số và nhận ngày hai chữ số", () => {
    expect(inferDay("Day 10.md", "")).toBe("Day10");
    expect(inferDay("ngay-7.md", "")).toBe("Day07");
  });

  // macOS names files with decomposed diacritics: "à" arrives as "a" + U+0300.
  it("nhận tên tệp có dấu tổ hợp (NFD)", () => {
    expect(inferDay("Ngày 1.md", "")).toBe("Day01");
  });
});
