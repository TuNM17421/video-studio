/**
 * Files that ship with the design system (a video's approved pictures, sample images) are addressed by
 * their path from the design-system root: "ui_kits/lesson-video/videos/<id>/img/s3.jpg". The same
 * scene is opened from several pages — ui_kits/lesson-video/index.html (render), a video's player.html,
 * a component card, Studio's /ds — so a path relative to the page would point somewhere else on each
 * one. The root is read once from where dist/vk.js was loaded (always <root>/dist/vk.js).
 */
const ROOT = (() => {
  try {
    const src = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
    return src ? new URL('../', src).href : null;
  } catch {
    return null;
  }
})();

/** Absolute URL of a design-system file; URLs and absolute paths pass through unchanged. */
export function dsUrl(p) {
  if (!p || !ROOT || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(p)) return p;
  return new URL(p, ROOT).href;
}
