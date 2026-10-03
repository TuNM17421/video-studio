"use client";

import { useState } from "react";
import { CaretRightFilled } from "@ant-design/icons";
import { Collapse, Modal, Radio } from "antd";
import { SampleMedia } from "@/components/sample-media";
import { fileUrl } from "@/lib/client";
import type { PaletteColor, Showcase, StyleDef } from "@/lib/types";

const LAB_GROUPS = new Set(["brand", "code", "context", "control", "loop", "structure", "system", "table", "teaching", "ui"]);

const SIGNATURE_COMPONENTS = {
  lesson: ["GlassBox", "Flow", "ProbabilityBars"],
  lab: ["AgentLoop", "ChatWindow", "CodeBlock"],
  whiteboard: ["Whiteboard"],
} as const;

const SIGNATURE_LABELS: Record<string, string> = {
  cards: "Thẻ kiến thức",
  code: "Mã & công cụ",
  data: "Dữ liệu",
  flow: "Luồng trực quan",
  loop: "Vòng lặp agent",
  ui: "Giao diện",
  whiteboard: "Bảng vẽ tay",
};

function signatureOf(style: StyleDef) {
  const variant: keyof typeof SIGNATURE_COMPONENTS = style.showcase.some((item) => item.group === "whiteboard")
    ? "whiteboard"
    : style.showcase.some((item) => LAB_GROUPS.has(item.group)) ? "lab" : "lesson";
  const candidates = [...style.showcase, ...(style.base?.showcase || [])];
  const preferred = SIGNATURE_COMPONENTS[variant]
    .map((component) => candidates.find((item) => item.component === component))
    .filter((item): item is Showcase => Boolean(item));
  const remaining = candidates.filter((item) => !preferred.some((picked) => picked.image === item.image));
  const items = [...preferred, ...remaining].slice(0, 3);

  return {
    items,
    // two components of one group share a label — list it once (it is also the React key)
    tags: [...new Set(items.map((item) => SIGNATURE_LABELS[item.group] || item.component))],
  };
}

function Palette({ colors }: { colors: PaletteColor[] }) {
  return <ul className="vs-palette">{colors.map((c) => <li key={c.hex} title={`${c.name} · ${c.role}`}>
    <span className="vs-swatch" style={{ background: c.hex }} />
    <span className="vs-swatch-copy"><strong>{c.name}</strong><small className="mono">{c.hex}</small><small>{c.role}</small></span>
  </li>)}</ul>;
}

function Tiles({ items }: { items: Showcase[] }) {
  return <ul className="vs-tiles">{items.map((s) => <li key={`${s.group}-${s.component}`} className="vs-tile">
    <span className="vs-tile-image"><img src={fileUrl(`styles/previews/${s.image}`)} alt="" loading="lazy" /></span>
    <span className="vs-tile-name">{s.component}<small>{s.group}</small></span>
  </li>)}</ul>;
}

function ShowcaseContent({ style }: { style: StyleDef }) {
  return <div className="vs-showcase">
    <div className="vs-showcase-block">
      <h4>Màu</h4>
      {style.base && <><p className="vs-showcase-sub">Từ {style.base.name}</p><Palette colors={style.base.palette} /></>}
      {style.base && <p className="vs-showcase-sub is-added">Thêm trong {style.name}</p>}
      <Palette colors={style.palette} />
    </div>
    <div className="vs-showcase-block">
      <h4>Component tiêu biểu</h4>
      {style.base && <><p className="vs-showcase-sub">Từ {style.base.name}</p><Tiles items={style.base.showcase} /></>}
      {style.base && <p className="vs-showcase-sub is-added">Thêm trong {style.name}</p>}
      <Tiles items={style.showcase} />
    </div>
    <div className="vs-showcase-block">
      <h4>Video mẫu</h4>
      <SampleMedia asset={style.sampleVideo} />
    </div>
  </div>;
}

