"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DeleteOutlined, DownOutlined, EditOutlined, FileOutlined, FolderOpenOutlined, InboxOutlined, LoadingOutlined, WarningFilled } from "@ant-design/icons";
import { Button, Dropdown, Form, Input } from "antd";
import type { InputRef, MenuProps } from "antd";
import { api } from "@/lib/client";

/**
 * One control for every "point at something on this machine" field: the old feedback folder, the old
 * video, and the folder of per-câu narration audio. It opens the desktop file dialog, falls back to a
 * typed path when there is no dialog to open, and keeps saying whether what is selected actually exists.
 */
export type SourcePurpose = "feedback" | "video" | "voice" | "voice-ref";
export type SourceCheck = { exists: boolean; dir?: boolean; files?: number; name?: string; size?: number };
type PickerResult = { cancelled: true } | ({ cancelled: false; path: string } & Omit<SourceCheck, "exists">);

function sourceName(value: string) {
  const clean = value.replace(/[\\/]+$/, "");
  return clean.split(/[\\/]/).pop() || value;
}

function sourceSize(bytes?: number) {
  if (bytes === undefined) return "1 tệp";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
}

export function SourcePickerField({ label, purpose, value, onChange, disabled }: { label: string; purpose: SourcePurpose; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [check, setCheck] = useState<SourceCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [picking, setPicking] = useState(false);
  const [manual, setManual] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const manualInput = useRef<InputRef>(null);
  const messageId = useId();
  useEffect(() => {
    if (!value.trim()) return;
    let active = true;
    const t = setTimeout(() => {
      api<SourceCheck>(`/api/fs-check?path=${encodeURIComponent(value.trim())}`)
        .then((result) => {
          if (!active) return;
          setCheck(result);
          setChecking(false);
        })
        .catch(() => {
          if (!active) return;
          setCheck(null);
          setChecking(false);
          setIssue("Không thể kiểm tra đường dẫn lúc này. Hãy thử lại.");
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [value]);
  // A folder of per-câu audio is the only shape the import understands, so a file is wrong here.
  const notAFolder = purpose === "voice" && check?.exists === true && check.dir === false;
  // A single reference WAV is the only shape OmniVoice cloning understands — the reverse of "voice".
  const notAFile = purpose === "voice-ref" && check?.exists === true && check.dir === true;
  const invalid = !!value.trim() && (check?.exists === false || notAFolder || notAFile);
  const selectedName = check?.name || sourceName(value);
  const selectedMeta = checking
    ? "Đang kiểm tra đường dẫn…"
    : notAFolder
      ? "Đây là một tệp, cần một thư mục"
      : notAFile
        ? "Đây là một thư mục, cần một tệp"
        : invalid
          ? "Không tìm thấy nguồn"
          : check?.exists
            ? check.dir ? `${check.files ?? 0} mục trong thư mục` : sourceSize(check.size)
            : "Đường dẫn trên máy";
  const idleTitle = purpose === "video" ? "Chọn video trên máy" : purpose === "voice" ? "Chọn thư mục audio trên máy" : purpose === "voice-ref" ? "Chọn audio mẫu trên máy" : "Chọn feedback trên máy";
  const idleHint = purpose === "video"
    ? "Tệp MP4, MOV, WEBM, MKV hoặc thư mục nguồn"
    : purpose === "voice"
      ? "Thư mục chứa 01.wav, 02.wav … mỗi câu một tệp"
      : purpose === "voice-ref"
        ? "Một tệp WAV ~10-12 giây, đúng lời với nội dung nhập bên dưới"
        : "Tệp ghi chú, ảnh hoặc thư mục của bản trước";
  const help = issue || invalid
    ? <span id={messageId} className="vs-validation-message is-error" role="alert"><WarningFilled />{issue || (notAFolder ? "Hãy chọn thư mục chứa các tệp audio, không phải một tệp lẻ." : notAFile ? "Hãy chọn một tệp WAV, không phải thư mục." : "Không tìm thấy tệp hoặc thư mục. Chọn lại nguồn hoặc sửa đường dẫn đầy đủ.")}</span>
    : undefined;

  function updatePath(next: string) {
    setIssue(null);
    setCheck(null);
    setChecking(!!next.trim());
    onChange(next);
  }

  async function choose(kind: "file" | "directory") {
    setIssue(null);
    setPicking(true);
    try {
      const result = await api<PickerResult>("/api/fs-picker", { method: "POST", json: { kind, purpose } });
      if (result.cancelled) return;
      setManual(false);
      setChecking(false);
      setCheck({ exists: true, dir: result.dir, files: result.files, name: result.name, size: result.size });
      onChange(result.path);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : "Không thể mở trình chọn tệp.");
      setManual(true);
      requestAnimationFrame(() => manualInput.current?.focus());
    } finally {
      setPicking(false);
    }
  }

  const items: MenuProps["items"] = [
    ...(purpose === "voice" ? [] : [{ key: "file", icon: <FileOutlined />, label: purpose === "video" ? "Chọn một tệp video" : purpose === "voice-ref" ? "Chọn một tệp WAV" : "Chọn một tệp" }]),
    ...(purpose === "voice-ref" ? [] : [{ key: "directory", icon: <FolderOpenOutlined />, label: "Chọn một thư mục" }]),
    { type: "divider" as const },
    { key: "manual", icon: <EditOutlined />, label: "Nhập đường dẫn thủ công" },
  ];
  if (value) items.push({ key: "clear", icon: <DeleteOutlined />, label: "Bỏ lựa chọn", danger: true });

  const onMenuClick: NonNullable<MenuProps["onClick"]> = ({ key }) => {
    if (key === "file" || key === "directory") {
      void choose(key);
      return;
    }
    if (key === "manual") {
      setManual(true);
      setIssue(null);
      requestAnimationFrame(() => manualInput.current?.focus());
      return;
    }
    if (key === "clear") {
      setManual(false);
      updatePath("");
    }
  };

  return <Form.Item className="field vs-source-field" label={<span className="vs-field-label">{label}</span>} validateStatus={invalid ? "error" : checking ? "validating" : check?.exists ? "success" : undefined} help={help}>
    <Dropdown disabled={disabled || picking} trigger={["click"]} placement="bottomLeft" menu={{ items, onClick: onMenuClick }}>
      <button
        type="button"
        className={`vs-source-picker ${value ? "is-selected" : ""} ${invalid || issue ? "is-invalid" : ""}`}
        disabled={disabled || picking}
        aria-invalid={!manual && invalid || undefined}
        aria-describedby={help ? messageId : undefined}
        data-validation-pending={!manual && checking || undefined}
      >
        <span className="vs-source-picker-icon" aria-hidden="true">
          {picking || checking ? <LoadingOutlined spin /> : invalid || issue ? <WarningFilled /> : value && check?.dir ? <FolderOpenOutlined /> : value ? <FileOutlined /> : <InboxOutlined />}
        </span>
        <span className="vs-source-picker-copy">
          <strong>{picking ? "Đang mở trình chọn…" : value ? selectedName : idleTitle}</strong>
          <small title={value || undefined}>{value || idleHint}</small>
          <span className="vs-source-picker-meta">{value ? selectedMeta : purpose === "voice" ? "Nhấp để chọn thư mục" : purpose === "voice-ref" ? "Nhấp để chọn tệp WAV" : "Nhấp để chọn tệp hoặc thư mục"}</span>
        </span>
        <span className="vs-source-picker-action" aria-hidden="true"><DownOutlined /></span>
      </button>
    </Dropdown>
    {manual && <div className="vs-source-manual">
      <Input
        ref={manualInput}
        value={value}
        disabled={disabled}
        status={invalid ? "error" : undefined}
        aria-label={`Đường dẫn thủ công cho ${label}`}
        aria-invalid={invalid || undefined}
        aria-describedby={help ? messageId : undefined}
        data-validation-pending={checking || undefined}
        onChange={(event) => updatePath(event.target.value)}
        placeholder={purpose === "voice" ? "/home/…/thư-mục-audio" : purpose === "voice-ref" ? "/home/…/mau-giong.wav" : "/home/…/tệp-hoặc-thư-mục"}
        spellCheck={false}
        autoComplete="off"
        allowClear
      />
      <Button type="link" size="small" onClick={() => setManual(false)}>Ẩn nhập thủ công</Button>
    </div>}
  </Form.Item>;
}
