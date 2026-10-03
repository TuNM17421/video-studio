import React from 'react';
import { C } from '../../lib/tokens.js';
import { useCaptionsEnabled, useFormat } from '../../lib/player.jsx';
import { CenterHeader, EditorialGrid, EditorialHeader, Eyebrow, SceneFooter, SubtitleBar, Watermark } from './Chrome.jsx';

/** The caption { start, end, text } active at `frame` (scene-local frames), or null. */
export function activeCaption(captions, frame) {
  if (!captions) return null;
  for (let i = 0; i < captions.length; i++) {
    const c = captions[i];
    if (frame >= c.start && frame < c.end) return c;
  }
  return null;
}

/**
 * One lesson scene with all the persistent chrome, on the canvas of the video's FORMAT
 * (16x9 = 1920×1080 · 9x16 = 1080×1920 — see lib/tokens.js FORMATS).
 *   variant 'center'    (canonical rebuild-v1): red eyebrow · centered title · divider · corner tag
 *   variant 'editorial' (Day28): 120 px grid · left kicker · title + red accent phrase · subtitle
 * `children` are SVG elements in that format's viewBox (cards, flows, bars…); read it with useLayout().
 * `overlay` is HTML drawn above the SVG (recap rows, question cards, hook overlay, title cards).
 * Captions are scene-local { start, end, text } in frames; the active one shows in the navy bar.
 * Layers: SVG → eyebrow/header → overlay → footer → watermark → subtitle bar.
 */
export function SceneFrame({
  frame = 0,
  variant = 'center',
  eyebrow,
  title,
  titleSize,
  tag,
  kicker,
  titleAccent,
  subtitle,
  footer,
  captions,
  caption,
  background = C.bg,
  header = true,
  watermark = true,
  overlay,
  children,
}) {
  const F = useFormat();
  const captionsOn = useCaptionsEnabled();
  const active = caption !== undefined ? caption : activeCaption(captions, frame)?.text;
  const editorial = variant === 'editorial';
  const footerLeft = footer && typeof footer === 'object' ? footer.left : footer;
  const footerRight = footer && typeof footer === 'object' ? footer.right : undefined;
  return (
    <div className="vk-scene" style={{ background }}>
      <svg className="vk-svg" viewBox={`0 0 ${F.width} ${F.height}`} width={F.width} height={F.height} xmlns="http://www.w3.org/2000/svg">
        {header && editorial ? <EditorialGrid /> : null}
        {header && !editorial ? <CenterHeader title={title} titleSize={titleSize} tag={tag} /> : null}
        {children}
      </svg>
      {header && !editorial && eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      {header && editorial ? (
        <EditorialHeader kicker={kicker} title={title} titleAccent={titleAccent} subtitle={subtitle} titleSize={titleSize} frame={frame} />
      ) : null}
      {overlay}
      {footer ? <SceneFooter left={footerLeft} right={footerRight} /> : null}
      {watermark ? <Watermark /> : null}
      {captionsOn && active ? <SubtitleBar text={active} /> : null}
    </div>
  );
}
