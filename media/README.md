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

`--prune` chỉ đúng trên máy đang giữ **bản gốc** của kho media. File nặng không nằm trong git, nên máy vừa
clone về có `media/files/` rỗng — ở đó "xoá những gì không còn trong thư mục" nghĩa là xoá sạch kho của cả
nhóm, mất hẳn. Vì vậy lệnh tự từ chối khi thư mục rỗng, hoặc khi số object sắp xoá nhiều hơn số file đang
giữ dưới máy. Các tuỳ chọn còn lại không đổi.

## Quy ước tên cho video mẫu của style
Studio tự nhận `styles/<mã style>/sample.<đuôi>` làm video (hoặc audio) mẫu của style đó — bỏ file vào
đúng tên này là xong, không phải sửa `styles/*.json`. Muốn tên khác thì đặt `"sampleVideo": "<key>"`
trong file style tương ứng.

Đối tượng được đẩy kèm `cache-control: max-age=86400`, và URL do Studio dựng luôn mang vân tay nội dung
(`?v=<12 ký tự đầu của sha256>`). Nhờ đó **thay file mà giữ nguyên tên vẫn ăn ngay**: nội dung đổi thì URL
đổi theo nên không trình duyệt nào phát lại bản cũ, còn file không đổi thì giữ nguyên URL và vẫn được cache.
Chỉ cần nhớ commit `media/manifest.json` — vân tay nằm trong đó.

Link chép tay từ `npm run voices` hay từ đây thì không có `?v=`; dán thẳng vào trình duyệt vẫn ra file mới
nếu chưa từng mở, nhưng đã mở bản cũ rồi thì phải tải lại cứng.

`media/.env` chứa khoá bí mật — không bao giờ commit, không in ra, không dán vào chat.
