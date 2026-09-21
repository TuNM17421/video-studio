"use client";

import type { ReactNode } from "react";
import { CheckCircleFilled, CommentOutlined, LeftOutlined, LoadingOutlined, MinusCircleOutlined, RightOutlined, WarningOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { api } from "@/lib/client";
import type { JobInfo, LogEntry, VideoDetail } from "@/lib/types";

/** Where the bar's Quay lại / Tiếp lead — built by the page, which owns the step order. */
export interface StepNav {
  back?: { label: string; onClick: () => void };
  /** Shown only once this step is complete; it is then the bar's one primary button. */
  next?: { label: string; onClick: () => void; ready: boolean };
}

export interface StepProps {
  detail: VideoDetail;
  logs: LogEntry[];
  job: JobInfo | null;
  busy: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
  stop: () => void;
  nav: StepNav;
}

export const post = (url: string, json: unknown) => api(url, { method: "POST", json });

export type BarTone = "idle" | "running" | "review" | "done" | "error";

const TONE_ICON: Record<BarTone, ReactNode> = {
  idle: <MinusCircleOutlined />,
  running: <LoadingOutlined spin />,
  review: <CommentOutlined />,
  done: <CheckCircleFilled />,
  error: <WarningOutlined />,
};

/**
 * The one place a step is decided: where it stands, what to do about it, and the way on. It sticks to the
 * bottom of the view, so the Duyệt button is never 2,000 px below the findings it depends on. A step adds
 * its own actions as children; at most one of them should be primary, and none once the step is complete —
 * Tiếp is primary then.
 */
export function StepBar({ tone, status, nav, children }: { tone: BarTone; status: ReactNode; nav: StepNav; children?: ReactNode }) {
  return <div className={`vs-step-bar is-${tone}`} role="region" aria-label="Quyết định của bước">
    <span className="vs-step-bar-state" aria-live="polite">{TONE_ICON[tone]}<span>{status}</span></span>
    <span className="vs-step-bar-actions">
      {nav.back && <Button icon={<LeftOutlined />} onClick={nav.back.onClick}>{nav.back.label}</Button>}
      {children}
      {nav.next?.ready && <Button type="primary" icon={<RightOutlined />} iconPlacement="end" onClick={nav.next.onClick}>Tiếp: {nav.next.label}</Button>}
    </span>
  </div>;
}
