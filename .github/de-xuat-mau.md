# Mẫu issue "Đề xuất"

Mọi issue loại `đề xuất` viết theo mẫu này. Xương sống là **một cặp ba mục**:

> **Vấn đề đang gặp phải** → **Hướng giải quyết** → **Output mong đợi**

Ba mục đó là bắt buộc. Phần còn lại là thông tin đi kèm: có thì điền, không có thì **xoá dòng đó đi**, đừng
để lại ô trống.

Báo lỗi thì dùng `.github/issue-mau.md`. Nhãn xem `.github/nhan-issue.md`.

---

## Quy ước

- **Một issue = một vấn đề.** Ba vấn đề thì mở ba issue, kể cả khi chúng cùng một khu vực. Issue gộp nhiều
  việc thì không ai nhận được, không đóng được, và không biết bao giờ xong.
- **Mục "Vấn đề" nói chuyện đang xảy ra, không nói giải pháp.** Viết "Studio chưa có nút X" là đã nhảy sang
  giải pháp; viết "làm xong bước Giọng đọc phải tự mở terminal chạy lại verify, hay quên" mới là vấn đề.
- **Không có số đo thì nói rõ là chưa đo.** Đừng bịa con số để đề xuất nghe cấp bách hơn.
- **Output mong đợi phải kiểm được.** Người khác đọc xong phải biết lấy gì ra để bảo "xong rồi" — một lệnh
  chạy qua, một ảnh trước/sau, một file tồn tại, một issue được đóng.
- **Đừng lẫn "mức độ" với "ưu tiên".** *Mức độ* nói lúc nó xảy ra thì tệ đến đâu; *ưu tiên* nói nên làm cái
  nào trước. Một lỗi chặn hẳn nhưng một năm gặp một lần, có đường lách, thì ưu tiên thấp hơn một chỗ chỉ
  khó chịu nhẹ mà cả nhóm vấp mỗi ngày. Người mở issue **đề nghị** một mức ưu tiên và nói vì sao; người
  quản repo mới chốt.
- Tiêu đề: `✨[Đề xuất] <nói rõ cái muốn có>`. Đừng viết "cải thiện UI" hay "tối ưu pipeline".
- **Không dán API key, nội dung `.env` hay thông tin cá nhân.** Dán log thì xoá key trước.

## Gắn nhãn khi gửi

`đề xuất` + 1 nhãn khu vực (`studio`, `pipeline`, `design-system`, `tts`, `render`) + 1 nhãn mức độ
+ 1 nhãn ưu tiên (`ưu tiên: P0` … `ưu tiên: P3`).

Không chắc mức độ hay ưu tiên thì **để trống**, đừng đoán — người quản repo gắn khi phân loại. Nhãn ưu tiên
là thứ dùng để sắp bảng việc, nên nó phải do một người chốt, không thì ai cũng tự cho việc mình là P0.

---

## 📝 Mẫu điền (copy từ đây)

**❗ Vấn đề đang gặp phải**
<!-- Chuyện gì đang xảy ra, ai chịu, và chịu như thế nào. Nêu chỗ cụ thể (file, bước trong Studio, lệnh).
     Nếu đã từng ăn lỗi thật thì kể ra, nó đáng giá hơn mọi lập luận. -->

**🛠️ Hướng giải quyết**
<!-- Cách làm, đủ để người nhận biết bắt đầu từ đâu — không cần thiết kế chi tiết.
     Có nhiều hướng thì ghi hết và nói hướng nào nên làm trước, vì sao.
     Chưa biết làm thế nào thì viết thẳng "chưa rõ, cần bàn" — đó cũng là một thông tin. -->

**🎯 Output mong đợi**
<!-- Kiểm bằng gì. Ví dụ: "máy mới clone về, mở /research?id=… là xem được ở chế độ chỉ-xem";
     "npm run verify -- --video <id> không còn problem"; "PR kèm ảnh trước/sau, đóng được #2". -->

---

**📍 Khu vực** <!-- Studio (giao diện) · Studio (một bước trong luồng) · Công cụ dòng lệnh · Design system video · TTS/giọng đọc · Render · Tài liệu -->

**🔥 Ưu tiên (đề nghị)**
<!-- P0 làm ngay, gạt việc khác · P1 trong đợt này · P2 có người rảnh thì làm · P3 để đó, chưa cần.
     Kèm một câu vì sao: bao nhiêu người vấp, vấp bao lâu một lần, có đường lách không,
     để lâu thì có xấu thêm không (ví dụ: PR càng để càng khó rebase, credit càng tốn thêm). -->

**🌡️ Mức độ** <!-- Chặn · Nặng · Vừa · Nhẹ — lúc nó xảy ra thì tệ đến đâu. Khác với ưu tiên ở trên. -->

**💪 Sức ước lượng** <!-- 🟢 một buổi · 🟡 1–2 ngày · 🔴 cần bàn trước khi làm -->

