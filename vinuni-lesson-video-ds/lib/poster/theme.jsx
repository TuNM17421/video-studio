/**
 * THEME của dòng poster — tách NGÔN NGỮ CHUYỂN ĐỘNG khỏi MÀU/NỀN.
 *
 * Vì sao có file này (22/09/2026): Thái xem bản `d05-v06` 10:54 và chốt "animation chất lượng hơn
 * những bản trước" nhưng **màu và nền phải theo series VinUni: NỀN TRẮNG + bảng màu VinUni**. Cái
 * hay của dòng poster là cách vật thể diễn (carrier đi xuyên phim, mốc nhấn neo vào lời, easing
 * theo nghĩa) — KHÔNG phải nền đêm. Nền đêm chỉ là một theme, và nó không phải theme mặc định.
 *
 * Primitive từ nay đọc theme qua `usePosterTheme()`, không đọc thẳng token `POSTER`/`C`.
 *
 * ── Hai bản ───────────────────────────────────────────────────────────────────────────────────
 * `night`         giữ NGUYÊN từng giá trị đang chạy. Video `demo-ai-history-three-turns` phải
 *                 render không đổi một pixel — chứng minh bằng sha256 SSR markup 44 frame.
 * `vinuni-light`  MẶC ĐỊNH cho video mới. Chỉ ánh xạ sang 9 token `C` + 4 màu vai trò `ROLE` đã
 *                 duyệt; KHÔNG thêm một hex nào (gate `off-palette` xanh mà không phải khai thêm).
 *
 * ── Ba thứ không chỉ là đổi màu ───────────────────────────────────────────────────────────────
 * 1. `halo`  nền đêm dùng QUẦNG SÁNG để tách vật thể khỏi nền; nền trắng không có quầng sáng —
 *            phải đổi sang BÓNG ĐỔ nhẹ + nét đậm hơn. Primitive đọc khoá này, không tự đoán.
 * 2. `dimMin` trạng thái mờ 0,3 trên nền đêm đọc ra là "chìm"; trên nền trắng nó thành XÁM BẨN.
 *            Theme light chặn dưới ở 0,55 và ưu tiên đổi MÀU (`inkMuted`) thay vì hạ alpha.
 * 3. `largeOnly` màu nào chỉ đủ tương phản cho CHỮ LỚN (≥24 px đậm → ngưỡng WCAG 3:1) thì liệt ở
 *            đây; chữ nhỏ dùng màu đó là sai, dùng `ink`/`inkMuted`.
 */
import React from 'react';
import { POSTER as P, C, ROLE } from '../tokens.js';

/**
 * `night` — bảng màu đang chạy, chép NGUYÊN giá trị. Đổi một dòng ở đây là đổi ba video đã render.
 */
export const NIGHT = Object.freeze({
  id: 'night',
  chrome: 'poster',
  bg: P.night,
  surface: P.night2,
  surfaceAlt: P.deep,
  ink: P.cream,
  inkMuted: P.ice,
  line: P.steel,
  lineStrong: P.steel,
  accentA: P.blue, //    "máy tự làm"
  accentB: P.gold, //    "người quyết"
  positive: P.mint,
  negative: P.coral,
  negativeSoft: P.night2, //  nền pill "sai" trên nền đêm
  cut: P.red,
  odd: P.purple,
  highlight: P.gold,
  paper: P.cream,
  paperInk: P.deep,
  captionBg: P.deep,
  captionInk: P.cream,
  halo: 'glow',
  dimMin: 0.3,
  mascotVariant: 'halo',
  mascotGround: 'cut',
  largeOnly: Object.freeze([P.steel]),
});

