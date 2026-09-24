"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExportOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Collapse, Drawer, Popconfirm, Switch, Tooltip } from "antd";
import { agentProviderLabel } from "@/lib/agent-providers";
import { fileUrl } from "@/lib/client";
import { placeEditIssues, RUN_RESULT_LABEL, type ResearchStage, type ResearchView } from "@/lib/research";
import { fmtTime, parseScript, plainTokens, REACHED, RUN_STEP_LABEL, runClock, runsSummary, usdText } from "@/lib/research-ui";
import type { LogEntry } from "@/lib/types";
import type { Act } from "./research-panels";

/**
 * Ngăn "Chi tiết lượt": thứ để tra khi cần — nhật ký agent, kiểm tra kịch bản, từng lần gọi agent với thời gian và chi
 * phí, file, và làm lại một bước. Token, đô la, đường dẫn và lệnh CLI chỉ nằm ở đây, không nằm trên màn hình chính.
 */

export type DetailsSection = "log" | "checks" | "runs" | "files" | "reruns";

const clock = (t: number | string) => new Date(t).toLocaleTimeString("vi-VN", { hour12: false });
const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

export function LogList({ logs, tools }: { logs: LogEntry[]; tools: boolean }) {
  const list = useRef<HTMLOListElement>(null);
  const shown = tools ? logs : logs.filter((e) => e.kind !== "tool");
  // Nhật ký dài hơn khung rất nhanh; không tự cuộn thì người xem phải kéo tay suốt lượt chạy.
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [shown.length]);
  if (!shown.length) return <p className="vs-scout-empty">Chưa có hoạt động.</p>;
  return <ol ref={list} className="vs-scout-flow vs-rs-log">
    {shown.map((e, i) => <li key={`${e.t}-${i}`} className={`vs-scout-row is-${e.kind === "error" ? "error" : e.kind === "result" ? "done" : e.kind === "tool" && /^Tìm web/.test(e.text) ? "search" : "tool"}`}>
      <span className="vs-scout-time mono">{clock(e.t)}</span>
      <span className="vs-scout-body">{e.kind === "agent" || e.kind === "result" || e.kind === "error" ? <p className={e.kind === "error" ? "vs-scout-error" : "vs-scout-say"}>{e.text}</p> : <small>{e.text}</small>}</span>
    </li>)}
  </ol>;
}

const EDIT_TYPE: Record<string, string> = { accuracy: "chính xác", hook: "mở đầu", flow: "mạch", clarity: "rõ ràng", spoken: "văn nói" };
const SCORE_LABEL: Record<string, string> = { accuracy: "Chính xác", hook: "Mở đầu", flow: "Mạch", clarity: "Rõ ràng", spoken: "Văn nói" };

/** Kết quả soát mẫu kịch bản (code) và góp ý biên tập (agent đọc độc lập). */
export function ScriptChecks({ view }: { view: ResearchView }) {
  const sc = view.scriptCheck;
  const edit = view.edit;
  const cues = useMemo(() => parseScript(view.script ?? ""), [view.script]);
  const placed = useMemo(() => placeEditIssues(cues.map((c) => ({ n: c.n, text: c.fields["lời"] ?? "" })), edit?.issues ?? []), [cues, edit]);
  if (!sc && !edit) return <p className="vs-scout-empty">Chưa kiểm tra kịch bản.</p>;
  const problems = sc?.issues.filter((i) => i.level === "problem") ?? [];
  const warnings = sc?.issues.filter((i) => i.level === "warning") ?? [];
  const quoted = edit?.issues.some((i) => i.quote) ?? false;
  const resolved = new Set(placed.resolved);
  return <div className="vs-rs-checks">
    {sc && <>
      <p>Mẫu kịch bản: {problems.length ? `còn ${problems.length} lỗi định dạng` : "đúng mẫu"} · {warnings.length} lưu ý · {sc.coverage.covered}/{sc.coverage.slides} slide có câu dựa vào</p>
      <p>Độ dài: {sc.stats.cues} câu · khoảng {Math.max(1, Math.round(sc.stats.seconds / 60))} phút đọc{sc.length ? ` · mức đặt ${sc.length.target} câu` : ""}</p>
      {sc.coverage.missing.length > 0 && <p>Slide chưa có câu nào: {sc.coverage.missing.join(", ")}</p>}
      {sc.issues.some((i) => i.cue === null) && <ul>{sc.issues.filter((i) => i.cue === null).map((i, n) => <li key={n} className={`is-${i.level}`}>{i.message}</li>)}</ul>}
      {sc.issues.some((i) => i.cue !== null) && <>
        <p>Lưu ý theo câu:</p>
        <ul>{sc.issues.filter((i) => i.cue !== null).map((i, n) => <li key={n} className={`is-${i.level}`}>Câu {i.cue}: {i.message}</li>)}</ul>
      </>}
    </>}
    {edit && <>
      <p>Biên tập độc lập: {Object.entries(edit.score).map(([key, v]) => `${SCORE_LABEL[key] ?? key} ${v}/5`).join(" · ")}</p>
      {edit.issues.length > 0 && <>
        <p>
          {edit.issues.length} góp ý biên tập — agent viết đã sửa theo đó trước khi đưa bạn duyệt.
          {quoted ? ` ${placed.resolved.length} góp ý đã xử lý (câu đã được viết lại).` : " Số câu dưới đây là của bản trước khi sửa:"}
        </p>
        <ul>{edit.issues.map((i, n) => <li key={n} className={resolved.has(i) ? "is-done" : undefined}>
          Câu {i.cue ?? "chung"} · {EDIT_TYPE[i.type] ?? i.type}: {i.problem} → {i.fix}{resolved.has(i) ? " (đã sửa)" : ""}
        </li>)}</ul>
      </>}
    </>}
  </div>;
}

