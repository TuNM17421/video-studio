# media/ — video và audio nặng, lưu trên Cloudflare R2

Repo không chứa file nặng (`.gitignore` chặn `*.mp4`, `*.mp3`, `*.wav`). Video minh hoạ của style nằm
trên một bucket R2 **đọc công khai**, và `manifest.json` — thứ duy nhất trong thư mục này được commit —
nói cho studio biết base URL cùng danh sách asset. Thành viên clone repo về chỉ cần `npm run studio`
là thấy video; họ không cần tài khoản R2, không cần `.env`, không cần cấu hình gì.

## Xem video (mọi thành viên)
Không phải làm gì. Studio đọc `media/manifest.json`, ghép `base` với key và đưa thẳng URL cho thẻ
`<video>`/`<audio>`. Mất mạng hoặc bucket lỗi thì card hiện "không khả dụng", phần còn lại vẫn chạy.

## Đẩy media lên (chỉ máy chủ sở hữu bucket)
1. `cp media/.env.example media/.env` rồi điền. Token lấy ở Cloudflare → R2 → *Manage API tokens* →
   *Create API token*, quyền **Object Read & Write**, giới hạn đúng bucket đó.
   Bucket phải bật đọc công khai: R2 → bucket → *Settings* → *Public Development URL* (cho ra
   `https://pub-….r2.dev`) hoặc gắn custom domain. `R2_PUBLIC_BASE` chính là URL đó, không có `/` cuối.
2. Bỏ file vào `media/files/<key>` — đường dẫn ở đây **là** key trên bucket:

       media/files/styles/lesson/sample.mp4      →  <base>/styles/lesson/sample.mp4
       media/files/styles/lesson-lab/sample.mp4
       media/files/styles/lesson/sample.mp3

3. `npm run media -- --dry-run` để xem sẽ đẩy gì, rồi `npm run media` để đẩy thật.
4. Commit `media/manifest.json`. Đó là bước làm cho cả nhóm thấy media mới.

Các tuỳ chọn khác: `--list` (chỉ báo cáo), `--force` (đẩy lại tất cả), `--prune` (xoá trên R2 những
object không còn trong `media/files/`). File không đổi nội dung sẽ bị bỏ qua nhờ so sánh SHA-256, nên
chạy lại bao nhiêu lần cũng rẻ.

> **Cẩn thận với `--prune`.** Nhạc nền và nhạc quiz (`audio/nen/*`, `audio/quiz/*`) được đưa thẳng lên
> bucket chứ không qua công cụ này, nên `media/files/` không có bản sao. `npm run media` sẽ liệt kê
> chúng ở mục "thừa", và `--prune` sẽ **xoá chúng khỏi R2**. Muốn dùng `--prune` thì tải 6 file đó về
> `media/files/audio/...` trước, rồi đẩy lại một lần cho manifest có SHA-256.

## Quy ước tên cho video mẫu của style
Studio tự nhận `styles/<mã style>/sample.<đuôi>` làm video (hoặc audio) mẫu của style đó — bỏ file vào
đúng tên này là xong, không phải sửa `styles/*.json`. Muốn tên khác thì đặt `"sampleVideo": "<key>"`
trong file style tương ứng.

Đối tượng được đẩy kèm `cache-control: max-age=86400`. Sửa nội dung mà vẫn giữ nguyên tên file thì bản cũ
còn nằm trong cache trình duyệt tới một ngày; đổi tên file (`sample-v2.mp4`) là cách gọn nhất để thay ngay.

`media/.env` chứa khoá bí mật — không bao giờ commit, không in ra, không dán vào chat.
