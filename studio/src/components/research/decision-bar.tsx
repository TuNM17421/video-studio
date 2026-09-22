"use client";

import { useEffect, useState, type ReactNode, type Ref } from "react";

/**
 * Thanh "Việc của bạn" dính đáy vùng làm việc — một chỗ duy nhất nói lượt đang làm gì và nút người dùng cần bấm.
 * Cùng một khuôn cho trang, cổng 1 và cổng 2 (mỗi cổng tự vẽ thanh của nó để giữ lựa chọn chưa gửi).
 *
 * Chỉ câu chính nằm trong `aria-live`: đồng hồ và câu agent vừa nói đổi liên tục, đọc to từng giây thì trình đọc
 * màn hình không nói được gì khác.
 */

export type BarTone = "running" | "waiting" | "done" | "error" | "idle";

/** Đồng hồ "đã chạy bao lâu" — chỉ component này đếm từng giây, phần còn lại của trang không vẽ lại. */
export function useElapsed(startedAt: number | null) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setMs(Date.now() - startedAt);
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return startedAt ? ms : null;
}

const clockText = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s} giây` : `${Math.floor(s / 60)} phút ${String(s % 60).padStart(2, "0")} giây`;
};

export function DecisionBar({ tone, lead, text, short, clockFrom = null, detail, actions, barRef }: {
  tone: BarTone;
  lead: string;
  text: ReactNode;
  /** Bản ngắn cho màn hẹp; không có thì dùng `text`. */
  short?: ReactNode;
  clockFrom?: number | null;
  detail?: ReactNode;
  actions?: ReactNode;
  barRef?: Ref<HTMLDivElement>;
}) {
  const elapsed = useElapsed(clockFrom);
  return <div ref={barRef} className={`vs-rs-decide is-${tone}`} role="region" aria-label="Việc của bạn" data-tour="research.bar">
    <span className="vs-rs-decide-dot" aria-hidden="true" />
    <div className="vs-rs-decide-text">
      <p className="vs-rs-decide-line">
        <span aria-live="polite"><strong>{lead}</strong> · <span className="is-long">{text}</span><span className="is-short">{short ?? text}</span></span>
        {elapsed !== null && <span className="vs-rs-decide-clock"> · {clockText(elapsed)}</span>}
      </p>
      {detail && <p className="vs-rs-decide-detail">{detail}</p>}
    </div>
    {actions && <div className="vs-rs-decide-actions">{actions}</div>}
  </div>;
}
