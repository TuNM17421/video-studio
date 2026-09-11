// Bundle entry for dist/vk.js (window.VK). Not part of the design system itself.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { scenes } from 'vk:scenes';
import { videos } from 'vk:videos';
import { mountScene } from '../vinuni-lesson-video-ds/lib/player.jsx';
import { KitApp, mountKitApp } from '../vinuni-lesson-video-ds/ui_kits/lesson-video/KitApp.jsx';

export * from '../vinuni-lesson-video-ds/lib/index.js';
export * from '../vinuni-lesson-video-ds/components/index.js';
export { React, createRoot, scenes, videos, KitApp };
export const h = React.createElement;
export const Fragment = React.Fragment;

/** Mount the scene-kit browser (ui_kits/lesson-video/index.html): templates + complete videos. */
export function mountKit(target) {
  return mountKitApp(target, scenes, videos);
}

/** Scene template or complete video definition by id. */
export function sceneById(id) {
  return scenes.find((s) => s.id === id) || videos.find((v) => v.id === id);
}

/** Mount one scene or video by id: VK.mountSceneById('#root', 'flow-compare', { frame: 300 }). */
export function mountSceneById(target, id, opts) {
  const def = sceneById(id);
  if (!def) throw new Error(`Unknown scene "${id}". Known: ${[...scenes, ...videos].map((s) => s.id).join(', ')}`);
  return mountScene(target, def, opts);
}
