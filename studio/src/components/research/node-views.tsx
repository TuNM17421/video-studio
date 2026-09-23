"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { ExportOutlined, FundProjectionScreenOutlined, PlayCircleFilled, StopOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Switch, Tooltip } from "antd";
import { gate2Waiting, outlineSummary, placeEditIssues, type ResearchView } from "@/lib/research";
import {
  busyClaims, claimOutcome, claimRefs, fmtTime, GLOSSARY, isGate, parseScript, REACHED, researchProgress, slideRefs, STEP_HELP, STEP_NAME,
  stageStepName, stripAgentText, tally, type NodeId, type Outcome, type ScriptCue,
} from "@/lib/research-ui";
import type { JobInfo, LogEntry } from "@/lib/types";
import { ClaimList } from "./claim-list";
import { DecisionBar, type BarTone } from "./decision-bar";
import { Gate1Panel } from "./gate1-panel";
import { Gate2Panel, Gate3Actions, type Act } from "./research-panels";

/**
 * Vùng làm việc: một view cho bước đang chọn trên dải sơ đồ, và thanh quyết định luôn là con cuối của nó. Cổng 1 và
 * cổng 2 đang chờ thì panel của chúng luôn được dựng (chỉ ẩn khi xem bước khác), để lựa chọn chưa gửi không mất.
 */

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);
const minutesOf = (seconds: number) => Math.max(1, Math.round(seconds / 60));

/** Bề rộng thật của vùng làm việc (sidebar thu/mở làm nó đổi cả trăm px ở cùng một cỡ màn hình). */
export function useNarrow(ref: RefObject<HTMLElement | null>, px: number) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width <= px));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, px]);
  return narrow;
}

/** Năm dòng agent vừa nói — đủ biết nó đang làm gì; đầy đủ ở Chi tiết → Nhật ký. */
function LiveFeed({ logs, onLog }: { logs: LogEntry[]; onLog: () => void }) {
  const said = logs.filter((e) => e.kind === "agent").slice(-5);
  return <div className="vs-rs-feed">
    <p className="vs-rs-feed-head"><span>Agent vừa làm</span><button type="button" className="vs-rs-link" onClick={onLog}>Xem nhật ký ›</button></p>
    {said.length ? <ul>{said.map((e, i) => <li key={`${e.t}-${i}`}>{stripAgentText(e.text)}</li>)}</ul> : <p className="vs-scout-empty">Agent chưa nói gì.</p>}
  </div>;
}

function PendingView({ node }: { node: NodeId }) {
  return <p className="vs-rs-pending">{STEP_HELP[node]}</p>;
}

function SlideView({ view, onClaim }: { view: ResearchView; onClaim: (cid: string) => void }) {
  const { state } = view;
  const outline = view.outline ?? [];
  const firstEntry = new Map<number, number>();
  outline.forEach((o, i) => { if (!firstEntry.has(o.slide)) firstEntry.set(o.slide, i); });
  return <div className="vs-rs-slide">
    {state.deck.format === "pptx" && (state.deck.emptySlides?.length ?? 0) > 0 && <p className="vs-rs-note">
      Slide chỉ có hình, agent không đọc được: {state.deck.emptySlides!.join(", ")}. Cần nội dung của chúng thì xuất PDF có chữ rồi tạo lượt mới.
    </p>}
    {state.deck.format === "pdf" && (state.deck.thinSlides?.length ?? 0) > 0 && <p className="vs-rs-note">
      Trang ít chữ (có thể chỉ có hình): {state.deck.thinSlides!.join(", ")} — agent mở đúng trang đó trong PDF khi cần.
    </p>}
    {outline.length
      ? <ol className="vs-rs-outline">{outline.map((o, i) => {
          const ids = firstEntry.get(o.slide) === i ? view.claims.filter((c) => c.slides.includes(o.slide)).map((c) => c.id) : [];
          return <li key={`${o.slide}-${i}`} value={o.slide}>
            {o.heading || `Slide ${o.slide}`}{o.skip ? " · không đọc" : ""}
            {ids.map((id) => <button key={id} type="button" className="vs-rs-idlink" onClick={() => onClaim(id)}>{id}</button>)}
          </li>;
        })}</ol>
      : <p className="vs-scout-empty">Chưa có dàn ý.</p>}
  </div>;
}

