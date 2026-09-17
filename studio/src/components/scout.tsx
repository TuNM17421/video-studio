"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircleFilled, ExportOutlined, FileTextOutlined, GlobalOutlined, LoadingOutlined,
  PlayCircleFilled, ReadOutlined, RobotOutlined, SaveOutlined, SearchOutlined, StopOutlined, WarningFilled,
} from "@ant-design/icons";
import { Alert, Button, Empty, Input, InputNumber, Tag } from "antd";
import { api, fileUrl } from "@/lib/client";
import { countEvents, TRUST_LABEL, type ScoutEvent, type ScoutInput, type ScoutRun, type ScoutStatus } from "@/lib/scout";
import { Shell } from "./shell";

const clock = (t: number) => new Date(t).toLocaleTimeString("vi-VN", { hour12: false });

/** Tên miền là thứ người duyệt nhìn để biết nguồn có độc lập với nhau không — URL đầy đủ thì quá dài. */
function host(url: string) {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}

const EVENT_ICON = {
  start: <PlayCircleFilled />,
  say: <RobotOutlined />,
  search: <SearchOutlined />,
  fetch: <GlobalOutlined />,
  save: <SaveOutlined />,
  tool: <ReadOutlined />,
  error: <WarningFilled />,
  done: <CheckCircleFilled />,
} as const;

/** Một dòng của flow. WebSearch và WebFetch được dựng khác hẳn các công cụ còn lại — chúng là thứ trang
 *  này sinh ra để cho xem, phần còn lại chỉ là bối cảnh. */
function FlowRow({ event }: { event: ScoutEvent }) {
  const body = event.kind === "search"
    ? <><span className="vs-scout-verb">Tìm trên web</span><q className="vs-scout-query">{event.query}</q></>
    : event.kind === "fetch"
      ? <><span className="vs-scout-verb">Đọc trang</span><a className="mono" href={event.url} target="_blank" rel="noreferrer">{host(event.url)}<ExportOutlined /></a>{event.ask && <small>{event.ask}</small>}</>
      : event.kind === "save"
        ? <><span className="vs-scout-verb">Ghi xuống đĩa</span><code>{event.file}</code></>
        : event.kind === "say"
          ? <p className="vs-scout-say">{event.text}</p>
          : event.kind === "error"
            ? <p className="vs-scout-error">{event.text}</p>
            : event.kind === "done"
              ? <><span className="vs-scout-verb">{event.ok ? "Xong" : "Dừng"}</span>{event.summary && <p className="vs-scout-say">{event.summary}</p>}</>
              : event.kind === "start"
                ? <><span className="vs-scout-verb">Bắt đầu</span><code>{event.dir}</code></>
                : <><span className="vs-scout-verb">{event.name}</span>{event.detail && <small>{event.detail}</small>}</>;

  return <li className={`vs-scout-row is-${event.kind}`}>
    <span className="vs-scout-icon" aria-hidden="true">{EVENT_ICON[event.kind]}</span>
    <span className="vs-scout-time mono">{clock(event.t)}</span>
    <span className="vs-scout-body">{body}</span>
  </li>;
}

