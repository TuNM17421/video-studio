"use client";

import { CheckCircleFilled, PlayCircleFilled, RedoOutlined, SendOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Collapse, Empty, Popover } from "antd";
import { agentProviderLabel } from "@/lib/agent-providers";
import { formatSize } from "@/lib/client";
import { resolveReviewer } from "@/lib/review";
import { AgentLog, AgentSummary, JobProgress, stageLogs } from "../agent-panel";
import { HarnessPanel } from "../harness-panel";
import { ProductionState } from "../production-state";
import { ReviewControl } from "../review-control";
import { findingMarks, QaGallery } from "./qa-gallery";
import { ClaudeDesignPanel } from "./claude-design-panel";
import { ImagesPanel } from "./images-panel";
import { ReviewComposer, ReviewFindings, useReviewDraft } from "./scenes-review";
import { post, StepBar, type StepProps } from "./shared";

export function ScenesStep({ detail, logs, job, busy, act, stop, nav, refresh }: StepProps) {
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
  // Chọn Claude Design thì cảnh dựng ở bên đó và render chụp trang nhập về, không phải `videos/<id>/`. Nên ở
  // đường này mọi thứ thuộc về cảnh của agent ở máy — nút chạy agent, kiểm tra tự động, finding, ảnh QA, ô góp
  // ý — đều ẩn: để chúng lại là mời người dùng soát và duyệt một bản khác với bản sẽ ra MP4.
  const byClaudeDesign = detail.state.request.sceneBuilder === "claude-design";
  const imported = detail.claudeDesign?.imported ?? null;

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
      {voiced && status === "idle" && !byClaudeDesign && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Agent chưa chạy" />}
      {status === "error" && <ProductionState className="vs-production-state" status="error" title="Chưa xong" detail={detail.state.lastError || "Xem nhật ký."} />}
      {/* Trước khi dựng cảnh là lúc cuối để chọn ảnh; đã duyệt dựng cảnh thì đổi ảnh phải qua góp ý cho agent. */}
      {!approved && <ImagesPanel detail={detail} act={act} refresh={refresh} />}
      {/* Chọn ở bước Kế hoạch, không phải ở đây: nó đổi cả cách làm của bước này. Panel hiện cả khi bước
          đã duyệt, để nhập lại một bản sửa — nhập lại thì bước mở về "chờ duyệt". */}
      {byClaudeDesign && voiced && <ClaudeDesignPanel detail={detail} act={act} busy={busy} approved={approved} />}
      {!byClaudeDesign && voiced && !approved && status !== "running" && <p className="vs-cd-switch">
        <Button size="small" type="link" disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/claude-design`, { action: "builder", value: "claude-design" }))}>
          Dựng bằng Claude Design thay vì agent ở máy
        </Button>
      </p>}
      {!byClaudeDesign && <><HarnessPanel run={run} tools={tools} approved={approved} />
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
      {detail.qa.length > 0 && <QaGallery paths={detail.qa} marks={findingMarks(detail.findings)} ratio={formatSize(detail.state.request.format).ratio} />}</>}
      {!byClaudeDesign && approved && !renderRunning && <Collapse className="vs-composer-later" items={[{
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
        : status === "review" ? (blocking > 0 ? `Còn ${blocking} lỗi chặn duyệt` : byClaudeDesign ? "Đã nhập — mở trình phát xem rồi duyệt" : "Sẵn sàng duyệt")
        : status === "error" ? "Agent dừng giữa chừng"
        : !voiced ? "Chờ giọng đọc"
        : byClaudeDesign ? "Chờ kết quả từ Claude Design" : "Chưa dựng cảnh"}
    >
      {!byClaudeDesign && voiced && status === "idle" && <Button type="primary" disabled={busy} icon={<PlayCircleFilled />} onClick={startAgent}>Bắt đầu dựng cảnh</Button>}
      {!byClaudeDesign && status === "error" && <Button disabled={busy} icon={<RedoOutlined />} onClick={startAgent}>Chạy lại agent</Button>}
      {!byClaudeDesign && waiting && voiced && <Button icon={<SendOutlined />} disabled={!canSend} onClick={send}>{sendLabel}</Button>}
      {status === "review" && <Button type="primary" disabled={busy || blocking > 0 || (byClaudeDesign && !imported)} icon={<CheckCircleFilled />} onClick={() => act(() => post(`/api/videos/${id}/approve`, { stage: "scenes" }))}>Duyệt dựng cảnh</Button>}
    </StepBar>
  </>;
}
