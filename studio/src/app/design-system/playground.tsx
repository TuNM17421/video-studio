"use client";

import { useState } from "react";
import { CheckCircleFilled, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { STUDIO_SEGMENTED_SPEC } from "@/lib/design-tokens";
import { App, Button, Checkbox, Input, Segmented, Select, Switch, Tag } from "antd";
import { AGENT_PROVIDER_OPTIONS } from "@/lib/agent-providers";
import type { StageStatus } from "@/lib/types";
import { ProductionState } from "@/components/production-state";
import styles from "./design-system.module.css";

export function DesignSystemPlayground() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<StageStatus>("review");
  const [motionRun, setMotionRun] = useState(0);
  const [source, setSource] = useState("elevenlabs");
  const [decision, setDecision] = useState("fix");
  const [filter, setFilter] = useState("all");

  return <div className={styles.playground}>
    <article className={styles.componentPanel}>
      <header><span>Actions</span><Tag color="blue">Ant Design 6</Tag></header>
      <div className={styles.buttonRow}>
        <Button type="primary" onClick={() => { void message.success("Đã lưu thay đổi."); }}>Lưu thay đổi</Button>
        <Button onClick={() => { void message.info("Đã mở bản xem trước."); }}>Xem trước</Button>
        <Button danger onClick={() => { void message.warning("Thao tác nhạy cảm cần xác nhận."); }}>Dừng tác vụ</Button>
        <Button disabled>Chưa đủ điều kiện</Button>
      </div>
      <nav className={styles.workflowNavigation} aria-label="Ví dụ thanh quyết định của một bước">
        <span><CheckCircleFilled />Đã duyệt dựng cảnh</span>
        <Button icon={<LeftOutlined />}>Giọng đọc</Button>
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
      <Segmented block value={status} onChange={(value) => setStatus(value as StageStatus)} options={[
        { value: "idle", label: "Chờ" },
        { value: "running", label: "Chạy" },
        { value: "review", label: "Duyệt" },
        { value: "done", label: "Xong" },
        { value: "error", label: "Lỗi" },
      ]} />
      <ProductionState className={styles.productionState} status={status} />
    </article>

    <article className={styles.componentPanel}>
      <header><span>Nút chuyển</span><code>Segmented · STUDIO_SEGMENTED</code></header>
      <div className={styles.segmentedRows}>
        <label>Nguồn giọng<Segmented value={source} onChange={(value) => setSource(String(value))} options={[
          { value: "elevenlabs", label: "ElevenLabs" },
          { value: "import", label: "Audio có sẵn" },
          { value: "local", label: "Model local" },
        ]} /></label>
        <label>Quyết định cho một lỗi<Segmented size="small" value={decision} onChange={(value) => setDecision(String(value))} options={[
          { value: "fix", label: "Sửa" },
          { value: "skip", label: "Bỏ qua" },
        ]} /></label>
        <label>Lọc, có mục tắt<Segmented size="small" value={filter} onChange={(value) => setFilter(String(value))} options={[
          { value: "all", label: "Tất cả" },
          { value: "flagged", label: "Có lỗi (3)" },
          { value: "skipped", label: "Đã bỏ qua (0)", disabled: true },
        ]} /></label>
      </div>
      <dl className={styles.segmentedSpec}>{STUDIO_SEGMENTED_SPEC.map((row) => <div key={row.part}><dt>{row.part}</dt><dd><code>{row.token}</code><span>{row.usage}</span></dd></div>)}</dl>
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
