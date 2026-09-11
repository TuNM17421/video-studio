"use client";

import { useEffect, useMemo, useState } from "react";
import { AppstoreOutlined, DownOutlined, ExportOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Empty, Input, Select, Spin, Tabs, Tag } from "antd";
import { api, dsUrl, fileUrl, useKeyStatus } from "@/lib/client";
import type { Library as LibraryData, LibraryComponent, StyleDef } from "@/lib/types";
import { Shell } from "./shell";
import { StyleShowcase } from "./style-showcase";

type Tab = "styles" | "components" | "videos";
const TABS: { id: Tab; label: string }[] = [
  { id: "styles", label: "Style" },
  { id: "components", label: "Component" },
  { id: "videos", label: "Video mẫu" },
];
const PAGE_SIZE = 30;

function LoadingState({ label }: { label: string }) {
  return <div className="vs-loading-state" role="status"><Spin size="small" /><span>{label}</span></div>;
}

function ComponentDrawer({ component, onClose, card }: { component: LibraryComponent; onClose: () => void; card: string | null }) {
  const [doc, setDoc] = useState<string | null>(null);
  useEffect(() => {
    if (component.doc) api<string>(`/api/library/doc?doc=${encodeURIComponent(component.doc)}`).then(setDoc).catch(() => setDoc("Không tải được tài liệu component."));
  }, [component]);
  return <Drawer className="vs-drawer" open title={<div><span className="quiet-label">{component.group}{component.lab ? " · Lesson Lab Style" : ""}</span><h2>{component.name}</h2></div>} size={560} onClose={onClose} destroyOnHidden>
      {component.image && <img className="vs-drawer-image" src={fileUrl(`styles/previews/${component.image}`)} alt={`Preview component ${component.name}`} />}
      {card && <Button type="link" href={dsUrl(card)} target="_blank" icon={<ExportOutlined />} iconPlacement="end">Xem card nhóm {component.group}</Button>}
      {doc === null ? <LoadingState label="Đang tải tài liệu…" /> : <pre className="vs-doc">{doc}</pre>}
    </Drawer>;
}

export default function Library() {
  const [tab, setTab] = useState<Tab>("styles");
  const [styles, setStyles] = useState<StyleDef[]>([]);
  const [lib, setLib] = useState<LibraryData | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [open, setOpen] = useState<LibraryComponent | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [stylesError, setStylesError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { hasKey } = useKeyStatus();
  useEffect(() => {
    api<StyleDef[]>("/api/styles").then(setStyles).catch((error) => setStylesError(error instanceof Error ? error.message : String(error)));
    api<LibraryData>("/api/library").then((l) => { setLib(l); setVideo(l.videos[0]?.id ?? null); }).catch((error) => setLibraryError(error instanceof Error ? error.message : String(error)));
  }, []);
  const components = useMemo(() => {
    const all = lib?.groups.flatMap((g) => g.components) || [];
    const q = query.trim().toLowerCase();
    return all.filter((c) => (group === "all" || c.group === group) && (!q || c.name.toLowerCase().includes(q) || c.group.includes(q)));
  }, [lib, query, group]);
  const visibleComponents = components.slice(0, visibleCount);
  const cardOf = (g: string) => lib?.groups.find((x) => x.id === g)?.card ?? null;
  const panels = {
    styles: <div className="vs-stack">
      {stylesError && <Alert className="feedback" type="error" showIcon message="Không tải được style" description={stylesError} />}
      {!styles.length && !stylesError && <LoadingState label="Đang tải style…" />}
      {styles.map((style) => <section key={style.id} className="editor-panel">
        <div className="panel-heading"><div><h2>{style.name}</h2><p>{style.summary}</p></div><Tag className="pill-label mono">styles/{style.id}.json</Tag></div>
        <div className="vs-section"><StyleShowcase style={style} collapsible />
          <h4 className="vs-rules-title">Luật</h4><ul className="vs-rules">{style.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </div>
      </section>)}
    </div>,
    components: <section className="editor-panel">
      <div className="vs-filter">
        <Input.Search className="vs-search" allowClear value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="Tìm component…" aria-label="Tìm component" />
        <Select aria-label="Nhóm component" value={group} onChange={(value) => { setGroup(value); setVisibleCount(PAGE_SIZE); }} options={[{ value: "all", label: "Tất cả nhóm" }, ...(lib?.groups.map((item) => ({ value: item.id, label: `${item.id} (${item.components.length})` })) || [])]} />
        <span className="quiet-label">HIỂN THỊ {Math.min(visibleCount, components.length)} / {components.length}</span>
      </div>
      {libraryError && <Alert className="feedback vs-library-feedback" type="error" showIcon message="Không tải được component" description={libraryError} />}
      {!lib && !libraryError && <LoadingState label="Đang lập chỉ mục component…" />}
      {lib && !components.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có component phù hợp. Đổi từ khóa hoặc chọn nhóm khác." />}
      <ul className="vs-tiles vs-library-grid">{visibleComponents.map((component) => <li key={`${component.group}-${component.name}`}>
        <Button type="text" className="vs-tile" onClick={() => setOpen(component)}>
          <span className="vs-tile-image">{component.image ? <img src={fileUrl(`styles/previews/${component.image}`)} alt="" loading="lazy" /> : <AppstoreOutlined />}</span>
          <span className="vs-tile-name">{component.name}<small>{component.group}{component.lab && <em className="vs-lab">LAB</em>}</small></span>
        </Button>
      </li>)}</ul>
      {visibleCount < components.length && <div className="vs-load-more"><span>Còn {components.length - visibleCount} component</span><Button icon={<DownOutlined />} iconPlacement="end" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Hiển thị thêm</Button></div>}
    </section>,
    videos: <section className="editor-panel">
      {libraryError && <Alert className="feedback vs-library-feedback" type="error" showIcon message="Không tải được video mẫu" description={libraryError} />}
      {!lib && !libraryError && <LoadingState label="Đang tải video mẫu…" />}
      <div className="vs-section vs-videos-tab">
        <div className="vs-video-list">{lib?.videos.map((item) => <Button key={item.id} type={video === item.id ? "primary" : "text"} className="scene-list-item" onClick={() => setVideo(item.id)}>{item.id}</Button>)}</div>
        {video && <div className="slide-visual vs-preview-frame vs-video-frame"><iframe title={video} src={dsUrl(`ui_kits/lesson-video/videos/${video}/player.html`)} /></div>}
      </div>
    </section>,
  } satisfies Record<Tab, React.ReactNode>;

  return <Shell page="library" crumb="Thư viện" hasKey={hasKey}>
    <div className="page-heading"><div><div className="eyebrow"><span className="tiny-mark" /> vinuni-lesson-video-ds</div><h1>Thư viện</h1></div></div>
    <Tabs className="vs-tabs" activeKey={tab} onChange={(key) => setTab(key as Tab)} items={TABS.map(({ id, label }) => ({ key: id, label, children: panels[id] }))} />
    {open && <ComponentDrawer component={open} card={cardOf(open.group)} onClose={() => setOpen(null)} />}
    <footer className="workspace-footer" />
  </Shell>;
}