export function RunsTable({ view }: { view: ResearchView }) {
  if (!view.state.runs.length) return <p className="vs-scout-empty">Chưa gọi agent lần nào.</p>;
  return <div className="vs-rs-runs">
    <table>
      <thead><tr><th>#</th><th>Việc</th><th>Thời gian</th><th>Kết quả</th><th>Token</th><th>Chi phí</th></tr></thead>
      <tbody>
        {view.state.runs.map((r) => {
          const u = r.usage;
          const total = u ? u.input + u.cacheWrite + u.cacheRead + u.output : 0;
          return <tr key={r.n}>
            <td className="mono">{r.n}</td>
            <td><Tooltip title={`${agentProviderLabel(r.agent)}${r.model ? ` · ${r.model}` : ""}`}><span>{RUN_STEP_LABEL[r.step]}{r.claims?.length ? ` ${r.claims.join(", ")}` : ""}</span></Tooltip></td>
            <td className="mono">{runClock(r)}</td>
            <td>{r.result ? RUN_RESULT_LABEL[r.result] : "đang chạy"}</td>
            <td className="mono">{u
              ? <Tooltip title={`${k(u.input + u.cacheWrite)} vào · ${k(u.cacheRead)} đọc lại từ cache · ${k(u.output)} ra — lượng chữ agent đọc và viết, căn cứ tính chi phí.`}><span tabIndex={0}>{k(total)}</span></Tooltip>
              : "—"}</td>
            <td className="mono">{typeof r.costUsd === "number" ? `$${r.costUsd.toFixed(2)}` : "—"}</td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}

function FileLinks({ view }: { view: ResearchView }) {
  const { state } = view;
  return <div className="vs-rs-files">
    <p><a href={fileUrl(`research/${state.id}/${state.deck.file}`)} target="_blank" rel="noreferrer">Slide gốc <ExportOutlined /></a></p>
    {state.deck.text && <p><a href={fileUrl(`research/${state.id}/${state.deck.text}`)} target="_blank" rel="noreferrer">Chữ đã bóc từ {state.deck.format === "pdf" ? "PDF" : "PPTX"} <ExportOutlined /></a></p>}
    {view.script && <p><a href={fileUrl(`research/${state.id}/output/kich-ban.md`)} target="_blank" rel="noreferrer">Kịch bản (.md) <ExportOutlined /></a></p>}
    <p>Thư mục của lượt: <code>research/{state.id}</code></p>
    <p>Đối chiếu lại trích dẫn bằng tay: <code>node tools/research-verify.mjs research/{state.id} --stage evidence</code></p>
  </div>;
}

const RERUN_FROM = { extract: 0, research: 2, write: 4, review: 5 } as const;
const RERUNS: { step: "extract" | "write" | "review"; label: string; line: string; button: string; title: string; description: string }[] = [
  {
    step: "extract", label: "Đọc lại slide", line: "Chọn lại điều cần kiểm từ đầu.", button: "Đọc lại…", title: "Đọc lại slide từ đầu?",
    description: "Dàn ý, danh sách điều cần kiểm, kết quả tra nguồn, kịch bản và góp ý của lượt này bị xoá; agent đọc slide lại từ đầu (tốn thêm lần gọi agent).",
  },
  {
    step: "write", label: "Viết lại kịch bản", line: "Viết lại từ đầu với kết quả tra nguồn hiện có.", button: "Viết lại…", title: "Viết lại kịch bản từ đầu?",
    description: "Kịch bản hiện có, kể cả bản đã duyệt, bị xoá và agent viết lại với kết quả tra nguồn hiện có (tốn thêm lần gọi agent).",
  },
  {
    step: "review", label: "Kiểm tra lại kịch bản", line: "Soát mẫu và biên tập lại bản hiện có.", button: "Kiểm tra lại…", title: "Kiểm tra lại kịch bản?",
    description: "Studio soát mẫu, một agent khác đọc lại và agent sửa một lượt; bạn duyệt lại sau đó (tốn thêm lần gọi agent).",
  },
];

function RerunRow({ view, spec, act, running }: { view: ResearchView; spec: (typeof RERUNS)[number]; act: Act; running: boolean }) {
  const [busy, setBusy] = useState(false);
  if (REACHED[view.state.stage as ResearchStage] < RERUN_FROM[spec.step]) return null;
  return <div className="vs-rs-rerun">
    <div><strong>{spec.label}</strong><small>{spec.line}</small></div>
    <Popconfirm title={spec.title} description={spec.description} okText={spec.label} cancelText="Thôi" onConfirm={async () => {
      setBusy(true);
      await act({ action: "rerun", step: spec.step });
      setBusy(false);
    }}>
      <Tooltip title={running ? "Đang chạy — dừng trước đã." : undefined}>
        <Button size="small" icon={<RedoOutlined />} disabled={running || busy} loading={busy}>{spec.button}</Button>
      </Tooltip>
    </Popconfirm>
  </div>;
}

export function DetailsDrawer({ open, sections, onClose, onSections, view, logs, act, running }: {
  open: boolean;
  sections: DetailsSection[];
  onClose: () => void;
  onSections: (s: DetailsSection[]) => void;
  view: ResearchView;
  logs: LogEntry[];
  act: Act;
  running: boolean;
}) {
  const [tools, setTools] = useState(false);
  const sum = runsSummary(view.state.runs);
  const toolCount = logs.filter((e) => e.kind === "tool").length;
  return <Drawer open={open} onClose={onClose} placement="right" size="var(--vu-research-drawer-width)" rootClassName="vs-rs-drawer" title="Chi tiết lượt">
    <p className="vs-rs-drawer-summary">
      {agentProviderLabel(view.state.agent)} · {sum.calls} <Tooltip title="Mỗi lần Studio giao một việc cho agent coding trên máy bạn: đọc slide, tra một nhóm điều, viết, biên tập, sửa."><span className="vs-rs-term" tabIndex={0}>lần gọi agent</span></Tooltip> · {sum.minutes} phút agent chạy
      <br />
      {plainTokens(sum.tokens)} · {usdText(sum.usd)} · tạo lúc {fmtTime(view.state.createdAt)}
    </p>
    <Collapse ghost activeKey={sections} onChange={(keys) => onSections(keys as DetailsSection[])} items={[
      {
        key: "log",
        label: "Nhật ký",
        extra: <span onClick={(e) => e.stopPropagation()} className="vs-rs-switchline"><Switch size="small" checked={tools} onChange={setTools} aria-label="Hiện cả thao tác công cụ" /> Hiện cả thao tác công cụ ({toolCount})</span>,
        children: <LogList logs={logs} tools={tools} />,
      },
      ...(view.scriptCheck || view.edit ? [{ key: "checks", label: "Kiểm tra kịch bản", children: <ScriptChecks view={view} /> }] : []),
      { key: "runs", label: `Các lần gọi agent · ${sum.calls}`, children: <RunsTable view={view} /> },
      { key: "files", label: "File", children: <FileLinks view={view} /> },
      ...(view.state.sample ? [] : [{
        key: "reruns",
        label: "Làm lại một bước",
        children: <div className="vs-rs-reruns-list">{RERUNS.map((spec) => <RerunRow key={spec.step} view={view} spec={spec} act={act} running={running} />)}</div>,
      }]),
    ]} />
  </Drawer>;
}
