"use client";

import { FileOutlined, FolderOpenOutlined, LoadingOutlined, UploadOutlined, UserOutlined, WarningFilled } from "@ant-design/icons";
import { Button, Input, Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { LocalCast, LocalRole, VoiceCatalog, VoiceDef, VoiceSettings } from "@/lib/types";
import { PlayButton, usePreview } from "./voice-picker";

/**
 * Giọng cho model local, chọn theo từng người nói.
 *
 * Kịch bản hội thoại khai `speaker` ở mỗi câu, và voices.json đã gán sẵn cho mỗi nhân vật một giọng —
 * nên mặc định không phải chọn gì, Tú vẫn ra giọng Nhật Phong còn Lucas vẫn ra giọng Đô Trịnh, đúng như
 * bản ElevenLabs. Bảng này chỉ để đổi khác đi: mượn một giọng khác trong thư viện, hoặc nhân bản từ một
 * file audio nằm trên máy khi giọng muốn dùng chưa có trong danh mục.
 *
 * Vì sao là đường dẫn file chứ không phải nút tải lên: file mẫu ở lại trên máy người dùng, model cũng
 * chạy ngay trên máy đó. Đưa nó qua một vòng tải lên chỉ để rồi tải về là thêm một chỗ hỏng và một khoản
 * lưu trữ, không đổi lại được gì.
 */

/** Cùng luật với tools/lib/omnivoice.mjs: có dấu gạch chéo hoặc mang đuôi audio thì đó là một file. */
const AUDIO = /\.(wav|mp3|m4a|mp4|aac|flac|ogg|opus|webm)$/i;
export const isRefFile = (value: string) => {
  const v = String(value || "").trim();
  return Boolean(v) && (/[\\/]/.test(v) || AUDIO.test(v));
};

/**
 * Được LƯU vào settings khi vai đã rẽ sang "giọng từ file" mà chưa chọn file nào. Trước đây trạng thái
 * này chỉ nằm trong bộ nhớ của ô chọn, nên settings vẫn giữ giọng danh mục vừa bỏ và lượt sinh lặng lẽ
 * đọc bằng giọng đó. Giữ khớp với FILE_PENDING trong tools/lib/omnivoice.mjs — máy chủ coi nó là một vai
 * chưa sẵn sàng và chặn lượt sinh.
 */
const FROM_FILE = "__file__";
const FROM_CATALOG = "";

export function useVoiceCatalog() {
  const [catalog, setCatalog] = useState<VoiceCatalog | null>(null);
  useEffect(() => {
    let alive = true;
    void api<VoiceCatalog>("/api/voices").then((c) => { if (alive) setCatalog(c); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return catalog;
}

/** Đuôi audio model local nhận (tools/lib/voice-files.mjs), cộng .txt để chọn kèm lời của đoạn mẫu. */
const ACCEPT = ".wav,.mp3,.m4a,.mp4,.aac,.flac,.ogg,.opus,.webm,.txt";

/**
 * Ô chọn file mẫu. Đường chính là hộp thoại thường của trình duyệt: trình duyệt chỉ đưa nội dung chứ không
 * đưa đường dẫn, nên máy chủ (chạy ngay trên máy này) chép một bản vào voice/cache/refs/uploads/ rồi trả
 * đường dẫn bản chép — xem api/voice-sample. Ai đã có file sẵn và không muốn chép thì gõ đường dẫn tay;
 * ô đó chỉ báo lên khi rời ô hoặc Enter, vì mỗi lần báo là một lần hỏi lại máy chủ.
 */
export function RefFileField({ value, onChange, disabled, note, error }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  note?: string | null;
  error?: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [manual, setManual] = useState(false);
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  // File vừa chọn mà máy chủ nghe không ra lời: giữ tên để người dùng biết file nào bị từ chối.
  const [rejected, setRejected] = useState<{ name: string; error: string } | null>(null);
  // Máy chủ đã nghe được gì từ mẫu — hiện lại để người dùng biết chọn đúng đoạn.
  const [heard, setHeard] = useState<{ text: string; seconds: number | null; long: boolean } | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setText(value); }, [value]);
  const commit = () => {
    if (text.trim() === value) return;
    setHeard(null);
    setRejected(null);
    onChange(text.trim());
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIssue(null);
    setBusy(true);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("file", f);
      const saved = await api<{ path: string | null; name: string; ref: { ok: boolean; text?: string; seconds?: number | null; long?: boolean; error?: string } }>(
        "/api/voice-sample", { method: "POST", body: form },
      );
      if (!saved.path || !saved.ref.ok) {
        setRejected({ name: saved.name, error: saved.ref.error || "không dùng được file này." });
        setHeard(null);
        return;
      }
      setRejected(null);
      setHeard({ text: saved.ref.text || "", seconds: saved.ref.seconds ?? null, long: Boolean(saved.ref.long) });
      onChange(saved.path);
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Không nhận được file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const chosen = value ? value.split(/[\\/]/).pop() || value : "";
  const problem = issue || rejected?.error || error;
  const meta = problem
    ? hoaDau(problem)
    : heard
      ? heard.long
        ? `Mẫu dài ${Math.round(heard.seconds ?? 0)} giây — nên cắt còn 10–20 giây, mẫu dài làm mỗi câu nặng thêm`
        : `Nghe được: "${heard.text.length > 70 ? `${heard.text.slice(0, 70)}…` : heard.text}"`
      : note || (chosen ? "Nhấp để đổi file" : "Nhấp để mở File Explorer");
  // Cùng một thẻ với ba trình chọn khác của Studio (feedback, video cũ, thư mục audio): bấm cả thẻ là mở
  // File Explorer; chưa chọn thì thẻ viền đỏ nói thẳng còn thiếu gì, chọn rồi thì viền liền và hiện tên file.
  return <div className="vs-cast-file">
    <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => void upload(e.target.files)} />
    <button
      type="button"
      className={`vs-source-picker ${chosen && !rejected ? "is-selected" : ""} ${problem ? "is-invalid" : ""}`}
      disabled={disabled || busy}
      onClick={() => input.current?.click()}
      aria-label={chosen ? `Đổi file giọng mẫu, đang chọn ${chosen}` : "Chọn file giọng mẫu trên máy"}
    >
      <span className="vs-source-picker-icon" aria-hidden="true">
        {busy ? <LoadingOutlined spin /> : problem ? <WarningFilled /> : chosen ? <FileOutlined /> : <UploadOutlined />}
      </span>
      <span className="vs-source-picker-copy">
        <strong>{busy ? "Đang nhận file và nghe thử…" : rejected ? rejected.name : chosen || "Chọn file giọng mẫu trên máy"}</strong>
        <small title={value || undefined}>
          {rejected
            ? "Chọn file khác — một đoạn 10–20 giây có tiếng người đó nói"
            : chosen ? value : "WAV, MP3, M4A, FLAC… một đoạn 10–20 giây người đó đọc; kèm file .txt cùng tên nếu có lời"}
        </small>
        <span className="vs-source-picker-meta">{meta}</span>
      </span>
      <span className="vs-source-picker-action" aria-hidden="true"><UploadOutlined /></span>
    </button>
    {manual
      ? <div className="vs-source-manual">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onPressEnter={commit}
            disabled={disabled}
            status={error ? "error" : undefined}
            prefix={<FolderOpenOutlined />}
            placeholder="C:\\giong\\mau-10-giay.wav"
            aria-label="Đường dẫn file giọng mẫu"
            spellCheck={false}
            autoComplete="off"
          />
          <Button type="link" size="small" onClick={() => setManual(false)}>Ẩn nhập thủ công</Button>
        </div>
      : <Button type="link" size="small" className="vs-cast-file-manual" disabled={disabled} onClick={() => setManual(true)}>Nhập đường dẫn thủ công</Button>}
  </div>;
}

/** "chưa chọn file giọng mẫu." → "Chưa chọn file giọng mẫu." — máy chủ viết thường vì thường ghép sau tên vai. */
const hoaDau = (s: string) => s.charAt(0).toLocaleUpperCase("vi") + s.slice(1);

/** Giọng mà voices.json gán sẵn cho vai này — cái sẽ dùng nếu không chọn gì. */
function defaultVoiceFor(role: LocalRole, catalog: VoiceCatalog | null): VoiceDef | null {
  if (!catalog) return null;
  if (!role.character) return catalog.voices.find((v) => v.isDefault) || null;
  const borrowed = catalog.characters.find((c) => c.id === role.character)?.voice;
  return catalog.voices.find((v) => v.id === borrowed || v.name === borrowed) || null;
}

function CastRow({ role, catalog, value, onChange, disabled, preview }: {
  role: LocalRole;
  catalog: VoiceCatalog | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  preview: ReturnType<typeof usePreview>;
}) {
  // Vừa bấm "Giọng từ file" thì chưa có đường dẫn nào — nhưng vẫn phải LƯU (FROM_FILE) để settings không
  // còn giữ giọng danh mục vừa bỏ; có đường dẫn thật rồi thì chính nó thay chỗ.
  const fromFile = isRefFile(value) || value === FROM_FILE;
  const fallback = defaultVoiceFor(role, catalog);
  const chosen = catalog?.voices.find((v) => v.id === value || v.name === value) || null;
  // Nghe thử bao giờ cũng là giọng vai này SẼ đọc, kể cả khi đó là giọng mặc định chưa ai đụng vào.
  const audible = fromFile ? null : chosen || fallback;
  // "Chưa sẵn sàng" cũng chặn lượt sinh y như một lỗi, nên nó hiện đỏ chứ không nằm lẫn với ghi chú.
  const problem = role.error || (role.ready ? null : role.note);
  const hint = role.ready ? role.note : null;

  return <li className={`vs-cast-row ${problem ? "is-error" : ""}`}>
    <span className="vs-cast-face">
      {role.avatar ? <img src={role.avatar} alt="" loading="lazy" /> : <UserOutlined />}
    </span>
    <span className="vs-cast-who">
      <strong>{role.name}</strong>
      <small>{role.cues} câu{role.side === "right" ? " · bên phải" : role.speaker ? " · bên trái" : ""}</small>
    </span>
    <span className="vs-cast-voice">
      <Select
        value={fromFile ? FROM_FILE : value || FROM_CATALOG}
        onChange={(next) => {
          if (next === FROM_FILE) onChange(isRefFile(value) ? value : FROM_FILE);
          else onChange(next === FROM_CATALOG ? "" : next);
        }}
        disabled={disabled}
        aria-label={`Giọng cho ${role.name}`}
        popupMatchSelectWidth={false}
        options={[
          { value: FROM_CATALOG, label: fallback ? `Mặc định · ${fallback.name}` : "Mặc định" },
          ...(catalog?.voices || []).map((v) => ({ value: v.id, label: `${v.name}${v.gender ? ` · ${v.gender}` : ""}` })),
          { value: FROM_FILE, label: "Giọng từ file trên máy…" },
        ]}
      />
      {audible && <PlayButton voice={audible} state={preview.stateOf(audible.id)} onClick={() => preview.toggle(audible)} />}
    </span>
    {fromFile && <RefFileField
      value={isRefFile(value) ? value.trim() : ""}
      // Xoá đường dẫn thì vẫn đang ở chế độ "từ file" (chưa chọn), không nhảy về giọng mặc định.
      onChange={(next) => onChange(next.trim() ? next : FROM_FILE)}
      disabled={disabled}
      note={isRefFile(value) ? hint : null}
      // Máy chủ đã biết vai này đang chờ file (FROM_FILE được lưu), nên lỗi nó báo là về đúng trạng thái này.
      error={problem}
    />}
    {!fromFile && (problem || hint) && <small className={`vs-cast-note ${problem ? "is-error" : ""}`}>{problem || hint}</small>}
  </li>;
}

export function LocalCastPicker({ cast, settings, setSettings, disabled }: {
  cast: LocalCast;
  settings: VoiceSettings;
  setSettings: (v: VoiceSettings) => void;
  disabled?: boolean;
}) {
  const catalog = useVoiceCatalog();
  const preview = usePreview();
  const speakers = settings.speakers || {};

  const set = (key: string, value: string) => {
    preview.stop();
    const next = { ...speakers };
    if (value.trim()) next[key] = value.trim();
    else delete next[key]; // không chọn gì = theo voices.json, đừng lưu một ô rỗng
    setSettings({ ...settings, speakers: next });
  };

  return <div className="vs-cast-pick">
    <ul>
      {cast.roles.map((role) => {
        const key = role.speaker ?? "";
        return <CastRow
          key={key}
          role={role}
          catalog={catalog}
          value={speakers[key] || ""}
          onChange={(value) => set(key, value)}
          disabled={disabled}
          preview={preview}
        />;
      })}
    </ul>
    {preview.element}
  </div>;
}
