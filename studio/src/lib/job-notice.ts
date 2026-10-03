/**
 * "Tell me when it is done": a render or an agent stage runs for many minutes, and members switch tabs in the
 * meantime. The page says it twice — in the tab's title (always) and as a browser notification (when the member
 * turned it on and the page is not in front). Pure: the page wires it to the video's job events.
 */
import type { JobInfo, JobKind } from "./types";

/** What each job is called on screen: the progress bar, the tab title and the notification say the same. */
export const JOB_LABEL: Record<JobKind, string> = {
  cues: "Lời & cue",
  voice: "Giọng đọc",
  scenes: "Dựng cảnh",
  review: "Review lại dựng cảnh",
  render: "Render MP4",
  deliver: "Bàn giao",
  research: "Đóng gói kịch bản",
  images: "Đề xuất ảnh",
  sfx: "Đề xuất tiếng động",
  "dry-run": "Kiểm tra giọng",
  "voice-script": "Xuất lời đọc",
  "import-scan": "Kiểm tra thư mục audio",
  "omnivoice-setup": "Cài model local",
  "omnivoice-generate": "Sinh giọng bằng model local",
  "align-setup": "Cài môi trường nhận diện giọng",
  "kaggle-setup": "Cài Kaggle CLI",
  "kaggle-generate": "Sinh giọng trên Kaggle",
  "voice-retake": "Sinh lại một câu",
  "voice-retake-pick": "Đặt bản đã chọn",
  "cue-edit": "Sửa câu",
};

/**
 * A job shorter than this is one the member watched finish (a dry-run, a folder scan): a notification for it
 * would only be noise. Agent stages and renders run minutes.
 */
export const NOTIFY_AFTER_MS = 30_000;

/**
 * The job that just ended, when `next` is the end of the very run `previous` was watching (same kind, same
 * start). Anything else — a page opened after the job ended, a new job starting — is not an ending seen live.
 */
export function endedJob(previous: JobInfo | null, next: JobInfo | null): JobInfo | null {
  if (previous?.status !== "running" || !next || next.status === "running") return null;
  return next.kind === previous.kind && next.startedAt === previous.startedAt ? next : null;
}

const OUTCOME: Record<Exclude<JobInfo["status"], "running">, string> = { done: "xong", error: "lỗi", stopped: "đã dừng" };

/** 754000 → "12 phút 34 giây". */
function spoken(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m} phút${s ? ` ${s} giây` : ""}` : `${s} giây`;
}

/** The notification for a job that ended, or null when it was too short to announce. */
export function jobNotice(job: JobInfo, video: string, endedAt: number): { title: string; body: string } | null {
  if (job.status === "running") return null;
  const took = endedAt - job.startedAt;
  if (took < NOTIFY_AFTER_MS) return null;
  return {
    title: `${JOB_LABEL[job.kind]} ${OUTCOME[job.status]} · ${video}`,
    body: job.status === "done" ? `Chạy ${spoken(took)}. Mở Video Studio để làm bước tiếp.` : `Sau ${spoken(took)}. Mở Video Studio để xem nhật ký.`,
  };
}

/**
 * The tab's title: what is running (with its percent), or how the last job ended while the member was looking
 * elsewhere (`unseen`), else just the video. The part that changes comes first — a tab shows ~20 characters.
 */
export function videoTabTitle(video: string, job: JobInfo | null, unseen: JobInfo | null) {
  if (job?.status === "running") {
    const percent = job.progress?.percent;
    return `${typeof percent === "number" ? `${Math.round(percent)}%` : "Đang chạy"} · ${JOB_LABEL[job.kind]} · ${video} · Video Studio`;
  }
  if (unseen && unseen.status !== "running") {
    return `${OUTCOME[unseen.status][0].toUpperCase()}${OUTCOME[unseen.status].slice(1)} · ${JOB_LABEL[unseen.kind]} · ${video} · Video Studio`;
  }
  return `${video} · Video Studio`;
}
