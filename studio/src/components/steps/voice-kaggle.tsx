"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircleFilled, CloudUploadOutlined, DeleteOutlined, DownloadOutlined, KeyOutlined } from "@ant-design/icons";
import { Button, Input, Tag } from "antd";
import { ConfirmDialog } from "../confirm-dialog";
import { api } from "@/lib/client";
import type { KaggleStatus, VideoDetail, VoiceSettings } from "@/lib/types";
import { ProductionState } from "../production-state";
import { post, type StepProps } from "./shared";
import { generatedResult, GeneratedImport, useLocalCast, VoiceChoice } from "./voice-local";

/** Thư mục Studio tải kết quả kernel về (studio/src/lib/server/voice.ts → kaggleAudioDir). */
const isKaggleDir = (dir: string) => dir.endsWith("/voice-script/kaggle/out");

/**
 * OmniVoice trên GPU của Kaggle: cùng model, cùng dàn vai với model local, nhưng máy này không cần GPU —
 * chỉ cần `kaggle` CLI và một tài khoản Kaggle. Kết quả là một thư mục 01.wav, 02.wav… đi tiếp bằng đúng
 * bước nhập của model local.
 */
export function KagglePanel({ detail, settings, setSettings, busy, act }: {
  detail: VideoDetail;
  settings: VoiceSettings;
  setSettings: (v: VoiceSettings) => void;
  busy: boolean;
  act: StepProps["act"];
}) {
  const id = detail.state.id;
  const [status, setStatus] = useState<KaggleStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const job = detail.job;
  const jobRunning = (kind: string) => job?.kind === kind && job.status === "running";
  const installing = jobRunning("kaggle-setup");
  const aligning = jobRunning("align-setup");
  const generating = jobRunning("kaggle-generate");

  const refresh = useCallback(
    () => api<KaggleStatus>(`/api/videos/${id}/voice`, { method: "POST", json: { action: "kaggle-status" } })
      .then((s) => { setStatus(s); setFailed(false); })
      .catch(() => setFailed(true)),
    [id],
  );
  // Cài xong thì job kết thúc — hỏi lại để bước 1 tự chuyển sang "xong". Cũng chạy lượt đầu khi mở tab.
  useEffect(() => { if (!installing && !aligning) void refresh(); }, [installing, aligning, refresh]);

  const { cast, castKey } = useLocalCast(id, settings);
  // 0 = chưa đổi gì từ lúc mở panel. Effect này từng chạy cả lúc mount, nên chỉ cần đổi bước hay tải lại
  // trang là mốc này vượt qua giờ bắt đầu của lượt vừa hỏng và khối báo lỗi biến mất — sau một lượt sinh
  // mười, hai mươi phút, người dùng quay lại chỉ thấy một nút "Sinh giọng" bình thường.
  const [settingsChangedAt, setSettingsChangedAt] = useState(0);
  const seenCast = useRef(castKey);
  useEffect(() => {
    if (seenCast.current === castKey) return;
    seenCast.current = castKey;
    setSettingsChangedAt(Date.now());
  }, [castKey]);
  const [confirmAgain, setConfirmAgain] = useState(false);

  const installed = status?.installed ?? false;
  const signedIn = status?.hasCreds ?? false;
  const voiceReady = cast ? cast.ok : Boolean(settings.voiceId);
  const spoken = detail.cues?.cues.filter((c) => !c.silent && c.text.trim()).length ?? 0;
  const result = generatedResult(detail, isKaggleDir);
  const { generated, imported } = result;
  const ready = installed && signedIn && voiceReady;

  if (failed && !status) {
    return <div className="vs-local">
      <ProductionState
        status="error"
        title="Không đọc được trạng thái Kaggle"
        detail="Máy chủ Studio không trả lời. Kiểm tra cửa sổ đang chạy `npm run studio` rồi thử lại."
        action={<Button size="small" onClick={() => void refresh()}>Thử lại</Button>}
      />
    </div>;
  }

  return <div className="vs-local">
    <header className="vs-local-head">
      <div>
        <h3>OmniVoice · chạy trên GPU của Kaggle</h3>
        <p>Cùng model với tab Model local nhưng chạy trên GPU T4 miễn phí của Kaggle (quota theo tuần), nên máy này không cần card đồ hoạ. Mỗi lượt thường mất 10–20 phút.</p>
      </div>
      {status && <Tag className="vs-badge" color={ready ? "success" : "default"}>{ready ? "Sẵn sàng" : "Chưa sẵn sàng"}</Tag>}
    </header>

    <ol className="vs-local-flow">
      <li className={`vs-local-step ${installed ? "is-done" : "is-now"}`}>
        <span className="vs-local-num">{installed ? <CheckCircleFilled /> : 1}</span>
        <div className="vs-local-body">
          <strong>Kaggle CLI</strong>
          {installed
            ? <small>Kaggle CLI {status?.version} · <code>{status?.from === "venv" ? status.venv : status?.bin}</code></small>
            : <small>Máy này chưa có lệnh <code>kaggle</code>. Cài vào <code>{status?.venv ?? "~/.cache/video-studio/kaggle-venv"}</code> — vài chục MB, một bản cho cả máy, không đụng tới Python của hệ thống.</small>}
          {!installed && status && <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={installing}
            disabled={busy || installing}
            onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "kaggle-setup" }))}
          >Cài Kaggle CLI</Button>}
        </div>
      </li>

      <li className={`vs-local-step ${signedIn ? "is-done" : "is-now"}`}>
        <span className="vs-local-num">{signedIn ? <CheckCircleFilled /> : 2}</span>
        <div className="vs-local-body">
          <strong>Tài khoản Kaggle</strong>
          <KaggleCredentials status={status} busy={busy} act={act} onChange={refresh} />
        </div>
      </li>

      <li className={`vs-local-step ${voiceReady ? "is-done" : "is-now"}`}>
        <span className="vs-local-num">{voiceReady ? <CheckCircleFilled /> : 3}</span>
        <div className="vs-local-body">
          <VoiceChoice cast={cast} settings={settings} setSettings={setSettings} disabled={busy} />
        </div>
      </li>

      <li className={`vs-local-step ${!ready ? "is-wait" : generated ? "is-done" : "is-now"}`}>
        <span className="vs-local-num">{generated ? <CheckCircleFilled /> : 4}</span>
        <div className="vs-local-body">
          <strong>Sinh giọng trên Kaggle</strong>
          <small>
            Đẩy {spoken || "tất cả"} câu lên một kernel private theo mã video, chờ Kaggle chạy xong rồi tải về. Mọi
            câu đều sạch thì giọng được nhập thẳng vào video; có câu lỗi hay cần nghe lại thì dừng ở bước 5 cho bạn nghe.
          </small>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            loading={generating}
            disabled={busy || generating || !ready}
            onClick={() => (generated ? setConfirmAgain(true) : void act(() => post(`/api/videos/${id}/voice`, { action: "kaggle-generate", settings })))}
          >{generated ? "Sinh lại trên Kaggle" : "Sinh giọng trên Kaggle"}</Button>
          {confirmAgain && <ConfirmDialog
            title="Sinh lại giọng cho cả video?"
            description={'Thư mục tải về lần trước bị xoá, kể cả những câu bạn đã nghe và chọn "Dùng bản này". Nếu mọi câu của lượt mới đều sạch, giọng mới được nhập thẳng vào video và thay giọng đang gắn.'}
            confirmLabel="Sinh lại trên Kaggle"
            onCancel={() => setConfirmAgain(false)}
            onConfirm={() => { setConfirmAgain(false); void act(() => post(`/api/videos/${id}/voice`, { action: "kaggle-generate", settings })); }}
          />}
          {job?.kind === "kaggle-generate" && job.status === "error" && job.startedAt >= settingsChangedAt && (() => {
            const last = [...detail.logs].reverse().find((l) => l.kind === "error");
            return <ProductionState
              className="vs-production-state"
              status="error"
              title="Sinh giọng trên Kaggle thất bại"
              detail={last ? last.text.split(/\r?\n/).filter(Boolean).map((line, i) => <span key={i}>{line}<br /></span>) : "Xem nhật ký bên dưới."}
            />;
          })()}
          {!voiceReady && <small className="vs-local-log vs-local-hint">{cast?.problems.length ? cast.problems[0].split(/\r?\n/)[0] : "Chọn một giọng ở bước 3 trước."}</small>}
        </div>
      </li>

      <li className={`vs-local-step ${!generated ? "is-wait" : imported ? "is-done" : "is-now"}`}>
        <span className="vs-local-num">{imported ? <CheckCircleFilled /> : 5}</span>
        <div className="vs-local-body">
          <strong>Nhập vào video</strong>
          <small>Whisper soát từng câu tải về có đúng lời của nó không, rồi ghép thành một bản thu liền.</small>
          <GeneratedImport detail={detail} settings={settings} result={result} aligned={!status || status.align} aligning={aligning} canGenerate={status ? Boolean(status.localModel) : null} busy={busy} act={act} />
        </div>
      </li>
    </ol>
  </div>;
}

