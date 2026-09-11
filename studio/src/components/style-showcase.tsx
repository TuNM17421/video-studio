"use client";

import { Check, FilmSlate } from "@phosphor-icons/react";
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

/** Palette, representative components and sample video of one style (with its base style's first). */
export function StyleShowcase({ style }: { style: StyleDef }) {
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
        : <div className="vs-sample-empty"><FilmSlate size={28} weight="light" /><span>Chưa có video mẫu</span></div>}
    </div>
  </div>;
}

export function StylePicker({ styles, value, onChange, disabled }: { styles: StyleDef[]; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  return <fieldset className="vs-style-picker" disabled={disabled}><legend className="sr-only">Style</legend>
    {styles.map((s) => {
      const colors = [...(s.base?.palette || []), ...s.palette];
      return <label key={s.id} className={`visual-style-option vs-style-option ${value === s.id ? "is-selected" : ""}`}>
        <input type="radio" name="style" value={s.id} checked={value === s.id} onChange={() => onChange(s.id)} />
        <span className="vs-style-strip" aria-hidden="true">{colors.map((c) => <span key={c.hex} style={{ background: c.hex }} />)}</span>
        <strong>{s.name}{value === s.id && <Check size={14} weight="bold" aria-hidden="true" />}</strong>
        <small>{s.summary}</small>
      </label>;
    })}
  </fieldset>;
}
