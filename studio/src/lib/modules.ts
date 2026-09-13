/**
 * Năng lực chọn thêm cho một video — không phải style.
 *
 * Style là ngôn ngữ hình (bảng màu, component, quy tắc); một năng lực là thứ đổi *cách làm*: kịch bản
 * viết khác, bước giọng chạy khác. Hai thứ tổ hợp tự do, nên video hội thoại vẫn là Lesson Lab Style.
 *
 * Các năng lực là một collection phẳng để Studio tự xếp thành card. Thêm năng lực không cần đổi layout;
 * logic riêng của năng lực vẫn phải được khai rõ trong REQUEST.md thay vì suy đoán từ tên card.
 */
export interface ModuleDef {
  id: string;
  name: string;
  summary: string;
  /** Glyph dùng trên card; là chuỗi để API modules có thể trả nguyên object. */
  icon: "dialogue" | "quiz";
  /** Tài liệu người viết kịch bản phải theo khi bật năng lực này. */
  template?: string;
  /** Key trên kho media của video xem thử; server đổi thành URL, thiếu thì nút xem thử không hiện. */
  previewKey?: string;
}

/** Một năng lực kèm video xem thử đã dựng sẵn URL (trả qua /api/modules). */
export interface ModuleInfo extends ModuleDef {
  preview: { url: string; type: string } | null;
}

export const MODULES: ModuleDef[] = [
  {
    id: "dialogue",
    name: "Video có hội thoại",
    summary: "Nhiều nhân vật cùng nói, mỗi người một giọng. Kịch bản phải khai ai nói câu nào.",
    icon: "dialogue",
    template: "templates/kich-ban-hoi-thoai.md",
    previewKey: "modules/hoi-thoai-mau-v2.mp4",
  },
  {
    id: "quiz",
    name: "Video có quiz",
    summary: "Đặt câu hỏi, dành thời gian suy nghĩ và tách rõ phần hỏi khỏi phần chữa bài.",
    icon: "quiz",
  },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);
export const isModuleId = (value: unknown): value is string => typeof value === "string" && MODULES.some((m) => m.id === value);
/** Bỏ mọi mã lạ và mã trùng — danh sách này đi thẳng vào REQUEST.md. */
export const cleanModules = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter(isModuleId))] : [];
export const moduleNames = (ids: string[]) => ids.map((id) => moduleById(id)?.name || id);
