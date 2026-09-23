/**
 * Sân khấu chung của MỌI video dòng "poster vector" — nơi frame đo được của giọng gặp giây authored
 * của bản thiết kế gốc.
 *
 * Dùng: `const { PosterStage, sceneOf, chapterTime, beatT, SCENE_PLAN } = createPosterStage({
 *          CHAPTERS, TIMELINE, spokenAt });`
 * Video chỉ khai bảng `CHAPTERS` của mình (tên cảnh + `dur` authored + header chương) rồi truyền
 * `TIMELINE`/`spokenAt` của chính nó vào. Toàn bộ phần dưới đây không biết gì về một video cụ thể.
 *
 * ── Ánh xạ thời gian ──────────────────────────────────────────────────────────────────────────
 * Mỗi cảnh của sếp có `dur` authored khai trong `OM_SCENES` (ba file `Animation Demo*.dc.html`).
 * Thời lượng THẬT của cảnh = tổng thời lượng các cue giọng thuộc cảnh đó (`timeline.js`).
 *
 *   ratio = giâyGiọng / giâyAuthored
 *   ratio ≤ 1.35 → kéo giãn tuyến tính: T = authStart + (frameLocal / framesCảnh) × authDur
 *   ratio > 1.35 → KHÔNG kéo giãn mù: chạy đúng tốc độ gốc rồi GIỮ frame cuối.
 *
 * Ngưỡng 1.35 là trần ±35% trong brief. Cảnh nào rơi vào nhánh HOLD được in ra bởi
 * `node tools/../projects/<id>/qa/timing-report` (xem `SCENE_PLAN` export bên dưới) và phải có mặt
 * trong báo cáo — một cảnh bị giãn 2× trông như phim quay chậm, đó chính là thứ luật này chặn.
 *
 * `authoredDuration` của `lib/series.jsx` làm đúng phép rescale tuyến tính này, NHƯNG chỉ ở mức một
 * sequence = một cue. Ở đây một cảnh authored trải qua NHIỀU cue, nên phép rescale phải tính trên
 * biên CẢNH, không phải biên cue — nếu để `Series` tự rescale từng cue thì mỗi cue sẽ tự co giãn
 * riêng và các mốc animation bên trong một cảnh sẽ nhảy giật ở mỗi biên cue. Vì vậy `video.jsx`
 * KHÔNG khai `authoredDuration`; mỗi scene tự cộng `start` toàn cục của nó rồi hỏi `chapterTime()`.
 *
 * ── Khung hình ────────────────────────────────────────────────────────────────────────────────
 * Bản của sếp dựng trên 1600×900. Harness là 1920×1080. 1920/1600 = 1.2 = 1080/900 nên
 * `scale(1.2)` với `transformOrigin: 'top left'` là khớp tuyệt đối, không méo, không cắt.
 * Header và thanh phụ đề vẽ ở hệ toạ độ NGOÀI (1920×1080) để đặt đúng `LAYOUT.captionTop`.
 */
import React from 'react';
import { LAYOUT, POSTER as P, POSTER_FONT as FONT } from '../tokens.js';
import { SceneFitContext } from './vach.jsx';
import { PosterThemeContext, themeByName, NIGHT } from './theme.jsx';
import { cueCaptions } from '../captions.js';
import { CompositionContext, Easing, kf } from './engine.jsx';

export const W = 1600;
export const H = 900;
export const SCALE = 1920 / W;
export const FPS = 30;

