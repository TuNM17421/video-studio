"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileTextOutlined, InboxOutlined, LeftOutlined, LoadingOutlined, PlayCircleFilled, PlusOutlined, RedoOutlined } from "@ant-design/icons";
import { Alert, Button, Collapse, Empty, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Tabs, Upload } from "antd";
import { AGENT_PROVIDER_OPTIONS } from "@/lib/agent-providers";
import { api, fileUrl } from "@/lib/client";
import { outlineSummary, STAGE_LABEL, type ResearchStage, type ResearchSummary, type ResearchView } from "@/lib/research";
import type { AgentProvider } from "@/lib/types";
import { Shell } from "../shell";
import { Gate1Panel } from "./gate1-panel";
import { ResearchFlow } from "./research-flow";
import { ClaimDetail, Gate2Panel, LogList, ReviewDetail, RunsTable, ScriptView, type Act } from "./research-panels";
import { ClaimList, RunBar } from "./research-steps";
import { useResearch, useResearchIndex } from "./use-research";

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const day = (iso: string) => new Date(iso).toLocaleString("vi-VN", { hour12: false, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Nhãn trạng thái một lượt trong bộ chọn — "chờ bạn" nổi lên trước tên chặng. */
function statusLabel(r: Pick<ResearchSummary, "status" | "stage" | "sample">) {
  if (r.sample) return "mẫu";
  if (r.status === "waiting") return "chờ bạn";
  if (r.status === "running") return "đang chạy";
  if (r.status === "failed") return "lỗi";
  return STAGE_LABEL[r.stage];
}

/** Chặng đã tới — một chặng chỉ chạy lại được khi lượt đã đi qua nó (máy chủ cũng chặn đúng như vậy). */
const REACHED: Record<ResearchStage, number> = { extract: 0, gate1: 1, research: 2, gate2: 3, write: 4, review: 5, revise: 5, gate3: 6, done: 7 };
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

/**
 * Hai cột như đọc tài liệu có chú thích: bên trái là việc của lượt (claim để duyệt, rồi kịch bản để đọc), bên phải
 * là thứ để đối chiếu (nguồn của claim đang chọn, dàn ý slide, nhật ký agent). Trước khi research, thứ để đối chiếu
 * là dàn ý — claim lấy ra từ đó; sau research là nguồn.
 */
type DocTab = "claims" | "script";
type SideTab = "sources" | "outline" | "log";
const docTabOf = (stage: ResearchStage): DocTab => (["extract", "gate1", "research", "gate2"].includes(stage) ? "claims" : "script");
const sideTabOf = (stage: ResearchStage): SideTab => (stage === "extract" || stage === "gate1" ? "outline" : "sources");

/** Nút trên sơ đồ → cột và tab mở ra (sơ đồ vẫn là một đường vào, nội dung mở ở hai cột). */
function placeOfNode(node: string): { doc?: DocTab; side?: SideTab } {
  if (node === "input" || node === "extract") return { side: "outline" };
  if (node === "gate1" || node === "research" || node === "evidence" || node === "gate2") return { doc: "claims" };
  return { doc: "script" };
}

/** Tab Claim: danh sách để duyệt ở cổng 1, việc cần quyết ở cổng 2, còn lại là claim và kết luận. */
function ClaimsDoc({ view, act, error, running, selected, onClaim }: { view: ResearchView; act: Act; error: string | null; running: boolean; selected: string | null; onClaim: (cid: string) => void }) {
  const { state } = view;
  const waiting = (gate: ResearchStage) => state.stage === gate && state.status === "waiting" && !state.sample;
  if (waiting("gate1")) return <Gate1Panel view={view} act={act} error={error} />;
  if (state.stage === "extract") return <p className="vs-scout-empty">Agent đang đọc slide và chọn những điều nên kiểm — danh sách claim sẽ hiện ở đây để bạn duyệt.</p>;
  return <div className="vs-rs-doc-stack">
    {waiting("gate2") && <Gate2Panel view={view} act={act} />}
    {waiting("gate2") && <h3 className="vs-rs-doc-subhead">Tất cả claim</h3>}
    {state.gates.gate1 && !waiting("gate2") && <p className="vs-scout-node-lede">
      Bạn đã duyệt {state.gates.gate1.claims} claim lúc {day(state.gates.gate1.at)}.
      {state.gates.gate2 && (state.gates.gate2.auto ? " Mọi claim đạt soát bằng chứng." : ` Đã quyết định ở cổng 2 lúc ${day(state.gates.gate2.at)}.`)}
      {" "}Bấm một claim để xem nguồn bên phải.
    </p>}
    <ClaimList view={view} running={running} selected={selected} onOpen={onClaim} />
    <p className="vs-scout-check-run">Studio soát từng trích đoạn với trang gốc nó tự tải. Chạy lại bằng tay: <code>node tools/research-verify.mjs research/{state.id} --stage evidence</code></p>
  </div>;
}

/** Tab Kịch bản: bản đang có, đọc như tài liệu; mã claim ở cuối câu mở nguồn bên phải. */
function ScriptDoc({ view, act, running, active, follow, onClaim }: { view: ResearchView; act: Act; running: boolean; active: string | null; follow: number; onClaim: (cid: string) => void }) {
  if (!view.script) {
    return <p className="vs-scout-empty">{running && view.state.stage === "write" ? "Agent đang viết — kịch bản sẽ hiện ở đây khi xong." : "Agent viết kịch bản sau khi research xong."}</p>;
  }
  return <div className="vs-rs-doc-stack">
    <ScriptView view={view} onClaim={onClaim} active={active} follow={follow} />
    <ReviewDetail view={view} />
    <div className="vs-rs-reruns">
      <RerunButton view={view} step="write" label="Viết lại từ đầu" act={act} running={running} />
      <RerunButton view={view} step="review" label="Soát & biên tập lại" act={act} running={running} />
    </div>
  </div>;
}

/** Dàn ý slide ở cột đối chiếu — thứ claim được lấy ra từ đó. */
function OutlineSide({ view, act, running }: { view: ResearchView; act: Act; running: boolean }) {
  const { state } = view;
  return <div className="vs-rs-doc-stack">
    <p className="vs-scout-node-note">
      <a href={fileUrl(`research/${state.id}/${state.deck.file}`)} target="_blank" rel="noreferrer">{state.deck.name}</a> · {state.deck.format.toUpperCase()} · {size(state.deck.bytes)}
      {state.deck.slides ? ` · ${state.deck.slides} slide` : ""}
    </p>
    {state.deck.text && <p className="vs-scout-node-note">Chữ và ghi chú đã bóc: <a href={fileUrl(`research/${state.id}/${state.deck.text}`)} target="_blank" rel="noreferrer">{state.deck.text}</a> — hình trong PPTX không đi theo.</p>}
    {(state.deck.emptySlides?.length ?? 0) > 0 && <p className="vs-scout-node-note">Slide chỉ có hình, agent không đọc được: {state.deck.emptySlides!.join(", ")}. Cần nội dung của chúng thì xuất PDF rồi tạo lượt mới.</p>}
    {view.outline
      ? <>
          <p className="vs-scout-node-note">Dàn ý agent bóc được · {outlineSummary(view.outline)}</p>
          <ol className="vs-rs-outline">{view.outline.map((o, i) => <li key={`${o.slide}-${i}`} value={o.slide}>{o.heading || `Slide ${o.slide}`}{o.skip ? " · không đọc" : ""}</li>)}</ol>
        </>
      : <p className="vs-scout-empty">Agent đang đọc slide — dàn ý sẽ hiện ở đây.</p>}
    <div><RerunButton view={view} step="extract" label="Bóc tách lại" act={act} running={running} /></div>
  </div>;
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
  // Tab người dùng tự chọn nhớ theo lượt và chặng — sang chặng mới thì về tab hợp với chặng đó.
  const [docPick, setDocPick] = useState<{ key: string; tab: DocTab } | null>(null);
  const [sidePick, setSidePick] = useState<{ key: string; tab: SideTab } | null>(null);
  const [claim, setClaim] = useState<{ rid: string | null; cid: string | null }>({ rid: null, cid: null });
  // Tăng mỗi lần chọn claim từ cột nguồn: kịch bản cuộn tới câu dẫn claim đó (chọn từ chính kịch bản thì không cuộn).
  const [follow, setFollow] = useState(0);
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
  const running = job?.status === "running";
  const config = index?.config;
  const fallback = config?.defaultProvider ?? "claude";
  const key = view ? `${view.state.id}:${view.state.stage}` : "";
  const docTab = docPick?.key === key ? docPick.tab : view ? docTabOf(view.state.stage) : "claims";
  const sideTab = sidePick?.key === key ? sidePick.tab : view ? sideTabOf(view.state.stage) : "sources";
  const openClaim = claim.rid === rid ? claim.cid : null;
  const openFrom = (cid: string, fromSide: boolean) => {
    setClaim({ rid, cid });
    setSidePick({ key, tab: "sources" });
    if (fromSide) return setFollow((n) => n + 1);
    // Màn hẹp: cột nguồn nằm dưới kịch bản, không dính bên cạnh — đưa người dùng xuống chỗ nó vừa mở.
    requestAnimationFrame(() => {
      const side = document.querySelector<HTMLElement>(".vs-rs-doc-side");
      if (side && getComputedStyle(side).position !== "sticky") side.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const claimsReady = Boolean(view && (view.claims.length || view.state.stage !== "extract"));
  const scriptReady = Boolean(view && (view.script || REACHED[view.state.stage] >= REACHED.write));

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

    {!rid && <section className="editor-panel vs-rs-main" aria-label="Lượt research">
      <div className="vs-step-body"><Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tải slide của giảng viên lên để bắt đầu, hoặc chọn một lượt ở trên">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>Lượt mới từ slide</Button>
      </Empty></div>
    </section>}
    {rid && !view && <section className="editor-panel vs-rs-main" aria-label="Lượt research">
      <div className="vs-step-body">{error ? <Alert type="error" showIcon title={error} /> : <p className="vs-scout-running"><LoadingOutlined spin /> Đang tải…</p>}</div>
    </section>}
    {view && <div className="vs-rs-run">
      <RunBar view={view} job={job} logs={logs} act={act} running={running} />
      {actError && <Alert className="feedback" type="error" showIcon closable title="Chưa làm được" description={actError} onClose={() => setActError(null)} />}
      <div className="vs-rs-doc">
        <section className="vs-rs-doc-main" aria-label="Tài liệu của lượt">
          <Tabs
            activeKey={docTab}
            onChange={(tab) => setDocPick({ key, tab: tab as DocTab })}
            items={[
              {
                key: "claims",
                label: `Claim${view.claims.length ? ` · ${view.claims.length}` : ""}`,
                disabled: !claimsReady,
                children: <ClaimsDoc view={view} act={act} error={actError} running={running} selected={openClaim} onClaim={(cid) => openFrom(cid, false)} />,
              },
              {
                key: "script",
                label: "Kịch bản",
                disabled: !scriptReady,
                children: <ScriptDoc view={view} act={act} running={running} active={openClaim} follow={follow} onClaim={(cid) => openFrom(cid, false)} />,
              },
            ]}
          />
        </section>
        <aside className="vs-rs-doc-side" aria-label="Đối chiếu">
          <Segmented
            block
            value={sideTab}
            onChange={(tab) => setSidePick({ key, tab: tab as SideTab })}
            options={[
              { value: "sources", label: "Nguồn" },
              { value: "outline", label: "Dàn ý slide" },
              { value: "log", label: "Nhật ký" },
            ]}
          />
          <div className="vs-rs-side-body">
            {sideTab === "sources" && (openClaim
              ? <>
                  <Button type="link" size="small" icon={<LeftOutlined />} className="vs-rs-side-back" onClick={() => setClaim({ rid, cid: null })}>Tất cả claim</Button>
                  <h3 className="vs-rs-side-title">Claim {openClaim}</h3>
                  <ClaimDetail view={view} cid={openClaim} act={act} running={running} />
                </>
              : view.claims.length && REACHED[view.state.stage] >= REACHED.research
                ? <>
                    <p className="vs-scout-node-note">Bấm một claim để xem nguồn, trích đoạn và câu trả lời của agent.</p>
                    <ClaimList view={view} running={running} selected={openClaim} onOpen={(cid) => openFrom(cid, true)} />
                  </>
                : <p className="vs-scout-empty">Nguồn của từng claim hiện ở đây sau khi bạn duyệt claim và agent research xong.</p>)}
            {sideTab === "outline" && <OutlineSide view={view} act={act} running={running} />}
            {sideTab === "log" && <LogList logs={logs} />}
          </div>
        </aside>
      </div>
      {/* Sơ đồ và bảng token là thứ để tra khi cần — gập sẵn. */}
      <Collapse className="vs-rs-more" size="small" items={[
        {
          key: "flow",
          label: "Sơ đồ pipeline",
          children: <ResearchFlow
            view={view}
            selected={openClaim ? `claim:${openClaim}` : docTab === "script" ? "write" : "research"}
            onSelect={(node) => {
              if (node.startsWith("claim:")) return openFrom(node.slice(6), true);
              const place = placeOfNode(node);
              if (place.doc) setDocPick({ key, tab: place.doc });
              if (place.side) setSidePick({ key, tab: place.side });
            }}
          />,
        },
        ...(view.state.runs.length ? [{ key: "runs", label: `Các lượt agent · ${view.state.runs.length} lượt · token`, children: <RunsTable view={view} /> }] : []),
      ]} />
    </div>}
  </Shell>;
}
