"use client";

import { PlusOutlined, ProfileOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Popover, Select, Tooltip } from "antd";
import type { ResearchSummary } from "@/lib/research";
import { fmtTime, runStatus } from "@/lib/research-ui";

/**
 * Hàng đầu trang, cao một hàng: tên trang, (?) giải thích trang làm gì, bộ chọn lượt, Lượt mới và Chi tiết. Lời giới
 * thiệu dài trước đây nằm cố định trên đầu trang — giờ ở trong (?), ở màn trống và trong tour.
 */

function HelpPopover() {
  return <Popover
    trigger="click"
    placement="bottomLeft"
    title="Đóng gói kịch bản làm gì?"
    content={<div className="vs-rs-help">
      <p>Từ slide của giảng viên, Studio làm ra một kịch bản video có dẫn nguồn cho từng con số, mốc năm, tên sản phẩm.</p>
      <p>Đọc slide: agent chọn những điều nên kiểm → Bạn duyệt danh sách → Tra nguồn: agent tìm trang gốc, Studio tự mở trang để đối chiếu từng trích dẫn → Viết kịch bản: agent viết theo mẫu, một agent khác đọc lại → Bạn duyệt, rồi tạo video.</p>
      <p>Studio chỉ dừng ở các hình thoi trên sơ đồ để chờ bạn; lúc agent chạy, bạn có thể rời trang.</p>
      <p>Agent là agent coding trên máy bạn (Claude Code, Codex…). Slide và mọi kết quả chỉ nằm trong thư mục research/ trên máy này. Cần hướng dẫn từng bước: bấm Griffin ở góc phải màn hình.</p>
    </div>}
  >
    <Button type="text" shape="circle" icon={<QuestionCircleOutlined />} aria-label="Trang này làm gì?" />
  </Popover>;
}

function RunSwitcher({ runs, rid, onSelect }: { runs: ResearchSummary[] | undefined; rid: string | null; onSelect: (id: string) => void }) {
  const byId = new Map((runs ?? []).map((r) => [r.id, r]));
  return <Select
    className="vs-rs-switch"
    variant="borderless"
    value={rid ?? undefined}
    placeholder={runs && !runs.length ? "Chưa có lượt nào" : "Chọn một lượt"}
    onChange={(id: string) => onSelect(id)}
    aria-label="Lượt đang xem"
    showSearch={{ optionFilterProp: "label" }}
    popupMatchSelectWidth={false}
    classNames={{ popup: { root: "vs-rs-switch-popup" } }}
    options={(runs ?? []).map((r) => ({ value: r.id, label: r.title }))}
    labelRender={({ label }) => <span className="vs-rs-switch-label">{label}</span>}
    optionRender={(o) => {
      const r = byId.get(String(o.value));
      if (!r) return o.label;
      const s = runStatus(r);
      return <span className="vs-rs-switch-option">
        <span>{r.title}</span>
        <small><i className={`vs-rs-dot is-${s.tone}`} aria-hidden="true" />{s.word} · {fmtTime(r.createdAt)}</small>
      </span>;
    }}
  />;
}

export function RunHeader({ runs, rid, onSelect, onNew, onDetails, hasRun }: {
  runs: ResearchSummary[] | undefined;
  rid: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDetails: () => void;
  hasRun: boolean;
}) {
  return <header className="vs-rs-head">
    <h1 className="vs-rs-title">Đóng gói kịch bản<small>beta</small></h1>
    <HelpPopover />
    <RunSwitcher runs={runs} rid={rid} onSelect={onSelect} />
    {hasRun && <span className="vs-rs-head-actions">
      <Button icon={<PlusOutlined />} onClick={onNew} data-tour="research.new" aria-label="Lượt mới từ slide"><span className="vs-rs-head-label">Lượt mới</span></Button>
      <Tooltip title="Nhật ký, chi phí, file và làm lại một bước">
        <Button type="text" icon={<ProfileOutlined />} onClick={onDetails} data-tour="research.details" aria-label="Chi tiết"><span className="vs-rs-head-label">Chi tiết</span></Button>
      </Tooltip>
    </span>}
  </header>;
}
