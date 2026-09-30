/**
 * Nhạc quiz cho `stage render` — chỗ DUY NHẤT biết "video này có quiz không, và chạy track nào".
 *
 * Vì sao tách ra (22/09/2026). `render.mjs` lấy CHỖ đặt nhạc quiz từ `quiz: true` trong `cues.js`,
 * nhưng TRACK thì chỉ nhận qua cờ `--quiz-track`. `tools/stage.mjs` dựng lệnh render mà không
 * truyền cờ đó, và không tool nào đọc `REQUEST.md` cho nhạc. Kết quả: `npm run stage:render` trên
 * một video có ba khoảng chờ quiz ra MP4 **câm ở đúng ba chỗ đó** — không gate nào đỏ, vì đây
 * không phải lỗi cú pháp. Cùng họ với `pickRenderAudio`: một quyết định ÂM THẦM làm hỏng bản giao.
 *
 * Luật (CLAUDE.md — Nhạc nền và nhạc quiz):
 *   · Nhạc quiz CHỈ chọn ở bước Render. Studio luôn gửi `--quiz-track <id|none>` xuống lệnh render.
 *   · `quizTrackArgs` nhận track id từ caller (đã đọc từ cờ CLI), không đọc REQUEST.md — REQUEST.md
 *     không khai quiz-track, và đọc vào đó tạo ra chỗ khai thứ hai dễ lệch.
 *   · `cues.js` không có cue `quiz: true`  → không cần track, lệnh render y như cũ (video cũ không
 *     đổi một chữ nào trong lệnh — chứng minh bằng `--dry-run` trước/sau);
 *   · có cue quiz mà caller không truyền track id → ĐỎ, gọi phải exit 2 kèm hướng dẫn;
 *   · truyền id không có trong `music.json` → ĐỎ, in ra các id có thật;
 *   · truyền "none" → không phát nhạc quiz (video có quiz nhưng không muốn nhạc);
 *   · khai đúng → trả `['--quiz-track', '<id>']` để nối vào lệnh render.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Có cue nào `quiz: true` không — đọc thô bằng regex, không bundle (cùng cách storyboard-gate làm). */
export function cuesHaveQuiz(cuesText) {
  return /\bquiz\s*:\s*true\b/.test(String(cuesText || ''));
}

/**
 * Kiểm và chuẩn bị cờ `--quiz-track` để nối vào lệnh render.
 *
 * @param {string} videoId  - id video (để tìm cues.js)
 * @param {string|null} trackId - id track nhận từ `--quiz-track` CLI arg; null = chưa truyền
 * @param {string} repoRoot - gốc repo (mặc định là REPO)
 * @returns {{ args: string[], problem: string|null, note: string }}
 *   `problem` khác null ⇒ người gọi phải dừng với exit 2.
 */
export function quizTrackArgs(videoId, trackId, repoRoot = ROOT) {
  const cuesFile = path.join(repoRoot, 'vinuni-lesson-video-ds/ui_kits/lesson-video/videos', videoId, 'cues.js');
  const musicFile = path.join(repoRoot, 'music.json');

  const cuesText = fs.existsSync(cuesFile) ? fs.readFileSync(cuesFile, 'utf8') : '';
  if (!cuesHaveQuiz(cuesText)) return { args: [], problem: null, note: 'không có cue `quiz: true` — render không nhạc quiz' };

  // Video có quiz — trackId bắt buộc phải có.
  if (!trackId) {
    return {
      args: [],
      problem:
        `${videoId} có cue \`quiz: true\` nhưng chưa chọn nhạc quiz.\n` +
        '  Render tiếp thì ba khoảng chờ quiz sẽ CÂM và không gate nào bắt được.\n' +
        '  Truyền cờ: --quiz-track <id>   (id lấy từ music.json → quiz[])\n' +
        '  Không muốn nhạc quiz: --quiz-track none',
      note: '',
    };
  }

  // "none" là lựa chọn hợp lệ: có quiz nhưng không phát nhạc.
  if (trackId === 'none') {
    return { args: ['--quiz-track', 'none'], problem: null, note: 'nhạc quiz: tắt (none)' };
  }

  // Kiểm id có trong danh sách quiz của music.json không.
  let known = [];
  try {
    known = (JSON.parse(fs.readFileSync(musicFile, 'utf8')).quiz || []).map((t) => t.id);
  } catch {
    return { args: [], problem: `không đọc được music.json để kiểm id nhạc quiz "${trackId}"`, note: '' };
  }
  if (!known.includes(trackId)) {
    return { args: [], problem: `--quiz-track ${trackId} — music.json không có id đó (có: ${known.join(' · ')})`, note: '' };
  }
  return { args: ['--quiz-track', trackId], problem: null, note: `nhạc quiz: ${trackId}` };
}
