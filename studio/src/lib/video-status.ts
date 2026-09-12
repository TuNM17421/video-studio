import type { StageId, StageStatus, VideoSummary } from "./types";

export const VIDEO_STAGES: { id: StageId; label: string; short: string }[] = [
  { id: "cues", label: "Lời & cue", short: "Cue" },
  { id: "voice", label: "Giọng đọc", short: "Giọng" },
  { id: "scenes", label: "Dựng cảnh", short: "Cảnh" },
  { id: "render", label: "Render MP4", short: "MP4" },
  { id: "deliver", label: "Bàn giao", short: "Giao" },
];

export type VideoFilter = "all" | "active" | "attention" | "done";

export function completedStages(stages: Record<StageId, StageStatus>) {
  return VIDEO_STAGES.filter(({ id }) => stages[id] === "done").length;
}

export function overallStageStatus(stages: Record<StageId, StageStatus>): StageStatus {
  const values = VIDEO_STAGES.map(({ id }) => stages[id]);
  if (values.includes("error")) return "error";
  if (values.includes("running")) return "running";
  if (values.includes("review")) return "review";
  if (values.every((status) => status === "done")) return "done";
  return "idle";
}

export function nextStageLabel(stages: Record<StageId, StageStatus>) {
  const active = VIDEO_STAGES.find(({ id }) => stages[id] === "running" || stages[id] === "review" || stages[id] === "error");
  if (active) return active.label;
  return VIDEO_STAGES.find(({ id }) => stages[id] !== "done")?.label || "Đã bàn giao";
}

export function matchesVideo(video: VideoSummary, query: string, filter: VideoFilter) {
  const normalized = query.trim().toLocaleLowerCase("vi");
  const matchesQuery = !normalized || [video.id, video.title, video.day].some((value) => value.toLocaleLowerCase("vi").includes(normalized));
  if (!matchesQuery || filter === "all") return matchesQuery;
  const status = overallStageStatus(video.stages);
  if (filter === "active") return status === "running" || status === "review";
  if (filter === "attention") return status === "error" || status === "idle";
  return status === "done";
}
