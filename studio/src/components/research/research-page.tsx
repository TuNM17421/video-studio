"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileTextOutlined, InboxOutlined, LoadingOutlined, PlayCircleFilled, UploadOutlined } from "@ant-design/icons";
import { Alert, Button, Input, InputNumber, Modal, Select, Upload } from "antd";
import { AGENT_PROVIDER_OPTIONS } from "@/lib/agent-providers";
import { api } from "@/lib/client";
import { scriptBudget } from "@/lib/research";
import { defaultNode, fmtTime, runStatus, type NodeId } from "@/lib/research-ui";
import type { AgentProvider } from "@/lib/types";
import { Shell } from "../shell";
import { WorkArea } from "./node-views";
import { DetailsDrawer, type DetailsSection } from "./research-details";
import { RunHeader } from "./research-head";
import type { Act } from "./research-panels";
import { ResearchStrip } from "./research-strip";
import { useResearch, useResearchIndex } from "./use-research";

/**
 * Trang Đóng gói kịch bản: hàng đầu trang, dải sơ đồ bảy ô, vùng làm việc của ô đang chọn với thanh quyết định dính
 * đáy, và ngăn Chi tiết. Trang chỉ ghép các phần; mỗi phần ở file riêng.
 */

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);
const NOTES_KEY = "video-studio.research.notes";

