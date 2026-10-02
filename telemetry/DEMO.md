# Kịch bản demo: "Mỗi video một hoá đơn" (12 phút + hỏi đáp)

**Câu chốt cần khán giả nhớ**: *Giờ ta biết một video tốn bao nhiêu, tốn vào đâu, và khi QA chê thì lỗi do lượt AI nào
gây ra và sửa hết bao nhiêu. Số nào không đo được thì để trống, không ghi 0.*

Ký hiệu: **[Click]** thao tác · **[Nói]** lời thoại gợi ý (đọc tự nhiên, không cần thuộc) · **[Nhấn]** điểm phải dừng lại.
Mọi con số dưới đây khớp với dữ liệu đang có trên production (đọc trực tiếp từ DB ngày 02/10/2026, phạm vi *Video hoàn tất*).

---

## 0. Chuẩn bị (T−30 phút)

- [ ] Mở https://video-telemetry.duckdns.org, đăng nhập, mở dashboard **Video Telemetry**.
- [ ] Đặt thời gian **Last 30 days**, *Phạm vi* = **Video hoàn tất**, *Video* = **All**. Nhấn F11 cho toàn màn hình.
- [ ] Kiểm hàng KPI phải thấy **3 / 4** và **$1.882**. Không thấy thì dữ liệu demo chưa có: chạy `seed-demo.mjs`
      (RUNBOOK → "Dữ liệu demo").
- [ ] (Tuỳ chọn, cho phần live) Studio chạy từ `baseline-upstream-2026-09-25` với `STUDIO_GATEWAY=9router`, 9router
      đang bật, và có sẵn một video để bấm gửi góp ý.
- [ ] Mở sẵn tab thứ hai: `telemetry/JOIN.md` để kết bài.
- [ ] Dự phòng khi mất mạng: Grafana local `http://127.0.0.1:3001` có cùng dữ liệu demo.

---

## 1. Mở đầu: vấn đề (0:00–1:00)

**[Nói]** "Làm một video bài giảng bây giờ đi qua rất nhiều AI: Claude viết kịch bản, Codex dựng cảnh, ElevenLabs hoặc
Kaggle làm giọng, rồi QA chấm, rồi sửa. Chỗ nào cũng tốn tiền hoặc tốn quota. Nhưng tới tuần trước, nếu ai hỏi *một video
tốn bao nhiêu?* thì cả team không ai trả lời được. Và khi QA chê một cảnh, ta cũng không biết lỗi đó do lượt AI nào sinh
ra, hay sửa nó tốn bao nhiêu."

**[Nói]** "Hôm nay mình demo hệ thống trả lời ba câu hỏi đó. Dữ liệu trên màn hình gồm **3 video mô phỏng** (`demo-d06-*`) và **1 video chạy thật** (`d2-01-lab`, 24 lượt agent), tất cả đi qua
đúng pipeline ghi log thật của Studio. Nói rõ điều này ngay từ đầu để không ai nhầm số mô phỏng với số thật."

## 2. Cách nó hoạt động (1:00–2:00)

**[Nói]** vẽ tay hoặc chỉ vào sơ đồ:

```text
Studio ─ ledger ─ outbox ─► collector ─► Postgres ─► Grafana (dashboard này)
  ├ Codex  ─► 9router: chi phí từng request, đối chiếu token khớp tuyệt đối
  ├ Claude : tự báo chi phí
  ├ ElevenLabs: đọc bộ đếm credit trước/sau → credit bị trừ thật
  └ Kaggle / model local: miễn phí → ghi "miễn phí", không ghi 0
```

**[Nói]** "Điểm quan trọng: chỉ gửi **metadata**, tức là số token, tiền, thời gian, mã lỗi. **Không gửi prompt, không gửi kịch
bản, không gửi API key.** Collector tự từ chối nếu thấy mấy thứ đó. Studio cũng không bao giờ bị chậm vì chuyện gửi log:
collector tắt thì dữ liệu nằm chờ trong outbox."

## 3. Hàng KPI: một video tốn bao nhiêu? (2:00–4:00)

**[Click]** chỉ lần lượt 6 ô trên cùng.

**[Nói]** "Trung bình một video hoàn tất tốn **$1.88**, khoảng **1,55 giờ máy chạy**, và **2,8 triệu token**. Lead time,
tức là từ lúc bắt đầu tới lúc xong kể cả chờ duyệt, khoảng **9,6 tiếng**."

**[Nhấn]** chỉ vào ô **Video đo đủ chi phí: 3 / 4**.
**[Nói]** "Con số $1.88 chỉ tính trên **3 video đo đủ**. Video thứ tư, `v03`, có một lượt dựng cảnh không đo được chi phí.
Nếu tính lượt đó là $0 thì trung bình tụt xuống và ta tự lừa mình. Nên nguyên tắc là: **không đo thì để trống, và không
đưa vào trung bình**."

