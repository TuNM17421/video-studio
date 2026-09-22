"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ExportOutlined, PlayCircleFilled, StopOutlined } from "@ant-design/icons";
import { Button, Tag, Tooltip } from "antd";
import { agentProviderLabel } from "@/lib/agent-providers";
import { gate2Waiting, STAGE_LABEL, totalUsage, VERDICT_LABEL, type ResearchStage, type ResearchView } from "@/lib/research";
import type { JobInfo, LogEntry } from "@/lib/types";
import { Gate3Actions, type Act } from "./research-panels";

/**
 * Trang một lượt đọc như tài liệu: thanh của lượt ở trên (đang ở đâu, cần làm gì, nút quyết định), tài liệu bên trái,
 * claim và nguồn bên phải. Chín chặng của máy chủ gom thành năm bước người đọc hiểu được — "soát bằng chứng" hay
 * "cổng 2" là chuyện bên trong một bước, không phải thứ người duyệt cần theo dõi.
 */

export type StepId = "slide" | "claims" | "research" | "script" | "deliver";

export const RS_STEPS: { id: StepId; title: string; stages: ResearchStage[] }[] = [
  { id: "slide", title: "Đọc slide", stages: ["extract"] },
  { id: "claims", title: "Duyệt claim", stages: ["gate1"] },
  { id: "research", title: "Research", stages: ["research", "gate2"] },
  { id: "script", title: "Viết kịch bản", stages: ["write", "review", "revise"] },
  { id: "deliver", title: "Duyệt & bàn giao", stages: ["gate3", "done"] },
];

export const stepOfStage = (stage: ResearchStage) => Math.max(0, RS_STEPS.findIndex((s) => s.stages.includes(stage)));

