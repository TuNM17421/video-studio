"use client";

import { FolderOpenOutlined, UserOutlined } from "@ant-design/icons";
import { Input, Select } from "antd";
import { useEffect, useState } from "react";
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
 * Ô đường dẫn file mẫu. Gõ tới đâu chưa tính tới đó: chỉ khi rời ô (hoặc Enter) mới báo lên trên, vì mỗi
 * lần báo là một lần hỏi lại máy chủ xem file có thật và đã biết lời của nó chưa.
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
  const commit = () => { if (text.trim() !== value) onChange(text.trim()); };

  return <div className="vs-cast-file">
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
  // Vừa bấm "Giọng từ file" thì chưa có đường dẫn nào để lưu — ô nhập phải mở ra trước, nên trạng thái
  // này nằm ở đây chứ không phải trong settings. Có đường dẫn thật rồi thì chính nó nói lên điều đó.
  const [picking, setPicking] = useState(false);
  const fromFile = isRefFile(value) || picking;
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
          setPicking(next === FROM_FILE);
          if (next !== FROM_FILE) onChange(next === FROM_CATALOG ? "" : next);
          else if (isRefFile(value)) onChange(value);
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
      onChange={onChange}
      disabled={disabled}
      // Chưa gõ đường dẫn nào thì nhận xét của máy chủ còn nói về giọng cũ — đừng dán nó vào ô này.
      note={isRefFile(value) ? hint : null}
      error={isRefFile(value) ? problem : null}
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
