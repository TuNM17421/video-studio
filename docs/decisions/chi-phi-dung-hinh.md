# Chi phí dựng hình: vì sao đắt, và thay đổi đã áp dụng

Ngày đo: 30/09/2026. Đo trên Studio chạy từ `main` (48f1331), bước **Dựng cảnh** (`scenes`).

## Tóm tắt

- Bảng chi phí bốn video của anh Tú cho thấy Dựng hình chiếm 47–78% tổng chi phí, và Bảng trắng rẻ hơn Lesson Lab khoảng 4 lần trên cùng kịch bản.
- **Nguyên nhân tìm được và đã đo**: prompt của Studio cấm agent chạy `build`/`verify`, nên mọi lỗi chỉ lộ sau khi agent dừng và phải trả một **lượt agent mới** để sửa từng lỗi. Đo trên Bảng trắng: hai lượt liên tiếp vẫn chưa qua gate.
- **Thay đổi đã áp dụng**: cho agent tự chạy `node tools/build.mjs && node tools/verify.mjs --video <id>` trước khi dừng (tối đa 3 lần). Bảng trắng từ "2 lượt, vẫn đỏ" thành "1 lượt, xanh".
- **Cảnh báo chất lượng (xem mục "Chất lượng")**: ảnh QA của Lesson Lab sau thay đổi có nhiều lỗi bố cục (chữ tràn, chồng lên khung) mà bản trước không có. Một mẫu mỗi bên chưa đủ để nói thay đổi gây ra, nhưng cũng chưa đủ để nói không. **Chưa được kết luận là tiết kiệm mà không giảm chất lượng.**
- **Phần chênh giữa hai style** đo được là khối lượng code agent phải viết và khám phá, chưa phải số lượt. Chưa tái hiện được mức 4 lần vì không đo được token đáng tin (xem Giới hạn).

## Dữ liệu từ lượt thật của anh Tú (#64, `d3-01-lab`, Lesson Lab, 125 cue)

