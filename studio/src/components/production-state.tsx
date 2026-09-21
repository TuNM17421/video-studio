import type { ReactNode } from "react";
import type { StageStatus } from "@/lib/types";
import styles from "./production-state.module.css";

export const PRODUCTION_STATE_COPY: Record<StageStatus, { label: string; detail: string }> = {
  idle: { label: "Chưa chạy", detail: "Cổng đang chờ đầu vào." },
  running: { label: "Đang chạy", detail: "Agent đang xử lý tác vụ hiện tại." },
  review: { label: "Chờ duyệt", detail: "Kết quả đã sẵn sàng để người dựng kiểm tra." },
  done: { label: "Hoàn tất", detail: "Cổng đã được duyệt và khóa kết quả." },
  error: { label: "Cần xử lý", detail: "Tác vụ dừng; mở nhật ký để sửa nguyên nhân." },
};

export function ProductionState({ status, title, detail, action, className, tour }: {
  status: StageStatus;
  title?: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** `data-tour` anchor for the onboarding tour (lib/tours.ts). */
  tour?: string;
}) {
  const copy = PRODUCTION_STATE_COPY[status];
  const message = detail === undefined ? copy.detail : detail;
  return <div
    className={[styles.state, styles[status], className].filter(Boolean).join(" ")}
    data-production-state={status}
    data-tour={tour}
    role={status === "error" ? "alert" : "status"}
  >
    <span className={styles.dot} aria-hidden="true" />
    <div className={styles.copy}>
      <strong>{title ?? copy.label}</strong>
      {message && <p>{message}</p>}
    </div>
    {action && <div className={styles.action}>{action}</div>}
  </div>;
}
