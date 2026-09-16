"use client";

import { UserOutlined } from "@ant-design/icons";
import { Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { LocalCast, LocalRole, VoiceCatalog, VoiceDef, VoiceSettings } from "@/lib/types";
import { SourcePickerField } from "./source-picker";
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

/**
 * Ô chọn file mẫu: mở hộp thoại của máy, hoặc gõ đường dẫn tay khi không có hộp thoại. Chọn qua hộp thoại
 * thì ra nguyên đường dẫn một lần; gõ tay thì trình chọn báo từng ký tự, mà mỗi lần báo lên trên là một
 * lần hỏi lại máy chủ xem file có thật và đã biết lời của nó chưa — nên gom lại, đường dẫn đứng yên 400 ms
 * mới tính.
 */
export function RefFileField({ value, onChange, disabled, note, error }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  note?: string | null;
  error?: string | null;
}) {
  const [text, setText] = useState(value);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setText(value); }, [value]);
  // onChange của hàng cha đổi mỗi lần render; giữ trong ref để bộ đếm không bị đặt lại vô cớ.
  const commit = useRef(onChange);
  useEffect(() => { commit.current = onChange; }, [onChange]);
  useEffect(() => {
    const next = text.trim();
    if (next === value) return;
    const t = setTimeout(() => commit.current(next), 400);
    return () => clearTimeout(t);
  }, [text, value]);

  return <div className="vs-cast-file">
    <SourcePickerField label="File giọng mẫu" purpose="sample" value={text} onChange={setText} disabled={disabled} />
    <small className={error ? "is-error" : undefined}>
      {error || note || "Một đoạn 10–20 giây người đó đọc là đủ. Đặt thêm file .txt cùng tên chứa đúng lời đoạn đó thì giọng bám sát hơn; không có thì Whisper tự nghe."}
    </small>
  </div>;
}

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
