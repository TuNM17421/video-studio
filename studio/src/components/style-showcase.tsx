"use client";

import { CheckOutlined } from "@ant-design/icons";
import { Collapse, Radio } from "antd";
import { SampleMedia } from "@/components/sample-media";
import { fileUrl } from "@/lib/client";
import type { PaletteColor, Showcase, StyleDef } from "@/lib/types";

const LAB_GROUPS = new Set(["brand", "code", "context", "control", "loop", "structure", "system", "table", "teaching", "ui"]);

const SIGNATURE_COMPONENTS = {
  lesson: ["GlassBox", "Flow", "ProbabilityBars"],
  lab: ["AgentLoop", "ChatWindow", "CodeBlock"],
  whiteboard: ["Whiteboard"],
} as const;

const EYEBROWS = { lesson: "Học liệu cốt lõi", lab: "Hệ thống tác tử", whiteboard: "Bảng trắng vẽ tay" } as const;

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
  const variant: keyof typeof EYEBROWS = style.showcase.some((item) => item.group === "whiteboard")
    ? "whiteboard"
    : style.showcase.some((item) => LAB_GROUPS.has(item.group)) ? "lab" : "lesson";
  const candidates = [...style.showcase, ...(style.base?.showcase || [])];
  const preferred = SIGNATURE_COMPONENTS[variant]
    .map((component) => candidates.find((item) => item.component === component))
    .filter((item): item is Showcase => Boolean(item));
  const remaining = candidates.filter((item) => !preferred.some((picked) => picked.image === item.image));
  const items = [...preferred, ...remaining].slice(0, 3);

  return {
    variant,
    eyebrow: EYEBROWS[variant],
    items,
    // two components of one group share a label — list it once (it is also the React key)
    tags: [...new Set(items.map((item) => SIGNATURE_LABELS[item.group] || item.component))],
  };
}

function StyleSpecimen({ style }: { style: StyleDef }) {
  const signature = signatureOf(style);
  return <span className={`vs-style-specimen is-${signature.variant}`} aria-hidden="true">
    <span className="vs-style-specimen-heading">
      <span>{signature.eyebrow}</span>
      <span>{signature.items.length} nét đặc trưng</span>
    </span>
    <span className="vs-style-scene">
      {signature.items.map((item, index) => <span key={item.image} className={`vs-style-scene-frame ${index === 0 ? "is-primary" : ""}`}>
        <img src={fileUrl(`styles/previews/${item.image}`)} alt="" />
        <span>{item.component}</span>
      </span>)}
    </span>
  </span>;
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

export function StylePicker({ styles, value, onChange, disabled, labelledBy }: { styles: StyleDef[]; value: string; onChange: (id: string) => void; disabled?: boolean; labelledBy?: string }) {
  return <Radio.Group className="vs-style-picker" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} aria-required="true" aria-labelledby={labelledBy}>
    {styles.map((s) => {
      const colors = [...(s.base?.palette || []), ...s.palette];
      const palette = s.base ? [...s.palette, ...s.base.palette] : s.palette;
      const signature = signatureOf(s);
      return <Radio key={s.id} value={s.id} className={`visual-style-option vs-style-option ${value === s.id ? "is-selected" : ""}`}>
        <StyleSpecimen style={s} />
        <span className="vs-style-copy">
          <strong>{s.name}{value === s.id && <span className="vs-style-selected"><CheckOutlined aria-hidden="true" /><span className="sr-only">Đã chọn</span></span>}</strong>
          <small>{s.summary}</small>
        </span>
        <span className="vs-style-footer">
          <span className="vs-style-tags">{signature.tags.map((tag) => <span key={tag}>{tag}</span>)}</span>
          <span className="vs-style-palette" title={colors.map((color) => color.name).join(" · ")}>
            <span className="vs-style-dots" aria-hidden="true">{palette.slice(0, 6).map((color, index) => <span key={`${color.hex}-${index}`} style={{ background: color.hex }} />)}</span>
            <span>{colors.length} màu</span>
          </span>
        </span>
      </Radio>;
    })}
  </Radio.Group>;
}