/**
 * `dur` authored của từng cảnh, lấy NGUYÊN VĂN từ `window.OM_SCENES` của ba file demo của sếp;
 * bốn cảnh mới (`cold-open`, `bridge-1`, `bridge-2`, `outro`) là thiết kế của owner, `dur` do owner
 * đặt theo brief (~12s · ~10s · ~12s · ~16s).
 *
 * `dur` ĐÃ CHỈNH so với `OM_SCENES` ở MỌI cảnh, và lý do là số đo chứ không phải thẩm mỹ: ba bài của
 * sếp là ba video RỜI, mỗi cảnh gánh một lượng lời khác hẳn bản gộp này (ví dụ `HoiTu` giờ gánh 5
 * cue vì `T4` được viết lại thành 6 cue trong `script-lock.md`, còn `CuNo`/`TramNhanh` gánh 2 cue
 * ngắn). Giữ nguyên `dur` cũ thì tỉ lệ giọng/authored rơi xuống 0,64 (animation chạy nhanh gấp rưỡi)
 * hoặc vọt lên 1,41 (phải HOLD frame cuối 7,5 giây). Chỉnh `dur` KHÔNG dịch một mốc animation nào
 * bên trong cảnh — mọi offset `A + x` giữ nguyên vị trí; chỉ cửa sổ tổng của cảnh đổi. Bảng đối chiếu
 * dur cũ → dur mới nằm trong `projects/<id>/PROMPTS.md`.
 *
 * Lần chỉnh THỨ HAI (sau khi bind giọng thật): OmniVoice đọc 5,0 âm tiết/giây, nhanh hơn hẳn ước
 * lượng 3,08 của kịch bản — cả video còn 3:08 thay vì 4:53. Với `dur` cũ, mọi cảnh phải nén 1,4–2,1
 * lần (tỉ lệ 0,47–0,75), tức animation chạy nhanh gấp đôi bản sếp dựng. `dur` mới bám sát giọng đo
 * được nên tỉ lệ về 0,74–0,92: animation gần như chạy đúng tốc độ gốc.
 *
 * `key` = tên mà file scene gốc tra trong prop `C` (`C.BaiHoc`, `C.TramNhanh`…). Chương Cây và
 * chương 1973 đều có một cảnh tên `BaiHoc`, nên `cues.js` dùng id `BaiHocCay` để phân biệt còn
 * `key` vẫn là `BaiHoc` — đúng tên mà `tree-scene` đang đọc.
 */
export const STRETCH_CAP = 1.35;

/**
 * `planScenes` — kế hoạch thời gian: một dòng cho mỗi cảnh, đã gắn frame THẬT đo được từ `TIMELINE`.
 *
 * Đây là phép tính mà trước đây làm bằng tay hai vòng × 21 cảnh (chú thích ở đầu file). Tách ra
 * thành hàm thuần, không React, để `tools/scene-pace.mjs` in bảng authored/voiced/ratio và đề xuất
 * bộ `dur` mới trước khi ai phải render một lần nào.
 */
export const planScenes = ({ chapters, timeline, fps = FPS, stretchCap = STRETCH_CAP }) => {
  const out = [];
  for (const ch of chapters) {
    const table = {};
    let authStart = 0;
    for (const s of ch.scenes) {
      table[s.key] = Math.round(authStart * 1000) / 1000;
      authStart += s.dur;
    }
    const authoredTotal = authStart;
    let authCursor = 0;
    for (const s of ch.scenes) {
      const cues = timeline.filter((t) => t.scene === s.id);
      if (!cues.length) throw new Error(`stage.jsx: không cue nào khai scene "${s.id}"`);
      const startFrame = cues[0].start;
      const frames = cues.reduce((n, c) => n + c.duration, 0);
      const voicedSec = frames / fps;
      const ratio = voicedSec / s.dur;
      const mode = ratio > stretchCap ? 'hold' : 'rescale';
      out.push({
        chapter: ch.id,
        header: ch.header,
        id: s.id,
        key: s.key,
        table,
        authoredTotal,
        authStart: authCursor,
        authDur: s.dur,
        startFrame,
        frames,
        voicedSec,
        ratio,
        mode,
        // Giây GIỮ frame cuối: chỉ nhánh `hold` mới có. Cảnh chạy hết `authDur` rồi đứng im phần dư.
        holdSec: mode === 'hold' ? voicedSec - s.dur : 0,
        cues: cues.map((c) => c.n),
      });
      authCursor += s.dur;
    }
  }
  return out;
};



/** Frame toàn cục → `T` (giây authored) trong chương của cảnh `id`. */
function chapterTimeOf(SCENE_BY_ID, id, globalFrame) {
  const s = SCENE_BY_ID[id];
  const local = Math.max(0, Math.min(globalFrame - s.startFrame, s.frames));
  if (s.mode === 'hold') return s.authStart + Math.min(local / FPS, s.authDur);
  return s.authStart + (s.frames > 0 ? (local / s.frames) * s.authDur : 0);
}