/**
 * `vinuni-light` — nền trắng, mực navy, chỉ 9 token `C` + 4 màu vai trò `ROLE`.
 *
 * CẶP MÀU CỦA CÁI VẠCH (đo bằng tỉ số tương phản WCAG trên nền `#ffffff`):
 *   trái "máy tự làm"  → `C.accent` #1d6199 · 6,52:1 — đúng nghĩa DS: xanh = dữ liệu / trung tính /
 *                        CHƯA XỬ LÝ, tức là phần máy tự chạy.
 *   phải "người quyết" → `ROLE.orange` #c8641e · 3,96:1 — nghĩa DS của cam là CHECK / ACTION, và
 *                        "người quyết" chính là bước người kiểm và bấm nút.
 *
 * KHÔNG dùng `red` cho một nửa cái vạch: trong DS đỏ đã mang nghĩa NHẤN / RỦI RO / ĐÁP ÁN, một nửa
 * carrier nhuộm đỏ suốt 11 phút sẽ nuốt mất nghĩa đó ở đúng những chỗ cần nó (tấm séc, hộp thoại
 * xoá, ✕ của các case sai).
 *
 * Cam 3,96:1 KHÔNG đủ cho chữ thường (4,5:1) nhưng đủ cho CHỮ LỚN (≥24 px đậm → 3:1). Vì vậy cam
 * chỉ dùng cho NÉT và NHÃN LỚN; mọi chữ nhỏ ở nửa phải dùng `ink` navy. Đó là lý do có `largeOnly`.
 */
export const VINUNI_LIGHT = Object.freeze({
  id: 'vinuni-light',
  chrome: 'vinuni',
  bg: C.bg, //                #ffffff
  surface: C.bgAlt, //        #f2f7fc · thân thẻ, "cỗ máy kính"
  surfaceAlt: C.dotInactive,//#e0edf8 · đường ray, track, trạng thái chưa kích hoạt
  ink: C.text, //             #0b2a4d · 14,46:1
  inkMuted: C.textMuted, //   #4a4a4a ·  8,86:1
  line: C.dotInactive, //     #e0edf8 · divider / ray (KHÔNG dùng cho chữ)
  lineStrong: C.accent, //    #1d6199 · nét mang nghĩa
  accentA: C.accent, //       6,52:1
  accentB: ROLE.orange, //    3,96:1 — chỉ nét + chữ LỚN
  positive: ROLE.green, //    5,01:1
  negative: C.red, //         5,71:1
  negativeSoft: C.redSoft, // #ffe0e1 · nền thẻ cảnh báo, đúng nghĩa DS
  cut: C.red,
  odd: ROLE.purple, //        7,20:1
  highlight: C.red,
  paper: C.bgAlt,
  paperInk: C.text,
  captionBg: C.text, //       thanh phụ đề navy 96 px + chữ trắng — luật 6 của DS
  captionInk: C.bg,
  halo: 'shadow',
  dimMin: 0.55,
  mascotVariant: 'bare', //   artwork LEXCE vẽ SẴN cho nền trắng — viền halo là thứ chỉ nền đêm cần
  mascotGround: 'keep', //    trả lại đĩa bóng dưới chân, đúng như video chuẩn n5-01
  largeOnly: Object.freeze([ROLE.orange, ROLE.amber, C.dotInactive, C.redSoft]),
});

export const THEMES = Object.freeze({ night: NIGHT, 'vinuni-light': VINUNI_LIGHT });

/**
 * Mặc định là `night` CÓ CHỦ ĐÍCH: ba video đã render đang chạy trên nó và không được đổi vì một
 * theme mới. Video mới khai `theme: 'vinuni-light'` trong `createPosterStage`.
 */
export const PosterThemeContext = React.createContext(NIGHT);

export function usePosterTheme() {
  return React.useContext(PosterThemeContext) || NIGHT;
}

/** Tra theme theo tên; tên lạ thì ném ngay, đừng im lặng rơi về nền đêm giữa một video nền trắng. */
export function themeByName(name) {
  if (!name) return NIGHT;
  const t = THEMES[name];
  if (!t) throw new Error(`theme poster "${name}" không có — chỉ ${Object.keys(THEMES).join(' · ')}`);
  return t;
}
