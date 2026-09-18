"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircleFilled, DeleteOutlined, ExportOutlined, FileTextOutlined, GlobalOutlined, InboxOutlined, LoadingOutlined,
  PlayCircleFilled, PlusOutlined, ReadOutlined, RobotOutlined, SaveOutlined, SearchOutlined, StopOutlined, WarningFilled,
} from "@ant-design/icons";
import { Alert, Button, Checkbox, Collapse, Empty, Input, InputNumber, Segmented, Select, Tag, Upload } from "antd";
import { api, fileUrl } from "@/lib/client";
import {
  countEvents, KIND_LABEL, SCRIPT_NODE, TRUST_LABEL, VERDICT_LABEL,
  type ItemKind, type ResearchItem, type ScoutEvent, type ScoutInput, type ScoutRun, type ScoutStatus,
} from "@/lib/scout";
import { ScoutWorkflow } from "./scout-workflow";
import { Shell } from "./shell";

const clock = (t: number) => new Date(t).toLocaleTimeString("vi-VN", { hour12: false });
const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** Tên miền là thứ người duyệt nhìn để biết nguồn có độc lập với nhau không — URL đầy đủ thì quá dài. */
function host(url: string) {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}

const EVENT_ICON: Partial<Record<ScoutEvent["kind"], React.ReactNode>> = {
  start: <PlayCircleFilled />,
  say: <RobotOutlined />,
  search: <SearchOutlined />,
  fetch: <GlobalOutlined />,
  save: <SaveOutlined />,
  tool: <ReadOutlined />,
  error: <WarningFilled />,
  review: <CheckCircleFilled />,
  done: <CheckCircleFilled />,
};

/** Một dòng nhật ký. WebSearch và WebFetch được dựng khác hẳn các công cụ còn lại — chúng là thứ trang
 *  này sinh ra để cho xem, phần còn lại chỉ là bối cảnh. */
function FlowRow({ event }: { event: ScoutEvent }) {
  let body: React.ReactNode;
  switch (event.kind) {
    case "search": body = <><span className="vs-scout-verb">Tìm trên web</span><q className="vs-scout-query">{event.query}</q></>; break;
    case "fetch": body = <><span className="vs-scout-verb">Đọc trang</span><a className="mono" href={event.url} target="_blank" rel="noreferrer">{host(event.url)}<ExportOutlined /></a>{event.ask && <small>{event.ask}</small>}</>; break;
    case "save": body = <><span className="vs-scout-verb">Ghi xuống đĩa</span><code>{event.file}</code></>; break;
    case "say": body = <p className="vs-scout-say">{event.text}</p>; break;
    case "error": body = <p className="vs-scout-error">{event.text}</p>; break;
    case "review": body = <><span className="vs-scout-verb">Bóc tách xong</span><small>{event.items} mục đề xuất — chờ duyệt</small></>; break;
    case "done": body = <><span className="vs-scout-verb">{event.ok ? "Xong" : "Dừng"}</span>{event.summary && <p className="vs-scout-say">{event.summary}</p>}</>; break;
    case "start": body = <><span className="vs-scout-verb">Bắt đầu</span><code>{event.dir}</code></>; break;
    case "tool": body = <><span className="vs-scout-verb">{event.name}</span>{event.detail && <small>{event.detail}</small>}</>; break;
    default: return null;
  }
  return <li className={`vs-scout-row is-${event.kind}`}>
    <span className="vs-scout-icon" aria-hidden="true">{EVENT_ICON[event.kind]}</span>
    <span className="vs-scout-time mono">{clock(event.t)}</span>
    <span className="vs-scout-body">{body}</span>
  </li>;
}

function EventList({ events, empty }: { events: ScoutEvent[]; empty: string }) {
  const list = useRef<HTMLOListElement>(null);
  const shown = events.filter((e) => e.kind !== "progress");
  // Nhật ký chạy dài hơn khung rất nhanh; không tự cuộn thì người xem phải kéo tay suốt lượt chạy.
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [shown.length]);
  if (!shown.length) return <p className="vs-scout-empty">{empty}</p>;
  return <ol ref={list} className="vs-scout-flow">{shown.map((e, i) => <FlowRow key={`${e.t}-${i}`} event={e} />)}</ol>;
}

