"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, MagnifyingGlass, PuzzlePiece, X } from "@phosphor-icons/react";
import { api, dsUrl, fileUrl, useKeyStatus } from "@/lib/client";
import type { Library as LibraryData, LibraryComponent, StyleDef } from "@/lib/types";
import { Shell } from "./shell";
import { StyleShowcase } from "./style-showcase";

type Tab = "styles" | "components" | "videos";

function ComponentDrawer({ component, onClose, card }: { component: LibraryComponent; onClose: () => void; card: string | null }) {
  const [doc, setDoc] = useState<string | null>(null);
  useEffect(() => {
    setDoc(null);
    if (component.doc) api<string>(`/api/library/doc?doc=${encodeURIComponent(component.doc)}`).then(setDoc).catch(() => setDoc(""));
  }, [component]);
  return <div className="vs-drawer-scrim" onClick={onClose}>
    <aside className="vs-drawer" role="dialog" aria-label={component.name} onClick={(e) => e.stopPropagation()}>
      <div className="vs-drawer-head">
        <div><span className="quiet-label">{component.group}{component.lab ? " · Lesson Lab Style" : ""}</span><h2>{component.name}</h2></div>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={20} /></button>
      </div>
      {component.image && <img className="vs-drawer-image" src={fileUrl(`styles/previews/${component.image}`)} alt="" />}
      {card && <a className="text-button" href={dsUrl(card)} target="_blank" rel="noreferrer">Xem card nhóm {component.group}<ArrowSquareOut size={13} /></a>}
      <pre className="vs-doc">{doc ?? "Đang tải…"}</pre>
    </aside>
  </div>;
}

export default function Library() {
  const [tab, setTab] = useState<Tab>("styles");
  const [styles, setStyles] = useState<StyleDef[]>([]);
  const [lib, setLib] = useState<LibraryData | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [open, setOpen] = useState<LibraryComponent | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const { hasKey } = useKeyStatus();
  useEffect(() => {
    api<StyleDef[]>("/api/styles").then(setStyles).catch(() => {});
    api<LibraryData>("/api/library").then((l) => { setLib(l); setVideo(l.videos[0]?.id ?? null); }).catch(() => {});
  }, []);
  const components = useMemo(() => {
    const all = lib?.groups.flatMap((g) => g.components) || [];
    const q = query.trim().toLowerCase();
    return all.filter((c) => (group === "all" || c.group === group) && (!q || c.name.toLowerCase().includes(q) || c.group.includes(q)));
  }, [lib, query, group]);
  const cardOf = (g: string) => lib?.groups.find((x) => x.id === g)?.card ?? null;

  return <Shell page="library" crumb="Thư viện" hasKey={hasKey}>
    <div className="page-heading"><div><div className="eyebrow"><span className="tiny-mark" /> vinuni-lesson-video-ds</div><h1>Thư viện</h1></div></div>
    <div className="vs-tabs" role="tablist">
      {([["styles", "Style"], ["components", "Component"], ["videos", "Video mẫu"]] as [Tab, string][]).map(([id, label]) =>
        <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {tab === "styles" && <div className="vs-stack">{styles.map((s) => <section key={s.id} className="editor-panel">
      <div className="panel-heading"><div><h2>{s.name}</h2><p>{s.summary}</p></div><span className="pill-label mono">styles/{s.id}.json</span></div>
      <div className="vs-section"><StyleShowcase style={s} />
        <h4 className="vs-rules-title">Luật</h4><ul className="vs-rules">{s.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
    </section>)}</div>}
    {tab === "components" && <section className="editor-panel">
      <div className="vs-filter">
        <label className="field vs-search"><span className="sr-only">Tìm component</span><MagnifyingGlass size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm component…" /></label>
        <label className="field"><span className="sr-only">Nhóm</span><select value={group} onChange={(e) => setGroup(e.target.value)}><option value="all">Tất cả nhóm</option>{lib?.groups.map((g) => <option key={g.id} value={g.id}>{g.id} ({g.components.length})</option>)}</select></label>
        <span className="quiet-label">{components.length} COMPONENT</span>
      </div>
      <ul className="vs-tiles vs-library-grid">{components.map((c) => <li key={`${c.group}-${c.name}`}>
        <button className="vs-tile" onClick={() => setOpen(c)}>
          <span className="vs-tile-image">{c.image ? <img src={fileUrl(`styles/previews/${c.image}`)} alt="" loading="lazy" /> : <PuzzlePiece size={26} weight="light" />}</span>
          <span className="vs-tile-name">{c.name}<small>{c.group}{c.lab && <em className="vs-lab">LAB</em>}</small></span>
        </button>
      </li>)}</ul>
    </section>}
    {tab === "videos" && <section className="editor-panel">
      <div className="vs-section vs-videos-tab">
        <div className="vs-video-list">{lib?.videos.map((v) => <button key={v.id} className={`scene-list-item ${video === v.id ? "is-selected" : ""}`} onClick={() => setVideo(v.id)}><span className="scene-list-copy"><strong>{v.id}</strong></span></button>)}</div>
        {video && <div className="slide-visual vs-preview-frame vs-video-frame"><iframe title={video} src={dsUrl(`ui_kits/lesson-video/videos/${video}/player.html`)} /></div>}
      </div>
    </section>}
    {open && <ComponentDrawer component={open} card={cardOf(open.group)} onClose={() => setOpen(null)} />}
    <footer className="workspace-footer" />
  </Shell>;
}