**🚧 Không làm trong issue này** <!-- Cắt phạm vi cho rõ. Bỏ mục này thì issue tự phình ra. -->

**📐 Ràng buộc phải giữ**
<!-- Ví dụ: màu/bố cục Studio lấy từ studio/src/lib/design-tokens.ts, không thêm hex mới;
     màu cảnh video chỉ từ vinuni-lesson-video-ds/lib/tokens.js (9 màu);
     npm run verify phải pass; không đổi tên file templates/modules/ đã có video dùng. -->

**🔗 Liên quan** <!-- issue / PR / file / mục trong CLAUDE.md, README -->

**🎬 Mã video hoặc lượt research làm ví dụ** <!-- nếu có -->

**🖥️ Môi trường** <!-- chỉ điền khi vấn đề phụ thuộc máy: hệ điều hành, Node, nhánh/commit -->

**📋 Log, ảnh, số đo** <!-- kéo thả file vào đây; log nhớ xoá API key -->

**🔍 Trước khi gửi, tự kiểm**
- [ ] Đúng một vấn đề, không gộp
- [ ] Mục "Vấn đề" không phải là mô tả giải pháp
- [ ] Output mong đợi kiểm được bằng một thứ cụ thể
- [ ] Mức ưu tiên đề nghị có kèm lý do, không chỉ là một chữ P
- [ ] Đã tìm issue/PR cũ, chưa ai nêu
- [ ] Không có API key hay thông tin nhạy cảm

---

## 💡 Ví dụ một đề xuất điền đầy đủ

> Tiêu đề: `✨[Đề xuất] Lượt research mẫu chỉ-xem để người mới tập luồng Đóng gói kịch bản`

**❗ Vấn đề đang gặp phải**
Luồng "Đóng gói kịch bản" đã chạy được và Studio đã hỗ trợ chế độ chỉ-xem (`"sample": true` trong
`state.json`), nhưng chưa có lượt mẫu nào — `research/` bị gitignore và chưa ai chọn được bộ slide được phép
commit. Người mới muốn xem bảy ô và ba cổng duyệt trông ra sao thì buộc phải chạy một lượt thật. Lượt thật
đầu tiên của nhóm tốn $8,06 và gần một nửa là tiền làm lại, nên "chạy thử cho biết" là một khoản không nhỏ.
Bên dựng video đã có `mau-huong-dan` cho đúng việc này, bên research thì không.

**🛠️ Hướng giải quyết**
Chọn một bộ slide nhóm mình sở hữu và chia sẻ công khai được (không lấy slide giảng viên chưa xin phép),
chạy một lượt research thật tới hết cổng 3, rồi `git add -f` phần chữ: `input/`, `claims/`, `checks/`,
`output/`, `state.json` có `"sample": true`. **Bỏ** `sources/` và log — đúng cách `mau-huong-dan` đang làm
với `projects/`, `videos/`, `voice/out/`.

**🎯 Output mong đợi**
Máy mới clone repo về, không cấu hình gì, mở `/research?id=template-research` là xem được cả bảy ô ở chế độ
chỉ-xem và API chặn mọi lượt agent. Kèm một dòng trong README trỏ vào nó.

---

**📍 Khu vực** Studio — luồng Đóng gói kịch bản

**🔥 Ưu tiên (đề nghị)** P2 — không ai đang bị chặn, nên không tranh chỗ với việc đang chạy. Nhưng nó
tự xấu thêm theo thời gian: cứ thêm một người vào nhóm là thêm một lượt credit tiêu cho việc "chạy thử cho
biết". Có người rảnh là nên làm.

**🌡️ Mức độ** Vừa — không chặn ai, nhưng mỗi người mới vào lại tốn tiền credit để tự tìm hiểu.

**💪 Sức ước lượng** 🟡 1–2 ngày (phần lâu là chọn slide và chờ lượt research chạy, không phải code)

**🚧 Không làm trong issue này** Không sửa giao diện `/research`, không đổi luật soát. Chỉ dựng dữ liệu mẫu
và thêm một dòng README.

**📐 Ràng buộc phải giữ** Không commit `sources/` (trang web của người khác) và không commit log. Không tắt
kiểm tra `"sample": true` ở API — chế độ chỉ-xem phải thật sự chặn agent, giọng đọc và render.

**🔗 Liên quan** `CLAUDE.md` mục "Đóng gói kịch bản" (ghi rõ lượt mẫu "chưa có, chờ chọn slide được phép
commit"); cách làm tương tự ở `mau-huong-dan`.

**🖥️ Môi trường** Không phụ thuộc máy, nhưng cần Node 22+ nếu slide là PDF (`unpdf`).

**🔍 Trước khi gửi, tự kiểm**
- [x] Đúng một vấn đề, không gộp
- [x] Mục "Vấn đề" không phải là mô tả giải pháp
- [x] Output mong đợi kiểm được bằng một thứ cụ thể
- [x] Đã tìm issue/PR cũ, chưa ai nêu
- [x] Không có API key hay thông tin nhạy cảm
