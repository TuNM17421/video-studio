# Mascot — LEXCE, người dẫn chuyện

LEXCE là mascot chính thức của VinUniversity. Dùng `Mascot` trong SVG của `SceneFrame` để dẫn lời,
chỉ vào nội dung, hoặc phản ứng với nội dung.

**Đây là nhân vật DUY NHẤT.** LEXCE thay hẳn con chim xanh cũ (Thái chốt 14/09/2026). Đừng thêm
nhân vật thứ hai và đừng thêm bảng màu riêng cho một pose nào — xem mục "Đã vấp" ở cuối.

## Bản vector revamp

`lexce-revamp.svg` là master vector một pose vẫy tay theo ảnh Thái cung cấp ngày 14/09/2026; `lexce-revamp-transparent.svg` là cùng hình với nền trong suốt để đặt lên scene. Cả hai là SVG path thuần, không nhúng bitmap. Tám pose cũ ở `Mascot.jsx`; bộ revamp 11 cảm xúc, hoạt ảnh theo frame ở `MascotRevamp.jsx` (xem `MascotRevamp.prompt.md`).

## Hình lấy từ đâu

Dựng lại từ bản plush chính thức: đầu tròn kem, hai tai xanh royal có lòng tai xanh nhạt, lọn tóc
xanh trên trán, lông mày xanh nhạt, mắt navy to hai điểm sáng, má hồng, mỏ cam hình tim, khăn lông
cổ kem, bộ liền thân xanh, yếm be mang logo V của VinUniversity, ba lông cánh kem xếp lớp mỗi bên,
bàn tay vàng, đuôi lửa đỏ, bàn chân xanh nhạt.

Ba chỗ cố ý lệch khỏi bản plush, đã duyệt:

1. **Có nét viền navy** quanh mọi mảng. Bản plush không có viền; ở chỗ đứng `corner` nhân vật chỉ
   cao 190 px trên nền trắng, không viền là nó tan vào nền.
2. **Cánh xoè ngang tầm vai** thay vì rủ xuống, để silhouette đủ rộng mà phân biệt pose.
3. **Mỏ đóng là mặc định.** Ảnh gốc đang há miệng; mỏ há để dành cho các pose đang nói to.

## Pose

Tám pose: `idle` (mặc định), `point`, `wave`, `teach`, `happy`, `sad`, `excited`, `serious`.

| Pose | Dùng khi câu đọc đang |
|---|---|
| `idle` | kể chuyện bình thường, không nhấn gì |
| `point` | chỉ vào một thứ cụ thể trên màn hình |
| `wave` | chào mở đầu hoặc chào kết |
| `teach` | giải thích một khái niệm |
| `happy` | nói về kết quả tốt, chốt một ý vui |
| `sad` | nói về thất bại, rủi ro, chỗ vấp |
| `excited` | bất ngờ, "à ra thế", con số gây sốc |
| `serious` | cảnh báo, ràng buộc, luật lệ — thứ không đùa được |

Danh sách pose export ra ở `MASCOT_POSES`; gallery và mọi chỗ cần liệt kê phải đọc từ đó, không
chép tay.

### Thêm pose mới thì làm gì

Phần thân là **một bộ mảnh dùng chung**; mỗi pose chỉ khai phần khác trong `POSE_SPEC`:

| Tham số | Ý nghĩa |
|---|---|
| `armL` / `armR` | góc xoay vai. **Dương là giơ lên**, âm là hạ và khép vào thân |
| `wing` | độ xoè cánh. Dương là mở lên, âm là rủ xuống |
| `ear` | dương là tai cụp ra ngoài |
| `brows` | `normal` · `raised` · `flat` · `sad` |
| `eyes` | `open` · `big` · `happy` (cung cong lên) |
| `beak` | `closed` · `open` (lộ khoang miệng đỏ) |
| `tear`, `speed` | giọt nước mắt, vạch tốc độ |

Thêm một dòng vào `POSE_SPEC`, thêm tên vào union `MascotPose` trong `.d.ts`, và ghi một dòng vào
bảng trên. **Nếu pose mới không diễn được bằng các tham số có sẵn thì thêm THAM SỐ mới** — đừng
chép một khối artwork riêng cho nó, đó chính là cách các pose bắt đầu trôi khỏi nhau.

Biên độ trong `POSE_SPEC` cố ý nhỏ: mascot là vai phụ, tay chân vung rộng là kéo mắt người xem
khỏi nội dung bài học.

