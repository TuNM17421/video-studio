"use client";

import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { BookOutlined, KeyOutlined, PlusOutlined, UnorderedListOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { Badge, Breadcrumb, Button, Layout, Menu } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Page = "new" | "library" | "videos";
const SIDEBAR_STORAGE_KEY = "video-studio.sidebar-collapsed";
const SIDEBAR_CHANGE_EVENT = "video-studio:sidebar-change";
const DESKTOP_SIDEBAR_QUERY = "(min-width: 681px)";
const PAGE_ROUTES: Record<Page, string> = { new: "/", videos: "/videos", library: "/library" };
let sidebarCollapsedFallback = false;

function getSidebarCollapsed() {
  if (typeof window === "undefined" || !window.matchMedia(DESKTOP_SIDEBAR_QUERY).matches) return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return sidebarCollapsedFallback;
  }
}

function subscribeSidebarCollapsed(onStoreChange: () => void) {
  const desktop = window.matchMedia(DESKTOP_SIDEBAR_QUERY);
  const update = () => onStoreChange();
  desktop.addEventListener("change", update);
  window.addEventListener("storage", update);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, update);
  return () => {
    desktop.removeEventListener("change", update);
    window.removeEventListener("storage", update);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, update);
  };
}

function SidebarPanelIcon() {
  return <svg className="vs-sidebar-toggle-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2.75" y="3.25" width="14.5" height="13.5" rx="2.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 4v12" stroke="currentColor" strokeWidth="1.5" />
  </svg>;
}

export function Shell({ page, crumb, hasKey, actions, children }: { page: Page; crumb: string; hasKey?: boolean; actions?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const sidebarCollapsed = useSyncExternalStore(subscribeSidebarCollapsed, getSidebarCollapsed, () => false);
  const toggleSidebar = (event: MouseEvent<HTMLElement>) => {
    const next = !sidebarCollapsed;
    sidebarCollapsedFallback = next;
    try { window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0"); } catch {}
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
    // Pointer users expect the brand mark to return immediately after collapse;
    // keyboard activation keeps focus so the control remains discoverable.
    if (event.detail > 0) event.currentTarget.blur();
  };
  const navigation = [
    { key: "new", icon: <PlusOutlined />, label: <Link href="/" title="Video mới">Video mới</Link> },
    { key: "videos", icon: <UnorderedListOutlined />, label: <Link href="/videos" title="Các video">Các video</Link> },
    { key: "library", icon: <BookOutlined />, label: <Link href="/library" title="Thư viện">Thư viện</Link> },
  ];
  return <Layout className="studio-shell">
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <Layout.Sider width={232} collapsedWidth={72} collapsed={sidebarCollapsed} trigger={null} theme="light" className="sidebar">
      <div className="vs-sidebar-head">
        <Link className="brand vs-brand" href="/" aria-label="Video Studio — trang chủ" aria-hidden={sidebarCollapsed} tabIndex={sidebarCollapsed ? -1 : undefined}><span className="brand-mark"><span /><span /><span /><span /></span><span className="vs-brand-name">Video Studio</span></Link>
        <Button type="text" className="vs-sidebar-toggle" icon={<SidebarPanelIcon />} aria-label={sidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"} aria-controls="studio-sidebar-navigation" aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"} onClick={toggleSidebar} />
      </div>
      <div className="workspace-label">AI IN ACTION 20K</div>
      <Menu id="studio-sidebar-navigation" className="vs-sidebar-menu" mode="inline" inlineCollapsed={sidebarCollapsed} selectedKeys={[page]} items={navigation} aria-label="Điều hướng" onClick={({ key }) => { if (sidebarCollapsed) router.push(PAGE_ROUTES[key as Page]); }} />
      <div className="sidebar-bottom">
        {hasKey !== undefined && <div className="sidebar-item vs-key-status" role="status" aria-label={`ElevenLabs · ${hasKey ? "đã nhập key" : "chưa nhập key"}`} title={`ElevenLabs · ${hasKey ? "đã nhập key" : "chưa nhập key"}`}><KeyOutlined /><span className="vs-sidebar-label">ElevenLabs</span><Badge status={hasKey ? "success" : "default"} /></div>}
        <div className="sidebar-footer"><span>VIDEO STUDIO</span><span>vinuni-lesson-video-ds</span></div>
      </div>
    </Layout.Sider>
    <Layout className="workspace">
      <Layout.Header className="topbar">
        <Breadcrumb className="breadcrumb" items={[{ title: <span><VideoCameraOutlined /> Video Studio</span> }, { title: <strong>{crumb}</strong> }]} />
        <div className="topbar-actions">{actions}</div>
      </Layout.Header>
      <Layout.Content id="main-content" className="main-content">{children}</Layout.Content>
    </Layout>
  </Layout>;
}