/** Hồ sơ nguồn sau khi lượt chạy xong: ai nói, khi nào, tin được tới đâu, và trích đoạn nào đã soát. */
function Dossier({ run }: { run: ScoutRun }) {
  const sources = run.dossier?.sources ?? [];
  if (!sources.length) return null;
  const failed = new Set((run.check?.quotes.problems ?? []).map((p) => p.source));
  return <section className="vs-scout-sources" aria-labelledby="scout-sources-title">
    <h3 id="scout-sources-title">Hồ sơ nguồn · {sources.length}</h3>
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
function Check({ run }: { run: ScoutRun }) {
  const check = run.check;
  if (!check) return null;
  const weak = check.cues.filter((c) => c.level !== "ok");
  return <section className={`vs-scout-check ${check.ok ? "is-ok" : "is-warn"}`} aria-labelledby="scout-check-title">
    <h3 id="scout-check-title">Soát trích dẫn</h3>
    <p className="vs-scout-check-line">
      {check.quotes.ok}/{check.quotes.total} trích đoạn khớp trang đã tải ·{" "}
      {check.sources.fetched}/{check.sources.total} nguồn có bản lưu ·{" "}
      {check.cues.length ? `${check.cues.filter((c) => c.level === "ok").length}/${check.cues.length} câu đủ ${check.minSources} nguồn` : "kịch bản chưa viết"}
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

export default function Scout() {
  const [input, setInput] = useState<ScoutInput>({ topic: "", minSources: 2, cues: 20 });
  const [run, setRun] = useState<ScoutRun | null>(null);
  const [events, setEvents] = useState<ScoutEvent[]>([]);
  const [status, setStatus] = useState<ScoutStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flow = useRef<HTMLOListElement>(null);

  const load = useCallback(async () => {
    try {
      const current = await api<ScoutRun | null>("/api/scout");
      if (!current) return;
      setRun(current);
      setEvents(current.events);
      setStatus(current.status);
      setInput(current.input);
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
      setEvents((list) => [...list.slice(-600), event]);
      if (event.kind === "start") setStatus("running");
      // Hồ sơ và báo cáo soát chỉ có sau khi tiến trình đóng lại, nên phải hỏi lại máy chủ.
      if (event.kind === "done") void load();
    };
    return () => source.close();
  }, [load]);

  // Flow chạy dài hơn màn hình rất nhanh; không tự cuộn thì người xem phải kéo tay suốt lượt chạy.
  useEffect(() => {
    if (status === "running") flow.current?.scrollTo({ top: flow.current.scrollHeight });
  }, [events, status]);

  const running = status === "running";
  const counts = countEvents(events);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      setEvents([]);
      const started = await api<ScoutRun>("/api/scout", { method: "POST", json: { action: "start", input } });
      setRun(started);
      setStatus("running");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try { await api("/api/scout", { method: "POST", json: { action: "stop" } }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(false); }
  }

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
        Agent tự tìm tài liệu trên web rồi viết thử một kịch bản có dẫn nguồn, ghi vào <code>scout/</code> ở gốc repo.
        {/* `.feedback strong` là display:block — giữ nguyên câu trong một thẻ strong để nó thành trọn
            một dòng, thay vì nhấn mạnh giữa câu rồi bị cắt làm đôi. */}
        <strong>Đừng dùng thẳng kết quả — đọc lại kịch bản và hồ sơ nguồn trước đã.</strong>
        <ul className="vs-scout-caveats">
          <li><strong>Chưa nối vào luồng tạo video.</strong> Luồng hiện tại không đọc gì ở đây và không bị ảnh hưởng; muốn dùng thì chép kịch bản ra rồi tạo video như bình thường.</li>
          <li><strong>Chưa có bước duyệt nguồn.</strong> Chưa bỏ được một nguồn rồi bắt agent viết lại đúng những câu dựa vào nó.</li>
          <li><strong>Chạy lâu.</strong> Một lượt thường mất khoảng mười phút vì phải tải thật từng trang về.</li>
          <li><strong>Phần soát chỉ kiểm được trích dẫn.</strong> Nó đối chiếu từng trích đoạn với trang đã tải, nhưng không thay người đọc để biết nguồn đó có đáng tin hay không.</li>
        </ul>
      </>}
    />

    <div className="editor-layout vs-scout-layout">
      <section className="editor-panel" aria-label="Chủ đề">
        <div className="panel-heading"><div><h2>Chủ đề</h2></div></div>
        <div className="vs-step-body">
          <label className="vs-scout-field">
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
          </label>
          {/* Nhãn phải ngắn đủ để không xuống dòng: một nhãn hai dòng cạnh một nhãn một dòng làm hai ô
              nhập lệch hàng nhau. Phần giải thích đã nằm ở dòng `small` bên dưới. */}
          <div className="field-grid">
            <label className="vs-scout-field">
              <span className="vs-field-label">Nguồn tối thiểu</span>
              <InputNumber min={1} max={5} value={input.minSources} disabled={running || busy} onChange={(v) => setInput({ ...input, minSources: v ?? 2 })} />
              <small>Mỗi câu phải có bấy nhiêu nguồn độc lập. Hai là mức để coi như có xác nhận chéo.</small>
            </label>
            <label className="vs-scout-field">
              <span className="vs-field-label">Số câu</span>
              <InputNumber min={5} max={80} value={input.cues} disabled={running || busy} onChange={(v) => setInput({ ...input, cues: v ?? 20 })} />
              <small>Ước lượng thôi — thiếu nguồn thì agent được phép viết ít hơn.</small>
            </label>
          </div>

          {error && <Alert className="feedback" type="error" showIcon closable title="Chưa chạy được" description={error} onClose={() => setError(null)} />}

          {running
            ? <Button danger block icon={<StopOutlined />} disabled={busy} onClick={() => void stop()}>Dừng lượt chạy</Button>
            : <Button type="primary" block icon={<PlayCircleFilled />} loading={busy} disabled={!input.topic.trim()} onClick={() => void start()}>
                {run ? "Chạy lại" : "Chạy thử"}
              </Button>}

          {/* Thẻ tự viết thay vì antd Tag: thẻ trung tính của antd không theo bảng màu tối, và cột thẻ
              phải rộng theo thẻ dài nhất — để cứng 96px thì "Bash · PowerShell" tràn đè lên phần chữ. */}
          <div className="vs-scout-tools">
            <h3>Agent được cầm những gì</h3>
            <ul>
              <li><span className="vs-scout-tool is-on">WebSearch</span><span>tìm kiếm — chỉ mở ở đây, mọi stage dựng video vẫn chặn</span></li>
              <li><span className="vs-scout-tool is-on">WebFetch</span><span>tải nội dung một trang về</span></li>
              <li><span className="vs-scout-tool">Write · Read</span><span>chỉ trong <code>scout/{run?.slug ?? "<chủ-đề>"}/</code></span></li>
              <li><span className="vs-scout-tool is-off">Bash · PowerShell</span><span>không cấp — lượt này không cần chạy lệnh nào</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="editor-panel vs-scout-flow-panel" aria-label="Agent đang làm gì">
        <div className="panel-heading">
          <div><h2>Agent đang làm gì</h2></div>
          <span className="quiet-label">{counts.searches} LƯỢT TÌM · {counts.fetches} TRANG ĐỌC · {counts.saves} FILE GHI</span>
        </div>
        <div className="vs-step-body">
          {events.length === 0
            ? <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa chạy lượt nào" />
            : <ol ref={flow} className="vs-scout-flow">{events.map((e, i) => <FlowRow key={`${e.t}-${i}`} event={e} />)}</ol>}
          {running && run && <p className="vs-scout-running"><LoadingOutlined spin /> Đang chạy · bắt đầu {clock(run.startedAt)}</p>}
          {run?.script && <p className="vs-scout-deliverable">
            <FileTextOutlined />
            <a href={fileUrl(run.script)} target="_blank" rel="noreferrer">{run.script}</a>
          </p>}
          {run && <Check run={run} />}
          {run && <Dossier run={run} />}
        </div>
      </section>
    </div>
  </Shell>;
}
