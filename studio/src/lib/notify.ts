"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * "Báo khi xong" is a per-browser choice: the member turns it on once (the browser asks for permission then)
 * and every long job on every video notifies from then on. Kept in localStorage — a convenience, not state
 * anyone else needs — and always read together with the permission, which the member can revoke in the
 * browser at any time.
 */
const KEY = "video-studio:notify";
const EVENT = "video-studio:notify-pref";

export interface NotifyPref {
  /** The browser has the Notification API (http://127.0.0.1 counts as a secure context). */
  supported: boolean;
  permission: NotificationPermission;
  /** Turned on here and still allowed by the browser. */
  on: boolean;
}

function snapshot(): string {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  let stored = false;
  try { stored = localStorage.getItem(KEY) === "1"; } catch {}
  return `${Notification.permission}:${stored && Notification.permission === "granted" ? "on" : "off"}`;
}

function parse(value: string): NotifyPref {
  if (value === "unsupported") return { supported: false, permission: "denied", on: false };
  const [permission, on] = value.split(":");
  return { supported: true, permission: permission as NotificationPermission, on: on === "on" };
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  // A permission changed in the browser's own settings shows up when the member comes back to the page.
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

/** Whether a notification should go out right now — for code outside React (the job-end handler). */
export const notifyOn = () => parse(snapshot()).on;

export function useNotifyPref() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "unsupported");
  const toggle = useCallback(async () => {
    if (!("Notification" in window)) return;
    const turnOn = !parse(snapshot()).on;
    // Asked only from this click: browsers ignore (or block) a permission prompt nobody asked for.
    if (turnOn && Notification.permission === "default") await Notification.requestPermission();
    const on = turnOn && Notification.permission === "granted";
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { ...parse(value), toggle };
}
