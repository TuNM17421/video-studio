"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppstoreOutlined,
  DownOutlined,
  ExportOutlined,
  PlayCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Alert, Button, Drawer, Empty, Input, Select, Spin, Tag } from "antd";
import { api, dsUrl, fileUrl } from "@/lib/client";
import type { Library as LibraryData, LibraryComponent, StyleDef } from "@/lib/types";
import { Shell, type LibrarySection } from "./shell";
import { StyleShowcase } from "./style-showcase";
import styles from "./library.module.css";

const PAGE_SIZE = 30;

function LoadingState({ label }: { label: string }) {
  return <div className={`${styles.loading} vs-loading-state`} role="status"><Spin size="small" /><span>{label}</span></div>;
}

function ComponentDrawer({ component, onClose, card }: { component: LibraryComponent; onClose: () => void; card: string | null }) {
  const [doc, setDoc] = useState<string | null>(() => component.doc ? null : "Component này chưa có tài liệu sử dụng.");

  useEffect(() => {
    if (component.doc) {
      api<string>(`/api/library/doc?doc=${encodeURIComponent(component.doc)}`)
        .then(setDoc)
        .catch(() => setDoc("Không tải được tài liệu component."));
    }
  }, [component]);

  return <Drawer
    className={`vs-drawer ${styles.drawer}`}
    open
    title={<div className={styles.drawerTitle}>
      <span className={styles.drawerEyebrow}>{component.group}{component.lab ? " · Lesson Lab Style" : ""}</span>
      <h2>{component.name}</h2>
    </div>}
    size={560}
    onClose={onClose}
    destroyOnHidden
  >
    {component.image && <div className={styles.drawerPreview}>
      <img className="vs-drawer-image" src={fileUrl(`styles/previews/${component.image}`)} alt={`Preview component ${component.name}`} />
    </div>}
    {card && <Button className={styles.drawerLink} type="link" href={dsUrl(card)} target="_blank" rel="noreferrer" icon={<ExportOutlined />} iconPlacement="end">Xem card nhóm {component.group}</Button>}
    <div className={styles.docHeader}><span>Tài liệu sử dụng</span><code>{component.doc ? "PROMPT.MD" : "NO DOC"}</code></div>
    {doc === null ? <LoadingState label="Đang tải tài liệu…" /> : <pre className={`vs-doc ${styles.doc}`}>{doc}</pre>}
  </Drawer>;
}