Số này do anh Tú đếm từ `.studio/log.jsonl` (comment 01/10 trên #71); đây là bằng chứng mạnh hơn phép đo nhỏ của mình vì đo trên video thật bằng Claude.

| Quan sát | Số đo |
|---|---|
| Chặng Dựng hình so với chặng Lời & cue | 568 lượt gọi công cụ, gấp 10 lần (57 lượt) |
| Ghi file | 146 lượt `Write` cho 138 file, 30% thời gian |
| Đọc lặp | 211 lượt `Read`, 59% là đọc lại, 23% thời gian |
| Lệnh Bash bị allowlist từ chối | 35/104 lượt, 11% thời gian + 6% xử lý lỗi |
| Độ dài cảnh | 126 file, 6.051 dòng, trung bình 48 dòng một cảnh (cảnh không phình) |

Kết luận của anh Tú, mình đồng ý và số đo của mình khớp: **chi phí đến từ số lượt, không từ độ dài cảnh**, và quy ước một file `sNN.jsx` cho mỗi câu biến một ràng buộc nội dung thành ràng buộc số lượt ghi. Đối chứng ở #64: cùng kịch bản, Claude Design ra 13 file thay vì 125, vẫn một cảnh mỗi câu, chất lượng không giảm.

## Kiểm tra allowlist của Studio (đo ngày 02/10, Claude Haiku + đúng `ALLOWED`/`DENIED` của `agent.ts`)

| Lệnh | Kết quả |
|---|---|
| `node tools/a.mjs && node tools/b.mjs` | Được phép (nên bước tự `build && verify` chạy được với Claude) |
| `node tools/a.mjs` | Được phép |
| `cd studio && node ../tools/a.mjs` | **Bị chặn** (phần sau `cd` là `node ../tools/…`, không khớp `node tools/*`) |
| `node -e "…"` | **Bị chặn** |

Hai dạng bị chặn khớp đúng hai nhóm lệnh bị từ chối trong log của anh Tú (19 lệnh `cd X && …`, 10 lệnh `node -e`). Không mở rộng allowlist cho `node -e`, vì nó cho phép chạy code tùy ý (đọc được `.env`, trong khi `Read` đang chặn). Thay vào đó prompt dặn agent quy tắc shell (`SHELL_RULES_LINE`). **Chưa đo** mức giảm số lệnh bị chặn sau thay đổi này.

## Cách đo

| | |
|---|---|
| Kịch bản | Một kịch bản 16 cue (`templates/kich-ban-co-ban.md`, ~3 phút), giữ nguyên cho mọi lần chạy |
| Agent | Cursor (`GPT-5.4 Mini Medium`) cho mọi lần chạy, qua Studio headless |
| Giọng | Mock im lặng (`STUDIO_TTS_MOCK=1`): đo riêng chặng dựng cảnh, không tốn credit |
| Review chéo | Tắt, để không cộng chi phí soát ảnh vào chặng dựng |
| Đếm | Từ `projects/<id>/.studio/runs.jsonl` và `log.jsonl` của Studio |

Không dùng số USD của anh Tú để so trực tiếp: hai agent khác nhau (Claude và Cursor), nên chỉ so **tỉ lệ** giữa hai style.

## Bốn số đo

### 1. Số lượt agent ở chặng dựng hình

| Lần chạy | Lượt agent | Gate cuối |
|---|---|---|
| Bảng trắng, trước | 2 (29 + 6 thao tác), vẫn đỏ | đỏ |
| Bảng trắng, sau | 1 (31 thao tác) | xanh |
| Lesson Lab, trước | 1 | xanh |
| Lesson Lab, sau | 1 | xanh |

Lượt 1 của Bảng trắng (trước) chết ở `verify`: `mark id "p1-loop" is used twice`. Lượt sửa 66 giây, 6 thao tác, nhưng lộ lỗi mới: `"mô hình" is not in the narration of câu 6`. Mỗi lỗi lộ ra sau khi agent dừng đều tốn một lượt nạp lại ngữ cảnh.

### 2. Độ dài file cảnh sinh ra

| | File | Dòng (trừ `cues`/`voice`/`timeline`) |
|---|---|---|
| Lesson Lab | 16 `sNN.jsx` + `shared` + `video` | 864 (trước), 662 (sau) |
| Bảng trắng | `board.js` + `video.jsx` | 173–174 |

Lesson Lab viết một file JSX cho mỗi cue; Bảng trắng viết dữ liệu trong một `board.js`. Code agent phải tạo ra nhiều hơn khoảng 4–5 lần.

### 3. Số lần chạy lại trong cùng một vòng

| Lần chạy | Tự chạy `build`+`verify` | Kết quả |
|---|---|---|
| Bảng trắng, sau | 6 lần trong một lượt | bắt 4 lỗi lệch cụm chữ, tự sửa, hội tụ xanh |
| Lesson Lab, sau | 2 lần | xanh |
| Trước thay đổi | 0 (bị cấm) | lỗi chỉ lộ sau khi agent dừng |

### 4. Bề rộng lựa chọn (agent đọc gì)

Số lần `read` trong chặng dựng cảnh:

| Lần chạy | Tổng `read` | Đọc video mẫu khác | Đọc component | `grep` |
|---|---|---|---|---|
| Lesson Lab, trước | 24 | 16 | 8 | 24 |
| Lesson Lab, sau | 19 | 12 | 6 | 3 |
| Bảng trắng, sau | 8 | 5 | 2 | 0 |

Phần lớn lần đọc của Lesson Lab là **video mẫu** (học ngôn ngữ cảnh từ `d2-01-lab` và các video khác), chưa phải danh sách component. Số component mở ra ít (6–8), nên giả thuyết "agent cân nhắc cả 74 component" chưa được xác nhận. Đây là hướng cần đo thêm.

## Nguyên nhân

**Đã đo:**
1. **Lỗi lộ muộn, sửa tốn cả lượt.** Prompt scenes ghi "Không chạy build, verify…; runner sẽ chạy sau khi bạn dừng". Gate sau khi agent dừng bắt lỗi, rồi người dùng phải gửi phản hồi để chạy lượt agent mới. `verify` mất vài giây, một lượt agent mất hàng chục giây đến vài phút và nạp lại ngữ cảnh. Đây là ca "vòng sửa" anh Tú nhắc, và nó đắt nhất khi kịch bản có nhiều cue (mỗi cue là một chỗ dễ lệch cụm chữ).
2. **Khối lượng viết của Lesson Lab lớn hơn 4–5 lần** (864 so với 173 dòng) và agent khám phá nhiều hơn (55–78 thao tác so với 31).

**Giả thuyết chưa đo:**
- Lesson Lab đọc nhiều video mẫu (12–16 lần) để học ngôn ngữ cảnh. Nếu `styles/lesson-lab.md` (21 dòng) nêu rõ khuôn cảnh và đúng một file mẫu cần đọc, số lần đọc có thể giảm. Chưa thử.

## Thay đổi đã áp dụng

**1. Quy tắc shell trong prompt** (`SHELL_RULES_LINE`, mọi stage): thư mục làm việc đã là gốc repo nên không `cd`, chỉ `node tools/<script>` và vài lệnh đã allowlist, không `node -e`. Nhắm vào 17% thời gian mất vì lệnh bị chặn.

**2. Tự kiểm trước khi dừng** (`studio/src/lib/server/agent.ts`): với stage `scenes`, `stagePrompt` và `feedbackPrompt` dặn agent tự chạy `node tools/build.mjs && node tools/verify.mjs --video <id>` trước khi dừng, sửa nếu có "problem", tối đa 3 lần. Runner vẫn chạy lại gate và QA sau khi agent dừng, nên gate cuối không bị nới. Lệnh nằm trong `node tools/*` đã được allowlist.

| Trước | Sau (cùng kịch bản) |
|---|---|
| Bảng trắng: 2 lượt agent, gate đỏ | Bảng trắng: 1 lượt agent, gate xanh (kể cả chụp ảnh) |
| Lesson Lab: 1 lượt, 78 thao tác, 546s, bố cục sạch | Lesson Lab: 1 lượt, 55 thao tác, 493s, **bố cục kém hơn (xem Chất lượng)** |

### Chất lượng

Cả hai bản "sau" qua `build`, `verify` và chụp ảnh, nhưng `verify` không bắt được lỗi bố cục. Xem ảnh QA 16 cảnh (30/10 so hai bản Lesson Lab):

| | Quan sát |
|---|---|
| Lesson Lab, trước (`cost-lab-01`) | Bố cục sạch ở cả 16 cảnh: chữ nằm trong khung, sơ đồ cân đối |
| Lesson Lab, sau (`cost-lab-02`) | Chữ tràn mép trái (cue 1, 4–12), chữ chồng lên khung (cue 9, 10, 14, 16), khung lớn trống (cue 3, 12) |
| Bảng trắng, sau (`cost-wb-02`) | Chữ chồng lên nét vẽ ở vài cảnh (cue 3, 4, 5, 8, 12). Không có bản "trước" qua gate để so |

**Chưa biết nguyên nhân.** Hai khả năng: (a) dao động giữa các lần chạy của agent (n = 1 mỗi bên), (b) agent tự kiểm xong thấy `verify` xanh nên dừng sớm hơn và đọc ít video mẫu hơn (12 so với 16 lần đọc video mẫu). `verify` xanh không có nghĩa bố cục đẹp, nên "tự kiểm" có thể làm agent tin gate quá mức. Cần chạy lặp (ít nhất 3 lần mỗi bên) và cho review chéo bật, rồi đếm số lỗi bố cục, trước khi bỏ chữ draft của PR.

## Hướng tối ưu còn lại (ước tính, chưa áp dụng)

| Hướng | Ước tính tiết kiệm | Rủi ro |
|---|---|---|
| **Gộp cảnh theo phần: 125 file `sNN.jsx` xuống khoảng 13** (một cảnh mỗi câu vẫn giữ, chỉ gộp file). Đề xuất của anh Tú, có đối chứng ở #64 | Cắt trực tiếp vào 30% thời gian ghi file và số lượt, tức vào tiền. Lớn nhất trong các hướng | Phải đổi quy ước `sNN.jsx` và bộ công cụ đọc nó; đi qua `lab` |
| Đưa mỗi fork một bản brief đã tiêu hoá sẵn (8 subagent đọc lại `cues.js` ×11, `README.md` ×8…) | Giảm số lần nạp ngữ cảnh, tỉ lệ theo số fork | Cần thiết kế bản brief |
| Ghi metrics theo từng chặng nhỏ thay vì lúc kết thúc (lượt bị dừng, thường đắt nhất, hiện không ghi token) | Không giảm chi phí, nhưng đo đúng lượt đắt nhất | Thấp |
| Thêm "khuôn cảnh" vào `styles/lesson-lab.md` (một file mẫu, bảng component → khi nào dùng) để bớt đọc video mẫu | Giảm phần `read` của Lesson Lab (12–16 lần đọc mẫu, cỡ một nửa số thao tác) | Cảnh giống nhau hơn nếu khuôn quá chặt |
| Áp cùng dòng tự kiểm cho lượt sửa theo review (`focusPrompt`) | Giảm lượt agent thêm khi review đòi sửa | Thấp |
| Gom nhiều cue vào một file cảnh ở Lesson Lab (giống `board.js`) | Giảm số file và phần khởi tạo lặp | Phải sửa design system; cần qua `lab` |
| Sửa chỗ `verify --video` không bắt lỗi của video khác | Tránh cả lô ảnh QA hỏng vì một video lỗi (xem dưới) | Thấp |

## Phát hiện phụ

`dist/vk.js` đóng gói **mọi** video trong `videos/`. Một video còn lỗi (đã xảy ra với `cost-wb-01`) làm bước chụp ảnh QA của **mọi video khác** thất bại (`NOT-READY`, `Cannot read properties of undefined (reading 'mountKit')`), trong khi `verify --video <id>` của agent chỉ kiểm video của nó nên báo xanh. Chưa sửa; cần quyết định xử lý ở gate.

## Phần chênh còn lại giữa Lesson Lab và Bảng trắng

Sau thay đổi, cùng kịch bản và cùng agent: Lesson Lab 55 thao tác, 662 dòng, 493s; Bảng trắng 31 thao tác, 173 dòng, 415s (gồm cả 6 lần tự `verify`). Phần chênh đo được đến từ **khối lượng code phải viết** (16 file JSX so với một file dữ liệu) và **số lần khám phá**, không đến từ số vòng sửa. Khi chọn style, cần tính Lesson Lab là "viết code từng cảnh", Bảng trắng là "khai báo dữ liệu".

## Giới hạn của phép đo

- **Số token của Cursor không đáng tin** để so giữa các lần chạy: `outputTokens` dao động từ 1.160 đến 43.550 cho cùng loại việc. Vì vậy ghi chú này dùng số lượt, số thao tác, số dòng và thời gian.
- **Mỗi cấu hình chỉ chạy một lần** (n = 1), nên chênh lệch nhỏ (ví dụ 78 so với 55 thao tác của Lesson Lab) có thể là nhiễu, chưa kết luận là tiết kiệm.
- Agent là Cursor với model mini, không phải Claude Code như anh Tú đo. Chỉ kết luận được về **nguyên nhân**, chưa kết luận được **mức tiết kiệm bằng đô-la**. Nên lặp lại một lần với Claude Code trên cùng kịch bản để có con số USD từ `video-cost.ts`.
- Giọng mock và review tắt: chưa đo chi phí chặng giọng và chặng review.
- Không có phép đo lỗi bố cục tự động; nhận xét về chất lượng là xem bằng mắt ảnh QA.
- Lần chạy Lesson Lab đầu tiên sau thay đổi bị nhiễm (agent chép cảnh của video thử trước). Đã loại và chạy lại riêng; bản ghi ở trên là bản sạch.
