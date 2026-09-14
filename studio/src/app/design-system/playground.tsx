"use client";

import { useState } from "react";
import { CheckCircleFilled, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Alert, App, Button, Checkbox, Input, Segmented, Select, Switch, Tag } from "antd";
import { AGENT_PROVIDER_OPTIONS } from "@/lib/agent-providers";
import styles from "./design-system.module.css";

const STATUS_COPY = {
  idle: { label: "Chưa chạy", detail: "Cổng đang chờ đầu vào." },
  running: { label: "Đang chạy", detail: "Agent đang xử lý tác vụ hiện tại." },
  review: { label: "Chờ duyệt", detail: "Kết quả đã sẵn sàng để người dựng kiểm tra." },
  done: { label: "Hoàn tất", detail: "Cổng đã được duyệt và khóa kết quả." },
  error: { label: "Cần xử lý", detail: "Tác vụ dừng; mở nhật ký để sửa nguyên nhân." },
} as const;

type Status = keyof typeof STATUS_COPY;

export function DesignSystemPlayground() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<Status>("review");
  const [motionRun, setMotionRun] = useState(0);
  const current = STATUS_COPY[status];

  return <div className={styles.playground}>
    <article className={styles.componentPanel}>
      <header><span>Actions</span><Tag color="blue">Ant Design 6</Tag></header>
      <div className={styles.buttonRow}>
        <Button type="primary" onClick={() => { void message.success("Đã lưu thay đổi."); }}>Lưu thay đổi</Button>
        <Button onClick={() => { void message.info("Đã mở bản xem trước."); }}>Xem trước</Button>
        <Button danger onClick={() => { void message.warning("Thao tác nhạy cảm cần xác nhận."); }}>Dừng tác vụ</Button>
        <Button disabled>Chưa đủ điều kiện</Button>
      </div>
      <nav className={styles.workflowNavigation} aria-label="Ví dụ điều hướng giữa các bước sản xuất">
        <Button icon={<LeftOutlined />}>Quay lại: Giọng đọc</Button>
        <span><CheckCircleFilled />Đã xong Dựng cảnh</span>
        <Button type="primary" icon={<RightOutlined />} iconPlacement="end">Tiếp: Render</Button>
      </nav>
      <div className={styles.formSpecimen}>
        <label>Mã video<Input defaultValue="d02-r1-v03" spellCheck={false} /></label>
        {/* the real list, so a new agent shows up here too instead of quietly going stale */}
        <label>Agent<Select defaultValue={AGENT_PROVIDER_OPTIONS[0].value} options={AGENT_PROVIDER_OPTIONS.map(({ value, label }) => ({ value, label }))} /></label>
        <label className={`vs-counted-textarea ${styles.countedTextarea}`}>Ghi chú
          <Input.TextArea rows={3} maxLength={5000} showCount placeholder="Thông tin bổ sung cho agent…" />
        </label>
        <Checkbox defaultChecked>Render MP4 sau khi duyệt</Checkbox>
        <label className={styles.switchLabel}><Switch defaultChecked size="small" /> Giữ nhật ký chi tiết</label>
      </div>
    </article>

    <article className={styles.componentPanel}>
      <header><span>Production states</span><Tag>5 trạng thái</Tag></header>
      <Segmented block value={status} onChange={(value) => setStatus(value as Status)} options={[
        { value: "idle", label: "Chờ" },
        { value: "running", label: "Chạy" },
        { value: "review", label: "Duyệt" },
        { value: "done", label: "Xong" },
        { value: "error", label: "Lỗi" },
      ]} />
      <div className={`${styles.statusReadout} ${styles[`status_${status}`]}`}>
        <span aria-hidden="true" /><div><strong>{current.label}</strong><p>{current.detail}</p></div>
      </div>
      <Alert showIcon type={status === "error" ? "error" : status === "done" ? "success" : status === "review" ? "warning" : "info"} title={current.label} description={current.detail} />
    </article>

    <article className={`${styles.componentPanel} ${styles.motionPanel}`}>
      <header><span>Signature motion</span><code>240 ms · ease-standard</code></header>
      <div className={styles.motionStage} key={motionRun} aria-label="Minh họa production rail chạy qua năm cổng">
        <div className={styles.motionTrack}><span /></div>
        <div className={styles.motionGates}>{[1, 2, 3, 4, 5].map((gate) => <i key={gate}>{gate}</i>)}</div>
      </div>
      <div className={styles.motionFooter}><p>Rail tiến tới cổng đang hoạt động; nội dung xung quanh đứng yên để người dùng giữ ngữ cảnh.</p><Button onClick={() => setMotionRun((run) => run + 1)}>Phát lại motion</Button></div>
    </article>
  </div>;
}
