"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ExportOutlined, FileTextOutlined, InboxOutlined, LoadingOutlined, PlayCircleFilled, PlusOutlined, RedoOutlined, StopOutlined,
} from "@ant-design/icons";
import { Alert, Button, Empty, Input, InputNumber, Modal, Popconfirm, Select, Tag, Upload } from "antd";
import { AGENT_PROVIDER_OPTIONS, agentProviderLabel } from "@/lib/agent-providers";
import { api, fileUrl } from "@/lib/client";
import { STAGE_LABEL, totalUsage, type ResearchSummary, type ResearchView } from "@/lib/research";
import type { AgentProvider } from "@/lib/types";
import { Shell } from "../shell";
import { ResearchFlow } from "./research-flow";
import { ClaimDetail, Gate1Panel, Gate2Panel, Gate3Panel, LogList, ReviewDetail, RunsTable, ScriptView, type Act } from "./research-panels";
import { useResearch, useResearchIndex } from "./use-research";

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const day = (iso: string) => new Date(iso).toLocaleString("vi-VN", { hour12: false, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

/** Nút mặc định của khung chi tiết: cổng đang chờ, chặng đang chạy, hoặc chỗ lượt dừng lại. */
function defaultNode(view: ResearchView) {
  const { state } = view;
  // Cổng đang chờ đã có khung riêng phía trên sơ đồ; khung chi tiết mở thứ người duyệt cần đọc kèm.
  if (state.stage === "gate1") return "extract";
  if (state.stage === "gate2") return "evidence";
  if (state.stage === "gate3") return "review";
  if (state.stage === "done") return "handoff";
  if (state.stage === "research") {
    const last = state.runs.at(-1);
    const cid = last && !last.endedAt && last.step === "research" ? last.claims?.[0] : null;
    return cid ? `claim:${cid}` : view.claims[0] ? `claim:${view.claims[0].id}` : "research";
  }
  if (state.stage === "revise") return "review";
  return state.stage;
}

/** Nhãn trạng thái một lượt trong bộ chọn — "chờ bạn" nổi lên trước tên chặng. */
function statusLabel(r: Pick<ResearchSummary, "status" | "stage" | "sample">) {
  if (r.sample) return "mẫu";
  if (r.status === "waiting") return "chờ bạn";
  if (r.status === "running") return "đang chạy";
  if (r.status === "failed") return "lỗi";
  return STAGE_LABEL[r.stage];
}

const WAITING: Partial<Record<ResearchView["state"]["stage"], string>> = {
  gate1: "Chờ bạn ở cổng 1 — duyệt danh sách claim bên dưới.",
  gate2: "Chờ bạn ở cổng 2 — vài claim chưa đạt soát, chọn cách xử lý bên dưới.",
  gate3: "Chờ bạn ở cổng 3 — đọc kịch bản, duyệt hoặc góp ý bên dưới.",
};

const NODE_TITLE: Record<string, string> = {
  input: "Slide", extract: "Bóc tách", gate1: "Cổng 1 · duyệt claim", research: "Research", evidence: "Soát bằng chứng",
  gate2: "Cổng 2", write: "Viết kịch bản", review: "Soát & biên tập", gate3: "Cổng 3 · duyệt kịch bản", handoff: "Bàn giao",
};

/** Chặng đã tới — một chặng chỉ chạy lại được khi lượt đã đi qua nó (máy chủ cũng chặn đúng như vậy). */
const REACHED: Record<ResearchView["state"]["stage"], number> = { extract: 0, gate1: 1, research: 2, gate2: 3, write: 4, review: 5, revise: 5, gate3: 6, done: 7 };
const RERUN_FROM = { extract: 0, research: 2, write: 4, review: 5 } as const;

function RerunButton({ view, step, label, act, running }: { view: ResearchView; step: keyof typeof RERUN_FROM; label: string; act: Act; running: boolean }) {
  const [busy, setBusy] = useState(false);
  if (view.state.sample || REACHED[view.state.stage] < RERUN_FROM[step]) return null;
  // Chạy lại xoá kết quả từ chặng này trở đi (kể cả kịch bản đã duyệt) — hỏi trước, một cú bấm nhầm là mất.
  return <Popconfirm
    title={`${label}?`}
    description="Kết quả từ chặng này trở đi sẽ bị xoá và làm lại (tốn thêm lượt agent)."
    okText={label}
    cancelText="Thôi"
    onConfirm={async () => {
      setBusy(true);
      await act({ action: "rerun", step });
      setBusy(false);
    }}
  ><Button size="small" icon={<RedoOutlined />} disabled={running || busy} loading={busy}>{label}</Button></Popconfirm>;
}

/** Bảng của cổng đang chờ — luôn mở phía trên sơ đồ, để bấm sang claim hay nhật ký không làm mất phần đang soạn. */
function GatePanel({ view, act, onSelect }: { view: ResearchView; act: Act; onSelect: (id: string) => void }) {
  const { stage } = view.state;
  if (stage === "gate1") return <Gate1Panel view={view} act={act} />;
  if (stage === "gate2") return <Gate2Panel view={view} act={act} />;
  if (stage === "gate3") return <Gate3Panel view={view} act={act} onClaim={(cid) => onSelect(`claim:${cid}`)} />;
  return null;
}

function NodeDetail({ view, node, act, running, onSelect }: { view: ResearchView; node: string; act: Act; running: boolean; onSelect: (id: string) => void }) {
  const { state } = view;
  const rerun = (step: keyof typeof RERUN_FROM, label: string) => <RerunButton view={view} step={step} label={label} act={act} running={running} />;
  const waitingHere = (gate: string) => state.stage === gate && state.status === "waiting";
  const openAbove = <p className="vs-scout-node-lede">Khung duyệt đang mở ở phía trên sơ đồ.</p>;
  if (node.startsWith("claim:")) return <ClaimDetail view={view} cid={node.slice(6)} act={act} running={running} />;
  switch (node) {
    case "input":
      return <div className="vs-scout-node">
        <p className="vs-scout-node-lede">
          <a href={fileUrl(`research/${state.id}/${state.deck.file}`)} target="_blank" rel="noreferrer">{state.deck.name}</a> · {state.deck.format.toUpperCase()} · {size(state.deck.bytes)}
          {state.deck.slides ? ` · ${state.deck.slides} slide` : ""}
        </p>
        {state.deck.text && <p className="vs-scout-node-note">Chữ và ghi chú đã bóc: <a href={fileUrl(`research/${state.id}/${state.deck.text}`)} target="_blank" rel="noreferrer">{state.deck.text}</a> — hình trong PPTX không đi theo.</p>}
        {(state.deck.emptySlides?.length ?? 0) > 0 && <p className="vs-scout-node-note">Slide chỉ có hình, agent không đọc được: {state.deck.emptySlides!.join(", ")}. Cần nội dung của chúng thì xuất PDF rồi tạo lượt mới.</p>}
      </div>;
    case "extract":
      return <div className="vs-scout-node">
        <p className="vs-scout-node-lede">{view.outline ? `${view.outline.length} slide trong dàn ý · ${view.claims.length} claim` : "Chưa bóc tách xong."}</p>
        {view.outline && <ol className="vs-rs-outline">{view.outline.map((o) => <li key={o.slide} value={o.slide}>{o.heading || `Slide ${o.slide}`}{o.skip ? " · bỏ qua" : ""}</li>)}</ol>}
        {rerun("extract", "Bóc tách lại")}
      </div>;
    case "gate1":
      return waitingHere("gate1") ? openAbove : <p className="vs-scout-node-lede">{state.gates.gate1 ? `Đã duyệt ${state.gates.gate1.claims} claim lúc ${day(state.gates.gate1.at)}.` : "Chưa tới cổng này."}</p>;
    case "research":
      return <p className="vs-scout-node-lede">{view.claims.length ? "Bấm vào từng claim để xem nguồn và kết luận." : "Không có claim nào cần research — kịch bản viết thẳng từ slide."}</p>;
    case "evidence":
      return <div className="vs-scout-node">
        <ul className="vs-rs-claimlist">
          {view.claims.map((c) => {
            const ev = view.evidence[c.id];
            return <li key={c.id}>
              <button type="button" onClick={() => onSelect(`claim:${c.id}`)} className={ev?.ok ? "is-ok" : ev ? "is-bad" : ""}>
                <span className="vs-scout-sid mono">{c.id}</span>{c.text}
                <small>{ev ? `${ev.ok ? "đạt" : "chưa đạt"} · ${ev.quotes.verified}/${ev.quotes.total} trích đoạn khớp` : "chưa soát"}</small>
              </button>
            </li>;
          })}
        </ul>
        <p className="vs-scout-check-run">Chạy lại bất cứ lúc nào: <code>node tools/research-verify.mjs research/{state.id} --stage evidence</code></p>
      </div>;
    case "gate2":
      return waitingHere("gate2") ? openAbove : <p className="vs-scout-node-lede">{state.gates.gate2 ? (state.gates.gate2.auto ? "Tự qua: mọi claim đạt soát bằng chứng." : `Bạn đã quyết định lúc ${day(state.gates.gate2.at)}.`) : "Tự qua khi mọi claim đạt soát."}</p>;
    case "write":
      return <div className="vs-scout-node">
        <ScriptView view={view} onClaim={(cid) => onSelect(`claim:${cid}`)} />
        {view.script && rerun("write", "Viết lại từ đầu")}
      </div>;
    case "review":
      return <div className="vs-scout-node"><ReviewDetail view={view} />{view.script && rerun("review", "Soát & biên tập lại")}</div>;
    case "gate3":
      return waitingHere("gate3") ? openAbove : <p className="vs-scout-node-lede">{state.gates.gate3 ? `Đã duyệt lúc ${day(state.gates.gate3.at)}.` : "Chưa tới cổng này."}</p>;
    case "handoff":
      return state.stage === "done"
        ? <div className="vs-scout-node">
            <p className="vs-scout-node-lede">Kịch bản đã duyệt. Tạo video mở bước Kế hoạch với kịch bản này điền sẵn — bạn chọn style, ngày và mã video như mọi video khác.</p>
            <Link href={`/?fromResearch=${state.id}`}><Button type="primary" icon={<ExportOutlined />}>Tạo video từ kịch bản này</Button></Link>
          </div>
        : <p className="vs-scout-node-lede">Mở được sau khi bạn duyệt kịch bản ở cổng 3.</p>;
    default:
      return null;
  }
}

/**
 * Điều người dùng cần biết trước khi giao một lượt research (đọc slide và trang web của người khác) cho agent:
 * chỉ Claude bị giới hạn ghi trong research/<rid>/.
 */
const AGENT_NOTE: Partial<Record<AgentProvider, string>> = {
  codex: " · chưa kiểm, ghi được khắp repo",
  antigravity: " · thử nghiệm, không giới hạn quyền",
};

function NewRun({ agents, locked, fallback, onCreated }: { agents: Record<AgentProvider, boolean> | undefined; locked: boolean; fallback: AgentProvider; onCreated: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [agent, setAgent] = useState<AgentProvider>(fallback);
  const [cues, setCues] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", title);
      form.set("agent", agent);
      form.set("cues", String(cues));
      const { id } = await api<{ id: string }>("/api/research", { method: "POST", body: form });
      setFile(null);
      setTitle("");
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return <div className="vs-rs-new">
    {file
      ? <div className="vs-file">
          <FileTextOutlined />
          <span><strong>{file.name}</strong><small>{size(file.size)}</small></span>
          <Button type="link" disabled={busy} onClick={() => setFile(null)}>Đổi file</Button>
        </div>
      : <Upload.Dragger className="vs-drop" accept=".pdf,.pptx" showUploadList={false} disabled={busy} beforeUpload={(f) => {
          setFile(f);
          if (!title) setTitle(f.name.replace(/\.(pdf|pptx)$/i, ""));
          return Upload.LIST_IGNORE;
        }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Kéo slide của giảng viên vào đây</p>
          <p className="ant-upload-hint">.pdf hoặc .pptx · tối đa 50 MB</p>
        </Upload.Dragger>}
    <label className="vs-scout-field">
      <span className="vs-field-label">Tên bài giảng</span>
      <Input value={title} disabled={busy} maxLength={300} placeholder="Lấy từ tên file nếu để trống" onChange={(e) => setTitle(e.target.value)} />
    </label>
    <div className="field-grid">
      <label className="vs-scout-field">
        <span className="vs-field-label">Agent</span>
        <Select
          value={agent}
          disabled={busy || locked}
          onChange={setAgent}
          options={AGENT_PROVIDER_OPTIONS.map((o) => ({ value: o.value, label: `${o.label}${agents && !agents[o.value] ? " · chưa cài" : AGENT_NOTE[o.value] ?? ""}`, disabled: agents ? !agents[o.value] : false }))}
        />
      </label>
      <label className="vs-scout-field">
        <span className="vs-field-label">Số câu</span>
        <InputNumber min={5} max={80} value={cues} disabled={busy} onChange={(v) => setCues(v ?? 20)} />
      </label>
    </div>
    {error && <Alert className="feedback" type="error" showIcon closable title="Chưa tạo được" description={error} onClose={() => setError(null)} />}
    <Button type="primary" block icon={<PlayCircleFilled />} loading={busy} disabled={!file} onClick={() => void start()}>Bóc tách slide</Button>
  </div>;
}

export default function ResearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const rid = params.get("id");
  const { index, error: indexError, refresh: refreshIndex } = useResearchIndex();
  const { view, logs, job, error, act: rawAct } = useResearch(rid, refreshIndex);
  const [picked, setPicked] = useState<{ rid: string | null; node: string | null }>({ rid: null, node: null });
  const [allLogs, setAllLogs] = useState(false);
  const [actError, setActError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const select = (id: string | null) => router.push(id ? `/research?id=${encodeURIComponent(id)}` : "/research");
  const act: Act = async (body) => {
    setActError(null);
    try {
      await rawAct(body);
      return true;
    } catch (e) {
      setActError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };
  const node = view ? (picked.rid === rid && picked.node ? picked.node : defaultNode(view)) : null;
  const running = job?.status === "running";
  const usage = useMemo(() => (view ? totalUsage(view.state.runs) : null), [view]);
  const config = index?.config;
  const fallback = config?.defaultProvider ?? "claude";

  return <Shell page="scout">
    <div className="page-heading vs-page-heading">
      <div>
        <div className="eyebrow"><span className="tiny-mark" /> Thử nghiệm</div>
        <h1>Đóng gói kịch bản</h1>
      </div>
      <span className="vs-scout-beta">Beta</span>
    </div>
    <p className="vs-rs-lede">
      Slide của giảng viên → agent chọn điều cần kiểm → bạn duyệt → agent research trên web, Studio soát từng trích đoạn với trang gốc →
      agent viết kịch bản theo mẫu → bạn duyệt. Chạy bằng agent coding trên máy bạn; mọi lượt nằm ở <code>research/</code>, chỉ trên máy này.
    </p>

    <div className="vs-rs-toolbar">
      <Select
        className="vs-rs-picker"
        value={rid ?? undefined}
        placeholder={index?.runs.length ? "Chọn một lượt research" : "Chưa có lượt nào"}
        onChange={(id: string) => select(id)}
        options={index?.runs.map((r) => ({ value: r.id, label: `${r.title} · ${statusLabel(r)} · ${day(r.createdAt)}${r.claims ? ` · ${r.passed}/${r.claims} claim` : ""}` })) ?? []}
        aria-label="Lượt research"
      />
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>Lượt mới từ slide</Button>
    </div>
    {indexError && <Alert className="feedback" type="error" showIcon title={indexError} />}

    <Modal open={creating} title="Lượt research mới" footer={null} onCancel={() => setCreating(false)} destroyOnHidden>
      <NewRun agents={index?.agents} locked={Boolean(config?.selectionLocked)} fallback={fallback} onCreated={(id) => { setCreating(false); void refreshIndex(); select(id); }} />
    </Modal>

    <section className="editor-panel vs-rs-main" aria-label="Lượt research">
      {!rid && <div className="vs-step-body"><Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tải slide của giảng viên lên để bắt đầu, hoặc chọn một lượt ở trên">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>Lượt mới từ slide</Button>
      </Empty></div>}
      {rid && !view && <div className="vs-step-body">{error ? <Alert type="error" showIcon title={error} /> : <p className="vs-scout-running"><LoadingOutlined spin /> Đang tải…</p>}</div>}
      {view && <>
        <div className="panel-heading vs-rs-head">
          <div>
            <h2>{view.state.title}</h2>
            <p className="vs-rs-meta">
              <Tag className={`vs-badge is-${view.state.status}`}>{STAGE_LABEL[view.state.stage]}</Tag>
              <span>{agentProviderLabel(view.state.agent)}</span>
              {usage && (usage.input || usage.output) ? <span className="mono" title="Token của mọi lượt agent: vào (kể cả ghi cache) · đọc từ cache · ra">{k(usage.input)} vào · {k(usage.cached)} cache · {k(usage.output)} ra</span> : null}
              {view.state.sample && <Tag className="vs-badge">mẫu · chỉ xem</Tag>}
            </p>
          </div>
          <div className="vs-rs-actions">
            {running && <Button danger icon={<StopOutlined />} onClick={() => void act({ action: "stop" })}>Dừng</Button>}
            {!running && !view.state.sample && (view.state.status === "failed" || view.state.status === "idle") && !["gate1", "gate2", "gate3", "done"].includes(view.state.stage)
              && <Button type="primary" icon={<PlayCircleFilled />} onClick={() => void act({ action: "resume" })}>Chạy tiếp</Button>}
          </div>
        </div>
        <div className="vs-step-body">
          {running && <p className="vs-scout-running"><LoadingOutlined spin /> {job?.progress?.message ?? "Đang chạy…"}</p>}
          {view.state.status === "waiting" && WAITING[view.state.stage] && <Alert className="feedback" type="warning" showIcon title={WAITING[view.state.stage]} />}
          {view.state.error && !running && <Alert className="feedback" type={view.state.error === "Đã dừng." ? "info" : "error"} showIcon title={view.state.error} />}
          {actError && <Alert className="feedback" type="error" showIcon closable title="Chưa làm được" description={actError} onClose={() => setActError(null)} />}
          {view.state.status === "waiting" && !view.state.sample && ["gate1", "gate2", "gate3"].includes(view.state.stage) && <section className="vs-scout-detail vs-rs-gate" aria-label="Cổng duyệt">
            <div className="vs-scout-detail-head"><h3>{NODE_TITLE[view.state.stage]}</h3></div>
            <GatePanel key={`${view.state.id}:${view.state.stage}`} view={view} act={act} onSelect={(id) => { setPicked({ rid, node: id }); setAllLogs(false); }} />
          </section>}
          <ResearchFlow view={view} selected={node} onSelect={(id) => { setPicked({ rid, node: id }); setAllLogs(false); }} />
          <section className="vs-scout-detail" aria-label="Chi tiết">
            <div className="vs-scout-detail-head">
              <h3>{allLogs ? "Nhật ký" : node ? (node.startsWith("claim:") ? `Claim ${node.slice(6)}` : NODE_TITLE[node] ?? node) : ""}</h3>
              <Button type="link" size="small" onClick={() => setAllLogs(!allLogs)}>{allLogs ? "Xem theo nút" : "Nhật ký"}</Button>
            </div>
            {allLogs || !node ? <LogList logs={logs} /> : <NodeDetail view={view} node={node} act={act} running={running} onSelect={(id) => setPicked({ rid, node: id })} />}
          </section>
          <RunsTable view={view} />
        </div>
      </>}
    </section>
  </Shell>;
}
