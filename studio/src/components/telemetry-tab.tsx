"use client";

import { useCallback, useEffect, useState } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Table, Tag } from "antd";
import { api } from "@/lib/client";
import type { LocalTelemetry, TelemetryPreviewEvent, TelemetryVideoMetrics } from "@/lib/types";
import { EVENT_STATUS, formatCount, formatDuration, formatTime, formatUsd, receiptNote, sendingSummary } from "@/lib/telemetry-ui";
import { Shell } from "./shell";
import styles from "./telemetry-tab.module.css";

const ALERT_TYPE = { success: "success", warning: "warning", error: "error", default: "info", processing: "info" } as const;

function Counts({ data }: { data: LocalTelemetry }) {
  const cells: [string, number, string][] = [
    ["total", data.outbox.total, "Event đã ghi trên máy"],
    ["acked", data.counts.acked, "Đã có biên nhận"],
    ["pending", data.counts.pending, "Chờ gửi"],
    ["blocked", data.counts.blocked, "Bị chặn (không gửi)"],
    ["ai", data.aiLogs.count, data.aiLogs.enabled ? "AI log mã hoá (bật)" : "AI log mã hoá (tắt)"],
  ];
  return <div className={styles.counts}>
    {cells.map(([key, value, label]) => <div key={key} className={styles.count} data-count={key}><strong>{formatCount(value)}</strong><span>{label}</span></div>)}
  </div>;
}

const videoColumns = [
  { title: "Video", dataIndex: "video", key: "video", render: (v: string) => <span className={styles.mono}>{v}</span> },
  { title: "Lượt chạy", key: "runs", render: (r: TelemetryVideoMetrics) => `${r.finished}/${r.runs}` },
  { title: "Lỗi", dataIndex: "errors", key: "errors" },
  { title: "Thời gian chạy", key: "duration", render: (r: TelemetryVideoMetrics) => formatDuration(r.durationMs) },
  { title: "Token vào/ra", key: "tokens", render: (r: TelemetryVideoMetrics) => `${formatCount(r.inputTokens)} / ${formatCount(r.outputTokens)}` },
  {
    title: "Chi phí đo được",
    key: "cost",
    render: (r: TelemetryVideoMetrics) => <span title={`${r.costMeasured} lượt có chi phí, ${r.costUnknown} lượt chưa đo`}>{formatUsd(r.costUsd)}{r.costUnknown > 0 && ` (+${r.costUnknown} chưa đo)`}</span>,
  },
  { title: "Finding mở", dataIndex: "feedbackOpen", key: "feedbackOpen" },
  { title: "Gần nhất", key: "lastAt", render: (r: TelemetryVideoMetrics) => formatTime(r.lastAt) },
];

const previewColumns = [
  {
    title: "Trạng thái",
    key: "status",
    render: (p: TelemetryPreviewEvent) => <Tag color={EVENT_STATUS[p.status].tone}>{EVENT_STATUS[p.status].label}</Tag>,
  },
  { title: "Loại", key: "type", render: (p: TelemetryPreviewEvent) => <span className={styles.mono}>{String(p.event.event_type ?? "—")}</span> },
  { title: "Video", key: "video", render: (p: TelemetryPreviewEvent) => String(p.event.video_ref ?? "—") },
  { title: "Bước", key: "stage", render: (p: TelemetryPreviewEvent) => String(p.event.stage ?? "—") },
  { title: "Lúc", key: "at", render: (p: TelemetryPreviewEvent) => formatTime(typeof p.event.occurred_at === "string" ? p.event.occurred_at : null) },
  {
    title: "Ghi chú",
    key: "note",
    render: (p: TelemetryPreviewEvent) => p.blockedReason ?? (p.extraKeys.length ? `Có field ngoài danh sách xem trước: ${p.extraKeys.join(", ")}` : ""),
  },
];

export default function TelemetryTab() {
  const [data, setData] = useState<LocalTelemetry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => api<LocalTelemetry>("/api/telemetry-local")
    .then((next) => { setData(next); setError(null); })
    .catch((e: unknown) => setError(e instanceof Error ? e.message : "Không đọc được số liệu."))
    .finally(() => setLoading(false)), []);

  useEffect(() => { void load(); }, [load]);

  const summary = data ? sendingSummary(data) : null;
  const note = data ? receiptNote(data) : null;

  return <Shell page="telemetry">
    <div className={`page-heading ${styles.pageHeading}`}>
      <div><div className="eyebrow"><span className="tiny-mark" /> .studio/telemetry/</div><h1>Số liệu</h1></div>
      <p>Số liệu máy này đã ghi và bản xem trước dữ liệu sẽ gửi lên hệ thống log. Chỉ metadata: không lời nhắc, nội dung hay khoá.</p>
      <Button icon={<ReloadOutlined />} onClick={() => { setLoading(true); void load(); }} loading={loading}>Tải lại</Button>
    </div>
    {error && <Alert className="feedback" type="error" showIcon title="Không đọc được số liệu" description={error} />}
    {data && summary && <>
      <section className={`editor-panel ${styles.panel}`} aria-labelledby="telemetry-send-title" data-testid="telemetry-send">
        <span className="eyebrow">GỬI LÊN HỆ THỐNG LOG</span>
        <h2 id="telemetry-send-title">{summary.title}</h2>
        <Alert type={ALERT_TYPE[summary.tone]} showIcon title={summary.detail} />
        {note && <Alert className={styles.note} type="info" showIcon title={note} />}
        <Counts data={data} />
        <div className={styles.meta}>
          Lần thử gần nhất: {formatTime(data.receipts.lastAttemptAt)} · thành công: {formatTime(data.receipts.lastSuccessAt)} · thất bại: {formatTime(data.receipts.lastFailureAt)}
          {data.outbox.unreadableLines > 0 && ` · ${data.outbox.unreadableLines} dòng outbox không đọc được`}
        </div>
      </section>
      <section className={`editor-panel ${styles.panel}`} aria-labelledby="telemetry-videos-title">
        <span className="eyebrow">SỐ LIỆU TRÊN MÁY</span>
        <h2 id="telemetry-videos-title">Theo từng video</h2>
        <Table rowKey="video" size="small" pagination={false} columns={videoColumns} dataSource={data.videos} locale={{ emptyText: "Chưa có event nào." }} />
      </section>
      <section className={`editor-panel ${styles.panel}`} aria-labelledby="telemetry-preview-title">
        <span className="eyebrow">XEM TRƯỚC DỮ LIỆU GỬI</span>
        <h2 id="telemetry-preview-title">Event chưa có biên nhận ({formatCount(data.counts.pending + data.counts.blocked)}, hiện tối đa {data.previewLimit})</h2>
        <Table
          rowKey={(p) => String(p.event.event_id ?? JSON.stringify(p.event))}
          size="small"
          columns={previewColumns}
          dataSource={data.preview}
          pagination={{ pageSize: 10 }}
          expandable={{ expandedRowRender: (p) => <pre className={styles.json}>{JSON.stringify(p.event, null, 2)}</pre> }}
          locale={{ emptyText: "Không còn event nào chờ gửi." }}
        />
      </section>
    </>}
  </Shell>;
}
