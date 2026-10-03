"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckOutlined, CloseCircleFilled, CheckCircleFilled, CopyOutlined, DownloadOutlined, ExportOutlined, EyeOutlined, FileTextOutlined, RedoOutlined, WarningFilled } from "@ant-design/icons";
import { Alert, Button, Modal, Popconfirm, Tag, Tooltip, Typography } from "antd";
import { api } from "@/lib/client";
import { scenePages } from "@/lib/client";
import type { BundleCheck, BundleReport, VideoDetail } from "@/lib/types";
import { SourcePickerField } from "../source-picker";
import { post } from "./shared";

type ImportReport = BundleReport;

/** Bảng kiểm của phép soát: một thư mục lệch vẫn render ra đủ frame, chỉ là cảnh trắng hoặc trôi so với lời. */
function CheckList({ report }: { report: ImportReport }) {
  return <ul className="vs-cd-checks">
    {report.checks.map((c: BundleCheck) => <li key={c.name} className={`is-${c.level}`}>
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
  format?: string;
  styleMissing?: boolean;
  images?: number;
}

const FORMAT_NAME: Record<string, string> = { "16x9": "ngang 16:9", "9x16": "dọc 9:16" };
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * Dựng cảnh bằng Claude Design thay vì agent ở máy: Studio sinh bản brief, người dùng dán sang
 * claude.ai/design, rồi mang kết quả về đây render.
 *
 * **Không có nút Gửi, và đó không phải thiếu sót.** Công cụ `DesignSync` đọc/ghi được file của project bên
 * đó nhưng không có method nào gửi prompt cho agent thiết kế, nên bước dán là việc của người. Đừng thêm nút
 * giả vờ gửi được — thứ Studio làm được là gom brief cho đúng, và đó mới là phần tốn công: lời đọc, thời
 * lượng **đo thật** của từng câu, và phần riêng của style, không lẫn đường dẫn của repo.
 */
export function ClaudeDesignPanel({ detail, act, busy, approved }: { detail: VideoDetail; act: (fn: () => Promise<unknown>) => Promise<boolean>; busy: boolean; approved: boolean }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const [folder, setFolder] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const id = detail.state.id;
  // Bản đang nằm trong Studio đến từ server, không phải từ state của panel: đổi bước hay tải lại trang vẫn còn.
  const imported = detail.claudeDesign?.imported ?? null;
  const pages = scenePages(detail);
  const format = detail.state.request.format || "16x9";
  const briefFormat = brief ? brief.format || "16x9" : null;
  const useImages = detail.images?.slots.filter((slot) => slot.decision?.action === "use").length ?? 0;

  const load = useCallback(() => api(`/api/videos/${id}/claude-design`) as Promise<{ brief: Brief | null }>, [id]);

  // Không tải được thì nói ra: im lặng ở đây làm panel hiện "Sinh brief" như chưa từng có brief nào.
  useEffect(() => {
    let alive = true;
    load()
      .then((data) => { if (alive) { setBrief(data.brief); setLoadError(null); } })
      .catch((e: unknown) => { if (alive) setLoadError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [load]);

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
                <Button size="small" disabled={busy} icon={<RedoOutlined />}>Sinh lại</Button>
              </Popconfirm>
            : <Button size="small" type="primary" disabled={busy || Boolean(loadError)} icon={<RedoOutlined />} onClick={generate}>Sinh brief</Button>}
          {brief && <Button size="small" icon={<EyeOutlined />} onClick={() => setPreview(true)}>Xem brief</Button>}
          {/* Một nút chính mỗi lúc: sao chép brief cho tới khi có bản nhập, sau đó nút chính là Duyệt ở thanh dưới. */}
          {brief && <Button size="small" type={imported ? "default" : "primary"} icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={copy}>
            {copied ? "Đã sao chép" : "Sao chép"}
          </Button>}
          {/* Server từ chối đổi chỗ dựng khi cảnh đã duyệt; nút bật mà bấm là lỗi thì thà đóng và nói vì sao. */}
          <Tooltip title={approved ? "Cảnh đã duyệt. Nhập lại một bản khác để mở lại bước này rồi mới đổi chỗ dựng." : undefined}>
            <Button size="small" type="text" disabled={busy || approved} onClick={() => act(() => post(`/api/videos/${id}/claude-design`, { action: "builder", value: "agent" }))}>
              Quay lại agent ở máy
            </Button>
          </Tooltip>
        </div>
      </header>

      <p className="vs-cd-lede">
        Studio gom brief, bạn dán sang{" "}
        <a href="https://claude.ai/design" target="_blank" rel="noreferrer">claude.ai/design <ExportOutlined /></a>{" "}
        rồi mang kết quả về đây render. Studio không gửi hộ được: bên đó không có đường nhận prompt từ ngoài.
      </p>

      {loadError && <Alert type="error" showIcon title="Không tải được brief đã sinh" description={loadError} />}

      {brief && briefFormat !== format && <Alert type="error" showIcon
        title={`Brief này viết cho khổ ${FORMAT_NAME[briefFormat || "16x9"] || briefFormat}, còn video là khổ ${FORMAT_NAME[format] || format}.`}
        description="Dán bản này sang thì bên kia dựng sai cỡ khung. Bấm Sinh lại để brief nói đúng khổ và cách bày của video." />}

      {brief?.styleMissing && <Alert type="warning" showIcon
        title={`Style ${detail.state.request.style} chưa có phần hướng dẫn cho Claude Design.`}
        description={`Brief vẫn dùng được nhưng thiếu phần riêng của style (thiếu file styles/${detail.state.request.style}.claude-design.md), nên bên kia sẽ tự chọn cách bày.`} />}

      {brief && (brief.images ?? 0) > 0 && <Alert type="info" showIcon
        title={`Brief nhắc tới ${brief.images} ảnh tư liệu đã duyệt.`}
        description={`Tải các file trong vinuni-lesson-video-ds/ui_kits/lesson-video/videos/${id}/img/ vào thư mục img/ của project bên đó trước khi dán brief. Lúc nhập về Studio tự chép lại đúng những file này.`} />}

      {brief && useImages !== (brief.images ?? 0) && <Alert type="warning" showIcon
        title="Ảnh tư liệu đã đổi sau khi sinh brief."
        description={`Đang duyệt dùng ${useImages} ảnh, brief ghi ${brief.images ?? 0}. Bấm Sinh lại trước khi dán sang.`} />}

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
        {imported && <Alert type="success" showIcon
          title={`Đang dùng bản nhập lúc ${when(imported.at)} · ${imported.files} file · ${imported.page}`}
          description={<>
            {approved ? "Bản này đã duyệt — bước Render sẽ chụp nó." : "Mở trình phát xem qua, rồi bấm Duyệt dựng cảnh ở thanh dưới để mở bước Render."}{" "}
            Kiểm tra tự động và review chéo của Studio không chạy trên bản dựng bên Claude Design.
            {pages && <>{" "}<a href={pages.player} target="_blank" rel="noreferrer">Mở trình phát <ExportOutlined /></a></>}
          </>} />}
        {imported && imported.checks.length > 0 && !report && <CheckList report={imported} />}
        <SourcePickerField label={imported ? "Nhập bản khác" : "Thư mục tải về"} purpose="scenes" value={folder} disabled={busy} onChange={(v) => { setFolder(v); setReport(null); }} />
        <div className="vs-cd-tools">
          <Button size="small" disabled={!folder || busy} onClick={scan}>Soát thư mục</Button>
          {/* Nhập lại là xoá bản đang dùng, và nếu bản ấy đã duyệt thì bước mở lại — hỏi trước. */}
          {imported
            ? <Popconfirm
                title="Thay bản đang dùng?"
                description={approved ? "Bản đã duyệt bị thay, bước Dựng cảnh mở lại và phải duyệt lần nữa trước khi render." : "Bản đang nằm trong Studio bị thay bằng thư mục này."}
                okText="Thay" cancelText="Thôi" disabled={!folder || busy || !report?.ok} onConfirm={bringIn}
              >
                <Button size="small" disabled={!folder || busy || !report?.ok}>Chép vào Studio</Button>
              </Popconfirm>
            : <Button size="small" type={brief && copied ? "primary" : "default"} disabled={!folder || busy || !report?.ok} onClick={bringIn}>Chép vào Studio</Button>}
        </div>
        {report && <CheckList report={report} />}
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
