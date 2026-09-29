"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightOutlined, DeleteOutlined, LoadingOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Input, Select, Table } from "antd";
import type { TableProps } from "antd";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { VideoSummary } from "@/lib/types";
import { completedStages, matchesVideo, nextStageLabel, overallStageStatus, VIDEO_STAGES, type VideoFilter } from "@/lib/video-status";
import { costLabels } from "@/lib/video-cost";
import { Shell } from "./shell";
import { StageBadge } from "./agent-panel";
import { ConfirmDialog } from "./confirm-dialog";
import styles from "./videos.module.css";

interface TrashResult {
  id: string;
  trashed: { kind: string; path: string }[];
}

function currentStageIndex(video: VideoSummary) {
  const active = VIDEO_STAGES.findIndex(({ id }) => ["running", "review", "error"].includes(video.stages[id]));
  if (active >= 0) return active;
  const next = VIDEO_STAGES.findIndex(({ id }) => video.stages[id] !== "done");
  return next >= 0 ? next : VIDEO_STAGES.length - 1;
}

function updatedLabel(updatedAt: string | null) {
  if (!updatedAt) return "Chưa ghi nhận";
  const value = new Date(updatedAt);
  if (Number.isNaN(value.getTime())) return updatedAt;
  return value.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function VideoProgress({ video }: { video: VideoSummary }) {
  const done = completedStages(video.stages);
  const current = currentStageIndex(video);
  return <div className={styles.progress} aria-label={`${done} trên 5 cổng đã hoàn tất. Cổng hiện tại: ${nextStageLabel(video.stages)}.`}>
    <div className={styles.progressRail} aria-hidden="true">
      {VIDEO_STAGES.map(({ id }, index) => <span key={id} data-status={video.stages[id]} data-current={index === current || undefined} />)}
    </div>
    <div className={styles.progressLabels} aria-hidden="true">
      {VIDEO_STAGES.map(({ id, short }, index) => <span key={id} data-current={index === current || undefined}>{short}</span>)}
    </div>
  </div>;
}

/** Agent USD and ElevenLabs characters so far; each line says what it leaves out (lib/video-cost.ts). */
function VideoCost({ video }: { video: VideoSummary }) {
  const { agent, tts } = costLabels(video.cost);
  if (!agent && !tts) return <span className={styles.costNone} aria-label="Chưa có chi phí ghi nhận">—</span>;
  return <div className={styles.cost}>
    {([["agent", agent], ["ElevenLabs", tts]] as const).map(([kind, line]) => line && <div key={kind} title={line.note}>
      {line.known
        ? <><strong>{line.value}</strong><span>{kind}{line.missing ? ` · ${line.missing}` : ""}</span></>
        : <span>{kind}: chưa có số</span>}
    </div>)}
  </div>;
}

function VideoIdentity({ video }: { video: VideoSummary }) {
  return <div className={styles.videoIdentity}>
    <strong>{video.id}</strong>
    {video.title !== video.id && <span>{video.title}</span>}
    {!video.managed && <small>Quản lý ngoài Video Studio</small>}
  </div>;
}

export default function Videos() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VideoSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VideoFilter>("all");

  useEffect(() => {
    api<VideoSummary[]>("/api/videos").then(setVideos).catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Không thể tải danh sách video.");
    });
  }, []);

  async function loadVideos() {
    setVideos(null);
    setError(null);
    try {
      setVideos(await api<VideoSummary[]>("/api/videos"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải danh sách video.");
    }
  }

  const filtered = useMemo(() => videos?.filter((video) => matchesVideo(video, query, filter)) || [], [videos, query, filter]);
  const loading = videos === null && !error;
  const countLabel = videos ? `${filtered.length} / ${videos.length} video` : error ? "Không thể tải" : "Đang tải…";
  const hasFilters = Boolean(query.trim()) || filter !== "all";

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

  function resetFilters() {
    setQuery("");
    setFilter("all");
  }

  const columns: TableProps<VideoSummary>["columns"] = [
    { title: "Video", key: "video", width: "21%", render: (_, video) => <VideoIdentity video={video} /> },
    { title: "Lịch", key: "schedule", width: "13%", render: (_, video) => <div className={styles.schedule}><strong>{video.day || "—"}</strong><span>Cập nhật {updatedLabel(video.updatedAt)}</span></div> },
    { title: "Tiến độ 5 cổng", key: "progress", width: "24%", render: (_, video) => <VideoProgress video={video} /> },
    { title: "Cổng hiện tại", key: "status", width: "15%", render: (_, video) => <div className={styles.videoState}><StageBadge status={overallStageStatus(video.stages)} /><span>{nextStageLabel(video.stages)}</span></div> },
    { title: "Chi phí", key: "cost", width: "13%", render: (_, video) => <VideoCost video={video} /> },
    { title: <span className="sr-only">Thao tác</span>, key: "action", width: "14%", align: "right", render: (_, video) => <div className={styles.desktopActions}>
      <Button type="link" onClick={() => router.push(`/?id=${encodeURIComponent(video.id)}`)} icon={video.running ? <LoadingOutlined spin /> : <ArrowRightOutlined />} iconPlacement="end">Mở</Button>
      <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Xóa video ${video.id}`} onClick={() => { setDeleteError(null); setDeleteTarget(video); }}>Xóa</Button>
    </div> },
  ];

  const results = error
    ? <div className={styles.statePanel} role="status">
        <strong>Danh sách video chưa sẵn sàng</strong>
        <span>Kiểm tra server Studio rồi thử tải lại.</span>
        <Button icon={<ReloadOutlined />} onClick={() => { void loadVideos(); }}>Thử tải lại</Button>
      </div>
    : loading
      ? <div className={styles.statePanel} role="status" aria-live="polite"><LoadingOutlined spin /><strong>Đang đọc hồ sơ sản xuất…</strong></div>
      : filtered.length === 0
        ? <div className={styles.emptyState}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={videos?.length ? "Không có video phù hợp với bộ lọc hiện tại." : "Chưa có video. Tạo video đầu tiên để bắt đầu luồng sản xuất."} />
            {hasFilters && <Button onClick={resetFilters}>Xóa bộ lọc</Button>}
          </div>
        : <>
            <Table className={styles.desktopTable} rowKey="id" columns={columns} dataSource={filtered} pagination={false} tableLayout="fixed" />
            <ul className={styles.mobileList} aria-label="Danh sách video">
              {filtered.map((video) => <li key={video.id}>
                <article className={styles.videoCard}>
                  <div className={styles.cardHeading}>
                    <VideoIdentity video={video} />
                    <StageBadge status={overallStageStatus(video.stages)} />
                  </div>
                  <dl className={styles.cardFacts}>
                    <div><dt>Ngày</dt><dd>{video.day || "—"}</dd></div>
                    <div><dt>Cập nhật</dt><dd>{updatedLabel(video.updatedAt)}</dd></div>
                    <div><dt>Cổng hiện tại</dt><dd>{nextStageLabel(video.stages)}</dd></div>
                  </dl>
                  <div className={styles.cardCost}><span>Chi phí</span><VideoCost video={video} /></div>
                  <VideoProgress video={video} />
                  <div className={styles.mobileActions}>
                    <Button type="primary" onClick={() => router.push(`/?id=${encodeURIComponent(video.id)}`)} icon={video.running ? <LoadingOutlined spin /> : <ArrowRightOutlined />} iconPlacement="end">Mở video</Button>
                    <Button danger icon={<DeleteOutlined />} aria-label={`Xóa video ${video.id}`} onClick={() => { setDeleteError(null); setDeleteTarget(video); }}>Xóa</Button>
                  </div>
                </article>
              </li>)}
            </ul>
          </>;

  return <Shell page="videos">
    <div className={`page-heading ${styles.pageHeading}`}>
      <div><div className="eyebrow"><span className="tiny-mark" /> projects/</div><h1>Các video</h1></div>
      <p>Đọc tiến độ, nhận diện cổng đang chờ và trở lại đúng bàn dựng.</p>
    </div>
    {error && <Alert className="feedback" type="error" showIcon title="Không tải được danh sách video" description={error} />}
    {notice && <Alert className="feedback" type="success" showIcon closable title="Đã đưa video vào Thùng rác" description={notice} onClose={() => setNotice(null)} />}
    <section className={`editor-panel ${styles.indexPanel}`} aria-busy={loading} aria-labelledby="video-index-title">
      <div className={styles.toolbar}>
        <div className={styles.toolbarTitle}><span className="eyebrow">LUỒNG SẢN XUẤT</span><h2 id="video-index-title">Theo dõi từng cổng duyệt</h2></div>
        <div className={styles.controls}>
          <Input.Search className={styles.search} allowClear value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên hoặc ngày…" aria-label="Tìm video" aria-controls="video-index-results" />
          <Select className={styles.filter} aria-label="Lọc trạng thái" value={filter} onChange={(value) => setFilter(value)} options={[{ value: "all", label: "Tất cả trạng thái" }, { value: "active", label: "Đang xử lý" }, { value: "attention", label: "Cần chú ý" }, { value: "done", label: "Đã hoàn tất" }]} />
          <span className={styles.count} aria-live="polite">{countLabel}</span>
        </div>
      </div>
      <div id="video-index-results" className={styles.results}>{results}</div>
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