/** Hồ sơ nguồn sau khi lượt chạy xong: ai nói, khi nào, tin được tới đâu, và trích đoạn nào đã soát. */
function Dossier({ run, only }: { run: ScoutRun; only?: string[] }) {
  const sources = (run.dossier?.sources ?? []).filter((s) => !only || only.includes(s.id));
  if (!sources.length) return null;
  const failed = new Set((run.check?.quotes.problems ?? []).map((p) => p.source));
  return <section className="vs-scout-sources" aria-label="Hồ sơ nguồn">
    <h3>{only ? "Nguồn của mục này" : "Hồ sơ nguồn"} · {sources.length}</h3>
    <ul>
      {sources.map((s) => <li key={s.id} className={`vs-scout-source is-${s.trust}`}>
        <div className="vs-scout-source-head">
          <span className="vs-scout-sid mono">{s.id}</span>
          <a href={s.url} target="_blank" rel="noreferrer"><strong>{s.title || host(s.url)}</strong></a>
          <Tag className="vs-badge">{TRUST_LABEL[s.trust] ?? s.trust}</Tag>
        </div>
        <p className="vs-scout-source-meta">
          <span className="mono">{host(s.url)}</span>
          {" · "}
          {s.published ? `đăng ${s.published}` : <em>trang không ghi ngày</em>}
          {s.file ? <> · <a href={fileUrl(`${run.dir}/${s.file}`)} target="_blank" rel="noreferrer">đã tải về</a></> : <> · <em>chưa tải trang</em></>}
        </p>
        {s.why && <p className="vs-scout-why">{s.why}</p>}
        {s.quotes.length > 0 && <ul className="vs-scout-quotes">
          {s.quotes.map((q, i) => <li key={i}>
            <q>{q}</q>
            {failed.has(s.id) && <Tag color="error">chưa soát được</Tag>}
          </li>)}
        </ul>}
      </li>)}
    </ul>
  </section>;
}

/** Báo cáo của tools/scout-verify.mjs — chạy cục bộ, không mạng, nên nó là chỗ duy nhất nói thật. */
function Check({ run, heading = true }: { run: ScoutRun; heading?: boolean }) {
  const check = run.check;
  if (!check) return <p className="vs-scout-empty">Chưa soát — phần soát chạy sau khi agent viết xong.</p>;
  const weak = check.cues.filter((c) => c.level !== "ok");
  const fromSlide = check.cues.filter((c) => c.slides?.length).length;
  return <section className={`vs-scout-check ${check.ok ? "is-ok" : "is-warn"}`} aria-label="Soát trích dẫn">
    {heading && <h3>Soát trích dẫn</h3>}
    <p className="vs-scout-check-line">
      {check.quotes.ok}/{check.quotes.total} trích đoạn khớp trang đã tải ·{" "}
      {check.sources.fetched}/{check.sources.total} nguồn có bản lưu ·{" "}
      {check.cues.length ? `${check.cues.filter((c) => c.level === "ok").length}/${check.cues.length} câu đủ nguồn` : "kịch bản chưa viết"}
      {fromSlide > 0 && ` · ${fromSlide} câu dựa trên slide`}
    </p>
    {check.quotes.problems.length > 0 && <ul className="vs-scout-problems">
      {check.quotes.problems.map((p, i) => <li key={i}><span className="mono">{p.source}</span> — {p.reason}<q>{p.quote}</q></li>)}
    </ul>}
    {weak.length > 0 && <ul className="vs-scout-problems">
      {weak.map((c) => <li key={c.n}>Câu {c.n} — {c.note}</li>)}
    </ul>}
    <p className="vs-scout-check-run">
      Chạy lại bất cứ lúc nào: <code>node tools/scout-verify.mjs {run.dir} --min {check.minSources}</code>
    </p>
  </section>;
}

// ── bước duyệt ───────────────────────────────────────────────────────────────────

const KIND_OPTIONS = (Object.keys(KIND_LABEL) as ItemKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }));