/**
 * Điều người dùng cần biết trước khi giao một lượt (đọc slide và trang web của người khác) cho agent: chỉ Claude bị giới
 * hạn ghi trong research/<rid>/.
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
        <span className="vs-field-label">Số câu kịch bản</span>
        <InputNumber min={5} max={80} value={cues} disabled={busy} onChange={(v) => setCues(v ?? 20)} />
        <small>Mỗi câu là một cảnh · ≈ {String(scriptBudget(cues).minutes).replace(".", ",")} phút lời đọc</small>
      </label>
    </div>
    <p className="vs-rs-note">Agent chạy trên máy này; slide và mọi kết quả chỉ nằm trong thư mục research/ trên máy này.</p>
    {error && <Alert className="feedback" type="error" showIcon closable title="Chưa tạo được" description={error} onClose={() => setError(null)} />}
    <Button type="primary" block icon={<PlayCircleFilled />} loading={busy} disabled={!file} onClick={() => void start()}>Bắt đầu đọc slide</Button>
  </div>;
}

export default function ResearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const rid = params.get("id");
  const { index, error: indexError, refresh: refreshIndex } = useResearchIndex();
  const { view, logs, job, error, refresh, act: rawAct } = useResearch(rid, refreshIndex);
  // Ô người dùng tự chọn nhớ theo lượt và chặng — sang chặng mới thì về ô hợp với chặng đó.
  const [pick, setPick] = useState<{ key: string; node: NodeId } | null>(null);
  const [claim, setClaim] = useState<{ rid: string | null; cid: string | null }>({ rid: null, cid: null });
  // Tăng mỗi lần chọn một điều từ cột nguồn: kịch bản cuộn tới câu dẫn nó.
  const [follow, setFollow] = useState(0);
  const [details, setDetails] = useState<{ open: boolean; sections: DetailsSection[] }>({ open: false, sections: ["log"] });
  const [draft, setDraft] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notes, setNotesState] = useState(false);
  const [actError, setActError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Công tắc "Ghi chú dựng video" nhớ theo trình duyệt — đọc sau khi dựng trang để bản server và bản client khớp nhau.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotesState(localStorage.getItem(NOTES_KEY) === "1");
    } catch {}
  }, []);
  const setNotes = (on: boolean) => {
    setNotesState(on);
    try { localStorage.setItem(NOTES_KEY, on ? "1" : "0"); } catch {}
  };

  const running = job?.status === "running";
  // Tên tab nói trạng thái — người dùng hay để trang ở tab khác trong lúc agent chạy.
  const tabWord = !view ? null : view.state.status === "waiting" && !view.state.sample ? "Chờ bạn" : running ? "Đang chạy"
    : view.state.status === "failed" && view.state.error !== "Đã dừng." ? "Lỗi" : null;
  const tabTitle = view && tabWord ? `${tabWord} · ${view.state.title} · Video Studio` : null;
  useEffect(() => {
    if (!tabTitle) return;
    const prev = document.title;
    document.title = tabTitle;
    return () => { document.title = prev; };
  }, [tabTitle]);

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
  const config = index?.config;
  const fallback = config?.defaultProvider ?? "claude";
  const key = view ? `${view.state.id}:${view.state.stage}` : "";
  const node: NodeId = view ? (pick?.key === key ? pick.node : defaultNode(view)) : "slide";
  const openClaim = claim.rid === rid ? claim.cid : null;
  const selectNode = (n: NodeId) => setPick({ key, node: n });
  const recent = [...(index?.runs ?? [])].sort((a, b) => Number(b.status === "waiting") - Number(a.status === "waiting") || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const sample = index?.runs.find((r) => r.sample);

  return <Shell page="scout">
    <RunHeader runs={index?.runs} rid={rid} onSelect={select} onNew={() => setCreating(true)} onDetails={() => setDetails({ open: true, sections: details.sections })} hasRun={Boolean(view)} />
    {indexError && <Alert className="feedback" type="error" showIcon title={indexError} />}

    <Modal open={creating} title="Lượt mới từ slide" footer={null} onCancel={() => setCreating(false)} destroyOnHidden>
      <NewRun agents={index?.agents} locked={Boolean(config?.selectionLocked)} fallback={fallback} onCreated={(id) => { setCreating(false); void refreshIndex(); select(id); }} />
    </Modal>

    {!rid && <>
      <ResearchStrip preview />
      <section className="vs-rs-empty" aria-labelledby="rs-empty-title">
        <h2 id="rs-empty-title">Bắt đầu từ slide của giảng viên</h2>
        <p>Tải slide lên (.pdf hoặc .pptx). Studio tự đi qua các bước trên sơ đồ và chỉ dừng ở ba hình thoi để bạn quyết. Bạn có thể rời trang trong lúc agent chạy.</p>
        <div className="vs-rs-empty-actions">
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setCreating(true)} data-tour="research.new">Tải slide lên</Button>
          {sample && <button type="button" className="vs-rs-link" onClick={() => select(sample.id)}>Xem lượt mẫu ›</button>}
        </div>
        {recent.length > 0 && <div className="vs-rs-recent">
          <h3>Lượt gần đây</h3>
          <ul>{recent.map((r) => {
            const s = runStatus(r);
            return <li key={r.id}><button type="button" onClick={() => select(r.id)}>
              <i className={`vs-rs-dot is-${s.tone}`} aria-hidden="true" />
              <span className="vs-rs-recent-status">{s.word}</span>
              <span className="vs-rs-recent-title">{r.title}</span>
              <small>{fmtTime(r.createdAt)}</small>
            </button></li>;
          })}</ul>
        </div>}
      </section>
    </>}

    {rid && !view && <section className="vs-rs-work" aria-label="Lượt research">
      {error
        ? <Alert type="error" showIcon title="Không mở được lượt này." description={error} action={<Button size="small" onClick={() => void refresh()}>Tải lại</Button>} />
        : <p className="vs-rs-lead"><LoadingOutlined spin /> Đang tải lượt…</p>}
    </section>}

    {view && <>
      <ResearchStrip view={view} running={running} selected={node} onSelect={selectNode}
        onClaim={(cid) => { setClaim({ rid, cid }); selectNode("research"); }} />
      <WorkArea
        view={view}
        logs={logs}
        job={job}
        node={node}
        onNode={selectNode}
        act={act}
        actError={actError}
        onActError={() => setActError(null)}
        openLog={() => setDetails({ open: true, sections: [...new Set<DetailsSection>([...details.sections, "log"])] })}
        claim={openClaim}
        setClaim={(cid) => setClaim({ rid, cid })}
        follow={follow}
        bumpFollow={() => setFollow((n) => n + 1)}
        notes={notes}
        setNotes={setNotes}
        draft={draft}
        setDraft={setDraft}
        feedbackOpen={feedbackOpen}
        setFeedbackOpen={setFeedbackOpen}
      />
      <DetailsDrawer
        open={details.open}
        sections={details.sections}
        onClose={() => setDetails({ ...details, open: false })}
        onSections={(sections) => setDetails({ ...details, sections })}
        view={view}
        logs={logs}
        act={act}
        running={running}
      />
    </>}
  </Shell>;
}
