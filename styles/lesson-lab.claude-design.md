Mỗi câu là **một cảnh riêng**. Ghép tất cả bằng `Series`, mỗi mục `{ component, duration, name }` với `duration` **đúng bằng số frame ghi trong danh sách câu**, theo đúng thứ tự.

Bọc nội dung mỗi cảnh trong `SceneFrame`: truyền `frame`, `eyebrow` (một dòng viết hoa cho cả video, ví dụ `"NGÀY 03 · TỪ CHATBOT ĐẾN AGENT"`), `title` theo từng cảnh, và phụ đề.

**Phụ đề:** đừng truyền cả câu vào `caption` — thanh phụ đề chỉ chứa khoảng 78 ký tự, câu dài sẽ tràn. Dùng `captions` (hoặc `cueCaptions`) để chia thành nhiều trang, chữ giữ **nguyên văn** lời đọc.

**Đầu ra** là một trang xem được: `Series` bọc trong `Player`, đặt trong một khung tỉ lệ 16:9 có `position: relative`. Lưu ý `Player` có thanh điều khiển cao 56 px **nằm bên trong** nó, nên khung 16:9 trần sẽ bị viền đen — cộng thêm 56 px vào chiều cao khung bọc. Mình muốn bấm play xem hết và tua được tới từng cảnh.

**Thành phần hay dùng của style này:** `Card`, `GlassBox`, `GlassNode` cho khối; `Flow`, `StaticPath`, `Particle` cho luồng và hạt; `Pill`, `Chip`, `NumberBadge`, `ZoneLabel` cho nhãn; `SvgText`, `Multiline`, `RichText` cho chữ trong SVG; `Icon` và `LineIcon` cho biểu tượng; `Brand` khi cần tên sản phẩm thật.

Hầu hết component là **mảnh SVG đặt bằng toạ độ tuyệt đối** trong sân khấu 1920×1080 (`x`, `y`, `w`, `h`) — chúng chỉ vẽ ra gì đó khi nằm trong `<svg>` của `SceneFrame`. Đừng xếp chúng bằng flex hay grid. Nối hai khối bằng `anchor(box, 'left'|'right'|'top'|'bottom')`, đừng ước toạ độ bằng mắt.

`SvgText` / `Multiline` / `RichText` **không tự đặt font** — chúng thừa kế Montserrat từ `.vk-scene`. Trong một `<svg>` trần nằm ngoài `SceneFrame` thì phải tự đặt `style={{ fontFamily: 'var(--font-sans)' }}`, không thì chữ rơi về font serif.

**Màu vai trò** (`ROLE_OF`: tím, xanh lá, cam, hổ phách) chỉ dùng cho nhãn vùng, viền và nền nhạt khi bài học có gán vai trò cho từng khối — không dùng cho chữ thường, số hay hạt.

**Dữ liệu minh hoạ:** nhãn chứa chữ "MINH HỌA" **không được vẽ ra** (quyết định của nhóm, `IllustrativeStamp` trả về rỗng với nhãn đó dù tài liệu ghi là mặc định). Cần đánh dấu dữ liệu mô phỏng thì dùng chữ khác, ví dụ "DỮ LIỆU MÔ PHỎNG".
