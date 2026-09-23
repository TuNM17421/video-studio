/**
 * Nội dung từng chương (dòng poster) — tách khỏi `sNN.jsx` (chỉ là wrapper cue→PosterStage, xem
 * `shared.jsx`). Dùng lại engine dùng chung, KHÔNG tự chế animation mới.
 * Thêm chương mới thì thêm một component ở đây + một dòng trong `CHAPTER_COMPONENT` của `shared.jsx`.
 *
 * ── MÀU LẤY TỪ THEME, KHÔNG HARD-CODE ─────────────────────────────────────────────────────────
 * `usePosterTheme()` trả bảng màu của theme đang chạy (`stage.jsx` khai). Mặc định của series là
 * `vinuni-light`: NỀN TRẮNG + bảng màu VinUni. Viết `P.cream` hay một hex thẳng vào đây là khoá
 * cảnh vào nền đêm — đúng sai lầm đã tốn ≈0,75M token và 1h50 ngày 22/09/2026.
 * Bảng khoá theme: `lib/poster/theme.jsx` (`bg · surface · ink · inkMuted · line · lineStrong ·
 * accentA · accentB · positive · negative · halo · dimMin · largeOnly`).
 *
 * ── Import ở đâu ──────────────────────────────────────────────────────────────────────────────
 * `lib/index.js` gom dòng poster thành NAMESPACE (engine poster có `Easing`/`interpolate`/`clamp`
 * trùng tên với dòng slide, nên không `export *`):
 *
 *   poster              engine — `M`, `useComposition`, `Shot`, `kf`, `breathe`, `animate`
 *   posterTheme         `usePosterTheme`, `THEMES`, `themeByName`
 *   posterMarks         con dấu · bia khắc · pill · ✕ · thẻ · linh vật
 *   posterFigures       hình vẽ lớn (cỗ máy, băng chuyền, nhánh draw-on…)
 *   posterBridge        cầu nối giữa hai chương
 *   PhotoCard           ảnh tư liệu từ images.js
 *   createPosterStage
 *
 * Chữ ký từng primitive: `styles/poster.md`.
 */
import React from 'react';
import { POSTER_FONT as FONT } from '../../../../lib/tokens.js';
import { poster, posterTheme, posterMarks } from '../../../../lib/index.js';

const { M, useComposition } = poster;
const { usePosterTheme } = posterTheme;
const { Stamp } = posterMarks;

export function Intro() {
  const { T } = useComposition();
  const th = usePosterTheme();
  const title = M.pop(T, 0.3, 0.6);
  const mark = M.pop(T, 0.9, 0.5);
  // Mốc nhấn neo vào TỪ được nói thật: gọi `beatT` (lấy từ `stage.jsx`) với tên cảnh + cụm từ, chứ
  // không phải hằng số frame. Cụm từ phải có trong `text` của cue — gate G2 kiểm đúng điều đó.
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: 150, top: 420, opacity: title.opacity, transform: title.transform, transformOrigin: 'left center' }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 56, color: th.ink }}>__TITLE__</div>
      </div>
      <div style={{ position: 'absolute', left: 150, top: 530, opacity: mark.opacity, transform: mark.transform, transformOrigin: 'left center' }}>
        <Stamp text="__DAY__" color={th.accentA} size={28} />
      </div>
    </div>
  );
}

/**
 * Ba cảnh trắc nghiệm cuối video (`script-craft.md` §3i.3) — KHUNG sẵn, thay nội dung thật vào.
 * Đáp án khai ở `storyboard.json` (`quiz.answer`), gate G7 đối chiếu; ở đây chỉ vẽ.
 * Chữ trên hình của quiz CỐ Ý chép lời đọc (người xem phải đọc lại trong khe lặng) — vì vậy cảnh
 * quiz khai `kind: "quiz"` trong storyboard, nếu không G1 sẽ báo "lặp phụ đề".
 */
export function Quiz({ sceneId }) {
  const { T } = useComposition();
  const th = usePosterTheme();
  const answer = 3; //         placeholder — đổi cho khớp `quiz.answer` trong storyboard.json
  const reveal = T >= 9.5; //  đáp án sáng lên SAU khe lặng 3 s, không sớm hơn
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: 150, right: 150, top: 300, opacity: M.enter(T, 0.2, 0.5).opacity }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 44, color: th.ink }}>
          {`Câu hỏi — ${sceneId}`}
        </div>
      </div>
      {[1, 2, 3].map((i) => {
        const on = reveal && i === answer;
        const e = M.enter(T, 0.6 + i * 0.5, 0.5);
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: 150, right: 150, top: 400 + (i - 1) * 110, height: 90,
              opacity: Math.max(e.opacity, th.dimMin * (reveal && !on ? 1 : 0)),
              transform: e.transform,
              background: on ? th.positive : th.surface,
              border: `3px solid ${on ? th.positive : th.line}`,
              borderRadius: 12,
              display: 'flex', alignItems: 'center', paddingLeft: 32,
              fontFamily: FONT, fontWeight: 700, fontSize: 30,
              color: on ? th.bg : th.ink,
            }}
          >
            {`${i}. placeholder lựa chọn ${i}`}
          </div>
        );
      })}
    </div>
  );
}
