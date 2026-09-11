"use client";

import { CheckOutlined } from "@ant-design/icons";
import { Collapse, Empty, Radio } from "antd";
import { fileUrl } from "@/lib/client";
import type { PaletteColor, Showcase, StyleDef } from "@/lib/types";

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
      {style.sampleVideo
        ? <video className="video-player" src={fileUrl(style.sampleVideo)} controls preload="metadata" />
        : <Empty className="vs-sample-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có video mẫu" />}
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
      return <Radio key={s.id} value={s.id} className={`visual-style-option vs-style-option ${value === s.id ? "is-selected" : ""}`}>
        <span className="vs-style-strip" aria-hidden="true">{colors.map((c) => <span key={c.hex} style={{ background: c.hex }} />)}</span>
        <strong>{s.name}{value === s.id && <CheckOutlined aria-hidden="true" />}</strong>
        <small>{s.summary}</small>
      </Radio>;
    })}
  </Radio.Group>;
}
