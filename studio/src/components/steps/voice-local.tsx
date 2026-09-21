"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircleFilled, DownloadOutlined, ExportOutlined, FolderOpenOutlined, ImportOutlined, PlayCircleFilled, SearchOutlined, SoundOutlined } from "@ant-design/icons";
import { Button, Checkbox, Tag } from "antd";
import { api } from "@/lib/client";
import { reportMatchesDir } from "@/lib/import-report";
import type { LocalCast, OmnivoiceStatus, VideoDetail, VoiceSettings } from "@/lib/types";
import { ConfirmDialog } from "../confirm-dialog";
import { isRefFile, LocalCastPicker, RefFileField } from "../local-cast";
import { ProductionState } from "../production-state";
import { VoicePicker } from "../voice-picker";
import { post, type StepProps } from "./shared";
import { ImportMap } from "./voice-import";

/**
 * Model chạy dưới máy. OmniVoice không phải nguồn giọng thứ ba theo nghĩa kỹ thuật — nó sinh ra một thư
 * mục 01.wav, 02.wav… rồi đi tiếp bằng đúng đường "Nhập audio có sẵn". Panel này lo khâu duy nhất mà hai
 * tab kia không lo hộ được: dựng môi trường Python trên máy.
 */
export function LocalModelPanel({ detail, settings, setSettings, busy, act }: {
  detail: VideoDetail;
  settings: VoiceSettings;
  setSettings: (v: VoiceSettings) => void;
  busy: boolean;
  act: StepProps["act"];
}) {
  const id = detail.state.id;
  const [status, setStatus] = useState<OmnivoiceStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [working, setWorking] = useState(false);
  const [confirmSetup, setConfirmSetup] = useState(false);
  const job = detail.job;
  const jobRunning = (kind: string) => job?.kind === kind && job.status === "running";
  const installing = jobRunning("omnivoice-setup");
  const aligning = jobRunning("align-setup");

  const send = useCallback(
    (action: string) => api<OmnivoiceStatus>(`/api/videos/${id}/voice`, { method: "POST", json: { action } }),
    [id],
  );
  const refresh = useCallback(
    () => send("omnivoice-status").then((s) => { setStatus(s); setFailed(false); }).catch(() => setFailed(true)),
    [send],
  );
  // Cài xong thì job kết thúc — hỏi lại để bước 1 tự chuyển sang "xong". Cũng chạy lượt đầu khi mở tab.
  useEffect(() => { if (!installing && !aligning) void refresh(); }, [installing, aligning, refresh]);

  /**
   * Dàn vai: ai đọc câu nào, bằng giọng nào, mẫu đã sẵn sàng chưa. Miễn phí và tức thì (chỉ đọc cues.js
   * với voices.json), nên hỏi lại sau mỗi lần đổi giọng — đó là cách duy nhất biết được một đường dẫn
   * vừa gõ có thật hay không trước khi GPU chạy hàng chục phút.
   */
  const [cast, setCast] = useState<LocalCast | null>(null);
  const castKey = JSON.stringify([settings.voiceId, settings.speakers || {}]);
  useEffect(() => {
    let alive = true;
    void api<LocalCast>(`/api/videos/${id}/voice`, { method: "POST", json: { action: "omnivoice-cast", settings } })
      .then((c) => { if (alive) setCast(c); })
      .catch(() => { if (alive) setCast(null); });
    return () => { alive = false; };
    // settings đi cùng castKey; chỉ hỏi lại khi giọng của một vai nào đó thật sự đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, castKey]);
  // Lúc người dùng đổi giọng gần nhất: một lượt sinh thất bại TRƯỚC đó nói về thiết lập cũ, không còn
  // đáng treo trên màn hình — dàn vai đã nói lý do hiện tại rồi. 0 = chưa đo (frame đầu), không hiện gì.
  const [settingsChangedAt, setSettingsChangedAt] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSettingsChangedAt(Date.now()); }, [castKey]);

  const server = (action: "start" | "stop") => act(async () => {
    setWorking(true);
    try { setStatus(await send(`omnivoice-server-${action}`)); } finally { setWorking(false); }
  });

  const installed = status?.installed ?? false;
  const aligned = status?.align ?? false;
  const running = status?.server.running ?? false;
  // Video hội thoại: giọng là chuyện của từng nhân vật, không còn "giọng của video" nào để chọn một lần.
  const dialogue = cast?.dialogue ?? false;
  // Người dẫn của video một giọng có thể nhân bản từ file trên máy — khai ở cùng chỗ với các vai khác.
  const narratorRef = String(settings.speakers?.[""] ?? "").trim();
  const narratorFile = isRefFile(narratorRef);
  const narratorless = () => {
    const speakers = { ...(settings.speakers || {}) };
    delete speakers[""];
    return speakers;
  };
  const setNarratorFile = (value: string) => {
    const speakers = { ...(settings.speakers || {}) };
    if (value.trim()) speakers[""] = value.trim();
    else delete speakers[""];
    setSettings({ ...settings, speakers });
  };
  // Sinh được chưa: dàn vai nói thay cho ô "đã chọn giọng" — nó biết cả nhân vật lạ lẫn file mẫu không có thật.
  const voiceReady = cast ? cast.ok : Boolean(settings.voiceId);
  const generating = jobRunning("omnivoice-generate");
  const spoken = detail.cues?.cues.filter((c) => !c.silent && c.text.trim()).length ?? 0;
  // Thư mục nhập đang trỏ vào kết quả của chính model local: bước 3 đã chạy xong ít nhất một lần.
  const outDir = detail.state.voice.importDir;
  const generated = outDir.replace(/\\/g, "/").endsWith("/voice-script/omnivoice");
  const scanning = jobRunning("import-scan");
  const importing = jobRunning("voice");
  // Báo cáo phải là của đúng thư mục này; đổi giọng rồi sinh lại thì báo cáo cũ không còn nói gì nữa.
  const scan = detail.importReport;
  const fresh = generated && reportMatchesDir(scan, outDir) ? scan : null;
  // "Đã nhập" phải là đã nhập CHÍNH thư mục này — chỉ báo cáo của một lượt nhập thật mới có `out`.
  // Dựa vào artifacts.voice là sai: video còn giọng ElevenLabs cũ cũng sẽ hiện dấu tick.
  const imported = Boolean(fresh?.out);
  const problems = fresh ? fresh.rows.filter((r) => r.level === "error").length : 0;
  const warnings = fresh ? fresh.rows.filter((r) => r.level === "warn").length : 0;
  const [force, setForce] = useState(false);

  const reveal = () => act(() => post("/api/reveal", { dir: outDir }));
  const rescan = () => act(() => post(`/api/videos/${id}/voice`, { action: "scan-import", settings }));
  const device = status?.device;
  // Máy yếu: không GPU thì chậm tới mức không dùng nổi, còn VRAM sát thì câu dài dễ tràn.
  const weak = device?.tight ?? false;
  const weakText = !device ? "" : device.id === "cpu"
    ? `Máy không có GPU. Model ${status?.modelGb} GB sẽ chạy bằng CPU — mỗi câu có thể mất hàng phút, không hợp để dựng cả video.`
    : `Card ${device.vramGb} GB VRAM, model chiếm ~${status?.modelGb} GB. Chạy được nhưng sát: câu dài có thể tràn VRAM và phải sinh lại từng câu ngắn hơn.`;

  // Mất trạng thái thì panel rỗng trông như hỏng hẳn, và mất luôn nút Cài — phải còn đường thử lại.
  if (failed && !status) {
    return <div className="vs-local">
      <ProductionState
        status="error"
        title="Không đọc được trạng thái model local"
        detail="Máy chủ Studio không trả lời. Kiểm tra cửa sổ đang chạy `npm run studio` rồi thử lại."
        action={<Button size="small" onClick={() => void refresh()}>Thử lại</Button>}
      />
    </div>;
  }

  return <div className="vs-local">
    <header className="vs-local-head">
      <div>
        <h3>OmniVoice · model giọng chạy dưới máy</h3>
        <p>Sinh giọng ngay trên máy này nên không tốn credit ElevenLabs. Nhân bản giọng cho 600+ ngôn ngữ, giấy phép Apache-2.0.</p>
      </div>
      {status && <Tag className="vs-badge" color={installed ? "success" : "default"}>{installed ? "Đã cài" : "Chưa cài"}</Tag>}
    </header>

    {/* Là chuyện của máy, không phải của video: chỉ nói to trước khi cài — sau đó chỉ còn là một lưu ý. */}
    {status && weak && <ProductionState
      className="vs-local-warning"
      status={device?.id === "cpu" && !installed ? "error" : "review"}
      title={device?.id === "cpu" ? "Máy này không đủ sức chạy model local" : "Máy này chạy được nhưng sát sức"}
      detail={weakText}
    />}

    <ol className="vs-local-flow">
      <li className={`vs-local-step ${installed ? "is-done" : "is-now"}`}>
        <span className="vs-local-num">{installed ? <CheckCircleFilled /> : 1}</span>
        <div className="vs-local-body">
          <strong>Cài model</strong>
          {installed
            ? <small>{device?.label} · <code>{status?.venv}</code></small>
            : <small>Cài torch hợp phần cứng rồi cài gói <code>omnivoice</code>. Lần đầu tải vài GB.</small>}
          {!installed && status && <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={installing}
            disabled={busy || installing}
            onClick={() => setConfirmSetup(true)}
          >Setup OmniVoice local model</Button>}
        </div>
        {status && !installed && <span className="vs-local-aside">{device?.label}</span>}
      </li>

      <li className={`vs-local-step ${!installed ? "is-wait" : voiceReady ? "is-done" : "is-now"}`}>
        <span className="vs-local-num">{installed && voiceReady ? <CheckCircleFilled /> : 2}</span>
        <div className="vs-local-body">
          <strong>{dialogue ? `Chọn giọng cho ${cast?.roles.length} nhân vật` : "Chọn giọng để nhân bản"}</strong>
          {/* OmniVoice clone giọng từ một đoạn mẫu, và voices.json đã có sẵn mẫu của cả bốn người
              dẫn trên kho media — dùng lại đúng bộ chọn của tab ElevenLabs để giọng không lệch nhau. */}
          <small>
            {dialogue
              ? <>Mỗi câu mang giọng của người nói câu đó, sinh gọn trong một lượt. Mặc định là đúng giọng voices.json đã gán cho nhân vật, nên không phải chọn gì cả — bảng dưới chỉ để đổi khác đi.</>
              : <>Mẫu của giọng được chọn sẽ là <code>ref_audio</code> cho OmniVoice, nên giọng local khớp với giọng ElevenLabs đang dùng.</>}
          </small>
          {dialogue && cast
            ? <LocalCastPicker cast={cast} settings={settings} setSettings={setSettings} disabled={busy || !installed} />
            : <>
                <VoicePicker value={settings.voiceId} onChange={(voiceId) => setSettings({ ...settings, voiceId, speakers: narratorless() })} disabled={busy || !installed || narratorFile} />
                {/* Giọng chưa có trong danh mục: chỉ trỏ tới file mẫu trên máy, không tải lên đâu cả. */}
                <details className="vs-local-extra vs-cast-other" open={narratorFile}>
                  <summary>Hoặc nhân bản từ một file giọng trên máy</summary>
                  <RefFileField
                    value={narratorFile ? narratorRef : ""}
                    onChange={setNarratorFile}
                    disabled={busy || !installed}
                    note={narratorFile ? cast?.roles[0]?.note : null}
                    error={narratorFile ? cast?.roles[0]?.error : null}
                  />
                </details>
              </>}
        </div>
      </li>

      <li className={`vs-local-step ${!installed || !voiceReady ? "is-wait" : generated ? "is-done" : "is-now"}`}>
        <span className="vs-local-num">{generated ? <CheckCircleFilled /> : 3}</span>
        <div className="vs-local-body">
          <strong>Sinh giọng cho cả video</strong>
          <small>
            Sinh {spoken || "tất cả"} câu trong một lượt, đặt tên <code>01.wav, 02.wav…</code> đúng số câu.
            Thiếu dù một câu là báo lỗi chứ không nhận kết quả dở.
          </small>
          <Button
            type="primary"
            icon={<SoundOutlined />}
            loading={generating}
            disabled={busy || generating || !installed || !voiceReady}
            onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "omnivoice-generate", settings }))}
          >{generated ? "Sinh lại" : "Sinh giọng bằng model local"}</Button>
          {/* Lượt sinh thất bại chỉ được ghi vào nhật ký (hành động này cố ý không đụng trạng thái bước), nên
              thanh tiến trình biến mất mà không nói gì — đã thấy thật với một file mẫu không có tiếng nói. */}
          {job?.kind === "omnivoice-generate" && job.status === "error" && settingsChangedAt > 0 && job.startedAt >= settingsChangedAt && (() => {
            const last = [...detail.logs].reverse().find((l) => l.kind === "error");
            return <ProductionState
              className="vs-production-state"
              status="error"
              title="Sinh giọng thất bại"
              detail={last ? last.text.split(/\r?\n/).filter(Boolean).map((line, i) => <span key={i}>{line}<br /></span>) : "Xem nhật ký bên dưới."}
            />;
          })()}
          {!voiceReady && installed && <small className="vs-local-log vs-local-hint">{cast?.problems.length ? cast.problems[0].split(/\r?\n/)[0] : "Chọn một giọng ở bước 2 trước."}</small>}
          {/* Đo thật trên card 6 GB: server giữ model sẵn, lệnh sinh nạp thêm một bản nữa → VRAM lên 97 %
              và cả hai cùng ì. Máy VRAM rộng thì chạy song song vô tư, nên chỉ nhắc khi card chật. */}
          {running && device?.tight && <small className="vs-local-log vs-local-hint">
            Card này chật mà server Gradio đang giữ model trong VRAM. Tắt nó ở cuối trang trước khi sinh.
          </small>}
        </div>
      </li>

      <li className={`vs-local-step ${!generated ? "is-wait" : imported ? "is-done" : "is-now"}`}>
        <span className="vs-local-num">{imported ? <CheckCircleFilled /> : 4}</span>
        <div className="vs-local-body">
          <strong>Nhập vào video</strong>
          <small>
            Thư mục wav chưa phải là giọng của video: mỗi câu còn phải soát đúng câu rồi ghép lại thành
            một bản thu liền. Làm ngay tại đây — thư mục vừa sinh đã tự kiểm sau khi sinh xong.
          </small>

          {generated && <div className="vs-local-out">
            <code title={outDir}>{outDir}</code>
            {/* Nghe thử là việc của tai, không phải của giao diện này — mở thẳng thư mục cho nhanh. */}
            <Button size="small" icon={<FolderOpenOutlined />} disabled={busy} onClick={reveal}>Mở thư mục</Button>
            <Button size="small" icon={<SearchOutlined />} loading={scanning} disabled={busy || !aligned} onClick={rescan}>Kiểm tra lại</Button>
          </div>}

          {/* Whisper nằm ở voice/.venv, KHÁC venv của OmniVoice. Cài xong OmniVoice mà thiếu nó thì
              sinh giọng vẫn chạy ngon rồi chết ở bước nhập — hỏi ngay đây, đừng để gặp sau hàng chục phút. */}
          {status && !aligned && <ProductionState
            className="vs-local-warning"
            status="review"
            title="Còn thiếu môi trường nhận diện giọng"
            detail="Bước nhập dùng Whisper để soát từng file có đúng câu của nó không. Đây là môi trường riêng, bản cài OmniVoice không bao gồm."
            action={<Button size="small" type="primary" loading={aligning} disabled={busy || aligning} onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "align-setup" }))}>Cài Whisper</Button>}
          />}

          {fresh && <p className={`vs-import-summary ${problems ? "is-error" : warnings ? "is-warn" : "is-ok"}`}>
            <strong>{fresh.matched}/{fresh.needFile} câu có file</strong>
            {problems > 0 && <span> · {problems} lỗi</span>}
            {warnings > 0 && <span> · {warnings} cảnh báo</span>}
            {problems === 0 && warnings === 0 && <span> · không có vấn đề</span>}
            {fresh.align.used && <small>Đối chiếu nội dung bằng Whisper {fresh.align.model}</small>}
          </p>}

          {fresh && <details className="vs-flow-more" open={problems > 0}>
            <summary>Xem từng câu ({fresh.rows.length})</summary>
            <ImportMap report={fresh} />
          </details>}

          {fresh && problems > 0 && <Checkbox className="vs-force" checked={force} onChange={(e) => setForce(e.target.checked)}>
            Vẫn nhập dù {problems} câu có vấn đề — tôi đã nghe lại và chấp nhận
          </Checkbox>}

          {generated && <Button
            type="primary"
            icon={<ImportOutlined />}
            loading={importing}
            disabled={busy || importing || !fresh || (problems > 0 && !force)}
            onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "import", force }))}
          >{fresh ? `${imported ? "Nhập lại giọng" : "Nhập giọng"} · ${fresh.matched} câu` : "Kiểm tra thư mục trước"}</Button>}

        </div>
      </li>
    </ol>

    {/* Server Gradio KHÔNG nằm trên đường sinh giọng: lệnh sinh gọi thẳng omnivoice-infer-batch và
        không biết tới cổng nào. Để nó ở đây như một tiện ích, không phải một bước bắt buộc. */}
    {/* Nói bằng việc người dùng làm, không bằng tên công nghệ: "Gradio", "server", "nạp model" từng làm
        người dùng không hiểu mục này để làm gì. Cảnh báo về bộ nhớ card chỉ hiện trên máy card chật. */}
    {installed && <details className="vs-local-extra">
      <summary>Nghe thử một câu trước khi sinh cả video (tuỳ chọn)</summary>
      <p>
        Mở một trang nghe thử trên máy này: gõ một câu bất kỳ, chọn giọng hoặc file mẫu, nghe ngay — để chắc
        giọng đúng ý trước khi sinh cả {spoken || "video"} câu. Không bắt buộc; bước Sinh giọng không cần nó.
      </p>
      <div className="vs-local-actions">
        {running
          ? <>
              <span className="vs-local-url">Trang nghe thử đang mở</span>
              <Button size="small" type="primary" icon={<ExportOutlined />} href={status?.server.url ?? undefined} target="_blank">Mở trang</Button>
              <Button size="small" danger loading={working} disabled={busy} onClick={() => server("stop")}>Đóng trang nghe thử</Button>
            </>
          : <>
              <Button size="small" icon={<PlayCircleFilled />} loading={working} disabled={busy} onClick={() => server("start")}>Mở trang nghe thử</Button>
              <small>Lần đầu mở có thể phải chờ một lúc.</small>
            </>}
      </div>
      {device?.tight && <small className="vs-local-log vs-local-hint">
        Máy này card chật: <strong>đóng trang nghe thử trước khi bấm Sinh giọng</strong> — hai việc chạy cùng lúc sẽ giành nhau bộ nhớ card.
      </small>}
      {running && <small className="vs-local-log">Trang không mở được? Xem nhật ký: <code>{status?.server.log}</code></small>}
    </details>}

    {confirmSetup && <ConfirmDialog
      title="Cài OmniVoice lên máy này?"
      description={`Sẽ tải khoảng ${status?.device.id === "cuda" ? "3–4 GB" : "1–2 GB"} thư viện torch vào ${status?.venv}, rồi ~${status?.modelGb} GB trọng số model ở lần sinh giọng đầu tiên. Chỉ cài một lần, gỡ bằng cách xoá thư mục đó.${weak ? ` Lưu ý: ${weakText}` : ""}`}
      confirmLabel="Cài đặt"
      onCancel={() => setConfirmSetup(false)}
      onConfirm={() => { setConfirmSetup(false); void act(() => post(`/api/videos/${id}/voice`, { action: "omnivoice-setup" })); }}
    />}
  </div>;
}
