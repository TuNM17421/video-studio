"use client";

import type { ReactNode } from "react";
import { BookOutlined, KeyOutlined, PlusOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Badge, Layout, Menu } from "antd";
import Link from "next/link";

type Page = "new" | "library" | "videos";

export function Shell({ page, hasKey, children }: { page: Page; hasKey?: boolean; children: ReactNode }) {
  const navigation = [
    { key: "new", icon: <PlusOutlined />, label: <Link href="/">Video mới</Link> },
    { key: "videos", icon: <UnorderedListOutlined />, label: <Link href="/videos">Các video</Link> },
    { key: "library", icon: <BookOutlined />, label: <Link href="/library">Thư viện</Link> },
  ];
  return <Layout className="studio-shell">
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <Layout.Sider width={224} theme="light" className="sidebar">
      <Link className="brand vs-brand" href="/" aria-label="Video Studio — trang chủ"><span className="brand-mark"><span /><span /><span /><span /></span><span>Video Studio</span></Link>
      <div className="workspace-label">AI IN ACTION 20K</div>
      <Menu className="vs-sidebar-menu" mode="inline" selectedKeys={[page]} items={navigation} aria-label="Điều hướng" />
      <div className="sidebar-bottom">
        {hasKey !== undefined && <div className="sidebar-item vs-key-status" title="API key ElevenLabs của phiên này"><KeyOutlined /><span>ElevenLabs</span><Badge status={hasKey ? "success" : "default"} /></div>}
        <div className="sidebar-footer"><span>VIDEO STUDIO</span><span>vinuni-lesson-video-ds</span></div>
      </div>
    </Layout.Sider>
    <Layout className="workspace">
      <Layout.Content id="main-content" className="main-content">{children}</Layout.Content>
    </Layout>
  </Layout>;
}
