/**
 * Năng lực chọn thêm cho một video — không phải style.
 *
 * Style là ngôn ngữ hình (bảng màu, component, quy tắc); một năng lực là thứ đổi *cách làm*: kịch bản
 * viết khác, bước giọng chạy khác. Hai thứ tổ hợp tự do, nên video hội thoại vẫn là Lesson Lab Style.
 *
 * Danh mục không khai ở đây: mỗi năng lực là một file `templates/modules/<id>.md` (server đọc qua
 * `lib/server/modules.ts`, form lấy qua `/api/modules`). File này chỉ giữ kiểu dữ liệu dùng chung.
 */
export interface ModuleDef {
  id: string;
  name: string;
  /**
   * `short:` trong file module — tên trên hàng bật tắt của bước Kế hoạch, đứng dưới nhãn nhóm "Video có thêm"
   * nên không lặp lại "Video có". Thiếu thì dùng `name`. REQUEST.md và bảng tóm tắt vẫn dùng `name`.
   */
  short?: string;
  summary: string;
  /** Glyph trên card: "dialogue" · "quiz" · "mascot" · "image" có glyph riêng, giá trị khác dùng glyph chung. */
  icon: string;
  /** Tài liệu người viết kịch bản phải theo khi bật năng lực này — chính là file đã khai ra nó. */
  template: string;
  /** Key trên kho media của video xem thử; server đổi thành URL, thiếu thì nút xem thử không hiện. */
  previewKey?: string;
  /**
   * `default: true` trong file module: video MỚI tick sẵn năng lực này. Bỏ tick vẫn bỏ được — đây là
   * điểm xuất phát, không phải luật. Cùng quy ước với `"default": true` của một bản nhạc trong music.json.
   */
  isDefault?: boolean;
}

/** Một năng lực kèm video xem thử đã dựng sẵn URL (trả qua /api/modules). */
export interface ModuleInfo extends ModuleDef {
  preview: { url: string; type: string } | null;
}

/** Mọi kịch bản đều theo mẫu này; module chỉ ghi phần thêm. */
export const BASE_TEMPLATE_PATH = "templates/kich-ban-co-ban.md";

export const moduleNamesFrom = (list: Pick<ModuleDef, "id" | "name">[], ids: string[]) =>
  ids.map((id) => list.find((m) => m.id === id)?.name || id);
