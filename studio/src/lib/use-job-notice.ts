"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jobNotice, videoTabTitle } from "./job-notice";
import { notifyOn } from "./notify";
import type { JobInfo } from "./types";

const watching = () => document.visibilityState === "visible" && document.hasFocus();

/**
 * The page side of "Báo khi xong" (lib/job-notice.ts). `onJobEnd` goes to useVideo; `useVideoTabTitle` runs
 * once the video is known. Nothing is announced to a member who is looking at the page — they saw it end.
 */
export function useJobNotice(id: string | null) {
  const [unseen, setUnseen] = useState<JobInfo | null>(null);
  const [forId, setForId] = useState(id);
  if (forId !== id) {
    setForId(id);
    setUnseen(null);
  }
  const nameRef = useRef<string | null>(null);

  const onJobEnd = useCallback((ended: JobInfo) => {
    if (watching()) return;
    const notice = jobNotice(ended, nameRef.current || id || "Video", Date.now());
    if (!notice) return;
    setUnseen(ended);
    if (!notifyOn()) return;
    try {
      // One per run: two tabs on the same video replace each other's notification instead of stacking.
      const n = new Notification(notice.title, { body: notice.body, tag: `video-studio:${id}:${ended.startedAt}` });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {
      // Some browsers only allow notifications from a service worker; the tab title still says it.
    }
  }, [id]);

  // Coming back to the page is having seen how it ended.
  useEffect(() => {
    if (!unseen) return;
    const seen = () => { if (watching()) setUnseen(null); };
    window.addEventListener("focus", seen);
    document.addEventListener("visibilitychange", seen);
    return () => {
      window.removeEventListener("focus", seen);
      document.removeEventListener("visibilitychange", seen);
    };
  }, [unseen]);

  return { onJobEnd, unseen, nameRef };
}

/** The tab says what runs, or how it ended while the member was away; restored when the page leaves the video. */
export function useVideoTabTitle(notice: ReturnType<typeof useJobNotice>, video: string | null, job: JobInfo | null) {
  const { nameRef, unseen } = notice;
  useEffect(() => { nameRef.current = video; }, [nameRef, video]);
  const title = video ? videoTabTitle(video, job, unseen) : null;
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => { document.title = previous; };
  }, [title]);
}
