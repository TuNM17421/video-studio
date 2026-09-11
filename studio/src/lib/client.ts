"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export function formatFrames(frames: number | null | undefined) {
  if (!frames) return "—";
  const total = Math.round(frames / 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Video detail + live updates (SSE): log lines and job progress stream in; "state" triggers a refetch. */
export function useVideo(id: string | null) {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [job, setJob] = useState<JobInfo | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const d = await api<VideoDetail>(`/api/videos/${id}`);
      if (!alive.current) return;
      setDetail(d);
      setLogs(d.logs);
      setJob(d.job);
      setError(null);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : String(e));
    }
  }, [id]);

  useEffect(() => {
    alive.current = true;
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
      if (event.type === "job") setJob(event.job);
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
  }, [id, refresh]);

  return { detail, logs, job, error, refresh };
}

export function useKeyStatus() {
  const [hasKey, setHasKey] = useState(false);
  const refresh = useCallback(async () => {
    try { setHasKey((await api<{ hasKey: boolean }>("/api/voice-key")).hasKey); } catch {}
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { hasKey, setHasKey, refresh };
}