function ItemCard({ item, onChange, onRemove }: { item: ResearchItem; onChange: (next: ResearchItem) => void; onRemove: () => void }) {
  const set = (patch: Partial<ResearchItem>) => onChange({ ...item, ...patch });
  return <li className={`vs-scout-item${item.selected ? "" : " is-off"}`}>
    <Checkbox checked={item.selected} onChange={(e) => set({ selected: e.target.checked })} aria-label={`Research mục ${item.title || "mới"}`} />
    <div className="vs-scout-item-body">
      <div className="vs-scout-item-head">
        <Select size="small" value={item.kind} options={KIND_OPTIONS} onChange={(kind) => set({ kind })} popupMatchSelectWidth={false} aria-label="Loại" />
        <span className="vs-scout-item-slides mono">{item.slides.length ? `slide ${item.slides.join(", ")}` : "cả bài"}</span>
        <Button type="text" size="small" icon={<DeleteOutlined />} onClick={onRemove} aria-label="Xoá mục này" />
      </div>
      <Input value={item.title} placeholder="Tên ngắn của mục" maxLength={80} onChange={(e) => set({ title: e.target.value })} aria-label="Tên mục" />
      <Input.TextArea value={item.claim} placeholder="Slide nói gì, hoặc cần kiểm điều gì" autoSize={{ minRows: 1, maxRows: 4 }} maxLength={600} onChange={(e) => set({ claim: e.target.value })} aria-label="Nội dung cần research" />
      {item.why && <p className="vs-scout-item-why">{item.why}</p>}
      <Select
        mode="tags"
        size="small"
        value={item.queries}
        placeholder="Từ khoá gợi ý cho agent (tuỳ chọn)"
        onChange={(queries: string[]) => set({ queries: queries.slice(0, 4) })}
        tokenSeparators={[";"]}
        open={false}
        suffixIcon={null}
        aria-label="Từ khoá gợi ý"
      />
    </div>
  </li>;
}

function ReviewPanel({ run, draft, setDraft, busy, onConfirm }: { run: ScoutRun; draft: ResearchItem[]; setDraft: (items: ResearchItem[]) => void; busy: boolean; onConfirm: () => void }) {
  const chosen = draft.filter((it) => it.selected && it.title.trim()).length;
  const outline = run.extraction?.outline ?? [];
  const add = () => setDraft([...draft, { id: `new-${Date.now()}`, slides: [], title: "", claim: "", kind: "khang-dinh", why: "", queries: [], selected: true }]);
  return <div className="vs-scout-review">
    <p className="vs-scout-review-lede">
      Agent đã đọc <strong>{run.deck?.name}</strong>
      {run.extraction?.slides ? ` (${run.extraction.slides} slide)` : ""} và đề xuất những chỗ nên research trên web trước khi viết
      kịch bản. Bỏ tick mục không cần, sửa lại cho đúng ý, hoặc thêm mục — agent sẽ làm <strong>lần lượt từng mục đã tick</strong> rồi
      viết kịch bản theo mạch của slide.
    </p>
    {outline.length > 0 && <Collapse
      size="small"
      className="vs-scout-outline"
      items={[{
        key: "outline",
        label: `Dàn ý agent bóc được · ${outline.length} slide`,
        children: <ol>{outline.map((o) => <li key={o.slide} value={o.slide}><strong>{o.heading || `Slide ${o.slide}`}</strong>{o.points.length > 0 && <ul>{o.points.map((p, i) => <li key={i}>{p}</li>)}</ul>}</li>)}</ol>,
      }]}
    />}
    {draft.length === 0
      ? <p className="vs-scout-empty">Agent không thấy chỗ nào cần research. Thêm mục bằng tay, hoặc viết kịch bản thẳng từ slide.</p>
      : <ul className="vs-scout-items">
          {draft.map((it, i) => <ItemCard
            key={it.id}
            item={it}
            onChange={(next) => setDraft(draft.map((x, j) => (j === i ? next : x)))}
            onRemove={() => setDraft(draft.filter((_, j) => j !== i))}
          />)}
        </ul>}
    <div className="vs-scout-review-actions">
      <Button icon={<PlusOutlined />} onClick={add} disabled={busy}>Thêm mục</Button>
      <Button type="primary" icon={<PlayCircleFilled />} loading={busy} onClick={onConfirm}>
        {chosen ? `Xác nhận · research ${chosen} mục` : "Viết kịch bản từ slide, không research"}
      </Button>
    </div>
  </div>;
}

