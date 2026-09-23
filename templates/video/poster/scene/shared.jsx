/**
 * Chrome dùng chung. Dòng poster KHÔNG dùng `SceneFrame`: chrome (header chương + thanh phụ đề)
 * nằm trong `lib/poster/stage.jsx` và đổi theo THEME đang chạy.
 *
 * `Cue` là thứ `video.jsx` dựng SEQUENCES từ `TIMELINE` gọi tới — một sequence mỗi cue, tự động.
 * Nó cộng `start` toàn cục của cue vào frame scene-local mà `Series` đưa cho, rồi giao cho
 * `PosterStage` — nơi frame đó đổi sang `T` của ĐÚNG cảnh authored mà cue này thuộc về.
 */
import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { TIMELINE } from './timeline.js';
import { PosterStage, sceneOf } from './stage.jsx';
import { Intro, Quiz } from './chapters.jsx';

// Khoá = `id` của chapter trong `stage.jsx` CHAPTERS (KHÔNG phải `id` của từng scene) — thêm chương
// mới thì thêm một dòng ở đây + một component trong `chapters.jsx`.
const CHAPTER_COMPONENT = {
  intro: Intro,
  quiz: Quiz, //  ba cảnh quiz dùng chung một component, phân biệt bằng `sceneId`
};

export function Cue({ n }) {
  const t = TIMELINE[n - 1];
  const scene = sceneOf(t.scene);
  const Chapter = CHAPTER_COMPONENT[scene.chapter];
  return (
    <PosterStage sceneId={t.scene} frame={t.start + useFrame()}>
      <Chapter sceneId={t.scene} />
    </PosterStage>
  );
}
