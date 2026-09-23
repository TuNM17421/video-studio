"use client";

import { useState, type ReactNode } from "react";
import { ExportOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Tooltip } from "antd";
import { fileUrl } from "@/lib/client";
import { DIFFICULTY_LABEL, KIND_LABEL, type ResearchView } from "@/lib/research";
import {
  busyClaims, citingCues, claimOutcome, GLOSSARY, OUTCOME_LABEL, plainReason, REACHED, STANCE_WORD, verdictTitle, type Outcome, type ScriptCue,
} from "@/lib/research-ui";
import type { Act } from "./research-panels";

/**
 * Danh sách điều cần kiểm và phần "nguồn" của từng điều — một component cho cả bước Tra nguồn (đầy đủ, theo thứ
 * tự hoặc theo nhóm kết quả) lẫn cột nguồn cạnh kịch bản. Mỗi dòng mở tại chỗ, mỗi lúc một dòng.
 */

const host = (url: string) => {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
};
const dmy = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : iso;
};

/** Từ có giải thích (gạch chấm, focus được bằng bàn phím). */
export function Term({ children, help }: { children: string; help?: string }) {
  const title = help ?? GLOSSARY[children];
  if (!title) return <>{children}</>;
  return <Tooltip title={title}><span className="vs-rs-term" tabIndex={0}>{children}</span></Tooltip>;
}

