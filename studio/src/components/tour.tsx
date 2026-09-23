"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dropdown, Tour, type TourProps } from "antd";
import { mascotAsset, mascotPicture, useMascotTable, type MascotTable } from "@/lib/mascot";
import { STUDIO_STEP_EVENT, TOURS, tourById, toursFor, type TourDef, type TourMascot } from "@/lib/tours";
import styles from "./tour.module.css";

const SEEN_KEY = (id: string) => `video-studio.tour.${id}`;
/** Gives the page a moment to paint the elements a tour points at before looking for them. */
const SETTLE_MS = 700;
/** How long a tour that opens a video waits for that video page to be on screen. */
const OPEN_VIDEO_MS = 10000;

/**
 * A tour waiting for its video page. Every page mounts its own Shell (and this component), so the wait has
 * to outlive the navigation: it is kept in sessionStorage, not in state.
 */
const PENDING_KEY = "video-studio.tour.pending";
function takePending(): TourDef | null {
  try {
    const id = window.sessionStorage.getItem(PENDING_KEY);
    return id ? tourById(id) ?? null : null;
  } catch {
    return null;
  }
}
function putPending(tour: TourDef | null) {
  try {
    if (tour) window.sessionStorage.setItem(PENDING_KEY, tour.id);
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch {}
}

/** The video the page shows (`/?id=…`), read from the address bar so the tour needs no Suspense boundary. */
const openVideo = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id"));

function seen(tour: TourDef) {
  try {
    return Number(window.localStorage.getItem(SEEN_KEY(tour.id))) >= tour.version;
  } catch {
    return false;
  }
}

function markSeen(tour: TourDef) {
  try { window.localStorage.setItem(SEEN_KEY(tour.id), String(tour.version)); } catch {}
}

/**
 * The element a step points at. Sidebar entries are tagged on their link, but the highlight belongs on the
 * whole menu row, so a tag inside a menu item resolves to that row.
 */
function findTarget(id: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
  if (!el) return null;
  return el.closest<HTMLElement>(".ant-menu-item, .ant-menu-submenu-title") ?? el;
}

/** Griffin as the step shows it; a new key per step replays the entrance, like a cut in the videos. */
function TourMascotFigure({ table, mascot }: { table: MascotTable; mascot: TourMascot }) {
  const prop = mascot.prop && table.props[mascot.prop];
  return <span className={styles.figure} aria-hidden="true">
    <img className={styles.body} src={mascotPicture(table, mascot.pose, mascot.mood)} alt="" />
    {prop && <img className={styles.prop} src={mascotAsset(table, prop.file)} alt="" />}
  </span>;
}

/**
 * Onboarding tours with Griffin as the guide (content in lib/tours.ts). Mounted once by the Shell: it
 * starts a page's tour the first time that page opens, and the mascot button in the corner replays any
 * tour of the page on demand. Steps whose target is not on screen are left out, so one tour copes with a
 * collapsed sidebar or a missing key badge.
 */
export function StudioTour() {
  const pathname = usePathname();
  const router = useRouter();
  const { table } = useMascotTable();
  const [active, setActive] = useState<{ tour: TourDef; steps: TourDef["steps"] } | null>(null);
  const [current, setCurrent] = useState(0);
  // Closing a tour with × means "not now": no other tour starts by itself until the next page load.
  const [quiet, setQuiet] = useState(false);
  // A tour waiting for its video page to open (the practice tour starts on /?id=mau-huong-dan).
  const [pending, setPending] = useState<TourDef | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
  useEffect(() => { setPending(takePending()); }, []);

  const start = useCallback((tour: TourDef) => {
    const steps = tour.steps.filter((s) => !s.target || findTarget(s.target));
    if (!steps.some((s) => s.target)) {
      // nothing of this tour is on this screen (e.g. the plan form while a video is open) — try later
      return false;
    }
    setCurrent(0);
    setActive({ tour, steps });
    return true;
  }, []);

  // First visit: the page's first unseen automatic tour starts on its own — after one finishes, the next
  // (in TOURS order) follows, so the welcome tour leads into the tour of the page itself.
  useEffect(() => {
    if (active || quiet) return;
    const next = toursFor(pathname).find((t) => t.auto && !seen(t));
    if (!next) return;
    const timer = window.setTimeout(() => start(next), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, active, quiet, start]);

  /** Start a tour chosen in the launcher: open its video first if it walks one. */
  const launch = (tour: TourDef) => {
    if (tour.video && openVideo() !== tour.video) {
      putPending(tour);
      setPending(tour);
      router.push(`/?id=${encodeURIComponent(tour.video)}`);
      return;
    }
    // a page tour whose targets are not on screen falls back to the tour of the whole Studio
    if (!start(tour)) start(TOURS[0]);
  };

  // After the video page opens, start the waiting tour as soon as its targets are painted.
  useEffect(() => {
    if (!pending) return;
    const began = Date.now();
    const timer = window.setInterval(() => {
      if ((openVideo() === pending.video && start(pending)) || Date.now() - began > OPEN_VIDEO_MS) {
        window.clearInterval(timer);
        putPending(null);
        setPending(null);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [pending, start]);

  // A step that belongs to a production step asks the video page to open it before pointing at it.
  const studioStep = active?.steps[current]?.studioStep;
  useEffect(() => {
    if (studioStep) window.dispatchEvent(new CustomEvent(STUDIO_STEP_EVENT, { detail: studioStep }));
  }, [studioStep]);

  const close = (finished: boolean) => {
    if (!active) return;
    markSeen(active.tour);
    if (!finished) setQuiet(true);
    setActive(null);
  };

  const steps: TourProps["steps"] = active?.steps.map((s, i) => ({
    target: s.target ? () => findTarget(s.target!) as HTMLElement : null,
    placement: s.placement,
    title: s.title,
    description: <div className={styles.step}>
      {table && <TourMascotFigure key={`${active.tour.id}-${i}`} table={table} mascot={s.mascot} />}
      <p>{s.body}</p>
    </div>,
    nextButtonProps: { children: i === active.steps.length - 1 ? "Xong" : "Tiếp" },
    prevButtonProps: { children: "Quay lại" },
  }));

  // the page's own tours, then the ones offered everywhere (and the welcome tour, from any page)
  const offered = [...toursFor(pathname), ...TOURS.filter((t) => (t.everywhere || t.id === "welcome") && !t.routes.includes(pathname))];

  return <>
    {active && <Tour
      open
      className={styles.tour}
      steps={steps}
      current={current}
      onChange={setCurrent}
      // antd calls onClose after onFinish too; closing on the last step counts as having finished the tour
      onClose={() => close(current >= (active.steps.length - 1))}
      onFinish={() => close(true)}
      indicatorsRender={(cur, total) => <span className={styles.progress}>{cur + 1}/{total}</span>}
      scrollIntoViewOptions={{ block: "center", behavior: "smooth" }}
    />}
    {/* stays on screen during a tour: the welcome tour ends by pointing at it */}
    <Dropdown
      trigger={["click"]}
      placement="topRight"
      menu={{
        items: offered.map((t) => ({ key: t.id, label: t.label })),
        onClick: ({ key }) => {
          const tour = tourById(key);
          if (tour) launch(tour);
        },
      }}
    >
      <button type="button" className={styles.launcher} data-tour="tour.launcher" aria-label="Griffin hướng dẫn — chọn một hướng dẫn cho trang này" title="Griffin hướng dẫn">
        {table ? <img src={mascotAsset(table, "face-happy")} alt="" /> : <span>?</span>}
      </button>
    </Dropdown>
  </>;
}
