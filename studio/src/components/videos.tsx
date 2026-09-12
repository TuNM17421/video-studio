"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightOutlined, LoadingOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Input, Select, Table } from "antd";
import type { TableProps } from "antd";
import { api, useKeyStatus } from "@/lib/client";
import type { VideoSummary } from "@/lib/types";
import { completedStages, matchesVideo, nextStageLabel, overallStageStatus, VIDEO_STAGES, type VideoFilter } from "@/lib/video-status";
import { Shell } from "./shell";
import { StageBadge } from "./agent-panel";

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
  const columns: TableProps<VideoSummary>["columns"] = [
    { title: "Video", key: "video", render: (_, video) => <div className="vs-video-cell"><strong>{video.id}</strong>{video.title !== video.id && <small>{video.title}</small>}{!video.managed && <small>làm ngoài Video Studio</small>}</div> },
    { title: "Ngày", dataIndex: "day", key: "day", render: (day: string) => day || "—" },
    { title: "Tiến độ 5 cổng", key: "progress", render: (_, video) => <VideoProgress video={video} /> },
    { title: "Trạng thái", key: "status", render: (_, video) => <div className="vs-video-state"><StageBadge status={overallStageStatus(video.stages)} /><small className="vs-next-stage">{nextStageLabel(video.stages)}</small></div> },
    { title: <span className="sr-only">Thao tác</span>, key: "action", align: "right", render: (_, video) => <Button type="link" href={`/?id=${video.id}`} icon={video.running ? <LoadingOutlined spin /> : <ArrowRightOutlined />} iconPlacement="end">Mở</Button> },
  ];
  return <Shell page="videos" crumb="Các video" hasKey={hasKey}>
    <div className="page-heading"><div><div className="eyebrow"><span className="tiny-mark" /> projects/</div><h1>Các video</h1></div></div>
    {error && <Alert className="feedback" type="error" showIcon title="Không tải được danh sách video" description={error} />}
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
    <footer className="workspace-footer" />
  </Shell>;
}
