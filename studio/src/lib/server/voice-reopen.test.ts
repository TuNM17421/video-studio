import { describe, expect, it } from "vitest";
import type { VideoState } from "../types";
import { reopenAfterVoice } from "./voice";

const stages = (over: Partial<VideoState["stages"]>) =>
  ({ cues: "done", voice: "done", scenes: "idle", render: "idle", deliver: "idle", ...over }) as VideoState["stages"];

describe("gắn giọng mới mở lại những bước dựng trên giọng cũ", () => {
  it("lần gắn đầu tiên không đụng gì — chưa có gì dựng trên mốc cũ", () => {
    const s = stages({});
    expect(reopenAfterVoice(s)).toEqual([]);
    expect(s).toMatchObject({ scenes: "idle", render: "idle", deliver: "idle" });
  });

  // Lỗi thật: làm lại giọng ghi lại mốc frame của mọi câu trong cues.js, nhưng Dựng cảnh và Render vẫn
  // đứng ở "Xong" — người dùng bàn giao một MP4 mang giọng cũ mà không dòng nào báo.
  it("cảnh đã duyệt về chờ duyệt, MP4 và bàn giao về chưa làm", () => {
    const s = stages({ scenes: "done", render: "done", deliver: "done" });
    expect(reopenAfterVoice(s)).toEqual(["Dựng cảnh (chờ duyệt lại)", "Render"]);
    expect(s).toMatchObject({ scenes: "review", render: "idle", deliver: "idle" });
  });

  it("cảnh đang chờ duyệt hay đang lỗi giữ nguyên trạng thái — vẫn còn phải soát", () => {
    for (const scenes of ["review", "error"] as const) {
      const s = stages({ scenes });
      expect(reopenAfterVoice(s)).toEqual([]);
      expect(s.scenes).toBe(scenes);
    }
  });

  it("không đụng tới lời & cue và chính bước giọng", () => {
    const s = stages({ scenes: "done", render: "error" });
    reopenAfterVoice(s);
    expect(s).toMatchObject({ cues: "done", voice: "done", render: "idle" });
  });
});
