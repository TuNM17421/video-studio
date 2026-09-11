"use client";

import type { ReactNode } from "react";
import { Books, FilmStrip, Key, ListBullets, Plus } from "@phosphor-icons/react";

type Page = "new" | "library" | "videos";

export function Shell({ page, crumb, hasKey, actions, children }: { page: Page; crumb: string; hasKey?: boolean; actions?: ReactNode; children: ReactNode }) {
  const item = (id: Page, href: string, label: string, icon: ReactNode) => (
    <a className={`sidebar-item ${page === id ? "is-active" : ""}`} href={href} aria-current={page === id ? "page" : undefined}>
      {icon}<span>{label}</span>{page === id && <span className="sidebar-active-dot" />}
    </a>
  );
  return <div className="studio-shell">
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <aside className="sidebar">
      <a className="brand vs-brand" href="/" aria-label="Video Studio — trang chủ"><span className="brand-mark"><span /><span /><span /><span /></span><span>Video Studio</span></a>
      <div className="workspace-label">AI IN ACTION 20K</div>
      <nav aria-label="Điều hướng">
        {item("new", "/", "Video mới", <Plus size={20} weight={page === "new" ? "duotone" : "regular"} />)}
        {item("videos", "/videos", "Các video", <ListBullets size={20} />)}
        {item("library", "/library", "Thư viện", <Books size={20} />)}
      </nav>
      <div className="sidebar-bottom">
        {hasKey !== undefined && <div className="sidebar-item vs-key-status" title="API key ElevenLabs của phiên này"><Key size={20} /><span>ElevenLabs</span><span className={`connection-dot ${hasKey ? "is-connected" : ""}`} /></div>}
        <div className="sidebar-footer"><span>VIDEO STUDIO</span><span>vinuni-lesson-video-ds</span></div>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="breadcrumb"><FilmStrip size={16} /> Video Studio <span>/</span> <strong>{crumb}</strong></div>
        <div className="topbar-actions">{actions}</div>
      </header>
      <main id="main-content" className="main-content">{children}</main>
    </div>
  </div>;
}
