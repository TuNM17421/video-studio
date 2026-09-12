"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightOutlined, DeleteOutlined, LoadingOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Input, Select, Table } from "antd";
import type { TableProps } from "antd";
import { api, useKeyStatus } from "@/lib/client";
import type { VideoSummary } from "@/lib/types";
import { completedStages, matchesVideo, nextStageLabel, overallStageStatus, VIDEO_STAGES, type VideoFilter } from "@/lib/video-status";
import { Shell } from "./shell";
import { StageBadge } from "./agent-panel";
import { ConfirmDialog } from "./confirm-dialog";

interface TrashResult {
  id: string;
  trashed: { kind: string; path: string }[];
}

function VideoProgress({ video }: { video: VideoSummary }) {
  const done = completedStages(video.stages);
  return <div className="vs-video-progress" aria-label={`${done} trên 5 cổng đã hoàn tất. Mốc hiện tại: ${nextStageLabel(video.stages)}`}>
    <div className="vs-progress-line" aria-hidden="true">{VIDEO_STAGES.map(({ id }) => <span key={id} className={`is-${video.stages[id]}`} />)}</div>
    <div className="vs-progress-labels" aria-hidden="true">{VIDEO_STAGES.map(({ id, short }) => <span key={id}>{short}</span>)}</div>
  </div>;
}

export default function Videos() {
  const [videos, setVideos] = useState<VideoSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VideoSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VideoFilter>("all");
  const { hasKey } = useKeyStatus();
  useEffect(() => { api<VideoSummary[]>("/api/videos").then(setVideos).catch((e) => setError(e.message)); }, []);
  const filtered = useMemo(() => videos?.filter((video) => matchesVideo(video, query, filter)) || [], [videos, query, filter]);
  const loading = videos === null && !error;
  const countLabel = videos ? `${filtered.length} / ${videos.length} VIDEO` : error ? "KHÔNG THỂ TẢI" : "ĐANG TẢI VIDEO…";
  const emptyText = videos === null || error
    ? null
    : videos.length
      ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có video phù hợp. Đổi từ khóa hoặc bộ lọc trạng thái." />
      : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có video. Tạo video đầu tiên để bắt đầu luồng sản xuất." />;

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await api<TrashResult>(`/api/videos/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      setVideos((current) => current?.filter((video) => video.id !== deleteTarget.id) ?? null);
      setNotice(`Đã đưa “${deleteTarget.id}” cùng ${result.trashed.length} vị trí dữ liệu vào Thùng rác. Có thể khôi phục bằng trình quản lý tệp.`);
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Không thể đưa video vào Thùng rác.");
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableProps<VideoSummary>["columns"] = [
    { title: "Video", key: "video", render: (_, video) => <div className="vs-video-cell"><strong>{video.id}</strong>{video.title !== video.id && <small>{video.title}</small>}{!video.managed && <small>làm ngoài Video Studio</small>}</div> },
    { title: "Ngày", dataIndex: "day", key: "day", render: (day: string) => day || "—" },
    { title: "Tiến độ 5 cổng", key: "progress", render: (_, video) => <VideoProgress video={video} /> },
    { title: "Trạng thái", key: "status", render: (_, video) => <div className="vs-video-state"><StageBadge status={overallStageStatus(video.stages)} /><small className="vs-next-stage">{nextStageLabel(video.stages)}</small></div> },
    { title: <span className="sr-only">Thao tác</span>, key: "action", align: "right", render: (_, video) => <div className="vs-video-actions">
      <Button type="link" href={`/?id=${video.id}`} icon={video.running ? <LoadingOutlined spin /> : <ArrowRightOutlined />} iconPlacement="end">Mở</Button>
      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { setDeleteError(null); setDeleteTarget(video); }}>Xóa</Button>
    </div> },
  ];
  return <Shell page="videos" crumb="Các video" hasKey={hasKey}>
    <div className="page-heading"><div><div className="eyebrow"><span className="tiny-mark" /> projects/</div><h1>Các video</h1></div></div>
    {error && <Alert className="feedback" type="error" showIcon title="Không tải được danh sách video" description={error} />}
    {notice && <Alert className="feedback" type="success" showIcon closable title="Đã đưa video vào Thùng rác" description={notice} onClose={() => setNotice(null)} />}
    <section className="editor-panel vs-video-index" aria-busy={loading}>
      <div className="vs-index-toolbar">
        <div><span className="eyebrow">LUỒNG SẢN XUẤT</span><h2>Theo dõi từng cổng duyệt</h2></div>
        <div className="vs-index-controls">
          <Input.Search className="vs-search" allowClear value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên hoặc ngày…" aria-label="Tìm video" />
          <Select aria-label="Lọc trạng thái" value={filter} onChange={(value) => setFilter(value)} options={[{ value: "all", label: "Tất cả trạng thái" }, { value: "active", label: "Đang xử lý" }, { value: "attention", label: "Cần chú ý" }, { value: "done", label: "Đã hoàn tất" }]} />
          <span className="quiet-label" aria-live="polite">{countLabel}</span>
        </div>
      </div>
      <Table className="vs-table vs-production-table" rowKey="id" columns={columns} dataSource={filtered} pagination={false} loading={loading} locale={{ emptyText }} />
    </section>
    {deleteTarget && <ConfirmDialog
      title={`Đưa “${deleteTarget.id}” vào Thùng rác?`}
      description={<div className="vs-delete-summary">
        <p>Studio sẽ chuyển toàn bộ dữ liệu riêng của video này vào Thùng rác:</p>
        <ul>
          <li>project, state, nhật ký, ảnh QA và các bản render;</li>
          <li>mã nguồn cảnh, giọng đọc, transcript và chapter.</li>
        </ul>
        <p className="vs-delete-recovery">Có thể khôi phục từng mục bằng trình quản lý tệp của hệ điều hành. Bundle và template dùng chung không bị xóa.</p>
        {deleteTarget.running && <Alert type="warning" showIcon title="Video đang có tác vụ chạy" description="Hãy dừng tác vụ trước khi xóa để agent không ghi dữ liệu trở lại." />}
        {deleteError && <Alert type="error" showIcon title="Chưa thể xóa video" description={deleteError} />}
      </div>}
      confirmLabel="Đưa vào Thùng rác"
      busy={deleting}
      confirmDisabled={deleteTarget.running}
      onCancel={() => { if (!deleting) setDeleteTarget(null); }}
      onConfirm={() => { void confirmDelete(); }}
    />}
    <footer className="workspace-footer" />
  </Shell>;
}
