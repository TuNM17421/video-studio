/**
 * Nhịp hình và cỡ khung của bản MP4 — những gì bước Render quyết định về *hình*, tách khỏi nhạc, tiếng động
 * và manifest QA.
 *
 * Nhịp hình là **đơn vị lúc render**, không phải đơn vị lúc dựng cảnh. Cảnh vẫn viết bằng frame nguyên ở
 * 30 fps (đơn vị của `cues.js`, `voice.js`, `timeline.js`, `spokenAt()`); `render.mjs --fps 60` chỉ lấy mẫu
 * cùng cái đồng hồ đó dày gấp đôi — hỏi player frame 40, 40,5, 41 và nhận đúng hình ở giữa. Nên đổi nhịp
 * **không** làm phải viết lại cảnh, không chạy lại TTS, không tốn thêm credit; chỉ lượt render dài thêm.
 */

import type { RenderFps, VideoFormat } from "./types";

/**
 * Video mới render 60 fps. Giọng, cue và cảnh không đổi gì — xem đầu file.
 *
 * Cái giá đã đo (`docs/decisions/render-60fps.md`): +82 % thời gian render, +23 % cỡ file, và ×1,67 số ảnh
 * thật sự khác nhau trên nội dung động. Nội dung tĩnh thì vẫn trả đủ thời gian mà mua được rất ít, nên ô
 * chọn ở bước Render luôn hạ về 30 được.
 */
export const DEFAULT_RENDER_FPS: RenderFps = 60;

/**
 * Video tạo trước khi có lựa chọn này giữ nguyên 30 fps thay vì nhận mặc định mới. Chúng đã QA xong ở 30;
 * một lượt render lại không được âm thầm đổi nhịp của bản đã duyệt. Giống luật của năng lực chọn thêm:
 * `default: true` chỉ tick sẵn cho video **mới**, video đã tạo không bao giờ bị bật thêm.
 */
export const LEGACY_RENDER_FPS: RenderFps = 30;

export const FPS_OPTIONS: { value: RenderFps; label: string; hint: string }[] = [
  {
    value: 60,
    label: "60 fps",
    hint: "Chuyển động mượt hơn. Render lâu hơn khoảng 82 %, file nặng hơn khoảng 23 %.",
  },
  {
    value: 30,
    label: "30 fps",
    hint: "Nhịp cũ, nhanh hơn. Dùng cho bản gửi soát QA: manifest.json luôn khai fps 30.",
  },
];

export const isRenderFps = (value: unknown): value is RenderFps => value === 30 || value === 60;

export const fpsHint = (fps: RenderFps) => FPS_OPTIONS.find((o) => o.value === fps)?.hint ?? "";

/** Cỡ khung của từng khổ — khai một chỗ, vì `render-specs` và Thư viện đều in ra cho người đọc. */
export const FORMAT_SIZE: Record<VideoFormat, string> = {
  "16x9": "1920×1080",
  "9x16": "1080×1920",
};

/** Dòng "Định dạng" ở bước Render: đúng khổ của video này và đúng nhịp sắp render, không in cứng. */
export const renderSpecLabel = (format: VideoFormat | undefined, fps: RenderFps) =>
  `MP4 · ${FORMAT_SIZE[format || "16x9"]} · ${fps} fps`;
