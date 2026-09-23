export * from './tokens.js';
export * from './motion.js';
export * from './geometry.js';
export * from './captions.js';
export * from './player.jsx';
export * from './series.jsx';
export * from './text.js';
export * from './paths.js';
export * from './assets.js';
export * from './transitions.js';

// Dòng video "poster vector" — NGÔN NGỮ CHUYỂN ĐỘNG (full-frame, carrier, mốc nhấn neo vào lời).
// Nền/màu là trục RIÊNG: `posterTheme` (mặc định của series là `vinuni-light`, NỀN TRẮNG).
// Export theo NAMESPACE, không `export *`: engine poster có `Easing`/`interpolate`/`clamp` trùng tên
// với `motion.js`, star-export sẽ làm mọi scene đang có đứt build vì "ambiguous import".
export * as poster from './poster/engine.jsx';
export { createPosterStage } from './poster/stage.jsx';
// Theme của dòng poster — `usePosterTheme()` trong cảnh, `themeByName()`/`THEMES` để tra.
// Cảnh đọc MÀU qua đây, không hard-code token `POSTER` (nếu không là khoá cứng vào nền đêm).
export * as posterTheme from './poster/theme.jsx';
// Primitive của dòng poster (con dấu, bia đá, pill, ✕, thẻ, linh vật · nét vẽ ra, băng chuyền ·
// cầu nối). Cùng lý do namespace: `Card`/`Pill` trùng tên với component DS dòng slide.
export * as posterMarks from './poster/marks.jsx';
export * as posterFigures from './poster/figures.jsx';
export * as posterBridge from './poster/bridge.jsx';
// Ảnh tư liệu đi theo đường của remote: `images.js` + `<PhotoCard>` (components/media). Không còn
// `posterIllustration` — cảnh poster đặt thẳng `<PhotoCard>` vào SVG như mọi component DS khác.
// LEXCE bọc cho nền đêm (`MascotRevamp` vẽ cho nền TRẮNG) + khung điện thoại tông poster
// (`components/ui/PhoneFrame.jsx` khoá cứng bảng màu dòng slide, không nhận prop màu nào).
export * as posterMascot from './poster/mascot.jsx';
export * as posterPhone from './poster/phone.jsx';
// Carrier "CÁI VẠCH" của d05-v06 + bốn panel mà 36 cảnh của nó dùng lặp lại. Cùng lý do namespace:
// `Stack`/`Paper`/`W`/`H` trùng tên với nhiều chỗ khác trong cây.
export * as posterVach from './poster/vach.jsx';
// Carrier "CÁI CÂN" của d05-v01 (hai đĩa CÔNG SỨC ↔ TÍN HIỆU). Cùng lý do namespace: `Block`/`W`/`H`
// trùng tên với nhiều chỗ khác trong cây. Hình học và hợp đồng trạng thái: `lib/poster/can.jsx`.
export * as posterCan from './poster/can.jsx';
export * as posterPanels from './poster/panels.jsx';
// Hình CHÍNH có KHỐI của d05-v06 (panel · cỗ máy · xoè thẻ · người · thanh đo · bia). Cái vạch là
// CARRIER nối các cảnh, không phải nhân vật duy nhất: mỗi cảnh cần một hình chính có diện tích.
export * as posterHcai from './poster/hcai.jsx';
