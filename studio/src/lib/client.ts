"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { endedJob } from "./job-notice";
import type { JobInfo, LogEntry, VideoDetail } from "./types";

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "content-type": "application/json", ...init?.headers } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const type = res.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`);
  return data as T;
}

export const fileUrl = (repoPath: string) => `/files/${repoPath.split("/").map(encodeURIComponent).join("/")}`;
export const dsUrl = (dsPath: string) => `/ds/${dsPath}`;

/** Cỡ khung của từng khổ — khớp `FORMATS` trong vinuni-lesson-video-ds/lib/tokens.js. */
export const FORMAT_SIZE: Record<string, { width: number; height: number; aspect: string; ratio: string }> = {
  "16x9": { width: 1920, height: 1080, aspect: "16:9", ratio: "16 / 9" },
  "9x16": { width: 1080, height: 1920, aspect: "9:16", ratio: "9 / 16" },
};
export const formatSize = (format?: string) => FORMAT_SIZE[format || "16x9"] || FORMAT_SIZE["16x9"];

/**
 * Trang mà bước Render sẽ chụp — cũng phải là trang khung xem trước và nút "Mở trình phát" cho thấy. Video
 * dựng bằng Claude Design render trang nhập về trong `ds-bundle/cd/<id>/`, không phải cảnh trong `videos/<id>/`:
 * trỏ nhầm sang bên kia là cho người dùng xem (và duyệt) một bản khác với bản sẽ ra MP4. Null khi chưa có gì.
 */
export function scenePages(detail: Pick<VideoDetail, "state" | "artifacts" | "claudeDesign">): { frame: (n: number) => string; player: string } | null {
  const id = detail.state.id;
  if (detail.claudeDesign) {
    const page = detail.claudeDesign.imported?.page;
    if (!page) return null;
    const url = `/ds-bundle/cd/${encodeURIComponent(id)}/${encodeURIComponent(page)}`;
    return { frame: (n) => `${url}?frame=${n}`, player: url };
  }
  if (!detail.artifacts.scenes) return null;
  return {
    frame: (n) => dsUrl(`ui_kits/lesson-video/index.html?scene=${encodeURIComponent(id)}&frame=${n}`),
    player: dsUrl(`ui_kits/lesson-video/videos/${id}/player.html`),
  };
}

export function formatFrames(frames: number | null | undefined) {
  if (!frames) return "—";
  const total = Math.round(frames / 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Video detail + live updates (SSE): log lines and job progress stream in; "state" triggers a refetch.
 * `onJobEnd` hears the end of a job this page watched running — from the event stream, or from a refetch
 * when the stream missed it — once, and never for a job that had already ended when the page opened.
 */
export function useVideo(id: string | null, onJobEnd?: (job: JobInfo) => void) {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [job, setJob] = useState<JobInfo | null>(null);
  const alive = useRef(true);
  const lastJob = useRef<JobInfo | null>(null);
  // A refetch that left before the job ended can land after the event that ended it and show it running
  // again; the next update ends it a second time. One announcement per run, keyed by its start.
  const announced = useRef<number | null>(null);
  const endHandler = useRef(onJobEnd);
  useEffect(() => { endHandler.current = onJobEnd; }, [onJobEnd]);
  const takeJob = useCallback((next: JobInfo | null) => {
    const ended = endedJob(lastJob.current, next);
    lastJob.current = next;
    setJob(next);
    if (ended && ended.startedAt !== announced.current) {
      announced.current = ended.startedAt;
      endHandler.current?.(ended);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const d = await api<VideoDetail>(`/api/videos/${id}`);
      if (!alive.current) return;
      setDetail(d);
      setLogs(d.logs);
      takeJob(d.job);
      setError(null);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : String(e));
    }
  }, [id, takeJob]);

  useEffect(() => {
    alive.current = true;
    lastJob.current = null;
    // A new id is a new event stream; clear the previous video's snapshot first.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetail(null);
    setLogs([]);
    setJob(null);
    if (!id) return;
    void refresh();
    const source = new EventSource(`/api/videos/${id}/events`);
    let timer: ReturnType<typeof setTimeout> | null = null;
    source.onmessage = (message) => {
      const event = JSON.parse(message.data);
      if (event.type === "log") setLogs((list) => [...list.slice(-600), event.entry]);
      if (event.type === "job") takeJob(event.job);
      if (event.type === "state" || (event.type === "job" && event.job?.status !== "running")) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void refresh(), 250);
      }
    };
    return () => {
      alive.current = false;
      source.close();
      if (timer) clearTimeout(timer);
    };
  }, [id, refresh, takeJob]);

  return { detail, logs, job, error, refresh };
}

export function useKeyStatus() {
  const [hasKey, setHasKey] = useState(false);
  const refresh = useCallback(async () => {
    try { setHasKey((await api<{ hasKey: boolean }>("/api/voice-key")).hasKey); } catch {}
  }, []);
  // Initial synchronization with the server-owned, in-memory key state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);
  return { hasKey, setHasKey, refresh };
}