/**
 * `T` (giây authored) của đúng lúc một cụm từ được NÓI RA.
 *
 * Đây là cầu nối giữa hai hệ thời gian: `spokenAt(n, cụm)` trả frame scene-local trong cue `n`
 * (mốc word-level thật từ Whisper align khi `voice.js` đã bind, ước lượng theo âm tiết khi chưa),
 * cộng `TIMELINE[n].start` thành frame toàn cục, rồi `chapterTime()` đổi sang `T`. Nhờ vậy một
 * mốc hình (flash ChatGPT, con dấu 2006, "MÈO ✓") rơi đúng vào chữ tương ứng trong giọng đọc dù
 * cảnh có bị co giãn bao nhiêu.
 *
 * `lead` = số frame hiện TRƯỚC khi nghe thấy (4–8 frame là nhịp quen của harness).
 *
 * Tra cue theo CỤM TỪ trong chính cảnh đó, KHÔNG theo số câu: ranh giới cue của video này đã phải
 * đổi bốn lần vì OmniVoice nuốt chữ, và mỗi lần đổi là một lần số câu chạy. Một mốc hình neo vào số
 * câu sẽ im lặng trỏ sang câu khác (hoặc ném lỗi giữa render) mỗi lần như thế.
 */
function beatTOf(TIMELINE, spokenAt, chapterTime, sceneId, phrase, lead = 5) {
  const t = TIMELINE.find((x) => x.scene === sceneId && x.text.includes(phrase));
  if (!t) {
    const có = TIMELINE.filter((x) => x.scene === sceneId).map((x) => x.n).join(', ');
    throw new Error(`beatT: không câu nào của cảnh "${sceneId}" (câu ${có}) chứa "${phrase}"`);
  }
  return chapterTime(sceneId, t.start + spokenAt(t.n, phrase) - lead);
}

// ── Phụ đề ────────────────────────────────────────────────────────────────────────────────────


/**
 * Thanh phụ đề của video này — KHÔNG dùng thanh navy 96px của `SceneFrame`: nền ở đây là `night`
 * (#243155), một thanh navy đặt trên đó gần như biến mất. Thanh `deep` (#181f38) + chữ `cream`
 * cho tương phản 13,5:1 (yêu cầu ≥7:1), và nó nằm ở đúng `LAYOUT.captionTop` = 984 nên không đè
 * lên bất kỳ chữ nào của cảnh (chữ thấp nhất của sếp ở y≈710/900 → 852 sau scale 1.2).
 */
function CaptionBar({ frame, CAPTIONS, theme }) {
  const page = CAPTIONS.find((c) => frame >= c.start && frame < c.end);
  if (!page) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: LAYOUT.captionTop,
        height: LAYOUT.captionHeight,
        background: theme.captionBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
      }}
    >
      <div
        style={{
          maxWidth: 1720,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 40,
          lineHeight: 1.15,
          color: theme.captionInk,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {page.text}
      </div>
    </div>
  );
}

/** Header góc trái trên kiểu bản sếp: chữ in hoa giãn chữ + gạch chân gold, fade theo chương. */
function Header({ text, T, theme, eyebrow }) {
  if (!text) return null;
  const p = kf(T, [[0.4, 0], [1.2, 1]], Easing.easeInOutQuad);
  /*
   * Chrome VinUni (README §5 + §6): eyebrow đỏ IN HOA giãn chữ ở top 70 → tiêu đề 50 px đậm căn
   * giữa (baseline 176) → divider 3 px ở y 220 (x 96→1824) → watermark góc phải trên. Dòng poster
   * cũ chỉ có một nhãn góc trái; trên theme light phải dùng đúng chrome của series, nếu không video
   * đứng cạnh n5-01 là đọc ra ngay "không cùng một nhà".
   */
  if (theme.chrome === 'vinuni') {
    return (
      <div style={{ position: 'absolute', inset: 0, opacity: p, zIndex: 20 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 24, letterSpacing: 5, color: theme.highlight }}>
          {eyebrow}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 128, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 50, color: theme.ink }}>
          {text}
        </div>
        <div style={{ position: 'absolute', left: 96, right: 96, top: 220, height: 3, background: theme.surfaceAlt, transform: `scaleX(${p})`, transformOrigin: 'center' }} />
        {/* Watermark: chấm đỏ + MỘT node chữ, xếp bằng flex chứ không bằng toạ độ tay — canh tay
            một lần đã đặt chấm ĐÈ LÊN chữ ("VinUn●"). Chấm là div nền, không phải ký tự `●` trong
            chữ: tách ký tự ra `<span>` thì `qa-layout` đọc thành hai hộp chữ chồng nhau.
            Lề phải 76 px để không chạm ngưỡng MÉP 64 px. */}
        <div style={{ position: 'absolute', right: 76, top: 48, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: theme.highlight }} />
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: theme.ink }}>
            VinUni · AI in Action 20K
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', left: 72, top: 50, opacity: p, zIndex: 20 }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 31, letterSpacing: 2.4, color: P.cream }}>{text}</div>
      <div
        style={{
          height: 7,
          background: theme.chrome === 'vinuni' ? theme.lineStrong : theme.highlight,
          borderRadius: 4,
          transform: `scaleX(${p})`,
          transformOrigin: 'left',
          marginTop: 7,
        }}
      />
    </div>
  );
}

