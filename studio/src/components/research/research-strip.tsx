"use client";

import { Fragment, memo, useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import {
  CheckCircleFilled, EditOutlined, FilePdfOutlined, FilePptOutlined, LoadingOutlined, PauseCircleOutlined, SearchOutlined, UserOutlined,
  VideoCameraOutlined, WarningFilled,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import type { ResearchView } from "@/lib/research";
import {
  busyClaims, claimOutcome, edgeState, gateLabel, isGate, NODE_ORDER, nodeStates, OUTCOME_LABEL, PREVIEW_STATUS, researchProgress, STEP_HELP,
  STEP_NAME, tally, type GateId, type NodeId, type NodeState,
} from "@/lib/research-ui";

/**
 * Dải sơ đồ một hàng ở đầu trang: bốn ô việc agent làm, ba hình thoi chỗ Studio dừng chờ người. Luôn bảy hình, dù lượt
 * có bao nhiêu điều cần kiểm — N điều thành N ô nhỏ trong ô Tra nguồn, nên dải không cao lên và chữ luôn ở cỡ thật.
 * HTML thuần, không thư viện vẽ đồ thị: không thu phóng, không đo bằng JS; hẹp quá thì dải cuộn ngang.
 */

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function statusOf(view: ResearchView, n: NodeId, s: NodeState, running: boolean) {
  const { stage } = view.state;
  const p = researchProgress(view);
  if (n === "slide") {
    if (s === "running") return "đang đọc…";
    if (s === "error") return "lỗi";
    if (s === "stopped") return "đã dừng";
    return view.claims.length ? `${view.claims.length} điều cần kiểm` : "không có điều nào";
  }
  if (n === "research") {
    if (s === "pending") return "sau khi bạn duyệt";
    if (s === "skipped") return "bỏ qua — viết từ slide";
    if (s === "running") return `đang tra · ${p.done}/${p.total}`;
    if (s === "error") return `lỗi · ${p.done}/${p.total}`;
    if (s === "stopped") return `đã dừng · ${p.done}/${p.total}`;
    return `${tally(view, busyClaims(view, running)).ok}/${p.total} khớp slide`;
  }
  if (n === "script") {
    if (s === "pending") return "sau khi tra nguồn";
    if (s === "running") return stage === "review" ? "đang biên tập…" : stage === "revise" ? "đang sửa theo góp ý…" : "đang viết…";
    if (s === "error") return "lỗi";
    if (s === "stopped") return "đã dừng";
    const stats = view.scriptCheck?.stats;
    return stats ? `${stats.cues} câu · ~${Math.max(1, Math.round(stats.seconds / 60))} phút` : "đã viết";
  }
  if (n === "video") return s === "done" ? "sẵn sàng" : "sau khi bạn duyệt";
  return "";
}

function stateWord(view: ResearchView, n: NodeId, s: NodeState, status: string) {
  if (s === "pending") return "chưa tới";
  if (s === "running") return `đang chạy — ${status}`;
  if (s === "waiting") return "chờ bạn";
  if (s === "auto") return "tự qua — mọi điều đều đủ căn cứ";
  if (s === "error") return "lỗi";
  if (s === "stopped") return "đã dừng";
  if (s === "skipped") return "bỏ qua — không có điều nào cần kiểm";
  if (n === "research") {
    const t = tally(view);
    return `xong — ${t.ok} khớp slide, ${t.fixed} sửa theo nguồn, ${t.thin} chưa đủ nguồn`;
  }
  return status ? `xong — ${status}` : "xong";
}

const GLYPH: Partial<Record<NodeState, ReactNode>> = {
  running: <LoadingOutlined spin />,
  done: <CheckCircleFilled />,
  auto: <CheckCircleFilled />,
  skipped: <CheckCircleFilled />,
  error: <WarningFilled />,
  stopped: <PauseCircleOutlined />,
};

function nodeIcon(n: NodeId, format: "pdf" | "pptx" | undefined) {
  if (n === "slide") return format === "pptx" ? <FilePptOutlined /> : <FilePdfOutlined />;
  if (n === "research") return <SearchOutlined />;
  if (n === "script") return <EditOutlined />;
  return <VideoCameraOutlined />;
}

/** Mỗi điều cần kiểm một ô nhỏ, theo thứ tự — màu là kết quả. Chỉ để nhìn: danh sách bên dưới là đường cho bàn phím. */
function ClaimCells({ view, running }: { view: ResearchView; running: boolean }) {
  const busy = busyClaims(view, running);
  return <span className="vs-rs-cells" aria-hidden="true">
    {view.claims.map((c) => {
      const o = claimOutcome(view, c.id, busy);
      return <Tooltip key={c.id} title={`${c.id} · ${clip(c.text, 60)} — ${OUTCOME_LABEL[o]}`} mouseEnterDelay={0.15}>
        <i data-claim={c.id} className={`is-${o}`} />
      </Tooltip>;
    })}
  </span>;
}

export const ResearchStrip = memo(function ResearchStrip({ view, running = false, selected = null, onSelect, onClaim, preview = false }: {
  view?: ResearchView | null;
  running?: boolean;
  selected?: NodeId | null;
  onSelect?: (n: NodeId) => void;
  onClaim?: (cid: string) => void;
  preview?: boolean;
}) {
  const strip = useRef<HTMLElement>(null);
  // Màn hẹp: dải cuộn ngang — đưa ô đang xem vào giữa. Không dùng scrollIntoView: nó có thể kéo cả trang theo chiều dọc.
  useEffect(() => {
    const el = strip.current;
    const node = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !node || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: node.offsetLeft - (el.clientWidth - node.offsetWidth) / 2 });
  }, [selected]);
  const states = view && !preview ? nodeStates(view, running) : null;
  const waitingGate = states ? (["gate1", "gate2", "gate3"] as GateId[]).find((g) => states[g] === "waiting") : undefined;

  return <nav ref={strip} className={`vs-rs-strip${preview || !view ? " is-preview" : ""}`} aria-label="Các bước của lượt — chọn một bước để xem bên dưới" data-tour="research.strip">
    <ol className="vs-rs-strip-row">
      {NODE_ORDER.map((n, i) => {
        const s: NodeState = states?.[n] ?? "pending";
        const status = view && states ? statusOf(view, n, s, running) : PREVIEW_STATUS[n] ?? "";
        const interactive = Boolean(view && states && onSelect);
        const pressed = selected === n;
        const common = {
          "aria-describedby": `rs-help-${n}`,
          ...(interactive ? {
            "aria-pressed": pressed,
            "aria-controls": "rs-work",
            "aria-current": s === "running" || s === "waiting" ? ("step" as const) : undefined,
            "aria-label": `${STEP_NAME[n]}: ${stateWord(view!, n, s, status)}. ${pressed ? "Đang xem" : "Bấm để xem"}.`,
          } : {}),
        };
        const help = <span id={`rs-help-${n}`} className="sr-only">{STEP_HELP[n]}</span>;
        const edge = i > 0 && <li className={`vs-rs-edge ${states ? edgeState(s) : "is-pending"}`} aria-hidden="true" />;

        if (isGate(n)) {
          const label = states ? gateLabel(n, s) : gateLabel(n, "pending");
          const tour = (waitingGate ?? "gate1") === n ? { "data-tour": "research.gate" } : {};
          const inner = <>
            <Tooltip title={STEP_HELP[n]} mouseEnterDelay={0.4}><span className="vs-rs-gate-mark"><UserOutlined /></span></Tooltip>
            <span className="vs-rs-gate-label">{label}</span>
            {help}
          </>;
          return <Fragment key={n}>
            {edge}
            <li className="vs-rs-gate-slot">{interactive
              ? <button type="button" className={`vs-rs-gate is-${s}`} onClick={() => onSelect!(n)} {...common} {...tour}>{inner}</button>
              : <div className={`vs-rs-gate is-${s}`} {...common} {...tour}>{inner}</div>}</li>
          </Fragment>;
        }

        const inner = <>
          <Tooltip title={STEP_HELP[n]} mouseEnterDelay={0.4}>
            <span className="vs-rs-node-title"><span className="vs-rs-node-icon">{nodeIcon(n, view?.state.deck.format)}</span><span>{STEP_NAME[n]}</span></span>
          </Tooltip>
          {n === "research" && view && states && view.claims.length > 0 && <ClaimCells view={view} running={running} />}
          <span className="vs-rs-node-status">{states ? GLYPH[s] : null}<span>{status}</span></span>
          {help}
        </>;
        const onClick = (e: MouseEvent) => {
          const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-claim]");
          if (cell && onClaim) return onClaim(cell.dataset.claim!);
          onSelect?.(n);
        };
        return <Fragment key={n}>
          {edge}
          <li className="vs-rs-node-slot">{interactive
            ? <button type="button" className={`vs-rs-node is-${s}`} onClick={onClick} {...common}>{inner}</button>
            : <div className={`vs-rs-node is-${s}`} {...common}>{inner}</div>}</li>
        </Fragment>;
      })}
    </ol>
  </nav>;
});
