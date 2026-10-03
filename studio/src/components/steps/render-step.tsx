"use client";

import { useEffect, useState } from "react";
import { CheckCircleFilled, ExportOutlined, PlayCircleFilled, RedoOutlined } from "@ant-design/icons";
import { Button, Collapse, Empty, Segmented, Select } from "antd";
import { api, fileUrl, formatFrames, scenePages } from "@/lib/client";
import { NO_MUSIC, type MusicCatalog } from "@/lib/music";
import { BUILD_OPTIONS, buildLabel, DEFAULT_BUILD_NO, type BuildNo } from "@/lib/qa-manifest";
import { FPS_OPTIONS, fpsHint, LEGACY_RENDER_FPS, renderSpecLabel } from "@/lib/render-spec";
import type { RenderFps } from "@/lib/types";
import { AgentLog, JobProgress, stageLogs } from "../agent-panel";
import { ConfirmDialog } from "../confirm-dialog";
import { HarnessPanel } from "../harness-panel";
import { MusicPicker } from "../music-picker";
import { ProductionState } from "../production-state";
import { SfxPanel } from "./sfx-panel";
import { post, StepBar, type StepProps } from "./shared";

export function RenderStep({ detail, logs, job, busy, act, stop, nav }: StepProps) {
  const id = detail.state.id;
  const status = detail.state.stages.render;
  const deliver = detail.state.stages.deliver;
  const a = detail.artifacts;
  const runLogs = stageLogs(logs, ["render", "deliver"]);
  const ready = detail.state.stages.scenes === "done";
  const pages = scenePages(detail);
  const [confirmRender, setConfirmRender] = useState(false);
  // both tracks are finishing decisions: they are chosen only here and sent with the render request
  const [music, setMusic] = useState(detail.state.music.background);
  const [quizMusic, setQuizMusic] = useState(detail.state.music.quiz);
  const [captions, setCaptions] = useState(detail.state.captions);
  // Which round of review this MP4 is. Not derivable from how many renders ran — a render repeated after
  // a crash is still the same round — so the person sending it says.
  const [buildNo, setBuildNo] = useState<BuildNo>(detail.state.buildNo ?? DEFAULT_BUILD_NO);
  // Nhịp hình là quyết định lúc hoàn thiện như nhạc và phụ đề: cảnh đã dựng ở 30 fps dùng được cho cả hai
  // mức, nên đổi ở đây không bắt dựng lại gì. Video làm trước lựa chọn này giữ 30.
  const [fps, setFps] = useState<RenderFps>(detail.state.fps ?? LEGACY_RENDER_FPS);
  const [catalog, setCatalog] = useState<MusicCatalog>({ background: [], quiz: [] });
  const quizCues = detail.cues?.cues.filter((c) => c.quiz).length ?? 0;
  const hasSfx = detail.state.request.modules.includes("sfx");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  useEffect(() => {
    api<MusicCatalog>("/api/music").then(setCatalog).catch((e: unknown) => setCatalogError(e instanceof Error ? e.message : String(e)));
  }, []);
  const startRender = () => act(() => post(`/api/videos/${id}/render`, { music, quizMusic, captions, buildNo, fps }));
  const files: [string, string | null][] = [["Video MP4", a.mp4], ["Transcript", a.transcript], ["Manifest QA", a.qaManifest], ["File chương", a.chapters], ["Ghi chú dựng", a.prompts]];
  const complete = status === "done" && deliver === "done";
  const running = status === "running" || deliver === "running";

  const settings = <div className="vs-music-section">
    <div className="vs-section-title">Phụ đề</div>
    <div className="vs-captions-picker">
      <Segmented
        aria-label="Phụ đề trong video"
        value={captions ? "on" : "off"}
        disabled={busy}
        onChange={(v) => setCaptions(v === "on")}
        options={[{ value: "on", label: "Có" }, { value: "off", label: "Không" }]}
      />
      <small>{captions ? "Thanh phụ đề xanh, chữ trắng ở cuối khung hình." : "Video không có phụ đề."}</small>
    </div>
    <div className="vs-section-title">Nhịp hình</div>
    <div className="vs-captions-picker">
      <Segmented
        aria-label="Nhịp hình của bản MP4"
        value={fps}
        disabled={busy}
        onChange={(v) => setFps(v as RenderFps)}
        options={FPS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />
      <small>{fpsHint(fps)}</small>
    </div>
    <div className="vs-section-title">Bản dựng gửi QA</div>
    <div className="vs-captions-picker">
      <Select
        aria-label="Bản dựng gửi cho đội QA"
        className="vs-build-picker"
        value={buildNo}
        disabled={busy}
        onChange={setBuildNo}
        options={BUILD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />
      <small>{BUILD_OPTIONS.find((o) => o.value === buildNo)?.hint} · ghi vào <code>manifest.json</code> cạnh MP4.</small>
    </div>
    <div className="vs-section-title">Nhạc nền</div>
    {catalogError && <p className="vs-music-note">Không tải được danh mục nhạc ({catalogError}). Lựa chọn đã lưu vẫn được dùng khi render; tải lại trang để chọn bản khác.</p>}
    <MusicPicker tracks={catalog.background} value={music} disabled={busy} label="Chọn nhạc nền" noneLabel="Không có nhạc nền" noneHint="Video chỉ có giọng đọc." onChange={setMusic} />
    {/* Which câu the question covers was settled in cues.js; only the track is still open here. */}
    {quizCues > 0 && <>
      <div className="vs-section-title">Nhạc quiz</div>
      <p className="vs-music-note">{quizCues} câu được đánh dấu <code>quiz: true</code>. Nhạc nền tắt hẳn trong các đoạn đó.</p>
      <MusicPicker tracks={catalog.quiz} value={quizMusic} disabled={busy} label="Chọn nhạc quiz" noneLabel="Không có nhạc quiz" noneHint="Quiz vẫn hoạt động mà không cần nhạc." onChange={setQuizMusic} />
    </>}
    {quizCues === 0 && quizMusic !== NO_MUSIC && <p className="vs-music-note">
      Đã chọn nhạc quiz nhưng <code>cues.js</code> chưa câu nào đánh dấu <code>quiz: true</code> — nhạc quiz sẽ bị bỏ qua.
    </p>}
    {/* Tiếng động quyết ở đây cùng nhạc: cả ba đều là quyết định lúc hoàn thiện, và đều cần giọng đã xong. */}
    {hasSfx && <>
      <div className="vs-section-title">Tiếng động</div>
      <SfxPanel id={id} enabled={hasSfx} locked={busy} lockedWhy={running ? "Đang render — bản trộn của lượt này đã chốt. Đổi tiếng sau khi render xong." : !detail.managed ? "Video chỉ xem." : null} />
    </>}
  </div>;

  return <>
    <div className="vs-step-body">
      <JobProgress job={job && ["render", "deliver"].includes(job.kind) ? job : null} onStop={stop} />
      {!ready && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Duyệt phần dựng cảnh trước" />}
      {status === "error" && <ProductionState className="vs-production-state" status="error" title="Chưa xong" detail={detail.state.lastError || "Xem nhật ký."} />}
      {a.mp4 && <video className="video-player" src={fileUrl(a.mp4)} controls preload="metadata" />}
      {ready && <div className="render-specs">
        {/* Cạnh một MP4 thì ba dòng này tả chính file đó (giá trị đã lưu ở lượt render). Lựa chọn cho lượt
            sau nằm ở phần cài đặt — trộn hai thứ thì dòng ghi "30 fps" dưới một file 60 fps đang phát. */}
        <div><span>Định dạng</span><strong>{renderSpecLabel(detail.state.request.format, a.mp4 ? detail.state.fps ?? LEGACY_RENDER_FPS : fps)}</strong></div>
        <div><span>Phụ đề</span><strong>{(a.mp4 ? detail.state.captions : captions) ? "Có" : "Không"}</strong></div>
        <div><span>Bản dựng</span><strong>{buildLabel(a.mp4 ? detail.state.buildNo ?? DEFAULT_BUILD_NO : buildNo)}</strong></div>
        <div><span>Thời lượng</span><strong className="mono">{formatFrames(detail.cues?.voiceDuration ?? detail.cues?.duration)}</strong></div>
      </div>}
      {ready && a.mp4 && <ul className="vs-deliverables">{files.map(([label, path]) => <li key={label}>
        {path ? <CheckCircleFilled className="is-ok" /> : <span className="vs-dot" />}
        <span>{label}</span>
        {path ? <Button type="link" href={fileUrl(path)} target="_blank">{path}</Button> : <small>chưa có</small>}
      </li>)}</ul>}
      <HarnessPanel run={detail.harness.deliver} />
      {/* Before the first render the settings are the task; afterwards they only matter for a re-render. */}
      {ready && (a.mp4
        ? <Collapse className="vs-render-settings" items={[{ key: "settings", label: "Cài đặt cho lần render lại", extra: <span className="quiet-label">nhịp · phụ đề · bản dựng · nhạc</span>, children: settings }]} />
        : settings)}
      <AgentLog logs={runLogs} open={running} />
    </div>
    <StepBar
      nav={nav}
      tone={complete ? "done" : running ? "running" : status === "error" || deliver === "error" ? "error" : "idle"}
      status={complete ? "Đã render và bàn giao"
        : status === "running" ? "Đang render…"
        : deliver === "running" ? "Agent đang bàn giao…"
        : status === "error" ? "Render chưa xong"
        : status === "done" ? (deliver === "error" ? "Đã render · bàn giao lỗi" : "Đã render · chưa bàn giao (file chương, ghi chú dựng)")
        : ready ? "Chưa render" : "Chờ duyệt dựng cảnh"}
    >
      {status === "done" && ["idle", "error"].includes(deliver) && <Button type="primary" disabled={busy} icon={<PlayCircleFilled />} onClick={() => act(() => post(`/api/videos/${id}/agent`, { stage: "deliver" }))}>Chạy bàn giao</Button>}
      {a.mp4 && pages && <Button icon={<ExportOutlined />} href={pages.player} target="_blank">Mở trình phát</Button>}
      {ready && (a.mp4
        ? <Button disabled={busy} icon={<RedoOutlined />} onClick={() => setConfirmRender(true)}>Render lại</Button>
        : <Button type="primary" disabled={busy} icon={<PlayCircleFilled />} onClick={() => { void startRender(); }}>Render video</Button>)}
    </StepBar>
    {confirmRender && <ConfirmDialog
      title={`Render lại ${id}?`}
      description="Bản MP4 hiện có sẽ được thay bằng kết quả render mới. File nguồn và transcript không bị xoá."
      confirmLabel="Render lại"
      onCancel={() => setConfirmRender(false)}
      onConfirm={() => { setConfirmRender(false); void startRender(); }}
    />}
  </>;
}