/** Đồng hồ "đã chạy bao lâu" của chặng đang chạy — đếm theo giây, dừng khi không còn chạy. */
function useElapsed(startedAt: number | null) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setMs(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return startedAt ? ms : null;
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s} giây` : `${Math.floor(s / 60)} phút ${String(s % 60).padStart(2, "0")} giây`;
};
const plainTokens = (n: number) => (n >= 1e6 ? `≈ ${(n / 1e6).toFixed(1).replace(".", ",")} triệu token` : n >= 1e3 ? `≈ ${Math.round(n / 1e3)} nghìn token` : `${n} token`);
const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

const DOING: Partial<Record<ResearchStage, string>> = {
  extract: "Agent đang đọc slide",
  research: "Agent đang research trên web",
  write: "Agent đang viết kịch bản",
  review: "Agent đang soát & biên tập kịch bản",
  revise: "Agent đang sửa theo góp ý của bạn",
};

type Tone = "running" | "waiting" | "done" | "error" | "idle";

/** Câu trạng thái của lượt: một dòng đậm nói chuyện gì đang xảy ra, một dòng nhạt nói người dùng cần làm gì. */
function nowOf(view: ResearchView, running: boolean, job: JobInfo | null, logs: LogEntry[], elapsed: number | null, act: Act, busy: boolean, run: (body: Record<string, unknown>) => void):
  { tone: Tone; headline: ReactNode; detail?: ReactNode; actions?: ReactNode } {
  const { state } = view;
  if (state.sample) return { tone: "idle", headline: "Lượt mẫu — chỉ xem", detail: "Một lượt đã đi đủ các bước, để xem mỗi bước trông thế nào khi xong." };
  if (running) {
    const said = [...logs].reverse().find((e) => e.kind === "agent")?.text;
    return {
      tone: "running",
      headline: <>{DOING[state.stage] ?? `Đang ${STAGE_LABEL[state.stage].toLowerCase()}`}{elapsed !== null && <span className="vs-rs-elapsed"> · {clock(elapsed)}</span>}</>,
      detail: said ? <span className="vs-rs-said">{said}</span> : job?.progress?.message ?? "Trang tự cập nhật, không cần tải lại.",
      actions: <Button danger icon={<StopOutlined />} loading={busy} onClick={() => run({ action: "stop" })}>Dừng</Button>,
    };
  }
  if (state.status === "waiting" && state.stage === "gate1") {
    return { tone: "waiting", headline: "Chờ bạn duyệt claim", detail: "Bỏ qua điều không cần kiểm, sửa điều agent chép sai — rồi bấm Duyệt ở cuối danh sách bên dưới." };
  }
  if (state.status === "waiting" && state.stage === "gate2") {
    const n = gate2Waiting(view.claims, view.evidence, state.gates.gate2?.decisions).length;
    return { tone: "waiting", headline: "Chờ bạn quyết định", detail: `${n} claim cần bạn chọn cách xử lý trước khi agent viết kịch bản — ở tab Claim bên dưới.` };
  }
  if (state.status === "waiting" && state.stage === "gate3") {
    return { tone: "waiting", headline: "Kịch bản sẵn sàng — chờ bạn duyệt", detail: "Đọc kịch bản bên dưới, bấm mã claim ở cuối câu để xem nguồn của nó — rồi duyệt, hoặc góp ý để agent sửa.", actions: <Gate3Actions act={act} /> };
  }
  if (state.stage === "done") {
    return {
      tone: "done",
      headline: "Kịch bản đã duyệt",
      detail: "Tạo video mở bước Kế hoạch với kịch bản này điền sẵn — bạn chọn style, ngày và mã video như mọi video khác.",
      actions: <Link href={`/?fromResearch=${state.id}`}><Button type="primary" icon={<ExportOutlined />}>Tạo video từ kịch bản này</Button></Link>,
    };
  }
  const stopped = state.error === "Đã dừng.";
  return {
    tone: stopped ? "idle" : "error",
    headline: stopped ? "Lượt đang dừng" : "Lượt dừng vì lỗi",
    detail: stopped ? `Dừng ở bước ${STAGE_LABEL[state.stage].toLowerCase()}. Chạy tiếp để làm nốt từ chỗ đó.` : state.error ?? "Chạy tiếp để thử lại từ chỗ dừng.",
    actions: <Button type="primary" icon={<PlayCircleFilled />} loading={busy} onClick={() => run({ action: "resume" })}>Chạy tiếp</Button>,
  };
}

/**
 * Thanh của lượt: tên và chi phí, năm bước dưới dạng một vạch tiến độ mảnh (không phải dải bước đánh số của trang
 * video — ở đây người dùng không chọn bước, chỉ cần biết đang tới đâu), rồi câu trạng thái và nút quyết định.
 */
export function RunBar({ view, job, logs, act, running }: { view: ResearchView; job: JobInfo | null; logs: LogEntry[]; act: Act; running: boolean }) {
  const { state } = view;
  const elapsed = useElapsed(running && job ? job.startedAt : null);
  const [busy, setBusy] = useState(false);
  const run = (body: Record<string, unknown>) => { setBusy(true); void act(body).finally(() => setBusy(false)); };
  const now = nowOf(view, running, job, logs, elapsed, act, busy, run);
  const at = stepOfStage(state.stage);
  const usage = totalUsage(state.runs);
  const tokens = usage.input + usage.cached + usage.output;
  const cost = state.runs.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
  return <section className="vs-rs-bar" aria-label="Lượt research">
    <div className="vs-rs-bar-head">
      <h2>{state.title}</h2>
      <p className="vs-rs-bar-meta">
        <span>{agentProviderLabel(state.agent)}</span>
        {state.runs.length > 0 && <span>{state.runs.length} lượt agent</span>}
        {tokens > 0 && <Tooltip title={`${k(usage.input)} vào · ${k(usage.cached)} đọc lại từ cache · ${k(usage.output)} ra`}><span className="vs-rs-tokens" tabIndex={0}>{plainTokens(tokens)}</span></Tooltip>}
        {cost > 0 && <span>${cost.toFixed(2)}</span>}
      </p>
    </div>
    <ol className="vs-rs-track" aria-label={state.stage === "done" ? "Đã xong cả năm bước" : `Bước ${at + 1}/${RS_STEPS.length}: ${RS_STEPS[at].title}`}>
      {RS_STEPS.map((s, i) => {
        const done = state.stage === "done" || i < at;
        const cls = done ? "is-done" : i === at ? `is-current is-${now.tone}` : "";
        return <li key={s.id} className={cls} aria-current={!done && i === at ? "step" : undefined}>
          <span className="vs-rs-track-bar" aria-hidden="true" />
          <span className="vs-rs-track-label">{s.title}</span>
        </li>;
      })}
    </ol>
    <div className={`vs-rs-now is-${now.tone}`}>
      <span className="vs-rs-now-dot" aria-hidden="true" />
      <div className="vs-rs-now-text" aria-live="polite">
        <strong>{now.headline}</strong>
        {now.detail && <span>{now.detail}</span>}
      </div>
      {now.actions && <div className="vs-rs-now-actions">{now.actions}</div>}
    </div>
  </section>;
}

type ClaimTone = "done" | "waiting" | "failed" | "running" | "idle";

/** Kết luận của một claim bằng lời người đọc — kết quả research trước, rồi tới việc nó có qua soát hay không. */
function claimStatus(view: ResearchView, cid: string, researching: boolean): { label: string; tone: ClaimTone; note: string } {
  const f = view.findings[cid];
  const ev = view.evidence[cid];
  if (!f) return researching ? { label: "Đang research", tone: "running", note: "" } : { label: "Chờ research", tone: "idle", note: "" };
  const quotes = ev ? `${ev.quotes.verified}/${ev.quotes.total} trích đoạn khớp` : "chưa soát";
  const note = [f.reused ? "dùng lại dữ kiện đã kiểm" : `${f.sources?.length ?? 0} nguồn`, quotes].join(" · ");
  if (ev && !ev.ok) return { label: "Chưa đạt soát", tone: "failed", note };
  const tone: ClaimTone = f.verdict === "ok" ? "done" : f.verdict === "wrong" ? "failed" : "waiting";
  return { label: VERDICT_LABEL[f.verdict], tone, note };
}

/** Danh sách claim với kết luận — bấm một dòng để mở nguồn của nó. */
export function ClaimList({ view, running, selected, onOpen }: { view: ResearchView; running: boolean; selected?: string | null; onOpen: (cid: string) => void }) {
  const last = view.state.runs.at(-1);
  const busy = new Set(running && last && !last.endedAt && last.step === "research" ? last.claims ?? [] : []);
  if (!view.claims.length) return <p className="vs-scout-empty">Không có claim nào cần research — kịch bản viết thẳng từ slide.</p>;
  return <ul className="vs-rs-claimlist vs-rs-claims">
    {view.claims.map((c) => {
      const s = claimStatus(view, c.id, busy.has(c.id));
      const rail = s.tone === "done" ? " is-ok" : s.tone === "failed" ? " is-bad" : s.tone === "waiting" ? " is-warn" : "";
      return <li key={c.id}>
        <button type="button" onClick={() => onOpen(c.id)} className={`${rail}${selected === c.id ? " is-selected" : ""}`} aria-pressed={selected === c.id}>
          <span className="vs-scout-sid mono">{c.id}</span>
          <span className="vs-rs-claim-text">{c.text}</span>
          <Tag className={`vs-badge is-${s.tone}`}>{s.label}</Tag>
          {s.note && <small>{s.note}</small>}
        </button>
      </li>;
    })}
  </ul>;
}