export default function Library({ section }: { section: LibrarySection }) {
  const [styleDefinitions, setStyleDefinitions] = useState<StyleDef[]>([]);
  const [lib, setLib] = useState<LibraryData | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [open, setOpen] = useState<LibraryComponent | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [stylesError, setStylesError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    api<StyleDef[]>("/api/styles")
      .then(setStyleDefinitions)
      .catch((error) => setStylesError(error instanceof Error ? error.message : String(error)));
    api<LibraryData>("/api/library")
      .then((library) => {
        setLib(library);
        setVideo(library.videos[0]?.id ?? null);
      })
      .catch((error) => setLibraryError(error instanceof Error ? error.message : String(error)));
  }, []);

  const allComponents = useMemo(() => lib?.groups.flatMap((item) => item.components) ?? [], [lib]);
  const components = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allComponents.filter((component) => (
      (group === "all" || component.group === group)
      && (!normalizedQuery || component.name.toLowerCase().includes(normalizedQuery) || component.group.toLowerCase().includes(normalizedQuery))
    ));
  }, [allComponents, query, group]);
  const visibleComponents = components.slice(0, visibleCount);
  const cardOf = (groupId: string) => lib?.groups.find((item) => item.id === groupId)?.card ?? null;
  const activeVideo = lib?.videos.find((item) => item.id === video) ?? null;

  const panels = {
    styles: <div className={styles.styleStack}>
      {/* each style below carries its own visible h2; the page itself no longer has a title band */}
      <h1 className="sr-only">Style — ngôn ngữ hình ảnh</h1>
      {stylesError && <Alert className="feedback" type="error" showIcon title="Không tải được style" description={stylesError} />}
      {!styleDefinitions.length && !stylesError && <LoadingState label="Đang tải style…" />}
      {styleDefinitions.map((style, index) => <section key={style.id} className={styles.stylePanel}>
        <header className={styles.styleHeading}>
          <span className={styles.styleNumber}>{String(index + 1).padStart(2, "0")}</span>
          <div className={styles.styleIntro}>
            <span className={styles.sectionEyebrow}>Visual language</span>
            <h2>{style.name}</h2>
            <p>{style.summary}</p>
          </div>
          <Tag className={styles.fileTag}>styles/{style.id}.json</Tag>
        </header>
        <div className={styles.styleContent}>
          <StyleShowcase style={style} collapsible />
          <div className={styles.rulesBlock}>
            <div className={styles.rulesHeading}><span>Quy chuẩn triển khai</span><strong>{String(style.rules.length).padStart(2, "0")} luật</strong></div>
            <ol>{style.rules.map((rule, ruleIndex) => <li key={rule}><span>{String(ruleIndex + 1).padStart(2, "0")}</span><p>{rule}</p></li>)}</ol>
          </div>
        </div>
      </section>)}
    </div>,
    components: <section className={styles.catalogPanel}>
      <header className={styles.catalogHeader}>
        <div><span className={styles.sectionEyebrow}>Component index</span><h1>Khối dựng cảnh</h1><p>Tìm theo tên hoặc nhóm, sau đó mở card để đọc đúng contract sử dụng.</p></div>
        <span className={styles.catalogTotal}><strong>{allComponents.length || "—"}</strong> component</span>
      </header>
      <div className={styles.filterBar}>
        <Input.Search
          className={styles.search}
          allowClear
          value={query}
          onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }}
          placeholder="Tìm component…"
          aria-label="Tìm component"
        />
        <Select
          className={styles.groupSelect}
          aria-label="Nhóm component"
          value={group}
          onChange={(value) => { setGroup(value); setVisibleCount(PAGE_SIZE); }}
          options={[
            { value: "all", label: "Tất cả nhóm" },
            ...(lib?.groups.map((item) => ({ value: item.id, label: `${item.id} (${item.components.length})` })) ?? []),
          ]}
        />
        <span className={styles.resultCount}>Hiển thị <strong>{Math.min(visibleCount, components.length)}</strong> / {components.length}</span>
      </div>
      {libraryError && <Alert className={styles.feedback} type="error" showIcon title="Không tải được component" description={libraryError} />}
      {!lib && !libraryError && <LoadingState label="Đang lập chỉ mục component…" />}
      {lib && !components.length && <Empty className={styles.empty} image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có component phù hợp. Đổi từ khóa hoặc chọn nhóm khác." />}
      <ul className={styles.componentGrid}>{visibleComponents.map((component, index) => <li key={`${component.group}-${component.name}`}>
        <Button type="text" className={styles.componentCard} onClick={() => setOpen(component)}>
          <span className={styles.componentPreview}>
            {component.image
              ? <img src={fileUrl(`styles/previews/${component.image}`)} alt="" loading="lazy" />
              : <AppstoreOutlined />}
            <span className={styles.componentIndex}>{String(index + 1).padStart(2, "0")}</span>
          </span>
          <span className={styles.componentCopy}>
            <span><strong>{component.name}</strong>{component.lab && <em>LAB</em>}</span>
            <small>{component.group}</small>
          </span>
          <RightOutlined className={styles.componentArrow} aria-hidden="true" />
        </Button>
      </li>)}</ul>
      {visibleCount < components.length && <div className={styles.loadMore}><span>Còn {components.length - visibleCount} component chưa hiển thị</span><Button icon={<DownOutlined />} iconPlacement="end" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Hiển thị thêm</Button></div>}
    </section>,
    videos: <section className={styles.videoPanel}>
      <header className={styles.catalogHeader}>
        <div><span className={styles.sectionEyebrow}>Reference cuts</span><h1>Bản dựng tham chiếu</h1><p>Đối chiếu nhịp cảnh, caption và chuyển động trước khi bắt đầu video mới.</p></div>
        <span className={styles.catalogTotal}><strong>{lib?.videos.length || "—"}</strong> video</span>
      </header>
      {libraryError && <Alert className={styles.feedback} type="error" showIcon title="Không tải được video mẫu" description={libraryError} />}
      {!lib && !libraryError && <LoadingState label="Đang tải video mẫu…" />}
      {lib && !lib.videos.length && <Empty className={styles.empty} image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có video mẫu" />}
      {!!lib?.videos.length && <div className={styles.videoWorkspace}>
        <aside className={styles.videoList} aria-label="Danh sách video mẫu">
          <div className={styles.listHeading}><span>Danh sách bản dựng</span><strong>{String(lib.videos.length).padStart(2, "0")}</strong></div>
          {lib.videos.map((item, index) => <Button
            key={item.id}
            type="text"
            className={`${styles.videoChoice} ${video === item.id ? styles.videoChoiceActive : ""}`}
            onClick={() => setVideo(item.id)}
            aria-pressed={video === item.id}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.id}</strong>
            <PlayCircleOutlined aria-hidden="true" />
          </Button>)}
        </aside>
        {activeVideo && <div className={styles.videoStage}>
          <div className={styles.stageHeader}><div><span>Đang xem</span><strong>{activeVideo.id}</strong></div><code>16:9 · 1920×1080</code></div>
          <div className={styles.frame}><iframe title={activeVideo.id} src={dsUrl(activeVideo.player)} /></div>
        </div>}
      </div>}
    </section>,
  } satisfies Record<LibrarySection, React.ReactNode>;

  return <Shell page="library" section={section}>
    <div className={styles.root}>
      {panels[section]}
      <footer className={styles.footer}>vinuni-lesson-video-ds <span>·</span> production reference library</footer>
    </div>
    {open && <ComponentDrawer key={`${open.group}-${open.name}`} component={open} card={cardOf(open.group)} onClose={() => setOpen(null)} />}
  </Shell>;
}
