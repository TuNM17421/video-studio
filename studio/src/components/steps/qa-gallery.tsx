"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Collapse, Modal, Pagination, Segmented } from "antd";
import { fileUrl } from "@/lib/client";
import type { VideoDetail } from "@/lib/types";

const PAGE_SIZE = 24;
type Severity = "blocker" | "major" | "minor";

/** One scene of the QA set: the still the reviewer graded, and any extra frames shot by hand. */
interface QaScene {
  scene: number | null;
  main: string;
  extras: string[];
}

const fileOf = (path: string) => path.split("/").pop() || path;
const sceneLabel = (scene: number | null) => scene === null ? "Ảnh kiểm tra tổng" : `Cảnh ${String(scene).padStart(2, "0")}`;

/** "f040" for a hand-shot mid-animation frame, "ảnh agent" for its plain one, "ảnh review" for the gate's. */
function frameLabel(path: string) {
  const file = fileOf(path);
  const frame = file.match(/-f(\d+)\./i);
  if (frame) return `frame ${frame[1]}`;
  return path.includes("/qa/auto/") ? "ảnh review" : "ảnh agent";
}

/**
 * cue-NN.png from the scene gate (qa/auto/) is the main still — it is what the cross-review graded. The
 * agent's own sNN.png and sNN-fNNN.png become extra frames of the same scene, seen in the lightbox.
 */
function scenesOf(paths: string[]): QaScene[] {
  const byScene = new Map<number, string[]>();
  const other: QaScene[] = [];
  for (const path of paths) {
    const match = fileOf(path).match(/^(?:s|cue-)(\d+)(?:-f\d+)?\.(?:png|jpe?g)$/i);
    if (!match) { other.push({ scene: null, main: path, extras: [] }); continue; }
    const n = Number(match[1]);
    byScene.set(n, [...(byScene.get(n) ?? []), path]);
  }
  const rank = (p: string) => p.includes("/qa/auto/") ? 0 : /-f\d+\./i.test(fileOf(p)) ? 2 : 1;
  return [...[...byScene].sort(([a], [b]) => a - b).map(([scene, list]) => {
    const [main, ...extras] = [...list].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    return { scene, main, extras };
  }), ...other];
}

/** Worst open cross-review severity per scene, for a dot on its thumbnail and the "Có lỗi" filter. */
export function findingMarks(findings: VideoDetail["findings"]) {
  const rank = { blocker: 0, major: 1, minor: 2 } as const;
  const marks = new Map<number, Severity>();
  for (const f of findings) {
    if (!["open", "planned", "applied"].includes(f.status)) continue;
    const n = Number(f.scope?.match(/cue-0*(\d+)/)?.[1] ?? NaN);
    if (Number.isNaN(n)) continue;
    const had = marks.get(n);
    if (!had || rank[f.severity] < rank[had]) marks.set(n, f.severity);
  }
  return marks;
}

function Lightbox({ scenes, index, onClose, onMove }: { scenes: QaScene[]; index: number; onClose: () => void; onMove: (index: number) => void }) {
  const item = scenes[index];
  const frames = [item.main, ...item.extras];
  const [shown, setShown] = useState(item.main);
  const current = frames.includes(shown) ? shown : item.main;
  const actions = useRef({ onMove, index, length: scenes.length });
  useEffect(() => { actions.current = { onMove, index, length: scenes.length }; }, [index, onMove, scenes.length]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const a = actions.current;
      if (event.key === "ArrowLeft" && a.index > 0) { event.preventDefault(); a.onMove(a.index - 1); }
      if (event.key === "ArrowRight" && a.index < a.length - 1) { event.preventDefault(); a.onMove(a.index + 1); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return <Modal className="vs-lightbox-dialog" open centered width="min(1180px, 92vw)" footer={null} onCancel={onClose}
    title={<div><span className="quiet-label">ẢNH QA · {index + 1}/{scenes.length}</span><h2>{sceneLabel(item.scene)}</h2></div>}>
    <div className="vs-lightbox-image">
      <Button type="text" className="vs-lightbox-nav is-previous" aria-label="Cảnh trước" disabled={index === 0} icon={<LeftOutlined />} onClick={() => onMove(index - 1)} />
      <img src={fileUrl(current)} alt={`Ảnh QA ${sceneLabel(item.scene)}`} />
      <Button type="text" className="vs-lightbox-nav is-next" aria-label="Cảnh tiếp theo" disabled={index === scenes.length - 1} icon={<RightOutlined />} onClick={() => onMove(index + 1)} />
    </div>
    {frames.length > 1 && <div className="vs-lightbox-frames" role="group" aria-label="Các ảnh của cảnh này">
      {frames.map((path) => <Button key={path} size="small" type={path === current ? "primary" : "default"} onClick={() => setShown(path)}>{frameLabel(path)}</Button>)}
    </div>}
    <div className="vs-lightbox-file mono">{fileOf(current)}</div>
  </Modal>;
}

/**
 * Every scene's still, folded away: the cross-review has already looked at all of them, so the grid is for
 * when the user wants to look too. Opening it on "Có lỗi" is one click for a 50-scene video.
 */
export function QaGallery({ paths, marks }: { paths: string[]; marks: Map<number, Severity> }) {
  const [filter, setFilter] = useState<"all" | "flagged">("all");
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const scenes = useMemo(() => scenesOf(paths), [paths]);
  const flagged = scenes.filter((s) => s.scene !== null && marks.has(s.scene));
  const shown = filter === "flagged" ? flagged : scenes;
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = shown.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  if (!scenes.length) return null;

  return <Collapse className="vs-qa-section" items={[{
    key: "qa",
    label: <span className="vs-qa-label">Xem tất cả cảnh <span className="quiet-label">{scenes.length} ảnh{flagged.length ? ` · ${flagged.length} cảnh còn lỗi` : ""}</span></span>,
    children: <>
      <div className="vs-qa-toolbar">
        <Segmented size="small" aria-label="Lọc ảnh QA" value={filter} onChange={(value) => { setFilter(value as "all" | "flagged"); setPage(0); }}
          options={[{ value: "all", label: "Tất cả" }, { value: "flagged", label: `Có lỗi (${flagged.length})`, disabled: !flagged.length }]} />
        <span className="vs-qa-count">Bấm một ảnh để xem lớn · ← → chuyển cảnh</span>
      </div>
      <ul className="vs-qa">{visible.map((item) => {
        const index = shown.indexOf(item);
        const mark = item.scene === null ? undefined : marks.get(item.scene);
        return <li key={item.main}><Button type="text" title={fileOf(item.main)} aria-label={`Mở ${sceneLabel(item.scene)}`} onClick={() => setZoom(index)}>
          <img src={fileUrl(item.main)} alt="" loading="lazy" />
          {mark && <i className={`vs-qa-mark is-${mark}`} title={`Còn lỗi ${mark} từ review chéo`} />}
          <span><strong>{item.scene === null ? "Ảnh tổng" : sceneLabel(item.scene)}</strong><small>{item.extras.length ? `+${item.extras.length} ảnh` : ""}</small></span>
        </Button></li>;
      })}</ul>
      {pageCount > 1 && <nav className="vs-qa-pagination" aria-label="Phân trang ảnh QA">
        <Pagination simple current={safePage + 1} pageSize={PAGE_SIZE} total={shown.length} showSizeChanger={false} onChange={(next) => setPage(next - 1)} />
      </nav>}
      {zoom !== null && shown[zoom] && <Lightbox key={shown[zoom].main} scenes={shown} index={zoom} onClose={() => setZoom(null)} onMove={setZoom} />}
    </>,
  }]} />;
}