export function ClaimBody({ view, cid, outcome, cues, onCue, act, running, compact = false }: {
  view: ResearchView;
  cid: string;
  outcome: Outcome;
  cues?: ScriptCue[];
  onCue?: (n: number) => void;
  act?: Act;
  running: boolean;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const claim = view.claims.find((c) => c.id === cid);
  const finding = view.findings[cid];
  const check = view.evidence[cid];
  if (!claim) return <p className="vs-scout-empty">Điều {cid} không còn trong danh sách.</p>;
  const verdict = finding?.verdict ?? check?.verdict ?? null;
  const evidence = Array.isArray(finding?.evidence) ? finding.evidence : [];
  const sourceOf = (ref: string) => {
    const sid = view.sources[ref] ? ref : Object.values(view.sources).find((s) => s.url === ref || s.finalUrl === ref)?.id;
    return sid ? view.sources[sid] : null;
  };
  // Trích dẫn gom theo nguồn: một dòng đầu cho mỗi trang, rồi các câu trích từ trang đó.
  const groups = new Map<string, { ref: string; quotes: typeof evidence }>();
  for (const e of evidence) {
    const key = sourceOf(e.source)?.id ?? e.source;
    groups.set(key, { ref: e.source, quotes: [...(groups.get(key)?.quotes ?? []), e] });
  }
  const citing = cues ? citingCues(cues, cid) : null;
  const q = check?.quotes;
  const bad = q ? q.total - q.verified - q.unverifiable : 0;
  const reused = finding?.reused ?? check?.reused;
  const answerLabel = verdict === "ok" ? "Nguồn xác nhận:" : verdict === "fix" || verdict === "wrong" ? "Theo nguồn:" : "Agent ghi:";
  const canRerun = !compact && act && !view.state.sample && REACHED[view.state.stage] >= REACHED.research;

  return <div className="vs-rs-claimbody">
    {!compact && <p className={`vs-rs-claimbody-title is-${outcome}`}>{verdictTitle(outcome, verdict)}</p>}
    <p>Slide ghi ({claim.slides.length ? `slide ${claim.slides.join(", ")}` : "cả bài"}): {claim.text}</p>
    {finding?.answer && <p>{answerLabel} {finding.answer}</p>}
    {finding?.reason && <p>Vì sao: {finding.reason}</p>}
    {check?.asOf && <p>Mốc của dữ kiện: tính đến {dmy(check.asOf)}.</p>}
    {citing && (citing.length
      ? <p>Dẫn ở câu {citing.map((n, i) => <span key={n}>{i ? ", " : ""}<button type="button" className="vs-rs-link" onClick={() => onCue?.(n)}>{n}</button></span>)}</p>
      : <p>Chưa câu nào dẫn điều này.</p>)}
    {groups.size > 0 && <div className="vs-rs-sources">
      <p className="vs-rs-sources-head">Nguồn</p>
      {[...groups.values()].map(({ ref, quotes }, i) => {
        const s = sourceOf(ref);
        const url = s?.finalUrl || s?.url || (/^https?:/.test(ref) ? ref : null);
        return <div key={`${ref}-${i}`} className="vs-rs-source">
          <p className="vs-rs-source-head">
            {url ? <a href={url} target="_blank" rel="noreferrer">{s?.title || host(url)} <ExportOutlined /></a> : <span>{ref}</span>}
            <small>{[s?.publisher || (url ? host(url) : null), s?.published ? dmy(s.published) : "không ghi ngày"].filter(Boolean).join(" · ")}</small>
          </p>
          {quotes.map((e, k) => <div key={k} className="vs-rs-quote">
            <q>{e.quote}</q>
            <small className={`is-${e.stance}`}>{STANCE_WORD[e.stance] ?? e.stance}</small>
          </div>)}
        </div>;
      })}
    </div>}
    {check && <p className="vs-rs-check">
      {reused
        ? `Dùng lại kết quả đã kiểm ngày ${dmy(reused.checkedAt)} — không tra lại.`
        : [
            q && q.total && q.verified === q.total ? `Studio đã mở trang gốc và thấy đủ ${q.verified}/${q.total} trích dẫn.` : null,
            bad > 0 ? `Studio chưa thấy ${bad}/${q!.total} trích dẫn trên trang gốc.` : null,
            q?.unverifiable ? `${q.unverifiable} trích dẫn không đối chiếu được (không tải được trang).` : null,
          ].filter(Boolean).join(" ")}
    </p>}
    {!finding && !check && <p className="vs-scout-empty">Chưa tra nguồn điều này.</p>}
    <details className="vs-rs-more">
      <summary>Chi tiết kiểm tra</summary>
      <div className="vs-rs-more-body">
        <p>Câu hỏi đã tra: {claim.question || "(dùng chính câu slide)"}</p>
        <p>Loại: {KIND_LABEL[claim.kind]} · Độ khó: {DIFFICULTY_LABEL[claim.difficulty]}{claim.timeSensitive ? " · hay đổi" : ""}</p>
        <p>Lần tra: {view.state.attempts[cid] ?? 0}/2</p>
        {(check?.warnings?.length ?? 0) > 0 && <><p>Cảnh báo:</p><ul>{check!.warnings.map((w, k) => <li key={k}>{plainReason(w)}</li>)}</ul></>}
        {(check?.problems?.length ?? 0) > 0 && <><p>Vấn đề:</p><ul>{check!.problems.map((p, k) => <li key={k}>{plainReason(p)}</li>)}</ul></>}
        {(check?.notes?.length ?? 0) > 0 && <p>{check!.notes!.join(" · ")}</p>}
        {groups.size > 0 && <p>Bản trang Studio đã tải: {[...groups.values()].map(({ ref }) => sourceOf(ref)).filter((s) => s?.ok).map((s, k) => <span key={s!.id}>{k ? " · " : ""}<a href={fileUrl(`research/${view.state.id}/sources/${s!.id}/page.txt`)} target="_blank" rel="noreferrer">{s!.id} <ExportOutlined /></a></span>)}</p>}
      </div>
    </details>
    {canRerun && <div>
      <Popconfirm
        title={`Tra lại ${cid}?`}
        description={view.script
          ? "Kết quả hiện tại của điều này bị xoá và agent tra lại từ đầu; kịch bản được viết lại theo kết quả mới (tốn thêm lần gọi agent)."
          : "Kết quả hiện tại của điều này bị xoá và agent tra lại từ đầu (tốn thêm lần gọi agent)."}
        okText="Tra lại"
        cancelText="Thôi"
        onConfirm={async () => {
          setBusy(true);
          await act!({ action: "rerun", step: "research", only: [cid] });
          setBusy(false);
        }}
      >
        <Tooltip title={running ? "Đang chạy — dừng trước đã." : undefined}>
          <Button size="small" icon={<RedoOutlined />} disabled={running || busy} loading={busy}>Tra lại điều này</Button>
        </Tooltip>
      </Popconfirm>
    </div>}
  </div>;
}

/** Một dòng: dấu kết quả, mã, câu (hai dòng), và bên phải là câu kịch bản dẫn nó hoặc kết quả. */
function ClaimRow({ id, text, outcome, suffix, open, onToggle, children }: {
  id: string;
  text: string;
  outcome: Outcome;
  suffix: ReactNode;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return <li id={`rs-claim-${id}`}>
    <button type="button" className="vs-rs-claimrow" aria-expanded={open} aria-controls={`rs-claim-${id}-body`} onClick={onToggle}>
      <span className={`vs-rs-claimrow-mark is-${outcome}`} aria-hidden="true" />
      <span className="vs-rs-claimrow-id">{id}</span>
      <span className="vs-rs-claimrow-text">{text}</span>
      <span className="vs-rs-claimrow-where">{suffix}</span>
    </button>
    {open && <div id={`rs-claim-${id}-body`}>{children}</div>}
  </li>;
}

const GROUPS: { outcome: Outcome; label: string; collapsed?: boolean }[] = [
  { outcome: "fixed", label: "Sửa theo nguồn" },
  { outcome: "thin", label: "Chưa đủ nguồn" },
  { outcome: "bad", label: "Chưa khớp trang gốc" },
  { outcome: "none", label: "Chưa có kết quả" },
  { outcome: "ok", label: "Khớp slide", collapsed: true },
];

export function ClaimList({ view, running, layout, mode, open, onOpen, cues, onCue, act }: {
  view: ResearchView;
  running: boolean;
  layout: "full" | "column";
  mode: "live" | "grouped";
  open: string | null;
  onOpen: (cid: string | null) => void;
  cues?: ScriptCue[];
  onCue?: (n: number) => void;
  act?: Act;
}) {
  const [showOk, setShowOk] = useState(false);
  const busy = busyClaims(view, running);
  if (!view.claims.length) return <p className="vs-scout-empty">Không có điều nào cần kiểm — kịch bản viết thẳng từ slide.</p>;
  const outcomeOf = (cid: string) => claimOutcome(view, cid, busy);
  const suffixOf = (cid: string, o: Outcome) => {
    if (layout === "column" && cues) {
      const n = citingCues(cues, cid);
      return n.length ? `câu ${n.join(", ")}` : "không câu nào dẫn";
    }
    if (o === "bad" && (view.state.attempts[cid] ?? 0) < 2 && REACHED[view.state.stage] < REACHED.gate2) return "chưa khớp trang gốc — sẽ tra lại";
    return OUTCOME_LABEL[o].toLowerCase();
  };
  const row = (cid: string) => {
    const c = view.claims.find((x) => x.id === cid)!;
    const o = outcomeOf(cid);
    return <ClaimRow key={cid} id={cid} text={c.text} outcome={o} suffix={suffixOf(cid, o)} open={open === cid} onToggle={() => onOpen(open === cid ? null : cid)}>
      <ClaimBody view={view} cid={cid} outcome={o} cues={cues} onCue={onCue} act={act} running={running} />
    </ClaimRow>;
  };

  if (mode === "live") return <ul className={`vs-rs-claims is-${layout}`}>{view.claims.map((c) => row(c.id))}</ul>;

  // Nhóm theo kết quả: chỗ kịch bản khác slide lên đầu (xếp theo câu đầu tiên dẫn nó), "khớp slide" gập lại.
  const firstCue = (cid: string) => (cues ? citingCues(cues, cid)[0] ?? Infinity : 0);
  const dropped = view.state.gates.gate2?.dropped ?? [];
  return <div className={`vs-rs-claimgroups is-${layout}`}>
    {GROUPS.map((g) => {
      const ids = view.claims.map((c) => c.id).filter((cid) => outcomeOf(cid) === g.outcome).sort((a, b) => firstCue(a) - firstCue(b));
      if (!ids.length) return null;
      const hidden = Boolean(g.collapsed && !showOk && !ids.includes(open ?? ""));
      return <section key={g.outcome}>
        <h3 className="vs-rs-group-head">
          {g.collapsed
            ? <button type="button" className="vs-rs-group-toggle" aria-expanded={!hidden} onClick={() => setShowOk(hidden)}>{hidden ? "▸" : "▾"} <Term>{g.label}</Term> · {ids.length}</button>
            : <><Term>{g.label}</Term> · {ids.length}</>}
        </h3>
        {!hidden && <ul className="vs-rs-claims">{ids.map(row)}</ul>}
      </section>;
    })}
    {dropped.length > 0 && <section>
      <h3 className="vs-rs-group-head">Đã bỏ · {dropped.length}</h3>
      <ul className="vs-rs-dropped">{dropped.map((d) => <li key={d.id}><span className="vs-rs-claimrow-id">{d.id}</span> {d.text} — bạn đã bỏ ở Bạn quyết</li>)}</ul>
    </section>}
  </div>;
}