**[Click]** ô **Chi phí do làm lại**.
**[Nói]** "Khoảng **42% số tiền** (hơn 2/5) là để trả cho các vòng sửa sau feedback và QA, chủ yếu từ video chạy thật `d2-01-lab` (18 lượt làm lại, $1.61). Đây là con số đáng giảm nhất, và giờ ta
đo được nó."

## 4. Tiền đi đâu: theo phase (4:00–6:00)

**[Click]** 3 biểu đồ hàng thứ hai.

**[Nói]** "Chia theo công đoạn: **dựng cảnh (scenes) đắt nhất, khoảng $0.84/video**, ngốn gần **2,6 triệu token** và gần
**1 tiếng máy** (47 phút). Soát hình bằng QA (`qa`) tốn thêm **$0.62/video**. Viết kịch bản chỉ $0.31, làm cue $0.13."

**[Nhấn]** *Lưu ý khi nói:* phase `qa` mới được tách riêng khỏi `scenes` (trước đó QA bị tính lẫn vào dựng cảnh). Các trung bình theo phase
tính trên số video khác nhau (scenes 2/4 đo giá, qa 4/4), nên **đừng cộng** hai cột này lại để ra "tổng dựng hình".

**[Nhấn]** chỉ biểu đồ token, thanh màu xám.
**[Nói]** "Thanh xám là token đọc lại từ cache, chiếm **khoảng 87%** ở phase scenes. Tức là agent đọc lại ngữ cảnh rất
nhiều lần. Muốn giảm chi phí thì đây là chỗ tối ưu prompt và cache có lời nhất."

**[Click]** bảng **Chi tiết theo phase**, cột "Video đo được chi phí".
**[Nói]** "Voice ghi **1/3**. Không phải thiếu dữ liệu: video dùng ElevenLabs tốn $0.26 (5.200 ký tự), còn hai video dùng Kaggle và
model local là **miễn phí**, nên để trống thay vì kéo trung bình voice về gần 0. Render ghi 0/4 vì chạy trên máy,
không tốn tiền; deliver 1/4. Thời gian vẫn đo đủ."

## 5. Ai tốn tiền: theo nhà cung cấp và giọng nói (6:00–7:00)

**[Click]** biểu đồ **Chi phí TB / video theo nhà cung cấp**, rồi 3 ô giọng nói bên phải.

**[Nói]** "ElevenLabs, Codex, Claude lần đầu nằm trên cùng một thước đo. Với ElevenLabs, credit là số **bị trừ thật trên tài
khoản**, vì hệ thống đọc bộ đếm trước và sau mỗi lượt tạo giọng. Kaggle thì tính bằng **thời gian GPU**, vì quota GPU có
giới hạn theo tuần."

**[Nói]** "ElevenLabs tính theo **giá công khai của đúng model đang dùng** — không phải một số cố định cho mọi
model, vì mỗi model giá khác nhau tới 2 lần. Chi phí Codex là giá **quy đổi** theo bảng giá API, không phải hoá
đơn, vì ta dùng gói ChatGPT."

## 6. Từng mã video (7:00–8:00)

**[Click]** 3 biểu đồ "từng video · theo phase", rồi bảng **Theo video · mã video**.

**[Nói]** "Mỗi thanh là một mã video, màu theo phase. Nhìn là thấy ngay video nào đắt bất thường, và đắt ở khâu nào."
**[Nhấn]** cột **Đo chi phí** của `v03`: "thiếu 1 run". "Đây là cách hệ thống tự khai phần mình chưa đo được, thay vì
giấu nó."

**[Nhấn]** dòng `d2-01-lab`: "Đây là video **chạy thật**, $2.17, 24 lượt, 12 lượt lỗi. Nó đắt nhất bảng và là chỗ có nhiều để tối ưu."

## 7. Gen đi gen lại: phiên bản (8:00–10:00)

**[Click]** bảng **Phiên bản & làm lại**, chỉ `demo-d06-v02-rag-basics`.

**[Nói]** "Video này là ví dụ điển hình. **v1** qua **2 vòng QA**, 5 lượt làm lại, tốn **$1.70**, rồi render và giao. Hôm sau
team QA góp ý thêm nên có **v2**: 1 vòng feedback, thêm **$0.16**."

**[Nói]** "Mỗi lần render thành công là mở một phiên bản mới, và mỗi lượt chạy đều ghi lý do: lần đầu, sửa theo góp ý,
hay sửa theo QA. Nên ta trả lời được câu *vòng feedback nào đắt*, chứ không chỉ biết tổng."

## 8. Truy vết lỗi QA: lỗi do đâu? (10:00–11:00)

**[Click]** bảng **Truy vết feedback / QA → lượt AI**, chỉ dòng `demo-d06-v02 · user · cue-05`.

**[Nói]** "Team QA chê cảnh cue-05 của bản đã giao. Hệ thống chỉ ra: lỗi nằm ở **lượt dựng cảnh thứ 3, phiên bản 1**, do
**Codex gpt-5.6-luna** sinh ra. Có sẵn **session** để mở lại đúng cuộc hội thoại của agent, có **hash prompt** để biết
dùng prompt nào. Lượt sửa là **scenes #4**, tốn **$0.16**."

