import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { FPS, HEIGHT, WIDTH } from './tokens.js';

/**
 * Frame clock + player for 1920×1080 · 30 fps scenes.
 * A scene is a React component that renders a pure function of the frame. It reads the
 * frame with useFrame() (the Remotion equivalent is useCurrentFrame()).
 *
 * URL params: ?frame=120 (freeze + 1:1 capture) · ?t=4.2 · ?controls=0 · ?captions=0 · ?autoplay=0 · ?scene=id
 */

export const FrameContext = createContext(0);
export const ConfigContext = createContext({ fps: FPS, width: WIDTH, height: HEIGHT, durationInFrames: 1 });
export const CaptionsContext = createContext(true);

/** Scene-local frame (Remotion: useCurrentFrame). */
export const useFrame = () => useContext(FrameContext);
/** { fps, width, height, durationInFrames } (Remotion: useVideoConfig). */
export const useVideoConfig = () => useContext(ConfigContext);
/** False when captions were switched off (?captions=0). */
export const useCaptionsEnabled = () => useContext(CaptionsContext);

export function urlParams() {
  if (typeof location === 'undefined') return { frame: null, scene: null, controls: true, captions: true, autoplay: true };
  const q = new URLSearchParams(location.search);
  const num = (k) => (q.has(k) && q.get(k) !== '' && !Number.isNaN(Number(q.get(k))) ? Number(q.get(k)) : null);
  const t = num('t');
  const frame = num('frame');
  return {
    frame: frame != null ? Math.round(frame) : t != null ? Math.round(t * FPS) : null,
    scene: q.get('scene'),
    controls: q.get('controls') !== '0',
    captions: q.get('captions') !== '0',
    autoplay: q.get('autoplay') !== '0',
  };
}

/**
 * Frames stay the authoring unit (30 fps), but a frame is not forced to be a whole number: a render that
 * samples twice per frame asks for 40, 40.5, 41… and must get the picture in between, not frame 41 twice.
 * Every motion helper already takes a continuous frame — `interpolate` is plain arithmetic and `spring`
 * splits its input into whole + rest (lib/motion.js:141) — so the rounding here was the only thing
 * quantising the clock. The interactive player still steps in whole frames (its rAF loop floors).
 */
const clampFrame = (f, duration) => Math.max(0, Math.min(duration - 1, f));

/** Pictures give up after this long: a broken or missing file must not hang a render. */
const PICTURE_TIMEOUT_MS = 5000;
const decoding = new Map(); // absolute URL → Promise, settled once that picture is decoded (or failed)
const decoded = new Set(); //  absolute URLs already settled

/**
 * Resolves when every SVG <image> on the page is decoded — at once when all of them already were, so it
 * only costs time on the first frame that shows a new picture.
 */
function picturesReady() {
  if (typeof document === 'undefined') return null;
  const pending = [];
  for (const el of document.querySelectorAll('svg image')) {
    const href = el.getAttribute('href') || el.getAttribute('xlink:href');
    if (!href) continue;
    const url = new URL(href, document.baseURI).href;
    if (decoded.has(url)) continue;
    if (!decoding.has(url)) {
      const img = new Image();
      img.src = url;
      decoding.set(url, img.decode().catch(() => {}).then(() => decoded.add(url)));
    }
    pending.push(decoding.get(url));
  }
  if (!pending.length) return null;
  return Promise.race([Promise.all(pending), new Promise((resolve) => setTimeout(resolve, PICTURE_TIMEOUT_MS))]);
}

/** Index of the last marker at or before frame f. */
const markerIndex = (markers, f) => {
  let k = 0;
  for (let i = 0; i < markers.length; i++) if (markers[i].frame <= f) k = i;
  return k;
};

function useFit(ref, enabled) {
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    const el = ref.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setScale(Math.min(r.width / WIDTH, r.height / HEIGHT));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled, ref]);
  return scale;
}