/** Palette, representative components and sample video of one style (with its base style's first). */
export function StyleShowcase({ style, collapsible = false }: { style: StyleDef; collapsible?: boolean }) {
  if (!collapsible) return <ShowcaseContent style={style} />;

  const colors = (style.base?.palette.length || 0) + style.palette.length;
  const components = (style.base?.showcase.length || 0) + style.showcase.length;
  return <Collapse
    className="vs-showcase-details"
    items={[{
      key: "showcase",
      label: <span className="vs-collapse-label"><strong>Khám phá {style.name}</strong><small>{colors} màu · {components} component tiêu biểu · video mẫu</small></span>,
      children: <ShowcaseContent style={style} />,
    }]}
  />;
}

/** The style's sample video in a dialog — the one look at a style the plan step keeps (the rest is in Thư viện). */
function SampleModal({ style, onClose }: { style: StyleDef | null; onClose: () => void }) {
  return <Modal open={!!style} onCancel={onClose} footer={null} width={900} destroyOnHidden title={style ? `Video mẫu · ${style.name}` : ""}>
    {style && <SampleMedia asset={style.sampleVideo} />}
  </Modal>;
}

export function StyleSampleButton({ style }: { style: StyleDef }) {
  const [open, setOpen] = useState(false);
  if (!style.sampleVideo) return null;
  return <>
    <button type="button" className="vs-module-play" onClick={() => setOpen(true)}><CaretRightFilled /><span>Xem video mẫu</span></button>
    <SampleModal style={open ? style : null} onClose={() => setOpen(false)} />
  </>;
}

/**
 * Chọn style ở bước Kế hoạch: mỗi style một hàng thấp (ảnh, tên, một dòng mô tả). Nhãn nhóm component, bảng
 * màu và nút xem video mẫu chỉ hiện cho style ĐANG CHỌN, ở dải bên dưới — ba thẻ đầy đủ từng cao khoảng
 * 350 px để bày chi tiết của cả hai style không được chọn.
 */
export function StylePicker({ styles, value, onChange, disabled, labelledBy }: { styles: StyleDef[]; value: string; onChange: (id: string) => void; disabled?: boolean; labelledBy?: string }) {
  const [sample, setSample] = useState<StyleDef | null>(null);
  const current = styles.find((s) => s.id === value);
  const colors = current ? [...(current.base?.palette || []), ...current.palette] : [];
  const palette = current ? (current.base ? [...current.palette, ...current.base.palette] : current.palette) : [];
  return <>
  <Radio.Group className="vs-style-rows" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} aria-required="true" aria-labelledby={labelledBy}>
    {styles.map((s) => {
      const thumb = signatureOf(s).items[0];
      return <Radio key={s.id} value={s.id} className={`vs-style-row ${value === s.id ? "is-selected" : ""}`}>
        {thumb && <img className="vs-style-row-thumb" src={fileUrl(`styles/previews/${thumb.image}`)} alt="" />}
        <span className="vs-style-row-copy">
          <strong>{s.name}{value === s.id && <span className="sr-only"> (đã chọn)</span>}</strong>
          <small title={s.summary}>{s.summary}</small>
        </span>
      </Radio>;
    })}
  </Radio.Group>
  {current && <div className="vs-style-detail" aria-live="polite">
    <strong>{current.name}</strong>
    <span className="vs-style-tags">{signatureOf(current).tags.map((tag) => <span key={tag}>{tag}</span>)}</span>
    <span className="vs-style-detail-palette" title={colors.map((color) => color.name).join(" · ")}>
      <span className="vs-style-dots" aria-hidden="true">{palette.slice(0, 6).map((color, index) => <span key={`${color.hex}-${index}`} style={{ background: color.hex }} />)}</span>
      <span>{colors.length} màu</span>
    </span>
    {current.sampleVideo && <button type="button" className="vs-module-play vs-style-detail-sample" onClick={() => setSample(current)}>
      <CaretRightFilled /><span>Xem video mẫu</span>
    </button>}
  </div>}
  <SampleModal style={sample} onClose={() => setSample(null)} />
  </>;
}
