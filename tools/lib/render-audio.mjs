/**
 * Chọn file audio cho `stage render`. Tách khỏi `tools/stage.mjs` ngày 21/09/2026 để test được
 * (stage.mjs chạy CLI ngay ở top-level) và để chỉ có MỘT chỗ biết luật này.
 *
 * `sfx-mix.mjs` là một bước RIÊNG giữa voice và render. Render thẳng vào `voice.wav` khi đã có bản
 * trộn SFX thì mất tiếng nhấn ÂM THẦM — `verify` không bắt được, vì đây không phải lỗi cú pháp.
 *
 * Ba ca:
 *   · có voice-sfx.wav MỚI HƠN voice.wav  → dùng voice-sfx.wav
 *   · có voice-sfx.wav CŨ HƠN voice.wav   → `stale`: giọng đã đổi sau lần trộn, gọi phải exit 2
 *   · không có voice-sfx.wav              → voice.wav, kèm ghi chú "không có SFX"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @returns {{ audio: string|null, stale: boolean, note: string }}
 *   `audio` là đường dẫn tương đối gốc repo; `stale: true` ⇒ người gọi phải dừng với exit 2.
 */
export function pickRenderAudio(videoId, repoRoot = ROOT) {
  const voiceSfxRel = `projects/${videoId}/voice-sfx.wav`;
  const voiceRawRel = `voice/out/${videoId}/voice.wav`;
  const voiceSfx = path.join(repoRoot, voiceSfxRel);
  const voiceRaw = path.join(repoRoot, voiceRawRel);
  const hasSfx = fs.existsSync(voiceSfx);
  const hasRaw = fs.existsSync(voiceRaw);

  if (hasSfx && hasRaw) {
    if (fs.statSync(voiceSfx).mtimeMs < fs.statSync(voiceRaw).mtimeMs) {
      return {
        audio: null,
        stale: true,
        note: `voice đã đổi sau lần trộn SFX (voice.wav mới hơn voice-sfx.wav) — chạy lại \`node tools/stage.mjs sfx --video ${videoId}\` rồi render lại. Ép dùng một file cụ thể bằng --audio.`,
      };
    }
    return { audio: voiceSfxRel, stale: false, note: `dùng ${voiceSfxRel} (bản đã trộn SFX, mới hơn voice.wav gốc)` };
  }
  if (hasSfx) {
    return { audio: voiceSfxRel, stale: false, note: `dùng ${voiceSfxRel} (không có ${voiceRawRel} để so mốc thời gian)` };
  }
  return { audio: voiceRawRel, stale: false, note: `không có SFX (không thấy ${voiceSfxRel}) — dùng ${voiceRawRel}` };
}
