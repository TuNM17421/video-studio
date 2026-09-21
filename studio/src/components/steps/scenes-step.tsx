"use client";

import { CheckCircleFilled, PlayCircleFilled, RedoOutlined, SendOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Collapse, Empty, Popover } from "antd";
import { agentProviderLabel } from "@/lib/agent-providers";
import { resolveReviewer } from "@/lib/review";
import { AgentLog, AgentSummary, JobProgress, stageLogs } from "../agent-panel";
import { HarnessPanel } from "../harness-panel";
import { ProductionState } from "../production-state";
import { ReviewControl } from "../review-control";
import { findingMarks, QaGallery } from "./qa-gallery";
import { ReviewComposer, ReviewFindings, useReviewDraft } from "./scenes-review";
import { post, StepBar, type StepProps } from "./shared";

export function ScenesStep({ detail, logs, job, busy, act, stop, nav }: StepProps) {
  const id = detail.state.id;
  const status = detail.state.stages.scenes;
  const runLogs = stageLogs(logs, ["scenes"]);
  const voiced = detail.state.stages.voice === "done";
  const approved = status === "done";
  const waiting = ["review", "error"].includes(status);
  const run = detail.harness.scenes;
  const draft = useReviewDraft(detail.findings, run?.review?.runId, voiced && waiting && !busy);
  const blocking = detail.blocking.scenes;
  const scenes = detail.cues?.cues.length ?? 0;
  const review = detail.state.review;
  const reviewer = resolveReviewer(detail.state.agent.provider, review, detail.installedAgents);
  const reviewLabel = !review.enabled ? "Review: tắt" : reviewer.ok ? `Review: ${agentProviderLabel(reviewer.provider)}` : "Review: chưa chọn được";
  const renderRunning = detail.state.stages.render === "running";

  const startAgent = () => act(() => post(`/api/videos/${id}/agent`, { stage: "scenes" }));
  const rerun = () => act(() => post(`/api/videos/${id}/review`, { action: "run" }));
  const send = () => act(async () => {
    const payload = draft.payload();
    if (payload.fix.length || payload.skip.length) await post(`/api/videos/${id}/findings`, payload);
    else await post(`/api/videos/${id}/agent`, { stage: "scenes", message: payload.note });
    draft.reset();
  });
  const sendLabel = draft.fix.length
    ? `Gửi agent sửa · ${draft.fix.length}${draft.skip.length ? ` · bỏ qua ${draft.skip.length}` : ""}`
    : draft.skip.length ? `Ghi bỏ qua · ${draft.skip.length}` : "Gửi góp ý";
  const canSend = !busy && !draft.missingReason && (draft.fix.length > 0 || draft.skip.length > 0 || draft.note.trim().length > 0);

  const tools = voiced && <>
    <Popover trigger="click" placement="bottomRight" content={<div className="vs-review-popover"><ReviewControl
      author={detail.state.agent.provider}
      value={review}
      installed={detail.installedAgents}
      disabled={busy || status === "running"}
      onChange={(next) => act(() => post(`/api/videos/${id}/review`, next))}
    /></div>}>
      <Button size="small" icon={<SettingOutlined />}>{reviewLabel}</Button>
    </Popover>
    <Button size="small" icon={<RedoOutlined />} disabled={busy || !waiting} onClick={rerun}>{review.enabled ? "Chạy lại review" : "Chạy lại kiểm tra"}</Button>
  </>;

  return <>
    <div className="vs-step-body">
      {scenes > 0 && <div className="vs-step-status"><span className="quiet-label">{scenes} CẢNH{detail.qa.length ? ` · ${detail.qa.length} ẢNH QA` : ""}</span></div>}
      <JobProgress job={job?.kind === "scenes" || job?.kind === "review" ? job : null} onStop={stop} />
      {!voiced && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tạo giọng đọc trước" />}
      {voiced && status === "idle" && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Agent chưa chạy" />}
      {status === "error" && <ProductionState className="vs-production-state" status="error" title="Chưa xong" detail={detail.state.lastError || "Xem nhật ký."} />}
      <HarnessPanel run={run} tools={tools} approved={approved} />
      <ReviewFindings
        draft={draft}
        qa={detail.qa}
        editable={draft.canFix}
        approved={approved}
        reviewEnabled={review.enabled}
        onReopen={(fid) => act(() => post(`/api/videos/${id}/findings`, { reopen: [fid] }))}
      />
      {waiting && voiced && <ReviewComposer draft={draft} disabled={busy} />}
      <AgentSummary logs={runLogs} />
      {detail.qa.length > 0 && <QaGallery paths={detail.qa} marks={findingMarks(detail.findings)} />}
      {approved && !renderRunning && <Collapse className="vs-composer-later" items={[{
        key: "later",
        label: "Góp ý thêm cho agent",
        extra: <span className="quiet-label">dựng lại một phần sau khi đã duyệt</span>,
        children: <>
          <ReviewComposer draft={draft} disabled={busy} />
          <Button icon={<SendOutlined />} disabled={!canSend} onClick={send}>Gửi góp ý</Button>
        </>,
      }]} />}
      <AgentLog logs={runLogs} open={status === "running"} />
    </div>
    <StepBar
      nav={nav}
      tone={status === "review" && blocking > 0 ? "error" : status}
      status={approved ? "Đã duyệt dựng cảnh"
        : status === "running" ? (job?.kind === "review" ? "Đang review lại…" : "Agent đang dựng cảnh…")
        : status === "review" ? (blocking > 0 ? `Còn ${blocking} lỗi chặn duyệt` : "Sẵn sàng duyệt")
        : status === "error" ? "Agent dừng giữa chừng"
        : voiced ? "Chưa dựng cảnh" : "Chờ giọng đọc"}
    >
      {voiced && status === "idle" && <Button type="primary" disabled={busy} icon={<PlayCircleFilled />} onClick={startAgent}>Bắt đầu dựng cảnh</Button>}
      {status === "error" && <Button disabled={busy} icon={<RedoOutlined />} onClick={startAgent}>Chạy lại agent</Button>}
      {waiting && voiced && <Button icon={<SendOutlined />} disabled={!canSend} onClick={send}>{sendLabel}</Button>}
      {status === "review" && <Button type="primary" disabled={busy || blocking > 0} icon={<CheckCircleFilled />} onClick={() => act(() => post(`/api/videos/${id}/approve`, { stage: "scenes" }))}>Duyệt dựng cảnh</Button>}
    </StepBar>
  </>;
}
