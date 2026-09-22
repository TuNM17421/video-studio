"use client";

import { useState } from "react";
import { CheckCircleFilled, ExportOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Input, Popover, Segmented } from "antd";
import { gate2Waiting, type Gate2Decision, type ResearchView } from "@/lib/research";
import { bestQuote, claimOutcome, plainReason } from "@/lib/research-ui";
import { ClaimBody, ClaimList } from "./claim-list";
import { DecisionBar } from "./decision-bar";

/** Gửi một thao tác lên máy chủ. Trả về có làm được không; lỗi đã được trang hiện ra, người gọi không cần bắt. */
export type Act = (body: Record<string, unknown>) => Promise<boolean>;

const host = (url: string) => {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
};

// ── cổng 2 ────────────────────────────────────────────────────────────────────────

const CONSEQUENCE = {
  keep: "Kịch bản dùng kết luận ở trên.",
  thin: "Kịch bản nhắc ý này nhưng không khẳng định con số hay dữ kiện.",
  retry: "Agent tìm nguồn khác thêm một lần (vài phút), rồi Studio đối chiếu lại.",
  drop: "Kịch bản không nhắc tới ý này.",
};

/**
 * Cổng 2: mỗi điều cần quyết một khối — lý do bằng lời người đọc, kết luận, trích dẫn tiêu biểu, rồi lựa chọn kèm hệ
 * quả của nó. Mặc định "giữ kết quả" cho mọi điều (cùng mặc định với máy chủ). Thanh quyết định là của chính cổng:
 * lựa chọn chưa gửi nằm trong component này, nên nó được giữ nguyên khi người dùng xem bước khác.
 */
export function Gate2Panel({ view, act, running }: { view: ResearchView; act: Act; running: boolean }) {
  // Cùng danh sách máy chủ dừng ở cổng 2 — kể cả điều qua soát mà agent báo không đủ nguồn hay có cảnh báo nặng.
  const waiting = gate2Waiting(view.claims, view.evidence, view.state.gates.gate2?.decisions);
  const [decisions, setDecisions] = useState<Record<string, Gate2Decision>>(() => Object.fromEntries(waiting.map((w) => [w.claim.id, "accept" as Gate2Decision])));
  const [busy, setBusy] = useState(false);
  const count = (d: Gate2Decision) => waiting.filter((w) => (decisions[w.claim.id] ?? "accept") === d).length;
  const retry = count("retry");
  const ids = new Set(waiting.map((w) => w.claim.id));
  const others = view.claims.filter((c) => !ids.has(c.id));
  const sourceOf = (ref: string) => {
    const sid = view.sources[ref] ? ref : Object.values(view.sources).find((s) => s.url === ref || s.finalUrl === ref)?.id;
    return sid ? view.sources[sid] : null;
  };

  return <div className="vs-rs-g2-wrap">
    <div className="vs-rs-g2">
      {waiting.map(({ claim: c, why }) => {
        const ev = view.evidence[c.id];
        const f = view.findings[c.id];
        const extra = [...(ev?.warnings ?? []), ...(ev && !ev.ok ? ev.problems : [])];
        const reasons = [...new Set([why, ...extra].map(plainReason))].slice(0, 2);
        const thin = !ev?.ok || ev.verdict === "insufficient";
        const choice = decisions[c.id] ?? "accept";
        const quote = bestQuote(f);
        const src = quote ? sourceOf(quote.source) : null;
        const url = src?.finalUrl || src?.url || (quote && /^https?:/.test(quote.source) ? quote.source : null);
        return <div key={c.id} className="vs-rs-g2-item">
          <p className="vs-rs-g2-head">
            <span className="vs-rs-claimrow-id">{c.id}</span>
            <strong>{c.text}</strong>
            <small>{c.slides.length ? `slide ${c.slides.join(", ")}` : "cả bài"}</small>
          </p>
          <p className="vs-rs-g2-why">{reasons.join(" ")}</p>
          <p className="vs-rs-g2-answer">Kết luận: {f?.answer || "chưa có."}</p>
          {quote && <p className="vs-rs-g2-quote">
            “{quote.quote}” — {src?.publisher || (url ? host(url) : quote.source)}{url && <> <a href={url} target="_blank" rel="noreferrer" aria-label="Mở trang nguồn"><ExportOutlined /></a></>}
          </p>}
          <div className="vs-rs-g2-choice">
            <Segmented
              value={choice}
              onChange={(v) => setDecisions({ ...decisions, [c.id]: v as Gate2Decision })}
              aria-label={`Cách xử lý ${c.id}`}
              options={[
                { value: "accept", label: thin ? "Ghi nhận chưa đủ nguồn" : "Giữ kết quả" },
                { value: "retry", label: "Tra lại" },
                { value: "drop", label: "Bỏ khỏi kịch bản" },
              ]}
            />
            <span className="vs-rs-g2-consequence">{choice === "accept" ? (thin ? CONSEQUENCE.thin : CONSEQUENCE.keep) : CONSEQUENCE[choice]}</span>
          </div>
          <details className="vs-rs-more">
            <summary>Xem đủ nguồn</summary>
            <ClaimBody view={view} cid={c.id} outcome={claimOutcome(view, c.id)} running={running} compact />
          </details>
        </div>;
      })}
      {others.length > 0 && <details className="vs-rs-more vs-rs-g2-others">
        <summary>{others.length} điều đã đủ căn cứ</summary>
        <ClaimList view={{ ...view, claims: others }} running={running} layout="full" mode="grouped" open={null} onOpen={() => {}} />
      </details>}
    </div>
    <DecisionBar
      tone="waiting"
      lead="Tới lượt bạn"
      text={`Đã chọn: giữ ${count("accept")} · tra lại ${retry} · bỏ ${count("drop")}`}
      actions={<Button type="primary" loading={busy} onClick={async () => {
        setBusy(true);
        await act({ action: "gate2", decisions });
        setBusy(false);
      }}>{retry ? `Tra lại ${retry} điều rồi viết` : "Tiếp tục viết kịch bản"}</Button>}
    />
  </div>;
}

