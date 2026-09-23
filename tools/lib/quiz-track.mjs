/**
 * Nhạc quiz cho `stage render` — chỗ DUY NHẤT biết "video này có quiz không, và chạy track nào".
 *
 * Vì sao tách ra (22/09/2026). `render.mjs` lấy CHỖ đặt nhạc quiz từ `quiz: true` trong `cues.js`,
 * nhưng TRACK thì chỉ nhận qua cờ `--quiz-track`. `tools/stage.mjs` dựng lệnh render mà không
 * truyền cờ đó, và không tool nào đọc `REQUEST.md` cho nhạc. Kết quả: `npm run stage:render` trên
 * một video có ba khoảng chờ quiz ra MP4 **câm ở đúng ba chỗ đó** — không gate nào đỏ, vì đây
 * không phải lỗi cú pháp. Cùng họ với `pickRenderAudio`: một quyết định ÂM THẦM làm hỏng bản giao.
 *
 * Luật:
 *   · `cues.js` không có cue `quiz: true`  → không cần track, lệnh render y như cũ (video cũ không
 *     đổi một chữ nào trong lệnh — chứng minh bằng `--dry-run` trước/sau);
 *   · có cue quiz mà `REQUEST.md` không khai `quiz-track:` → ĐỎ, gọi phải exit 2 kèm hướng dẫn;
 *   · khai một id không có trong `music.json` → ĐỎ, in ra các id có thật;
 *   · khai đúng → trả `['--quiz-track', '<id>']` để nối vào lệnh render.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Đọc `- **quiz-track**: \`id\`` (hoặc `music-track`) trong REQUEST.md. Không có thì trả null. */
export function readTrackDecl(requestText, key = 'quiz-track') {
  if (!requestText) return null;
  /*
   * Chỉ nhận id trong BACKTICK, hoặc một token đứng MỘT MÌNH hết dòng. Không nới hơn: bản đầu
   * nhận mọi thứ sau dấu hai chấm và đọc ra "kh" từ câu văn "không phải id" — một id bịa, và nó
   * sẽ đi thẳng xuống `render.mjs`.
   */
  const re = new RegExp(`^\\s*[-*]\\s*\\*\\*${key}\\*\\*\\s*:\\s*(?:\`([A-Za-z0-9._-]+)\`|([A-Za-z0-9._-]+)\\s*$)`, 'm');
  const m = requestText.match(re);
  return m ? m[1] || m[2] : null;
}

/** Có cue nào `quiz: true` không — đọc thô bằng regex, không bundle (cùng cách storyboard-gate làm). */
export function cuesHaveQuiz(cuesText) {
  return /\bquiz\s*:\s*true\b/.test(String(cuesText || ''));
}

/**
 * @returns {{ args: string[], problem: string|null, note: string }}
 *   `problem` khác null ⇒ người gọi phải dừng với exit 2.
 */
export function quizTrackArgs(videoId, repoRoot = ROOT) {
  const cuesFile = path.join(repoRoot, 'vinuni-lesson-video-ds/ui_kits/lesson-video/videos', videoId, 'cues.js');
  const requestFile = path.join(repoRoot, 'projects', videoId, 'REQUEST.md');
  const musicFile = path.join(repoRoot, 'music.json');

  const cuesText = fs.existsSync(cuesFile) ? fs.readFileSync(cuesFile, 'utf8') : '';
  if (!cuesHaveQuiz(cuesText)) return { args: [], problem: null, note: 'không có cue `quiz: true` — render không nhạc quiz' };

  const requestText = fs.existsSync(requestFile) ? fs.readFileSync(requestFile, 'utf8') : '';
  const id = readTrackDecl(requestText, 'quiz-track') || readTrackDecl(requestText, 'music-track');
  if (!id) {
    return {
      args: [],
      problem:
        `${videoId} có cue \`quiz: true\` nhưng projects/${videoId}/REQUEST.md không khai \`quiz-track\`.\n` +
        '  Render tiếp thì ba khoảng chờ quiz sẽ CÂM và không gate nào bắt được.\n' +
        `  Thêm vào REQUEST.md:  - **quiz-track**: \`<id>\`   (id lấy từ music.json → quiz[])\n` +
        '  Hoặc render tay có cờ: node tools/render.mjs --scene <id> --quiz-track <id> …',
      note: '',
    };
  }

  let known = [];
  try {
    known = (JSON.parse(fs.readFileSync(musicFile, 'utf8')).quiz || []).map((t) => t.id);
  } catch {
    return { args: [], problem: `không đọc được music.json để kiểm id nhạc quiz "${id}"`, note: '' };
  }
  if (!known.includes(id)) {
    return { args: [], problem: `REQUEST.md khai \`quiz-track: ${id}\` — music.json không có id đó (có: ${known.join(' · ')})`, note: '' };
  }
  return { args: ['--quiz-track', id], problem: null, note: `nhạc quiz: ${id}` };
}