## Chỗ đứng — `at`

`MASCOT_SPOTS` có sẵn sáu chỗ; đặt `at` thì khỏi tự tính `x`/`y`/`size`/`facing`:

| Spot | Ý đồ |
|---|---|
| `corner` / `cornerLeft` | nhỏ, ở góc — nội dung là chính, mascot chỉ có mặt |
| `costarRight` / `costarLeft` | to, nửa khung — mascot là bạn diễn, đang nói với người xem |
| `peekBottom` | ló lên từ mép dưới — phản ứng xen vào, kiểu chen lời |
| `center` | giữa khung — chỉ cho mở đầu và kết, lúc không có nội dung nào khác |

Đổi chỗ đứng **theo ý**, không phải cho đỡ chán: đang ở `corner` mà câu đọc bất ngờ thì nhảy sang
`peekBottom` mới ra cảm giác nhân vật đang nghe cùng người xem.

`facing` tự suy từ spot và luôn quay mặt về phía nội dung. Muốn ép thì truyền tay.

## Cảm xúc nổi — `emote`

`surprise` · `question` · `idea` · `sweat`. Một glyph nhỏ nổi cạnh đầu, bắt đầu ở `emoteFrom`.
Tối đa một emote mỗi cue, và đừng gắn cho quá 1/4 số cue — gắn khắp nơi thì thành nhiễu.
Emote nằm ngoài group lật nên luôn ở nửa phải khung, kể cả khi `facing="left"`.

## Chuyển động

`frame` bật nhịp đứng yên: nghiêng ~2,4°, nhún ~3,2 px, chớp mắt mỗi ~4,2 s. Cả ba đều là **hàm
thuần của `frame`** (`mascotIdle`), theo luật ở `lib/motion.js` — cấm CSS animation, cấm giờ hệ
thống, cấm `Math.random`. Biên độ cố ý nhỏ.

`enter` cho nhân vật trượt vào bằng spring trong ~0,5 s đầu rồi nhập vào nhịp trên.

## Toạ độ

`x`, `y` là góc trên-trái; `size` là chiều cao, chiều rộng bằng `size * 200 / 220`.
Trong scene 1920×1080, đặt trọn nhân vật trong vùng nội dung y 250–960, chừa chỗ cho phụ đề.

LEXCE xoè cánh nên rộng hơn con chim cũ: thân + cánh chiếm x 12→188 trong viewBox 200.
`data-vk-occupies` khai đúng vùng đó để `tools/verify.mjs` bắt được chữ bị nhân vật đè. Đổi kích
thước cánh hay chỗ đứng thì tính lại hai hệ số trong `Mascot.jsx`.

```jsx
<Mascot pose="teach" at="costarRight" emote="idea" emoteFrom={12} frame={f} enter opacity={appear(f, 12)} />
```

## Đã vấp — đừng lặp lại

- **Pose `formal` (chim mặc vest) và nhân vật giáo sư, bỏ 14/09/2026.** Cả hai vẽ bằng bộ hình khác
  hẳn phần còn lại nên đứng cạnh các pose kia đọc ra là nhân vật khác. Sắc thái nghiêm túc không
  nằm ở bộ vest.
- **Lông mày dốc vào trong là GIẬN, không phải buồn.** Bản `sad` đầu tiên của chim xanh chau mày
  nên lẫn với cáu; `serious` cũng từng vấp đúng lỗi đó. Buồn = đầu trong cao, đuôi ngoài thấp.
- **Chép artwork ra tám khối là nguồn của mọi lỗi trôi hình.** Bản chim xanh làm vậy và pose `sad`
  tự mất mỏ, thân nhỏ đi 2 px, mắt tụt 4 px lúc nào không ai hay.
- **Trục y của SVG hướng xuống nên dấu góc tay ngược với trực giác.** Bản LEXCE đầu tiên đặt góc âm
  cho "giơ lên" và cả tám pose đều thọc tay vào giữa bụng — đọc code thấy đúng, chụp ra mới thấy sai.
- **`card.html` phải đọc `MASCOT_POSES`**, không chép tay danh sách. Bản trước đọc một biến `poses`
  chưa ai khai nên card vỡ im lặng.
- **Kiểm bằng mắt, không bằng code.** Sửa artwork xong phải chụp CẢ BẢNG pose ra nhìn cạnh nhau, ở
  cả cỡ nhỏ. Lỗi "hai pose trông giống hệt nhau" không cách nào thấy được từ code.
