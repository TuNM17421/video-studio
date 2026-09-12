/**
 * Năng lực chọn thêm cho một video — không phải style.
 *
 * Style là ngôn ngữ hình (bảng màu, component, quy tắc); một năng lực là thứ đổi *cách làm*: kịch bản
 * viết khác, bước giọng chạy khác. Hai thứ tổ hợp tự do, nên video hội thoại vẫn là Lesson Lab Style.
 *
 * Cố tình giữ ở mức một danh sách phẳng thay vì một khung plugin: mới có đúng một năng lực thật, và
 * năng lực thứ hai ("tìm ảnh thực tế để minh hoạ") sẽ thêm hẳn một công đoạn chứ không mở rộng dữ liệu
 * như cái này. Rút ra cái chung khi đã có hai ví dụ thật, không phải một ví dụ cộng một phỏng đoán.
 */
export interface ModuleDef {
  id: string;
  name: string;
  summary: string;
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
    template: "templates/kich-ban-hoi-thoai.md",
    previewKey: "modules/hoi-thoai-mau-v2.mp4",
  },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);
export const isModuleId = (value: unknown): value is string => typeof value === "string" && MODULES.some((m) => m.id === value);
/** Bỏ mọi mã lạ và mã trùng — danh sách này đi thẳng vào REQUEST.md. */
export const cleanModules = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter(isModuleId))] : [];
export const moduleNames = (ids: string[]) => ids.map((id) => moduleById(id)?.name || id);
