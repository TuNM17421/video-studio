"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckOutlined, CloseCircleFilled, CheckCircleFilled, CopyOutlined, DownloadOutlined, ExportOutlined, EyeOutlined, FileTextOutlined, RedoOutlined, WarningFilled } from "@ant-design/icons";
import { Alert, Button, Modal, Popconfirm, Tag, Typography } from "antd";
import { api } from "@/lib/client";
import type { VideoDetail } from "@/lib/types";
import { SourcePickerField } from "../source-picker";
import { post } from "./shared";

interface BundleCheck { name: string; ok: boolean; detail: string; level: "ok" | "warning" | "problem" }
interface ImportReport { ok: boolean; page: string | null; files: number; dest: string; checks: BundleCheck[]; copied?: number }

/** Bảng kiểm của phép soát: một thư mục lệch vẫn render ra đủ frame, chỉ là cảnh trắng hoặc trôi so với lời. */
function CheckList({ report }: { report: ImportReport }) {
  return <ul className="vs-cd-checks">
    {report.checks.map((c) => <li key={c.name} className={`is-${c.level}`}>
      {c.ok ? <CheckCircleFilled /> : c.level === "warning" ? <WarningFilled /> : <CloseCircleFilled />}
      <b>{c.name}</b>
      <span>{c.detail}</span>
    </li>)}
  </ul>;
}

interface Brief {
  file: string;
  text: string;
  measured: boolean;
  cues: number;
  frames: number;
}

/**
 * Dựng cảnh bằng Claude Design thay vì agent ở máy: Studio sinh bản brief, người dùng dán sang
 * claude.ai/design, rồi mang kết quả về đây render.
 *
 * **Không có nút Gửi, và đó không phải thiếu sót.** Công cụ `DesignSync` đọc/ghi được file của project bên
 * đó nhưng không có method nào gửi prompt cho agent thiết kế, nên bước dán là việc của người. Đừng thêm nút
 * giả vờ gửi được — thứ Studio làm được là gom brief cho đúng, và đó mới là phần tốn công: lời đọc, thời
 * lượng **đo thật** của từng câu, và phần riêng của style, không lẫn đường dẫn của repo.
 */
export function ClaudeDesignPanel({ detail, act, busy }: { detail: VideoDetail; act: (fn: () => Promise<unknown>) => Promise<boolean>; busy: boolean }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const [folder, setFolder] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const id = detail.state.id;

  const load = useCallback(async () => {
    const data = await api(`/api/videos/${id}/claude-design`) as { brief: Brief | null };
    setBrief(data.brief);
  }, [id]);

  useEffect(() => { void load().catch(() => undefined).finally(() => setReady(true)); }, [load]);

  const generate = () => act(async () => {
    const data = await post(`/api/videos/${id}/claude-design`, { action: "prompt" }) as { brief: Brief };
    setBrief(data.brief);
    setCopied(false);
  });

  const scan = () => act(async () => {
    const data = await post(`/api/videos/${id}/claude-design`, { action: "scan", folder }) as { report: ImportReport };
    setReport(data.report);
  });

  const bringIn = () => act(async () => {
    const data = await post(`/api/videos/${id}/claude-design`, { action: "import", folder }) as { report: ImportReport };
    setReport(data.report);
  });

  const copy = async () => {
    if (!brief) return;
    await navigator.clipboard.writeText(brief.text);
    setCopied(true);
  };

  if (!ready) return null;

  return (
    <section className="vs-cd">
      <header className="vs-cd-head">
        <FileTextOutlined />
        <h3>Dựng bằng Claude Design</h3>
        {brief && <Tag color={brief.measured ? "blue" : "orange"}>
          {brief.cues} câu · {brief.frames.toLocaleString("vi-VN")} frame · {brief.measured ? "thời lượng đo thật" : "thời lượng ước"}
        </Tag>}
        <div className="vs-cd-tools">
          {brief
            ? <Popconfirm
                title="Sinh lại brief?"
                description="Bản hiện tại bị ghi đè. Làm vậy khi cues hoặc giọng vừa đổi; brief đã dán sang bên kia thì không đổi theo."
                okText="Sinh lại" cancelText="Thôi" onConfirm={generate}
              >
                <Button size="small" icon={<RedoOutlined />}>Sinh lại</Button>
              </Popconfirm>
            : <Button size="small" icon={<RedoOutlined />} onClick={generate}>Sinh brief</Button>}
          {brief && <Button size="small" icon={<EyeOutlined />} onClick={() => setPreview(true)}>Xem brief</Button>}
          {brief && <Button size="small" type="primary" icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={copy}>
            {copied ? "Đã sao chép" : "Sao chép"}
          </Button>}
          <Button size="small" type="text" onClick={() => act(() => post(`/api/videos/${id}/claude-design`, { action: "builder", value: "agent" }))}>
            Quay lại agent ở máy
          </Button>
        </div>
      </header>

      <p className="vs-cd-lede">
        Studio gom brief, bạn dán sang{" "}
        <a href="https://claude.ai/design" target="_blank" rel="noreferrer">claude.ai/design <ExportOutlined /></a>{" "}
        rồi mang kết quả về đây render. Studio không gửi hộ được: bên đó không có đường nhận prompt từ ngoài.
      </p>

      {brief && !brief.measured && <Alert type="warning" showIcon
        title="Thời lượng trong brief là ước lượng vì chưa thu giọng."
        description="Dựng theo số ước thì khi có giọng thật phải chỉnh lại nhịp. Sinh lại brief sau bước Giọng đọc để lấy số đo thật." />}

      {brief && <Typography.Text type="secondary" className="mono">{brief.file}</Typography.Text>}

      <div className="vs-cd-import">
        <span className="vs-field-label"><DownloadOutlined /> Mang kết quả về</span>
        <p className="vs-cd-lede">
          Dựng xong bên kia thì tải thư mục project về máy, chọn ở đây. Studio soát trước khi chép:
          thư mục thiếu file hay lệch tổng frame vẫn render ra đủ frame, chỉ là cảnh trắng hoặc trôi so với lời.
        </p>
        <SourcePickerField label="Thư mục tải về" purpose="scenes" value={folder} disabled={busy} onChange={(v) => { setFolder(v); setReport(null); }} />
        <div className="vs-cd-tools">
          <Button size="small" disabled={!folder || busy} onClick={scan}>Soát thư mục</Button>
          <Button size="small" type="primary" disabled={!folder || busy || !report?.ok} onClick={bringIn}>Chép vào Studio</Button>
        </div>
        {report && <CheckList report={report} />}
        {report?.copied !== undefined && <Alert type="success" showIcon
          title={`Đã chép ${report.copied} file vào ${report.dest}`}
          description="Sang bước Render để xuất MP4 với đúng giọng và nhạc nền của video này." />}
      </div>

      <Modal
        open={preview}
        onCancel={() => setPreview(false)}
        title={`Brief gửi Claude Design · ${brief?.cues ?? 0} câu`}
        width={900}
        footer={<>
          <Button onClick={() => setPreview(false)}>Đóng</Button>
          <Button type="primary" icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={copy}>
            {copied ? "Đã sao chép" : "Sao chép"}
          </Button>
        </>}
      >
        <pre className="vs-cd-preview">{brief?.text}</pre>
      </Modal>
    </section>
  );
}
