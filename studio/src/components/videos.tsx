"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { api, useKeyStatus } from "@/lib/client";
import type { StageId, VideoSummary } from "@/lib/types";
import { Shell } from "./shell";
import { StageBadge } from "./agent-panel";

const LABELS: [StageId, string][] = [["cues", "Cue"], ["voice", "Giọng"], ["scenes", "Cảnh"], ["render", "MP4"], ["deliver", "Bàn giao"]];

export default function Videos() {
  const [videos, setVideos] = useState<VideoSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { hasKey } = useKeyStatus();
  useEffect(() => { api<VideoSummary[]>("/api/videos").then(setVideos).catch((e) => setError(e.message)); }, []);
  return <Shell page="videos" crumb="Các video" hasKey={hasKey}>
    <div className="page-heading"><div><div className="eyebrow"><span className="tiny-mark" /> projects/</div><h1>Các video</h1></div></div>
    {error && <div className="feedback feedback-error"><p>{error}</p></div>}
    <section className="editor-panel">
      <div className="vs-table-wrap"><table className="vs-table">
        <thead><tr><th>Video</th><th>Ngày</th>{LABELS.map(([, l]) => <th key={l}>{l}</th>)}<th /></tr></thead>
        <tbody>{videos?.map((v) => <tr key={v.id}>
          <td><strong>{v.id}</strong>{v.title !== v.id && <small>{v.title}</small>}{!v.managed && <small>làm ngoài Video Studio</small>}</td>
          <td>{v.day || "—"}</td>
          {LABELS.map(([s]) => <td key={s}><StageBadge status={v.stages[s]} /></td>)}
          <td><a className="text-button" href={`/?id=${v.id}`}>{v.running ? <CircleNotch size={14} className="spin" /> : null}Mở<ArrowRight size={14} /></a></td>
        </tr>)}</tbody>
      </table></div>
      {videos && !videos.length && <div className="step-empty"><h3>Chưa có video</h3></div>}
    </section>
    <footer className="workspace-footer" />
  </Shell>;
}
