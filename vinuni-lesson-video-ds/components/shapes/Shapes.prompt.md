# Shapes — hình học dựng bằng @remotion/shapes và @remotion/paths

Bốn component: `DrawPath`, `Callout`, `Pie`, `Spark`.

## Vì sao dùng hai gói này

`@remotion/shapes` và `@remotion/paths` chỉ trả về **path data thuần** (chuỗi `d` của SVG). Chúng
**không** kéo theo runtime Remotion, không đòi `<Composition>`, không đụng pipeline render
frame-by-frame của repo. Nên đây là cách mượn phần hình học chuẩn mà không phải port cả framework.

License: Remotion miễn phí cho cá nhân và **tổ chức phi lợi nhuận** (gồm trường đại học); công ty
vì lợi nhuận từ 4 nhân viên trở lên phải mua Company License. Chi tiết:
`.claude/skills/make-video/visual-assets.md` §4.

Mọi chuyển động vẫn là **hàm thuần của `frame`** như luật chung trong `lib/motion.js`.

## DrawPath — nét tự vẽ ra

Thứ đáng dùng nhất trong nhóm. `evolvePath(progress, d)` trả về cặp
`strokeDasharray`/`strokeDashoffset` để nét hiện dần đúng tỉ lệ, khỏi phải tự đo chiều dài path.

```jsx
<DrawPath frame={f} d="M 300 400 C 600 400, 700 250, 980 250" from={spokenAt(12, 'nối sang')} duration={20} />
```

Dùng cho: mũi tên nối hai ý, đường viền khoanh vùng, đường dẫn mắt người xem đi theo.
**Đừng** dùng cho khung chữ nhật tĩnh — cái đó `<rect>` là đủ.

| Prop | Mặc định | |
|---|---|---|
| `d` | — | Path SVG |
| `from` | `0` | Frame bắt đầu vẽ |
| `duration` | `24` | Số frame vẽ xong |
| `stroke` / `strokeWidth` / `fill` | accent / 5 / none | |

Kiểm nhanh nó chạy theo frame: `strokeDashoffset` phải giảm dần (frame 0 → 1950, frame 24 → 0).

## Callout — bong bóng chú thích

`x,y` là **đỉnh đuôi** (điểm cần trỏ tới), không phải góc hộp. Đặt theo đúng thứ muốn chú thích,
không phải tính ngược ra vị trí hộp.

```jsx
<Callout frame={f} x={760} y={430} text="Chỗ nhiều team vấp" from={spokenAt(25, 'vấp')} />
```

Bong bóng nảy lên bằng `spring()`. Tối đa **một** callout mỗi cue.

## Pie — vòng tròn tỉ lệ

Dùng khi câu đọc nêu một phần trăm cụ thể. Quét dần từ 0 tới `value`.

```jsx
<Pie frame={f} x={500} y={600} value={0.35} label="35%" from={spokenAt(8, 'ba mươi lăm')} />
```

Không dùng Pie cho dữ liệu **không** phải tỉ lệ của một tổng thể.

Nhãn nằm giữa hình, tức đè lên lát đã tô. `ink` bỏ trống thì lấy `readableInk(fill)` — trắng trên nền
tối, navy trên nền sáng. Đừng ép `ink={C.text}` lên lát `accent`: đúng palette nhưng chữ chìm.

## Spark — tia nhấn

Khoảnh khắc "à ra thế". Nảy lên rồi **đứng yên** — cố ý không nhấp nháy liên tục, vì nhấp nháy kéo
mắt khỏi nội dung suốt cả cue.

Tối đa **một lần mỗi video**. Dùng nhiều thì hết thiêng.

## Transition đi kèm

Chuyển cảnh nằm ở `lib/transitions.js` (`slide`, `push`, `zoom`, `wipeClip`, `clockWipePath`),
cài lại bằng `interpolate` sẵn có nên không thêm dependency. Chọn kiểu theo **ý**, không phải cho
đỡ chán — xem bảng `TRANSITION_INTENT` trong file đó. Một video chỉ nên dùng 2-3 kiểu.

## Morph — một hình biến thành hình khác

`interpolatePath(p, a, b)` tự chuẩn hoá hai path về cùng số lệnh rồi nội suy từng điểm, nên hai hình
khác hẳn nhau vẫn biến được. Đây là thứ tự viết tay rất khó, và là lý do đáng mượn Remotion nhất
trong cả nhóm.

```jsx
<Morph frame={f} a={BLOB} b={CRISP} x={775} y={700} from={spokenAt(17, 'đo được')} duration={26}
       fill={C.bgAlt} stroke={C.accent} strokeWidth={6} />
```

Dùng khi câu đọc nói "cái này TRỞ THÀNH cái kia". Mắt bám theo biến hình rất mạnh, nên nó phải mang
đúng một ý — đừng morph cho vui. Nền nhạt + viền đọc ra là "hình dạng"; khối đặc trông thô.

## Tracer — chấm chạy dọc một đường

`getPointAtLength` cho toạ độ, `getTangentAtLength` cho hướng để chấm quay đúng chiều đang đi.
`trail={1}` vẽ thêm vệt mờ phần đã qua.

```jsx
<Tracer frame={f} d="M 200 720 L 1440 720" from={spokenAt(31, 'Happy path')} duration={46} trail={1} />
```

Dùng để DẪN MẮT theo một luồng (dữ liệu qua pipeline, user story đi qua ba tình huống) — mạnh hơn
mũi tên đứng yên vì mắt bám vật đang chuyển động. **Một Tracer mỗi cảnh**, hai cái thì không biết
nhìn cái nào.

## Arrow — mũi tên mọc dài ra

`x,y` là ĐUÔI, `angle` là hướng chỉ (0 = sang phải, -90 = lên trên). Tự mọc dài theo frame nên đọc
là "đi từ đây tới kia", không phải một hình có sẵn. Thay cho mũi tên vẽ tay bằng `<path>` trong scene.

```jsx
<Arrow frame={f} x={830} y={880} angle={-90} length={95} from={spokenAt(20, 'nhóm riêng')} thickness={14} />
```
