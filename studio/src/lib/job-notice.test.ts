import { describe, expect, it } from "vitest";
import type { JobInfo } from "./types";
import { endedJob, jobNotice, NOTIFY_AFTER_MS, videoTabTitle } from "./job-notice";

const job = (patch: Partial<JobInfo> = {}): JobInfo => ({ kind: "render", status: "running", startedAt: 1_000_000, progress: null, ...patch });

describe("endedJob", () => {
  it("is the end of the run the page watched", () => {
    const done = job({ status: "done" });
    expect(endedJob(job(), done)).toBe(done);
    expect(endedJob(job(), job({ status: "stopped" }))?.status).toBe("stopped");
  });

  it("is nothing when the page never saw it running", () => {
    // opened after the render ended: the first snapshot is already "done"
    expect(endedJob(null, job({ status: "done" }))).toBeNull();
    expect(endedJob(job({ status: "done" }), job({ status: "done" }))).toBeNull();
  });

  it("is nothing for a new run replacing the watched one", () => {
    // render finished and deliver started in between two updates: deliver is running, nothing ended here
    expect(endedJob(job(), job({ kind: "deliver", startedAt: 1_900_000 }))).toBeNull();
    expect(endedJob(job(), job({ status: "done", startedAt: 1_900_000 }))).toBeNull();
    expect(endedJob(job(), null)).toBeNull();
  });
});

describe("jobNotice", () => {
  it("names the job, the video and how it ended", () => {
    const notice = jobNotice(job({ status: "done" }), "d1-22-sep", 1_000_000 + 754_000);
    expect(notice).toEqual({ title: "Render MP4 xong · d1-22-sep", body: "Chạy 12 phút 34 giây. Mở Video Studio để làm bước tiếp." });
    expect(jobNotice(job({ kind: "scenes", status: "error" }), "d1", 1_000_000 + 60_000)?.title).toBe("Dựng cảnh lỗi · d1");
    expect(jobNotice(job({ kind: "voice", status: "stopped" }), "d1", 1_000_000 + 45_000)?.body).toBe("Sau 45 giây. Mở Video Studio để xem nhật ký.");
  });

  it("stays quiet for a short job the member watched finish", () => {
    expect(jobNotice(job({ kind: "dry-run", status: "done" }), "d1", 1_000_000 + NOTIFY_AFTER_MS - 1)).toBeNull();
    expect(jobNotice(job(), "d1", 9_999_999)).toBeNull();
  });
});

describe("videoTabTitle", () => {
  it("leads with what changes: the percent while it runs", () => {
    expect(videoTabTitle("d1", job({ progress: { percent: 45.4, message: "Render 3080/6785 frame" } }), null)).toBe("45% · Render MP4 · d1 · Video Studio");
    expect(videoTabTitle("d1", job({ kind: "scenes" }), null)).toBe("Đang chạy · Dựng cảnh · d1 · Video Studio");
  });

  it("says how the last job ended until the member comes back", () => {
    expect(videoTabTitle("d1", job({ status: "done" }), job({ status: "done" }))).toBe("Xong · Render MP4 · d1 · Video Studio");
    expect(videoTabTitle("d1", null, job({ kind: "scenes", status: "error" }))).toBe("Lỗi · Dựng cảnh · d1 · Video Studio");
    expect(videoTabTitle("d1", null, job({ status: "stopped" }))).toBe("Đã dừng · Render MP4 · d1 · Video Studio");
  });

  it("is just the video otherwise, and a new run wins over an old ending", () => {
    expect(videoTabTitle("d1", job({ status: "done" }), null)).toBe("d1 · Video Studio");
    expect(videoTabTitle("d1", job({ kind: "deliver" }), job({ status: "done" }))).toBe("Đang chạy · Bàn giao · d1 · Video Studio");
  });
});
