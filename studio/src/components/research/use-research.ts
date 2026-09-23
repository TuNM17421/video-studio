"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { ResearchSummary, ResearchView } from "@/lib/research";
import type { AgentConfig, AgentProvider, JobInfo, LogEntry } from "@/lib/types";

export interface ResearchIndex {
  runs: ResearchSummary[];
  agents: Record<AgentProvider, boolean>;
  config: AgentConfig;
}

/** Danh sách lượt + agent có trên máy. */
export function useResearchIndex() {
  const [index, setIndex] = useState<ResearchIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setIndex(await api<ResearchIndex>("/api/research"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  // Đồng bộ lần đầu với trạng thái do máy chủ giữ — cùng khuôn với useVideo trong lib/client.ts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);
  return { index, error, refresh };
}

/**
 * Một lượt research + cập nhật trực tiếp (SSE): dòng nhật ký và tiến độ job đổ về liên tục; sự kiện
 * "state" (chặng đổi, file mới) thì hỏi lại toàn bộ — trạng thái nằm trên đĩa, máy chủ dựng lại mỗi lần.
 */
export function useResearch(rid: string | null, onChange?: () => void) {
  const [view, setView] = useState<ResearchView | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Lượt trang đang hiển thị. Phản hồi của lượt khác (người dùng vừa chuyển lượt) thì bỏ, không vẽ lên. */
  const current = useRef(rid);
  const changed = useRef(onChange);
  useEffect(() => { changed.current = onChange; }, [onChange]);

  const apply = useCallback((v: ResearchView) => {
    if (v.state.id !== current.current) return;
    setView(v);
    setLogs(v.logs);
    setJob(v.job);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!rid) return;
    try {
      apply(await api<ResearchView>(`/api/research/${encodeURIComponent(rid)}`));
    } catch (e) {
      if (current.current === rid) setError(e instanceof Error ? e.message : String(e));
    }
  }, [rid, apply]);

  useEffect(() => {
    current.current = rid;
    // Lượt mới là một luồng sự kiện mới; xoá bản của lượt trước đã.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(null);
    setLogs([]);
    setJob(null);
    setError(null);
    if (!rid) return;
    void refresh();
    const source = new EventSource(`/api/research/${encodeURIComponent(rid)}/events`);
    let timer: ReturnType<typeof setTimeout> | null = null;
    source.onmessage = (message) => {
      const event = JSON.parse(message.data);
      if (event.type === "log") setLogs((list) => [...list.slice(-600), event.entry]);
      if (event.type === "job") setJob(event.job);
      if (event.type === "state" || (event.type === "job" && event.job?.status !== "running")) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void refresh();
          changed.current?.();
        }, 300);
      }
    };
    return () => {
      source.close();
      if (timer) clearTimeout(timer);
    };
  }, [rid, refresh]);

  /** Gửi một thao tác; máy chủ trả về trạng thái mới nên trang vẽ lại ngay. */
  const act = useCallback(async (body: Record<string, unknown>) => {
    if (!rid) return;
    apply(await api<ResearchView>(`/api/research/${encodeURIComponent(rid)}/action`, { method: "POST", json: body }));
    changed.current?.();
  }, [rid, apply]);

  return { view, logs, job, error, refresh, act };
}
