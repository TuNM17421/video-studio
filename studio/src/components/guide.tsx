"use client";

import { useKeyStatus } from "@/lib/client";
import { ArtCues, ArtPlan, ArtRender, ArtRoles, ArtScenes, ArtVoice } from "./guide-art";
import { Shell } from "./shell";

/**
 * Trang Hướng dẫn: nhìn một lần là hiểu cả quy trình.
 *
 * Chủ trương là hình mang nghĩa, chữ chỉ chú thích — người mới cần thấy "cái gì biến thành cái gì",
 * và một đoạn văn dài không nói được điều đó nhanh bằng một hình. Mỗi bước vì thế gói trong ba dòng:
 * bạn làm gì, máy làm gì, khi nào coi là xong.
 */

const STEPS = [
  {
    n: 1,
    title: "Kế hoạch",
    art: <ArtPlan />,
    lead: "Chọn style, đặt mã video, thả tệp kịch bản vào.",
    you: "Chọn style và tải kịch bản lên",
    machine: "Studio dựng hồ sơ video và ghi yêu cầu cho agent",
    done: "Bấm “Tạo video và chạy agent”",
  },
  {
    n: 2,
    title: "Lời & cue",
    art: <ArtCues />,
    lead: "Agent cắt kịch bản thành từng câu, giữ nguyên văn từng chữ.",
    you: "Đọc lại, góp ý nếu cần, rồi duyệt",
    machine: "Agent viết cues.js — mỗi câu một dòng, đánh số",
    done: "Bấm duyệt bước này",
  },
  {
    n: 3,
    title: "Giọng đọc",
    art: <ArtVoice />,
    lead: "Ba nguồn giọng, chọn một: ElevenLabs, tự thu, hoặc model chạy dưới máy.",
    you: "Chọn nguồn và giọng",
    machine: "Studio ghép thành một bản thu liền, đo mốc từng từ",
    done: "Bản thu đã gắn vào video",
  },
  {
    n: 4,
    title: "Dựng cảnh",
    art: <ArtScenes />,
    lead: "Cảnh được dựng theo đúng độ dài giọng thật, không phải ước lượng.",
    you: "Xem ảnh QA, góp ý chỗ sai rồi duyệt",
    machine: "Agent dựng từng cảnh, tự chụp ảnh kiểm tra",
    done: "Bấm duyệt bước này",
  },
  {
    n: 5,
    title: "Render",
    art: <ArtRender />,
    lead: "Ghép khung hình, giọng và nhạc nền thành MP4.",
    you: "Chọn nhạc nền rồi bấm render",
    machine: "Studio chụp từng khung hình rồi ghép, kèm transcript và file chương",
    done: "Có MP4 để bàn giao",
  },
];

const FACTS = [
  { label: "Định dạng", value: "MP4 · 1920×1080 · 30 fps" },
  { label: "Thứ tự", value: "Giọng trước, cảnh sau" },
  { label: "Mỗi bước", value: "Bạn duyệt rồi mới đi tiếp" },
  { label: "Dừng giữa chừng", value: "Mở lại vẫn đúng chỗ cũ" },
];

export default function Guide() {
  const { hasKey } = useKeyStatus();
  return <Shell page="guide" hasKey={hasKey}>
    <div className="page-heading">
      <div>
        <div className="eyebrow"><span className="tiny-mark" /> hướng dẫn</div>
        <h1>Làm một video</h1>
      </div>
      <p>Năm bước, mỗi bước có một cổng duyệt. Không bước nào chạy trước khi bước trước được duyệt.</p>
    </div>

    <section className="vs-guide-facts" aria-label="Thông tin nhanh">
      {FACTS.map((f) => <div key={f.label}><span>{f.label}</span><strong>{f.value}</strong></div>)}
    </section>

    <section className="vs-guide-roles editor-panel">
      <div className="vs-guide-roles-copy">
        <h2>Ba vai trong mỗi video</h2>
        <p>
          <strong>Bạn</strong> quyết định và duyệt · <strong>Studio</strong> chạy những việc tốn máy
          (giọng, render) · <strong>Agent</strong> viết lời và dựng cảnh.
        </p>
        <p className="vs-guide-muted">Agent không bao giờ tự tiêu tiền: mọi thứ tốn phí đều do bạn bấm.</p>
      </div>
      <ArtRoles />
    </section>

    <ol className="vs-guide-steps">
      {STEPS.map((step) => <li key={step.n} className="vs-guide-step editor-panel">
        <div className="vs-guide-visual">{step.art}</div>
        <div className="vs-guide-copy">
          <div className="vs-guide-step-head">
            <span className="vs-guide-step-num">{step.n}</span>
            <h2>{step.title}</h2>
          </div>
          <p className="vs-guide-lead">{step.lead}</p>
          <dl className="vs-guide-split">
            <div><dt>Bạn</dt><dd>{step.you}</dd></div>
            <div><dt>Máy</dt><dd>{step.machine}</dd></div>
            <div><dt>Xong khi</dt><dd>{step.done}</dd></div>
          </dl>
        </div>
      </li>)}
    </ol>
  </Shell>;
}