/** Mark the document ready once Montserrat is loaded and the first frame's pictures are decoded (headless capture). */
export function markReady() {
  if (typeof document === 'undefined') return;
  const flag = () => {
    document.documentElement.dataset.vkReady = '1';
  };
  const done = () =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // the first commit is in the DOM by now, so its <image>s can be found
        const pictures = picturesReady();
        if (pictures) pictures.then(() => requestAnimationFrame(flag));
        else flag();
      }),
    );
  if (document.fonts && document.fonts.load) {
    Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 32px Montserrat`, 'Tiếng Việt')))
      .catch(() => {})
      .then(done);
  } else done();
}

/** Plays (or freezes) one scene inside its container, scaled to fit, with optional controls. */
export function Player({
  scene: Scene,
  duration,
  fps = FPS,
  frame: fixedFrame = null,
  autoplay = true,
  loop = true,
  controls = true,
  captions = true,
  capture = false,
  label,
  markers,
}) {
  const [frame, setFrame] = useState(() => clampFrame(fixedFrame ?? 0, duration));
  const [playing, setPlaying] = useState(fixedFrame == null && autoplay);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const viewport = useRef(null);
  const scale = useFit(viewport, !capture);

  useEffect(() => {
    if (fixedFrame != null) {
      setFrame(clampFrame(fixedFrame, duration));
      setPlaying(false);
    }
  }, [fixedFrame, duration]);

  // Headless capture (tools/render.mjs): `await window.vkSetFrame(n)` resolves once frame n is painted
  // and every picture on it is decoded.
  useEffect(() => {
    if (!capture || typeof window === 'undefined') return undefined;
    window.vkDuration = duration;
    window.vkSetFrame = async (f) => {
      // Commit synchronously (background capture tabs may not get animation frames), then give the
      // compositor one frame — or 50 ms if rAF is throttled — before the screenshot.
      flushSync(() => setFrame(clampFrame(f, duration)));
      // Only the current scene is mounted (Series), so a picture in the next scene starts loading on its
      // first frame — wait until it is decoded, or that frame is captured with an empty frame.
      await picturesReady();
      return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (!settled) {
            settled = true;
            resolve(true);
          }
        };
        requestAnimationFrame(finish);
        setTimeout(finish, 50);
      });
    };
    return () => {
      delete window.vkSetFrame;
      delete window.vkDuration;
    };
  }, [capture, duration]);

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    let t0 = null;
    const f0 = frameRef.current;
    const tick = (ts) => {
      if (t0 === null) t0 = ts;
      let f = f0 + Math.floor(((ts - t0) / 1000) * fps);
      if (f >= duration) {
        if (!loop) {
          setFrame(duration - 1);
          setPlaying(false);
          return;
        }
        f %= duration;
      }
      setFrame(f);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, fps, loop]);

  useEffect(() => {
    if (!controls) return undefined;
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        const step = (e.shiftKey ? 10 : 1) * (e.code === 'ArrowRight' ? 1 : -1);
        setPlaying(false);
        setFrame((f) => clampFrame(f + step, duration));
      } else if (e.code === 'Home') {
        setPlaying(false);
        setFrame(0);
      } else if (e.code === 'End') {
        setPlaying(false);
        setFrame(duration - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controls, duration]);

  return (
    <div className={`vk-player${capture ? ' vk-player--capture' : ''}`}>
      <div className="vk-viewport" ref={viewport} onClick={controls ? () => setPlaying((p) => !p) : undefined}>
        <div className="vk-stage" style={capture ? undefined : { transform: `translate(-50%, -50%) scale(${scale})` }}>
          <ConfigContext.Provider value={{ fps, width: WIDTH, height: HEIGHT, durationInFrames: duration }}>
            <CaptionsContext.Provider value={captions}>
              <FrameContext.Provider value={frame}>
                <Scene frame={frame} />
              </FrameContext.Provider>
            </CaptionsContext.Provider>
          </ConfigContext.Provider>
        </div>
      </div>
      {controls ? (
        <div className="vk-controls">
          <button type="button" className="vk-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? '❚❚' : '▶'}
          </button>
          <input
            className="vk-scrub"
            type="range"
            min={0}
            max={duration - 1}
            step={1}
            value={frame}
            aria-label="Frame"
            onChange={(e) => {
              setPlaying(false);
              setFrame(Number(e.target.value));
            }}
          />
          <span className="vk-readout">{`${String(frame).padStart(4, '0')} / ${duration} f · ${(frame / fps).toFixed(2)} s`}</span>
          {markers && markers.length ? (
            <select
              className="vk-jump"
              aria-label="Nhảy tới"
              value={markerIndex(markers, frame)}
              onChange={(e) => {
                setPlaying(false);
                setFrame(clampFrame(markers[Number(e.target.value)].frame, duration));
              }}
            >
              {markers.map((m, i) => (
                <option key={`${m.frame}-${i}`} value={i}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : null}
          {label ? <span className="vk-name">{label}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

const resolveTarget = (target) => (typeof target === 'string' ? document.querySelector(target) : target);

/** Mount a scene definition { component, duration, title } into an element. */
export function mountScene(target, def, opts = {}) {
  const el = resolveTarget(target);
  const p = urlParams();
  const frame = opts.frame ?? p.frame;
  const capture = opts.capture ?? p.frame != null;
  if (capture) document.documentElement.classList.add('vk-capture');
  const root = createRoot(el);
  root.render(
    <Player
      scene={def.component}
      duration={def.duration}
      frame={frame}
      autoplay={opts.autoplay ?? p.autoplay}
      loop={opts.loop ?? true}
      controls={!capture && (opts.controls ?? p.controls)}
      captions={opts.captions ?? p.captions}
      capture={capture}
      label={opts.label ?? def.id}
      markers={def.markers}
    />,
  );
  markReady();
  return root;
}

function CardCanvas({ width, height, duration, render, fixedFrame, loop, fps, background }) {
  const [frame, setFrame] = useState(fixedFrame ?? 0);
  useEffect(() => {
    if (fixedFrame != null || duration <= 1) return undefined;
    let raf = 0;
    let t0 = null;
    const tick = (ts) => {
      if (t0 === null) t0 = ts;
      const raw = Math.floor(((ts - t0) / 1000) * fps);
      setFrame(loop ? raw % duration : Math.min(raw, duration - 1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fixedFrame, duration, loop, fps]);
  return (
    <svg
      className="vk-card-svg"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ display: 'block', background }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <FrameContext.Provider value={frame}>{render(frame)}</FrameContext.Provider>
    </svg>
  );
}

/**
 * Mount a small SVG canvas for a design-system card: render(frame) → SVG children in a
 * width×height viewBox. Animates (looping) unless `frame` or ?frame= freezes it.
 */
export function mountCard(target, { width, height, render, duration = 1, frame, loop = true, fps = FPS, background } = {}) {
  const el = resolveTarget(target);
  const p = urlParams();
  const fixed = frame ?? p.frame;
  createRoot(el).render(
    <CardCanvas
      width={width}
      height={height}
      duration={duration}
      render={render}
      fixedFrame={fixed != null ? Math.min(duration - 1, fixed) : null}
      loop={loop}
      fps={fps}
      background={background}
    />,
  );
  markReady();
}

/**
 * Mount a scaled 16:9 frame (no controls) for a card or thumbnail. `scene` is a component
 * reading useFrame(); it loops through `duration` frames unless `frame` freezes it.
 */
export function mountFrame(target, { scene, duration = 1, frame, loop = true, captions = true } = {}) {
  const el = resolveTarget(target);
  const p = urlParams();
  const fixed = frame ?? p.frame;
  createRoot(el).render(
    <Player scene={scene} duration={duration} frame={fixed} autoplay loop={loop} controls={false} captions={captions} />,
  );
  markReady();
}