// ── cổng 3 ────────────────────────────────────────────────────────────────────────

/**
 * Góp ý và Duyệt ở thanh quyết định. Bản nháp góp ý do trang giữ: bấm số câu trong kịch bản thêm "Câu n: " vào
 * đúng bản nháp này, rồi mở hộp góp ý.
 */
export function Gate3Actions({ act, draft, setDraft, open, setOpen }: {
  act: Act;
  draft: string;
  setDraft: (s: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    if (await act(body)) {
      setDraft("");
      setOpen(false);
    }
    setBusy(false);
  };
  return <>
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="topRight"
      title="Góp ý cho kịch bản"
      content={<div className="vs-rs-feedback">
        <Input.TextArea value={draft} onChange={(e) => setDraft(e.target.value)} autoSize={{ minRows: 3, maxRows: 8 }} maxLength={4000} placeholder="Ví dụ: câu 3 dài quá; phần hai cần thêm ví dụ từ slide 5" aria-label="Góp ý" autoFocus />
        <p className="vs-rs-note">Agent sửa kịch bản theo góp ý rồi đưa lại cho bạn duyệt. Nguồn và kết quả tra nguồn giữ nguyên.</p>
        <Button type="primary" block icon={<SendOutlined />} disabled={!draft.trim()} loading={busy} onClick={() => void run({ action: "feedback", feedback: draft })}>Gửi góp ý · sửa lại</Button>
      </div>}
    >
      <Button icon={<SendOutlined />} disabled={busy}>Góp ý…</Button>
    </Popover>
    <Button type="primary" icon={<CheckCircleFilled />} loading={busy} onClick={() => void run({ action: "approve-script" })}>Duyệt kịch bản</Button>
  </>;
}