**[Nói]** "Các dòng `qa` phía trên là lỗi QA tự động tìm ra, như `text-overflow` (chữ tràn khung) hay `overlap` (chữ
đè hình). Dòng nào cũng biết lượt nào gây ra và lượt nào đã sửa. Nội dung góp ý không gửi lên đây; muốn đọc thì mở
Studio theo mã feedback."

## 8b. Phiên bản Studio và style (mới, 1 phút)

**[Click]** cuộn xuống hai bảng cuối: **Token & chi phí theo phiên bản Studio** và **So sánh theo style**.

**[Nói]** "Mỗi lượt chạy giờ ghi thêm **commit của Studio** và **style** của video. Lý do: đổi prompt hay đổi luồng thì số token
đổi theo, và nếu không ghi phiên bản thì ta không biết token nhảy là do video khó hơn hay do Studio đổi. Hai bảng này cho
phép so cùng style khác commit, hoặc cùng commit khác style, đúng câu hỏi của issue #71."

**[Nhấn]** *Phải nói thật:* hiện cả hai bảng chỉ có dòng **"(chưa ghi)"**, vì mọi dữ liệu trên đây có trước khi thêm metadata. Bảng chỉ có nghĩa
từ lúc team chạy Studio bản mới. Đừng hứa kết luận so sánh trong buổi này.

## 9. (Tuỳ chọn) Live (11:00–12:00)

**[Click]** Studio → một video → gửi một góp ý ngắn cho stage đang làm bằng Codex.
**[Nói]** "Mình vừa gửi góp ý. Studio chạy lại bằng Codex qua 9router…" **[Nhấn]** dòng log
`9router: N request · $x (quy đổi)`. "…và vài giây sau, lượt này hiện trên dashboard với lý do là `feedback`."

*Nếu phần live chậm quá 60 giây thì bỏ qua, và dùng dòng `user` của `demo-d06-v02` ở mục 8 để kể.*

## 10. Kết + kêu gọi (12:00)

**[Click]** tab `JOIN.md`.
**[Nói]** "Để dữ liệu thật của mọi người lên đây: thêm **4 dòng** vào `studio/.env` rồi khởi động lại Studio. Token mình
gửi riêng từng người. 9router là tuỳ chọn. Từ tuần sau, con số $1.88 kia sẽ là **số thật của team**. Nhớ **cập nhật Studio lên bản mới** để có commit và style trong dữ liệu."

---

## Hỏi đáp: chuẩn bị sẵn

| Câu hỏi | Trả lời |
|---|---|
| Có lộ prompt hay kịch bản không? | Không. Chỉ gửi metadata; collector từ chối field `prompt`, `content`, `messages`. Log AI thô là tuỳ chọn riêng, mã hoá, và đang **tắt**. |
| $ của Codex là tiền thật à? | Là giá **quy đổi** theo bảng giá API (9router tính). Gói ChatGPT không tính theo token, nên số này dùng để so sánh và tối ưu. |
| Sao không ghi 0 cho phần miễn phí? | Vì trung bình sẽ bị kéo xuống. Phần miễn phí vẫn ghi rõ trạng thái `free` ở bảng "Chi phí theo nguồn". |
| Token có bị đếm trùng khi sửa nhiều vòng? | Từng bị: Codex `resume` báo token cộng dồn cả phiên. Đã sửa, và đối chiếu khớp tuyệt đối với 9router. |
| Không bật 9router thì sao? | Vẫn có token và thời gian; riêng chi phí Codex hiện "không đo", và video đó không vào trung bình chi phí. |
| Sao dashboard không có dữ liệu theo commit/style? | Vì chỉ có từ khi thêm metadata; dữ liệu cũ nằm ở "(chưa ghi)" và không điền lại được. Cần chạy video mới bằng Studio bản mới. |
| Số có so được với số của issue #71 ($23–95/video) không? | Không trực tiếp: đó là video thật dài hơn, tiền do Claude Code báo; ở đây có video mô phỏng và Codex tính qua 9router. Định nghĩa phase cũng khác ("Dựng hình" của issue không gồm soát hình). |
| Dữ liệu để ở đâu, giữ bao lâu? | Postgres trên VM của team, qua HTTPS; backup hằng ngày giữ 14 bản; event giữ 365 ngày. |

## Nếu có sự cố khi trình bày

- Dashboard trống: kiểm *Phạm vi* (thử **Tất cả video**) và thời gian (**Last 30 days**).
- Mất mạng: chuyển sang Grafana local `http://127.0.0.1:3001` (cùng dữ liệu demo).
- Phần live chậm: bỏ qua và kể bằng bảng truy vết (mục 8).

## Sau buổi demo

- Xoá dữ liệu demo: RUNBOOK → "Dữ liệu demo" (`DELETE … WHERE video_ref LIKE 'demo-%'`).
- Gửi token cho từng người qua kênh riêng, và tạo tài khoản Viewer Grafana cho họ.
