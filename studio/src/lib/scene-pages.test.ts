import { describe, expect, it } from "vitest";
import { formatSize, scenePages } from "./client";
import type { VideoDetail } from "./types";

const detail = (over: Partial<Pick<VideoDetail, "artifacts" | "claudeDesign">>) => ({
  state: { id: "d3-02" },
  artifacts: { scenes: true },
  claudeDesign: null,
  ...over,
}) as unknown as Pick<VideoDetail, "state" | "artifacts" | "claudeDesign">;

describe("trang mà khung xem trước và nút Mở trình phát trỏ tới", () => {
  it("agent ở máy: cảnh trong videos/<id>/ của design system", () => {
    const pages = scenePages(detail({}))!;
    expect(pages.frame(40)).toBe("/ds/ui_kits/lesson-video/index.html?scene=d3-02&frame=40");
    expect(pages.player).toBe("/ds/ui_kits/lesson-video/videos/d3-02/player.html");
  });

  // Lỗi thật: video dựng bằng Claude Design render trang nhập về, nhưng khung xem trước và trình phát vẫn
  // trỏ vào videos/<id>/ — người dùng xem (và duyệt) một bản khác với bản ra MP4, hoặc một khung trống.
  it("Claude Design: đúng trang nhập về, kể cả khi videos/<id>/ cũng có cảnh", () => {
    const imported = { page: "Video bài.html" } as NonNullable<VideoDetail["claudeDesign"]>["imported"];
    const pages = scenePages(detail({ claudeDesign: { imported } }))!;
    expect(pages.player).toBe("/ds-bundle/cd/d3-02/Video%20b%C3%A0i.html");
    expect(pages.frame(7)).toBe("/ds-bundle/cd/d3-02/Video%20b%C3%A0i.html?frame=7");
  });

  it("Claude Design mà chưa nhập thì không có trang nào — không rơi về cảnh của agent", () => {
    expect(scenePages(detail({ claudeDesign: { imported: null } }))).toBeNull();
  });

  it("chưa dựng cảnh thì không có trang", () => {
    expect(scenePages(detail({ artifacts: { scenes: false } as VideoDetail["artifacts"] }))).toBeNull();
  });
});

describe("cỡ khung theo khổ", () => {
  it("khổ dọc là 1080×1920; khổ lạ hay thiếu thì về ngang", () => {
    expect(formatSize("9x16")).toMatchObject({ width: 1080, height: 1920, ratio: "9 / 16" });
    expect(formatSize(undefined)).toMatchObject({ width: 1920, height: 1080 });
    expect(formatSize("4x3")).toMatchObject({ width: 1920, height: 1080 });
  });
});