// ── chi tiết một nút của workflow ─────────────────────────────────────────────────

function NodeDetail({ run, events, node }: { run: ScoutRun; events: ScoutEvent[]; node: string }) {
  if (node === "verify") return <Check run={run} heading={false} />;
  if (node === "input") {
    const deck = run.deck;
    if (!deck) return <p className="vs-scout-node-lede">Chủ đề: <strong>{run.input.topic}</strong></p>;
    return <div className="vs-scout-node">
      <p className="vs-scout-node-lede">
        <a href={fileUrl(`${run.dir}/${deck.file}`)} target="_blank" rel="noreferrer">{deck.name}</a> · {deck.format.toUpperCase()} · {size(deck.bytes)}
        {deck.slides ? ` · ${deck.slides} slide` : ""}
      </p>
      {deck.text && <p className="vs-scout-node-note">Chữ và ghi chú đã bóc: <a href={fileUrl(`${run.dir}/${deck.text}`)} target="_blank" rel="noreferrer">{deck.text}</a> — hình trong PPTX không đi theo.</p>}
    </div>;
  }
  if (node === "extract") {
    return <div className="vs-scout-node">
      {run.extraction && <p className="vs-scout-node-lede">{run.extraction.items.length} mục đề xuất, người dùng chọn {run.items.length}. <a href={fileUrl(`${run.dir}/muc-research.json`)} target="_blank" rel="noreferrer">muc-research.json</a></p>}
      <EventList events={events.filter((e) => e.stage === "extract")} empty="Chưa có hoạt động." />
    </div>;
  }
  if (node === "script") {
    return <div className="vs-scout-node">
      {run.script && <p className="vs-scout-deliverable"><FileTextOutlined /><a href={fileUrl(run.script)} target="_blank" rel="noreferrer">{run.script}</a></p>}
      <EventList events={events.filter((e) => e.item === SCRIPT_NODE)} empty="Agent chưa tới bước viết kịch bản." />
    </div>;
  }
  if (node === "research") return <EventList events={events.filter((e) => e.stage === "research")} empty="Chưa có hoạt động." />;

  const id = node.replace(/^item:/, "");
  const item = run.items.find((it) => it.id === id);
  if (!item) return null;
  const finding = run.findings[id];
  return <div className="vs-scout-node">
    <p className="vs-scout-node-lede">
      <Tag className="vs-badge">{KIND_LABEL[item.kind]}</Tag>
      <span className="mono">{item.slides.length ? `slide ${item.slides.join(", ")}` : "cả bài"}</span> · {item.claim}
    </p>
    {finding && <div className={`vs-scout-finding is-${finding.verdict}`}>
      <strong>{VERDICT_LABEL[finding.verdict]}</strong>
      <p>{finding.finding}</p>
    </div>}
    {finding && <Dossier run={run} only={finding.sources} />}
    <EventList events={events.filter((e) => e.item === id)} empty="Agent chưa tới mục này." />
  </div>;
}

/** Nút mặc định của khung chi tiết: nút đang làm, không thì bước cuối đã có kết quả. */
function defaultNode(run: ScoutRun) {
  if (run.status === "running") {
    if (run.stage === "extract") return "extract";
    if (run.mode === "topic") return "research";
    const active = Object.entries(run.itemStates).find(([, s]) => s === "active")?.[0];
    return active === SCRIPT_NODE ? "script" : active ? `item:${active}` : run.items[0] ? `item:${run.items[0].id}` : "script";
  }
  return run.check ? "verify" : run.mode === "topic" ? "research" : "extract";
}

function nodeTitle(run: ScoutRun, node: string) {
  if (node === "input") return run.deck ? "Slide" : "Chủ đề";
  if (node === "extract") return "Bóc tách nội dung";
  if (node === "research") return "Tìm tài liệu";
  if (node === "script") return "Viết kịch bản";
  if (node === "verify") return "Soát trích dẫn";
  const item = run.items.find((it) => `item:${it.id}` === node);
  return item ? `${item.id} · ${item.title}` : node;
}

// ── trang ─────────────────────────────────────────────────────────────────────────

