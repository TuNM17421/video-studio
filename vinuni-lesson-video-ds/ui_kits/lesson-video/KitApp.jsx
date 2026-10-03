import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Player, markReady, urlParams } from '../../lib/player.jsx';

/**
 * Scene kit browser: scene templates and complete example videos on the left, a player on the right.
 * Entries: [{ id, title, pattern, duration, component, markers?, format? }]. ?scene=<id> selects an entry;
 * an entry's `format` ('16x9' mặc định · '9x16') comes straight from its video.jsx `meta`, so the kit, the
 * QA stills and the render all use the canvas the video was authored for. ?format=<id> overrides it for a
 * quick look — it does NOT re-lay-out the scene, so use it to inspect, not to publish.
 * ?scene=<id>&frame=<n> renders that frame alone at 1:1 (for capture / QA). Videos expose their cue
 * starts as `markers` (the "jump to" menu in the player).
 */
export function KitApp({ scenes, videos = [] }) {
  const all = [...scenes, ...videos];
  const params = urlParams();
  const [index, setIndex] = useState(() => Math.max(0, all.findIndex((s) => s.id === params.scene)));
  const scene = all[index] || all[0];

  useEffect(() => {
    if (params.frame != null || !scene) return;
    const q = new URLSearchParams(location.search);
    q.set('scene', scene.id);
    history.replaceState(null, '', `${location.pathname}?${q.toString()}`);
  }, [scene && scene.id]);

  if (!scene) return null;
  if (params.frame != null) {
    return (
      <Player
        key={scene.id}
        scene={scene.component}
        duration={scene.duration}
        frame={params.frame}
        controls={false}
        captions={params.captions}
        format={params.format || scene.format}
        capture
      />
    );
  }
  const item = (s, i) => (
    <button type="button" key={s.id} className={`vk-kit__item${i === index ? ' is-active' : ''}`} onClick={() => setIndex(i)}>
      <span className="vk-kit__num">{s.kind === 'video' ? '▶' : String(i + 1).padStart(2, '0')}</span>
      <span className="vk-kit__meta">
        <span className="vk-kit__title">{s.title}</span>
        <span className="vk-kit__sub">{`${s.pattern} · ${(s.duration / 30).toFixed(1)} s`}</span>
      </span>
    </button>
  );
  return (
    <div className="vk-kit">
      <aside className="vk-kit__side">
        <div className="vk-kit__brand">
          <span className="vk-kit__dot" />
          Lesson Video Kit
        </div>
        <div className="vk-kit__list">
          {videos.length ? <div className="vk-kit__section">Video mẫu hoàn chỉnh</div> : null}
          {videos.map((v, k) => item(v, scenes.length + k))}
          <div className="vk-kit__section">Scene mẫu</div>
          {scenes.map((s, i) => item(s, i))}
        </div>
        <div className="vk-kit__hint">Space phát / dừng · ← → từng frame · Shift × 10 · ?captions=0 tắt phụ đề</div>
      </aside>
      <main className="vk-kit__main">
        <Player
          key={scene.id}
          scene={scene.component}
          duration={scene.duration}
          captions={params.captions}
          autoplay={params.autoplay}
          label={scene.id}
          markers={scene.markers}
          format={params.format || scene.format}
        />
      </main>
    </div>
  );
}

export function mountKitApp(target, scenes, videos = []) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (urlParams().frame != null) document.documentElement.classList.add('vk-capture');
  createRoot(el).render(<KitApp scenes={scenes} videos={videos} />);
  markReady();
}