/**
 * Username + API key (hoặc access token mới) của Kaggle, chỉ giữ trong RAM của server — cùng quy tắc với
 * key ElevenLabs. Nhận cả tệp kaggle.json tải từ trang Settings.
 */
function KaggleCredentials({ status, busy, act, onChange }: {
  status: KaggleStatus | null;
  busy: boolean;
  act: StepProps["act"];
  onChange: () => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [key, setKey] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const save = (json: object) => act(async () => {
    await api("/api/kaggle-key", { method: "POST", json });
    setKey("");
    await onChange();
  });

  if (status?.hasCreds) {
    return <div className="vs-key-line">
      <KeyOutlined />
      <span>Đã nhập tài khoản <strong>{status.username}</strong></span>
      <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => act(async () => { await api("/api/kaggle-key", { method: "DELETE" }); await onChange(); })}>Xoá</Button>
    </div>;
  }
  return <>
    <small>
      Lấy tại kaggle.com → Settings → API: tải <code>kaggle.json</code> (API key cũ), hoặc tạo token mới rồi dán
      cùng username. Chỉ giữ trong RAM của server này. Tài khoản phải đã xác minh số điện thoại thì kernel mới
      được dùng GPU và Internet.
    </small>
    <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => {
      const chosen = e.target.files?.[0];
      e.target.value = "";
      if (chosen) void chosen.text().then((json) => save({ json }));
    }} />
    <div className="vs-key-line">
      <KeyOutlined />
      <Input className="vs-key-field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Kaggle username" aria-label="Kaggle username" autoComplete="off" spellCheck={false} disabled={busy} />
      <Input.Password className="vs-key-field" value={key} onChange={(e) => setKey(e.target.value)} placeholder="API key hoặc token" aria-label="Kaggle API key hoặc token" autoComplete="off" disabled={busy} />
      <Button disabled={busy || !username.trim() || !key.trim()} onClick={() => save({ username, key })}>Dùng</Button>
    </div>
    <Button size="small" icon={<CloudUploadOutlined />} disabled={busy} onClick={() => file.current?.click()}>Chọn tệp kaggle.json</Button>
  </>;
}
