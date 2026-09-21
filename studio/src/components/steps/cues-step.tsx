"use client";

import { CheckCircleFilled, PlayCircleFilled } from "@ant-design/icons";
import { Button, Empty } from "antd";
import { formatFrames } from "@/lib/client";
import type { VideoDetail } from "@/lib/types";
import { AgentLog, AgentSummary, FeedbackBox, JobProgress, stageLogs } from "../agent-panel";
import { HarnessPanel } from "../harness-panel";
import { ProductionState } from "../production-state";
import { post, StepBar, type StepProps } from "./shared";

function CueList({ detail }: { detail: VideoDetail }) {
  const info = detail.cues;
  if (!info?.cues.length) return null;
  return <div className="scene-list vs-cue-list">{info.cues.map((c, index) => {
    const previousSection = info.cues[index - 1]?.section ?? null;
    const header = c.section !== null && c.section !== previousSection ? info.sections[(c.section ?? 1) - 1] : null;
    return <div key={c.n}>
      {header && <div className="vs-cue-section">Phần {c.section} · {header}</div>}
      <div className="scene-list-item">
        <span className="scene-index">{String(c.n).padStart(2, "0")}</span>
        <span className="scene-list-copy"><strong>{c.title || (c.silent ? "Khoảng dừng" : "—")}</strong><span className="vs-cue-text">{c.silent ? "(không lời)" : c.text}</span></span>
        <span className="scene-time mono" title="Bắt đầu · độ dài">{formatFrames(c.start)}<br /><span>{formatFrames(c.end - c.start)}</span></span>
      </div>
    </div>;
  })}</div>;
}

export function CuesStep({ detail, logs, job, busy, act, stop, nav }: StepProps) {
  const id = detail.state.id;
  const status = detail.state.stages.cues;
  const voiced = detail.state.stages.voice === "done";
  const runLogs = stageLogs(logs, ["cues"]);
  const count = detail.cues?.cues.length ?? 0;
  const blocking = detail.blocking.cues;
  const runAgent = () => act(() => post(`/api/videos/${id}/agent`, { stage: "cues" }));
  return <>
    <div className="vs-step-body">
      {count > 0 && <div className="vs-step-status"><span className="quiet-label">{count} CÂU · {formatFrames(detail.cues?.duration)} ƯỚC TÍNH</span></div>}
      <JobProgress job={job?.kind === "cues" ? job : null} onStop={stop} />
      {status === "idle" && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Agent chưa chạy" />}
      {status === "error" && <ProductionState className="vs-production-state" status="error" title="Chưa xong" detail={detail.state.lastError || "Xem nhật ký."} />}
      <HarnessPanel run={detail.harness.cues} />
      <AgentSummary logs={runLogs} />
      <CueList detail={detail} />
      {(status === "review" || (status === "done" && !voiced)) && <FeedbackBox disabled={busy} placeholder="Ví dụ: tách câu 12 thành hai câu; đổi tên nhân vật Minh thành Dũng…" onSend={(message) => act(() => post(`/api/videos/${id}/agent`, { stage: "cues", message }))} />}
      <AgentLog logs={runLogs} open={status === "running"} />
    </div>
    <StepBar
      nav={nav}
      tone={status}
      status={status === "done" ? "Đã duyệt lời & cue"
        : status === "review" ? (blocking > 0 ? `Còn ${blocking} góp ý chưa xử lý` : `${count} câu chờ duyệt`)
        : status === "running" ? "Agent đang viết cue…"
        : status === "error" ? "Agent dừng giữa chừng"
        : "Agent chưa chạy"}
    >
      {(status === "idle" || status === "error") && <Button type="primary" disabled={busy} icon={<PlayCircleFilled />} onClick={runAgent}>{status === "error" ? "Chạy lại" : "Chạy agent"}</Button>}
      {status === "review" && <Button type="primary" disabled={busy || blocking > 0} icon={<CheckCircleFilled />} onClick={() => act(() => post(`/api/videos/${id}/approve`, { stage: "cues" }))}>Duyệt lời & cue</Button>}
    </StepBar>
  </>;
}