/**
 * Font cục bộ. `markReady()` của harness chỉ chờ Montserrat nên Be Vietnam Pro phải nạp từ chính
 * server preview (`npm run serve` phục vụ thư mục design system ở gốc), KHÔNG qua mạng: đường dẫn
 * tuyệt đối `/fonts/…` đúng cho cả `ui_kits/lesson-video/index.html`, `card.html` và `player.html`.
 * OFL đi kèm ở `fonts/BeVietnamPro-OFL.txt`.
 */
const FONT_CSS = ['Medium 500', 'SemiBold 600', 'Bold 700', 'ExtraBold 800']
  .map((s) => {
    const [file, weight] = s.split(' ');
    return `@font-face{font-family:"Be Vietnam Pro";src:url("/fonts/BeVietnamPro-${file}.ttf") format("truetype");font-weight:${weight};font-style:normal;font-display:block;}`;
  })
  .join('');

/**
 * Sân khấu: nền đêm 1920×1080, bên trong là khung 1600×900 của sếp phóng 1.2 lần từ góc trái trên.
 * `scene` nhận `{ T, C, total }` — đúng chữ ký mà ba file scene gốc đang dùng.
 */
function PosterStageInner({ sceneId, frame, children, SCENE_BY_ID, chapterTime, CAPTIONS, theme = NIGHT, eyebrow, fitOf }) {
  const s = SCENE_BY_ID[sceneId];
  const T = chapterTime(sceneId, frame);
  const ctx = { T, CUES: s.table, time: T, duration: s.authoredTotal, authoredTotal: s.authoredTotal, playing: false };
  return (
    <PosterThemeContext.Provider value={theme}>
    <CompositionContext.Provider value={ctx}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: 1920,
          height: 1080,
          background: theme.bg,
          overflow: 'hidden',
          fontFamily: FONT,
          color: theme.ink,
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: FONT_CSS }} />
        {/* `fitOf` = lưới dọc riêng của cảnh (xem `SceneFitContext`). Không khai thì bằng null,
            và mọi lớp vẽ y như trước — ba video đang chạy không đổi một pixel. */}
        <SceneFitContext.Provider value={(fitOf && fitOf(sceneId)) || null}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </SceneFitContext.Provider>
        <Header text={s.header} T={T} theme={theme} eyebrow={eyebrow} />
        <CaptionBar frame={frame} CAPTIONS={CAPTIONS} theme={theme} />
      </div>
    </CompositionContext.Provider>
    </PosterThemeContext.Provider>
  );
}

/** Dựng bộ sân khấu cho MỘT video: khai `CHAPTERS`, đưa `TIMELINE` + `spokenAt` của video vào. */
export function createPosterStage({ CHAPTERS, TIMELINE, spokenAt, theme: themeName, eyebrow, fitOf }) {
  const theme = themeByName(themeName);
  const SCENE_PLAN = planScenes({ chapters: CHAPTERS, timeline: TIMELINE });
  const SCENE_BY_ID = Object.fromEntries(SCENE_PLAN.map((s) => [s.id, s]));
  const sceneOf = (id) => SCENE_BY_ID[id];
  const chapterTime = (id, f) => chapterTimeOf(SCENE_BY_ID, id, f);
  const beatT = (sceneId, phrase, lead) => beatTOf(TIMELINE, spokenAt, chapterTime, sceneId, phrase, lead);
  const CAPTIONS = cueCaptions(TIMELINE.map((t) => ({ start: t.start, end: t.end, text: t.text, pause: t.pause })));
  const PosterStage = (props) => PosterStageInner({ ...props, SCENE_BY_ID, chapterTime, CAPTIONS, theme, eyebrow, fitOf });
  return { SCENE_PLAN, sceneOf, chapterTime, beatT, PosterStage, theme };
}