export default function Scout() {
  const [mode, setMode] = useState<"slide" | "topic">("slide");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [input, setInput] = useState<ScoutInput>({ topic: "", minSources: 2, cues: 20 });
  const [run, setRun] = useState<ScoutRun | null>(null);
  const [events, setEvents] = useState<ScoutEvent[]>([]);
  const [status, setStatus] = useState<ScoutStatus>("idle");
  const [draft, setDraft] = useState<ResearchItem[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [allLogs, setAllLogs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const current = await api<ScoutRun | null>("/api/scout");
      if (!current) return;
      setRun(current);
      setEvents(current.events);
      setStatus(current.status);
      setInput(current.input);
      setMode(current.mode);
      if (current.status === "review") setDraft(current.extraction?.items ?? []);
    } catch {
      // Máy chủ chưa sẵn sàng thì trang vẫn dùng được — chỉ là chưa có lượt cũ nào để dựng lại.
    }
  }, []);

  useEffect(() => {
    // Đồng bộ lần đầu với trạng thái do máy chủ giữ, rồi bám luồng sự kiện — đúng trường hợp "subscribe
    // vào một hệ thống bên ngoài" mà chính tài liệu của luật này coi là hợp lệ; luật không nhìn xuyên
    // được qua `load`. Cùng khuôn với `useVideo`/`useKeyStatus` trong lib/client.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const source = new EventSource("/api/scout/events");
    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as ScoutEvent;
      setEvents((list) => [...list.slice(-700), event]);
      if (event.kind === "start") setStatus("running");
      if (event.kind === "progress") setRun((r) => (r ? { ...r, stage: event.stage ?? r.stage, itemStates: event.states } : r));
      // Danh sách mục, hồ sơ và báo cáo soát chỉ có sau khi một bước khép lại, nên phải hỏi lại máy chủ.
      if (event.kind === "review" || event.kind === "done") void load();
    };
    return () => source.close();
  }, [load]);

  const running = status === "running";
  const counts = countEvents(events);
  const node = picked ?? (run ? defaultNode(run) : null);
  const showWorkflow = run && !(run.mode === "slide" && status === "review");

  async function act(fn: () => Promise<ScoutRun>) {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      setRun(next);
      setEvents(next.events);
      setStatus(next.status);
      setPicked(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  const start = () => act(async () => {
    if (mode === "topic") return api<ScoutRun>("/api/scout", { method: "POST", json: { action: "start", input } });
    const form = new FormData();
    form.set("file", file!);
    form.set("title", title);
    form.set("minSources", String(input.minSources));
    form.set("cues", String(input.cues));
    return api<ScoutRun>("/api/scout/slide", { method: "POST", body: form });
  });

  const confirm = () => act(() => api<ScoutRun>("/api/scout", { method: "POST", json: { action: "confirm", items: draft } }));

  async function stop() {
    setBusy(true);
    try { await api("/api/scout", { method: "POST", json: { action: "stop" } }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(false); }
  }

  const ready = mode === "topic" ? Boolean(input.topic.trim()) : Boolean(file);
  const stageLabel = useMemo(() => {
    if (!run) return "";
    if (status === "review") return "CHỜ DUYỆT";
    if (run.mode === "slide" && run.stage === "extract") return running ? "ĐANG BÓC TÁCH" : "";
    const total = run.items.length;
    const done = run.items.filter((it) => run.itemStates[it.id] === "done").length;
    return total ? `${done}/${total} MỤC XONG` : "";
  }, [run, status, running]);

  return <Shell page="scout">
    <div className="page-heading vs-page-heading">
      <div>
        <div className="eyebrow"><span className="tiny-mark" /> Thử nghiệm</div>
        <h1>Đóng gói kịch bản</h1>
      </div>
      {/* `.vs-page-heading` là flex `align-items: stretch` (chỗ đó vốn dành cho khối chọn agent cao 84px),
          nên một Tag đặt thẳng vào sẽ bị kéo cao hết cỡ thành hình bầu dục. Tự đặt lại align-self. */}
      <span className="vs-scout-beta">Beta · đang phát triển</span>
    </div>

    {/* Nói thẳng những gì còn thiếu. Một trang beta mà chỉ ghi mỗi chữ "beta" thì người dùng vẫn tin
        kết quả như hàng chính thức — liệt kê ra thì họ biết phải tự soát chỗ nào. */}
    <Alert
      className="feedback"
      type="warning"
      showIcon
      title="Tính năng thử nghiệm — chưa hoàn thiện 100%"
      description={<>
        Agent đọc slide của giảng viên (hoặc một chủ đề), research trên web những chỗ cần kiểm, rồi viết kịch bản có dẫn nguồn vào <code>scout/</code> ở gốc repo.
        {/* `.feedback strong` là display:block — giữ nguyên câu trong một thẻ strong để nó thành trọn
            một dòng, thay vì nhấn mạnh giữa câu rồi bị cắt làm đôi. */}
        <strong>Đừng dùng thẳng kết quả — đọc lại kịch bản và hồ sơ nguồn trước đã.</strong>
        <ul className="vs-scout-caveats">
          <li><strong>Chưa nối vào luồng tạo video.</strong> Luồng hiện tại không đọc gì ở đây; muốn dùng thì tải kịch bản về rồi tạo video như bình thường.</li>
          <li><strong>PPTX chỉ lấy được chữ và ghi chú.</strong> Hình, sơ đồ trong PPTX không đi theo; slide nhiều hình thì xuất ra PDF rồi nộp PDF.</li>
          <li><strong>Chạy lâu.</strong> Agent research lần lượt từng mục vì phải tải thật từng trang về — vài phút mỗi mục.</li>
          <li><strong>Phần soát chỉ kiểm được trích dẫn.</strong> Nó đối chiếu từng trích đoạn với trang đã tải, nhưng không thay người đọc để biết nguồn đó có đáng tin hay không.</li>
        </ul>
      </>}
    />

    <div className="editor-layout vs-scout-layout">
      <section className="editor-panel" aria-label="Đầu vào">
        <div className="panel-heading"><div><h2>Đầu vào</h2></div></div>
        <div className="vs-step-body vs-scout-input">
          <div className="vs-scout-input-source">
          <Segmented
            block
            value={mode}
            disabled={running || busy}
            onChange={(v) => setMode(v as "slide" | "topic")}
            options={[{ value: "slide", label: "Slide giảng viên" }, { value: "topic", label: "Chủ đề" }]}
            aria-label="Nguồn đầu vào"
          />

          {mode === "slide" ? <>
            {file
              ? <div className="vs-file">
                  <FileTextOutlined />
                  <span><strong>{file.name}</strong><small>{size(file.size)}</small></span>
                  <Button type="link" disabled={running || busy} onClick={() => setFile(null)}>Đổi file</Button>
                </div>
              : <Upload.Dragger
                  className="vs-drop"
                  accept=".pdf,.pptx"
                  showUploadList={false}
                  disabled={running || busy}
                  beforeUpload={(f) => {
                    setFile(f);
                    if (!title) setTitle(f.name.replace(/\.(pdf|pptx)$/i, ""));
                    return Upload.LIST_IGNORE;
                  }}
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">Kéo slide vào đây, hoặc bấm để chọn</p>
                  <p className="ant-upload-hint">.pdf hoặc .pptx · tối đa 50 MB</p>
                </Upload.Dragger>}
            <label className="vs-scout-field">
              <span className="vs-field-label">Tên bài giảng</span>
              <Input value={title} disabled={running || busy} maxLength={300} placeholder="Lấy từ tên file nếu để trống" onChange={(e) => setTitle(e.target.value)} />
            </label>
          </> : <label className="vs-scout-field">
            <span className="vs-field-label">Chủ đề cần dựng video</span>
            <Input.TextArea
              rows={3}
              value={input.topic}
              disabled={running || busy}
              maxLength={300}
              showCount
              placeholder="Ví dụ: Vì sao mô hình ngôn ngữ lại bịa ra thông tin, và người dùng làm gì để hạn chế"
              onChange={(e) => setInput({ ...input, topic: e.target.value })}
            />
          </label>}
          </div>

          <div className="vs-scout-input-run">
          {/* Nhãn phải ngắn đủ để không xuống dòng: một nhãn hai dòng cạnh một nhãn một dòng làm hai ô
              nhập lệch hàng nhau. Phần giải thích đã nằm ở dòng `small` bên dưới. */}
          <div className="field-grid">
            <label className="vs-scout-field">
              <span className="vs-field-label">Nguồn tối thiểu</span>
              <InputNumber min={1} max={5} value={input.minSources} disabled={running || busy} onChange={(v) => setInput({ ...input, minSources: v ?? 2 })} />
              <small>Mỗi ý lấy từ web phải có bấy nhiêu nguồn độc lập. Hai là mức để coi như có xác nhận chéo.</small>
            </label>
            <label className="vs-scout-field">
              <span className="vs-field-label">Số câu</span>
              <InputNumber min={5} max={80} value={input.cues} disabled={running || busy} onChange={(v) => setInput({ ...input, cues: v ?? 20 })} />
              <small>Ước lượng thôi — agent được phép viết ít hơn.</small>
            </label>
          </div>

          {error && <Alert className="feedback" type="error" showIcon closable title="Chưa chạy được" description={error} onClose={() => setError(null)} />}

          {running
            ? <Button danger block icon={<StopOutlined />} disabled={busy} onClick={() => void stop()}>Dừng lượt chạy</Button>
            : <Button type="primary" block icon={<PlayCircleFilled />} loading={busy} disabled={!ready} onClick={() => void start()}>
                {mode === "slide" ? "Bóc tách nội dung cần research" : run ? "Chạy lại" : "Chạy thử"}
              </Button>}
          </div>

          {/* Thẻ tự viết thay vì antd Tag: thẻ trung tính của antd không theo bảng màu tối, và cột thẻ
              phải rộng theo thẻ dài nhất — để cứng 96px thì "Bash · PowerShell" tràn đè lên phần chữ. */}
          <div className="vs-scout-tools">
            <h3>Agent được cầm những gì</h3>
            <ul>
              <li><span className="vs-scout-tool is-on">WebSearch</span><span>tìm kiếm — chỉ ở bước research của trang này; bước bóc tách slide và mọi stage dựng video đều chặn</span></li>
              <li><span className="vs-scout-tool is-on">WebFetch</span><span>tải nội dung một trang về</span></li>
              <li><span className="vs-scout-tool">Write · Read</span><span>chỉ ghi trong <code>scout/{run?.slug ?? "<tên>"}/</code></span></li>
              <li><span className="vs-scout-tool is-off">Bash · PowerShell</span><span>không cấp — lượt này không cần chạy lệnh nào</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="editor-panel vs-scout-flow-panel" aria-label="Workflow">
        <div className="panel-heading">
          <div><h2>{status === "review" ? "Nội dung sẽ research" : "Workflow"}</h2></div>
          <span className="quiet-label">{stageLabel && `${stageLabel} · `}{counts.searches} LƯỢT TÌM · {counts.fetches} TRANG ĐỌC · {counts.saves} FILE GHI</span>
        </div>
        <div className="vs-step-body">
          {!run && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa chạy lượt nào" />}

          {run && status === "review" && run.mode === "slide" && <ReviewPanel run={run} draft={draft} setDraft={setDraft} busy={busy} onConfirm={() => void confirm()} />}

          {showWorkflow && <>
            <ScoutWorkflow run={run} events={events} selected={node} onSelect={(id) => { setPicked(id); setAllLogs(false); }} />
            {running && <p className="vs-scout-running"><LoadingOutlined spin /> Đang chạy · bắt đầu {clock(run.startedAt)}</p>}
            {run.script && <p className="vs-scout-deliverable"><FileTextOutlined /><a href={fileUrl(run.script)} target="_blank" rel="noreferrer">{run.script}</a></p>}
            <section className="vs-scout-detail" aria-label="Chi tiết nút">
              <div className="vs-scout-detail-head">
                <h3>{allLogs ? "Toàn bộ nhật ký" : node ? nodeTitle(run, node) : ""}</h3>
                <Button type="link" size="small" onClick={() => setAllLogs(!allLogs)}>{allLogs ? "Xem theo nút" : "Toàn bộ nhật ký"}</Button>
              </div>
              {allLogs || !node ? <EventList events={events} empty="Chưa có hoạt động." /> : <NodeDetail run={run} events={events} node={node} />}
            </section>
            {!running && run.dossier && <Dossier run={run} />}
          </>}
        </div>
      </section>
    </div>
  </Shell>;
}