/** Câu nào có vạch cam: dẫn một điều mà kịch bản nói khác slide. */
function fixedCues(view: ResearchView, cues: ScriptCue[]) {
  return cues.filter((c) => claimRefs(c).some((cid) => claimOutcome(view, cid) === "fixed")).map((c) => c.n);
}

/**
 * Kịch bản đọc như tài liệu, cột nguồn dính bên phải. Số câu (ở cổng 3) thêm "Câu n: " vào bản nháp góp ý; mã ở cuối
 * câu mở nguồn ở cột bên phải mà không kéo cả trang.
 */
function ScriptWork({ view, running, feedback, onFeedbackCue, claim, setClaim, follow, bumpFollow, notes, narrow, act, onSheet }: {
  view: ResearchView;
  running: boolean;
  feedback: boolean;
  onFeedbackCue: (n: number) => void;
  claim: string | null;
  setClaim: (cid: string | null) => void;
  follow: number;
  bumpFollow: () => void;
  notes: boolean;
  narrow: boolean;
  act: Act;
  onSheet: (cid: string | null) => void;
}) {
  const cues = useMemo(() => parseScript(view.script ?? ""), [view.script]);
  const aside = useRef<HTMLElement>(null);
  const doc = useRef<HTMLDivElement>(null);
  const busy = busyClaims(view, running);
  const issues = view.scriptCheck?.issues ?? [];
  const placed = useMemo(() => placeEditIssues(cues.map((c) => ({ n: c.n, text: c.fields["lời"] ?? "" })), view.edit?.issues ?? []), [cues, view.edit]);
  // Chọn một điều từ cột nguồn: cuộn tới câu đầu tiên dẫn nó (chọn từ chính kịch bản thì không cuộn trang).
  useEffect(() => {
    if (follow) doc.current?.querySelector(".vs-rs-sent.is-linked")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [follow]);
  const toCue = (n: number) => document.getElementById(`rs-sent-${n}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  const openFromPill = (cid: string) => {
    if (narrow) return onSheet(cid);
    setClaim(cid);
    // Cuộn cột nguồn tới dòng vừa mở — không bao giờ cuộn cả trang.
    requestAnimationFrame(() => {
      const box = aside.current;
      const row = document.getElementById(`rs-claim-${cid}`);
      if (box && row) box.scrollTo({ top: box.scrollTop + row.getBoundingClientRect().top - box.getBoundingClientRect().top, behavior: "smooth" });
    });
  };
  const missing = view.scriptCheck?.coverage.missing ?? [];

  return <div className="vs-rs-grid">
    <div ref={doc} className="vs-rs-main vs-rs-script">
      {(view.state.feedback?.length ?? 0) > 0 && <details className="vs-rs-history">
        <summary>Bản này đã sửa theo góp ý của bạn lúc {fmtTime(view.state.feedback!.at(-1)!.at)}</summary>
        <ul>{view.state.feedback!.map((f, i) => <li key={i}><small>{fmtTime(f.at)}</small> {f.text}</li>)}</ul>
      </details>}
      {running && (view.state.stage === "review" || view.state.stage === "revise") && <p className="vs-rs-note">Bản dưới đây còn có thể đổi khi agent sửa xong.</p>}
      {cues.map((c, i) => {
        const head = i === 0 || cues[i - 1].section !== c.section ? c.section : null;
        const ids = claimRefs(c);
        const outcomes = ids.map((cid) => [cid, claimOutcome(view, cid, busy)] as [string, Outcome]);
        const mine = issues.filter((i) => i.cue === c.n);
        const edits = placed.byCue.get(c.n) ?? [];
        const cls = `vs-rs-sent${outcomes.some(([, o]) => o === "fixed") ? " is-fixed" : ""}${claim && ids.includes(claim) ? " is-linked" : ""}`;
        return <div key={c.n}>
          {head && <h3>{head}</h3>}
          <div id={`rs-sent-${c.n}`} className={cls}>
            {feedback
              ? <Tooltip title={`Góp ý câu ${c.n}`}><button type="button" tabIndex={-1} className="vs-rs-sent-n" onClick={() => onFeedbackCue(c.n)}>{c.n}</button></Tooltip>
              : <span className="vs-rs-sent-n">{c.n}</span>}
            <div>
              <p className="vs-rs-sent-line">
                {c.fields["lời"] ?? <em>thiếu lời</em>}
                {outcomes.map(([cid, o]) => <Tooltip key={cid} title={`${cid} · ${OUTCOME_WORD[o]} — bấm để xem nguồn`}>
                  <button type="button" className={`vs-rs-cite is-${o}${claim === cid ? " is-active" : ""}`} aria-label={`Nguồn của câu này: ${cid}, ${OUTCOME_WORD[o]}`} onClick={() => openFromPill(cid)}>{cid}</button>
                </Tooltip>)}
              </p>
              {c.fields["trên màn hình"] && <p className="vs-rs-sent-screen"><FundProjectionScreenOutlined aria-hidden="true" /><span className="sr-only">Trên màn hình: </span><span>{c.fields["trên màn hình"]}</span></p>}
              {notes && <p className="vs-rs-sent-notes">{[c.fields["kiểu"], slideRefs(c).length ? `slide ${slideRefs(c).join(", ")}` : null].filter(Boolean).join(" · ") || "—"}</p>}
              {notes && mine.filter((i) => i.level === "warning").map((i, k) => <p key={`w${k}`} className="vs-rs-sent-issue is-warning">{i.message}</p>)}
              {notes && edits.map((i, k) => <p key={`e${k}`} className="vs-rs-sent-issue is-warning">Biên tập: {i.problem} → {i.fix}</p>)}
              {mine.filter((i) => i.level === "problem").map((i, k) => <p key={`p${k}`} className="vs-rs-sent-issue is-problem">{i.message}</p>)}
            </div>
          </div>
        </div>;
      })}
      {missing.length > 0 && <p className="vs-rs-note vs-rs-coverage">
        {missing.length <= 12
          ? `${missing.length} slide chưa có câu nào dựa vào: ${missing.join(", ")} — nếu có ý quan trọng của giảng viên ở đó, hãy góp ý để agent thêm.`
          : `${missing.length} slide chưa có câu nào dựa vào — bình thường khi bài có nhiều slide hơn số câu; danh sách ở Chi tiết → Kiểm tra kịch bản.`}
      </p>}
    </div>
    {!narrow && <aside ref={aside} className="vs-rs-aside is-sheet" aria-label="Nguồn đã kiểm">
      <ClaimList view={view} running={running} layout="column" mode="grouped" open={claim} onOpen={(cid) => { setClaim(cid); if (cid) bumpFollow(); }} cues={cues} onCue={toCue} act={act} />
    </aside>}
  </div>;
}

const OUTCOME_WORD: Record<Outcome, string> = {
  wait: "chờ tra", busy: "đang tra", ok: "khớp slide", fixed: "sửa theo nguồn", thin: "chưa đủ nguồn", bad: "chưa khớp trang gốc", none: "chưa có kết quả",
};

interface Bar { tone: BarTone; lead: string; text: ReactNode; short?: ReactNode; clockFrom?: number | null; detail?: ReactNode; actions?: ReactNode }

export function WorkArea({
  view, logs, job, node, onNode, act, actError, onActError, openLog, claim, setClaim, follow, bumpFollow, notes, setNotes, draft, setDraft,
  feedbackOpen, setFeedbackOpen,
}: {
  view: ResearchView;
  logs: LogEntry[];
  job: JobInfo | null;
  node: NodeId;
  onNode: (n: NodeId) => void;
  act: Act;
  actError: string | null;
  onActError: () => void;
  openLog: () => void;
  claim: string | null;
  setClaim: (cid: string | null) => void;
  follow: number;
  bumpFollow: () => void;
  notes: boolean;
  setNotes: (on: boolean) => void;
  draft: string;
  setDraft: (s: string) => void;
  feedbackOpen: boolean;
  setFeedbackOpen: (o: boolean) => void;
}) {
  const { state } = view;
  const work = useRef<HTMLElement>(null);
  const narrow = useNarrow(work, 900);
  const [sheet, setSheet] = useState<{ open: boolean; cid: string | null }>({ open: false, cid: null });
  const [busy, setBusy] = useState(false);
  const running = job?.status === "running";
  const sample = Boolean(state.sample);
  const waitingAt = (stage: "gate1" | "gate2" | "gate3") => state.stage === stage && state.status === "waiting" && !sample;
  const g1 = waitingAt("gate1");
  const g2 = waitingAt("gate2");
  const g3 = waitingAt("gate3");
  const cues = useMemo(() => parseScript(view.script ?? ""), [view.script]);
  const stats = view.scriptCheck?.stats;
  const t = tally(view);
  const p = researchProgress(view);
  const reached = REACHED[state.stage];
  const openClaim = (cid: string) => { setClaim(cid); onNode("research"); };
  const run = (body: Record<string, unknown>) => { setBusy(true); void act(body).finally(() => setBusy(false)); };

  // ── tiêu đề của view ──
  let h2: string = STEP_NAME[node];
  let meta: ReactNode = null;
  let tools: ReactNode = null;
  let body: ReactNode = null;
  const pending = (n: NodeId) => { h2 = STEP_NAME[n]; meta = "chưa tới bước này"; body = <PendingView node={n} />; };
  const scriptTools = <>
    {narrow && <Button size="small" onClick={() => setSheet({ open: true, cid: null })}>Nguồn · {t.fixed + t.thin + t.bad} cần xem</Button>}
    <span className="vs-rs-switchline">
      <Switch size="small" checked={notes} onChange={setNotes} aria-label="Ghi chú dựng video" />
      <Tooltip title={GLOSSARY["Ghi chú dựng video"]}><span className="vs-rs-term" tabIndex={0}>Ghi chú dựng video</span></Tooltip>
    </span>
  </>;
  const script = (feedback: boolean) => <ScriptWork view={view} running={running} feedback={feedback} claim={claim} setClaim={setClaim} follow={follow} bumpFollow={bumpFollow}
    notes={notes} narrow={narrow} act={act} onSheet={(cid) => setSheet({ open: true, cid })}
    onFeedbackCue={(n) => { setDraft(`${draft.trim() ? `${draft.trimEnd()}\n` : ""}Câu ${n}: `); setFeedbackOpen(true); }} />;

  if (node === "slide") {
    meta = `${state.deck.name} · ${state.deck.format.toUpperCase()} · ${size(state.deck.bytes)}${view.outline?.length ? ` · ${outlineSummary(view.outline)}` : ""}`;
    body = state.stage === "extract" && (running || state.status === "running")
      ? <><p className="vs-rs-lead">Agent đang đọc slide và chọn những điều nên kiểm — danh sách sẽ hiện ở bước Bạn duyệt.</p><LiveFeed logs={logs} onLog={openLog} /></>
      : <SlideView view={view} onClaim={openClaim} />;
  } else if (node === "gate1") {
    if (g1) {
      h2 = "Duyệt điều cần kiểm";
      const slides = new Set(view.claims.flatMap((c) => c.slides)).size;
      meta = view.claims.length ? `Agent chọn ${view.claims.length} điều từ ${slides} slide — mặc định tra hết. Bỏ qua điều không cần kiểm; Sửa khi agent chép sai.` : null;
    } else if (reached < REACHED.gate1) pending("gate1");
    else {
      h2 = "Bạn duyệt";
      meta = state.gates.gate1 ? `Đã duyệt ${state.gates.gate1.claims} điều cần kiểm lúc ${fmtTime(state.gates.gate1.at)}` : null;
      body = <ClaimList view={view} running={running} layout="full" mode={reached >= REACHED.gate2 ? "grouped" : "live"} open={claim} onOpen={setClaim} act={act} />;
    }
  } else if (node === "research") {
    if (reached < REACHED.research) pending("research");
    else {
      const busyIds = [...busyClaims(view, running)];
      meta = running && state.stage === "research"
        ? (busyIds.length ? `Đang tra ${busyIds.join(", ")}` : `${p.done}/${p.total} điều có kết quả`)
        : view.claims.length
          ? `${t.ok} khớp slide · ${t.fixed} sửa theo nguồn · ${t.thin} chưa đủ nguồn${t.bad ? ` · ${t.bad} chưa khớp trang gốc` : ""}`
          : "không có điều nào cần kiểm — kịch bản viết thẳng từ slide";
      body = <ClaimList view={view} running={running} layout="full" mode={reached >= REACHED.gate2 ? "grouped" : "live"} open={claim} onOpen={setClaim} act={act} />;
    }
  } else if (node === "gate2") {
    if (g2) {
      h2 = "Chọn cách xử lý";
      const w = gate2Waiting(view.claims, view.evidence, state.gates.gate2?.decisions).length;
      meta = `${w} điều cần bạn quyết · ${view.claims.length - w} điều khác đã đủ căn cứ`;
    } else if (reached < REACHED.write) pending("gate2");
    else {
      h2 = "Bạn quyết";
      const g = state.gates.gate2;
      const decisions = Object.values(g?.decisions ?? {});
      meta = g?.auto
        ? `Tự qua lúc ${fmtTime(g.at)} — mọi điều đều đủ căn cứ`
        : g ? `Đã quyết lúc ${fmtTime(g.at)}: giữ ${decisions.filter((d) => d === "accept").length} · bỏ ${g.dropped?.length ?? decisions.filter((d) => d === "drop").length}` : null;
      body = <ClaimList view={view} running={running} layout="full" mode="grouped" open={claim} onOpen={setClaim} act={act} />;
    }
  } else if (node === "script" || node === "gate3" || node === "video") {
    if (node === "video" && state.stage !== "done") pending("video");
    else if (node === "gate3" && reached < REACHED.gate3) pending("gate3");
    else if (node === "script" && reached < REACHED.write) pending("script");
    else if (!view.script) {
      h2 = "Viết kịch bản";
      meta = `theo mẫu kịch bản cơ bản · khoảng ${state.options.cues} câu`;
      body = <>
        <p className="vs-rs-lead">{running ? "Kịch bản sẽ hiện ở đây khi agent viết xong." : "Chưa có kịch bản — chạy tiếp để agent viết."}</p>
        {running && <LiveFeed logs={logs} onLog={openLog} />}
      </>;
    } else if (state.stage === "done") {
      h2 = "Kịch bản đã duyệt";
      meta = `${state.gates.gate3 ? `duyệt lúc ${fmtTime(state.gates.gate3.at)} · ` : ""}${stats ? `${stats.cues} câu · khoảng ${minutesOf(stats.seconds)} phút đọc` : ""}`;
      tools = scriptTools;
      body = script(false);
    } else if (g3) {
      h2 = "Duyệt kịch bản";
      const cited = new Set(cues.flatMap(claimRefs)).size;
      meta = stats ? `${stats.cues} câu · khoảng ${minutesOf(stats.seconds)} phút đọc · dẫn ${cited} điều đã kiểm` : null;
      tools = scriptTools;
      body = script(true);
    } else {
      h2 = "Viết kịch bản";
      meta = running && state.stage === "review" ? "Một agent khác đang đọc lại và biên tập"
        : running && state.stage === "revise" ? "Agent đang sửa theo góp ý của bạn"
          : stats ? `${stats.cues} câu · khoảng ${minutesOf(stats.seconds)} phút đọc` : null;
      tools = scriptTools;
      body = script(false);
    }
  }

  // ── thanh quyết định của trang ──
  const bar = ((): Bar | null => {
    if ((g1 && node === "gate1") || (g2 && node === "gate2")) return null; // panel cổng tự vẽ thanh
    if (sample) return { tone: "idle", lead: "Lượt mẫu", text: "Chỉ xem — bấm từng bước trên sơ đồ để xem kết quả của nó." };
    if (running) {
      const text = state.stage === "extract" ? "Agent đang đọc slide và chọn điều cần kiểm"
        : state.stage === "research" ? `Agent đang tra nguồn · ${p.done}/${p.total} điều có kết quả`
          : state.stage === "review" ? "Một agent khác đang đọc lại và biên tập kịch bản"
            : state.stage === "revise" ? "Agent đang sửa kịch bản theo góp ý của bạn"
              : "Agent đang viết kịch bản";
      const said = [...logs].reverse().find((e) => e.kind === "agent")?.text;
      const here = isGate(node) ? false : node === (state.stage === "extract" ? "slide" : state.stage === "research" ? "research" : "script");
      return {
        tone: "running", lead: "Đang chạy", text, clockFrom: job?.startedAt ?? null,
        detail: here ? undefined : said ? stripAgentText(said) : "Bạn có thể rời trang — Studio chạy tiếp và dừng lại khi cần bạn.",
        actions: <Button danger icon={<StopOutlined />} loading={busy} onClick={() => run({ action: "stop" })}>Dừng</Button>,
      };
    }
    if (state.status === "running") return { tone: "running", lead: "Đang chạy", text: "Đang chuyển sang bước tiếp theo…" };
    if (g1) return {
      tone: "waiting", lead: "Tới lượt bạn", text: `Danh sách ${view.claims.length} điều cần kiểm đang chờ bạn duyệt.`,
      actions: <Button type="primary" onClick={() => onNode("gate1")}>Mở danh sách</Button>,
    };
    if (g2) {
      const w = gate2Waiting(view.claims, view.evidence, state.gates.gate2?.decisions).length;
      return { tone: "waiting", lead: "Tới lượt bạn", text: `${w} điều cần bạn chọn cách xử lý.`, actions: <Button type="primary" onClick={() => onNode("gate2")}>Mở để chọn</Button> };
    }
    if (g3) {
      const x = fixedCues(view, cues).length;
      return {
        tone: "waiting", lead: "Tới lượt bạn",
        text: x ? `Đọc kịch bản — ${x} câu có vạch cam đã sửa theo nguồn — rồi duyệt hoặc góp ý.` : "Đọc kịch bản rồi duyệt hoặc góp ý — mọi điều đã kiểm đều khớp slide.",
        short: "Đọc rồi duyệt kịch bản.",
        actions: <Gate3Actions act={act} draft={draft} setDraft={setDraft} open={feedbackOpen} setOpen={setFeedbackOpen} />,
      };
    }
    if (state.stage === "done") return {
      tone: "done", lead: "Xong", text: "Tạo video để chọn style, ngày và mã video — kịch bản này được điền sẵn.",
      actions: <Link href={`/?fromResearch=${state.id}`}><Button type="primary" icon={<ExportOutlined />}>Tạo video từ kịch bản này</Button></Link>,
    };
    const stopped = state.error === "Đã dừng." || state.status === "idle";
    const where = stageStepName(state.stage);
    const resume = <Button type="primary" icon={<PlayCircleFilled />} loading={busy} onClick={() => run({ action: "resume" })}>Chạy tiếp</Button>;
    if (stopped) return { tone: "idle", lead: "Đã dừng", text: `Lượt dừng ở bước ${where} — chạy tiếp để làm nốt từ chỗ đó.`, actions: resume };
    const first = String(state.error ?? "").split("\n")[0];
    return {
      tone: "error", lead: "Lỗi", text: `Lượt dừng ở bước ${where}: ${first.length > 140 ? `${first.slice(0, 139)}…` : first}`,
      actions: <><Button onClick={openLog}>Xem nhật ký</Button>{resume}</>,
    };
  })();

  return <section ref={work} id="rs-work" className="vs-rs-work" aria-labelledby="rs-work-title">
    <div className="vs-rs-work-head">
      <h2 id="rs-work-title">{h2}</h2>
      {meta && <p className="vs-rs-work-meta">{meta}</p>}
      {tools && <div className="vs-rs-work-tools">{tools}</div>}
    </div>
    {actError && <Alert className="vs-rs-alert" type="error" showIcon closable title="Chưa làm được" description={actError} onClose={onActError} />}
    {g1 && <div hidden={node !== "gate1"}><Gate1Panel key={state.id} view={view} act={act} error={actError} /></div>}
    {g2 && <div hidden={node !== "gate2"}><Gate2Panel key={state.id} view={view} act={act} running={running} /></div>}
    {!((g1 && node === "gate1") || (g2 && node === "gate2")) && <div className="vs-rs-body">{body}</div>}
    {bar && <DecisionBar {...bar} />}
    <Drawer
      open={sheet.open}
      onClose={() => setSheet({ open: false, cid: null })}
      placement="bottom"
      size="var(--vu-research-sheet-height)"
      title="Nguồn đã kiểm"
      rootClassName="vs-rs-sheet"
    >
      <ClaimList view={view} running={running} layout="column" mode="grouped" open={sheet.cid} onOpen={(cid) => setSheet({ open: true, cid })} cues={cues}
        onCue={(n) => { setSheet({ open: false, cid: null }); document.getElementById(`rs-sent-${n}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }} act={act} />
    </Drawer>
  </section>;
}

