# Mốc từng từ cho giọng nhập: Whisper word_timestamps, chưa dùng forced alignment

Ngày 12/09/2026 · liên quan: `tools/voice-import.mjs`, `tools/voice-align/`, `tools/align-health.mjs`

## Bối cảnh

Giọng đọc có thể đến từ ElevenLabs hoặc từ audio thành viên tự thu / model local tạo (mỗi câu một tệp,
xem `tools/voice-export.mjs`). ElevenLabs trả về mốc thời gian của **từng ký tự**, nên `spokenAt(n, 'cụm từ')`
trong `lib/speech.js` biết chính xác một cụm từ được nói ở frame nào. Audio nhập từ ngoài không có gì
tương đương.

Không có mốc từng từ, `spokenAt` rơi về nội suy tuyến tính theo tỉ lệ âm tiết trên số frame lời đo được
của chính câu đó. Vì mỗi câu ngắn (5–8 giây) nên sai số bị chặn, nhưng câu có dấu phẩy dài, nhấn giọng
hoặc thuật ngữ tiếng Anh đọc chậm vẫn lệch thấy được. Một video tham chiếu có khoảng 170 lời gọi
`spokenAt`, trong khi hướng dẫn là đặt beat sớm 4–8 frame (0,15–0,27 giây) — sai số vài phần mười giây
là đủ để beat rơi *sau* từ cần đồng bộ.

## Quyết định

Dùng **faster-whisper với `word_timestamps=True`**, rồi ánh xạ các từ nghe được lên lời đã khoá trong
`cues.js` bằng một phép so khớp chuỗi con chung dài nhất (`mapWords` trong `tools/lib/voice-align.mjs`).
Từ nào Whisper không nghe ra thì nội suy giữa hai từ khớp gần nhất, nên `words` luôn phủ hết câu và
không bao giờ lùi.

Whisper **không** được cho biết trước lời của câu. Đó là chủ ý: bản ghi âm phải độc lập với kịch bản,
vì tỉ lệ khớp giữa hai bên chính là thứ phát hiện một thư mục audio bị lệch câu — lỗi duy nhất đi lọt
đến tận MP4 mà mọi bước trung gian vẫn báo bình thường. Mồi Whisper bằng lời mong đợi sẽ khiến nó gật
đầu với mọi thứ.

## Phương án đã cân nhắc và tạm gác

**Whisper + CTC forced alignment** (kiểu WhisperX, hoặc `torchaudio` MMS_FA): Whisper để đối chiếu nội
dung, một aligner nhẹ căn lời đã biết vào audio. Mốc từ chính xác hơn hẳn — mốc của Whisper suy ra từ
cross-attention chứ không phải căn thẳng tín hiệu — và chạy nhanh hơn.

Gác lại vì phương án hiện tại chỉ cần **một** phụ thuộc và làm được cả hai việc, còn phương án kia thêm
một nhánh code và một model nữa phải cài trên máy của mọi thành viên. Chất lượng thực tế chưa được đo;
đo trước rồi hãy trả giá.

## Khi nào thì đổi

`node tools/align-health.mjs` đọc mọi `voice/out/*/align-report.json` cùng nhật ký Video Studio và đối
chiếu với các ngưỡng dưới đây. Skill `/voice-align-check` chạy nó và giải thích kết quả.

Đề xuất chuyển sang Whisper + CTC align khi có **ít nhất một** điều sau, tính trên các video đã dùng
giọng nhập:

1. Đã làm từ **3 video** trở lên, và **≥ 2 video** phải gửi lại bước Dựng cảnh từ **2 vòng góp ý** trở
   lên có nhắc tới nhịp / lệch lời.
2. **≥ 10%** số câu có đối chiếu chỉ khớp dưới **65%** lời — tức phần lớn beat của những câu đó là nội
   suy chứ không phải mốc đo được.

Các ngưỡng này nằm trong `tools/align-health.mjs` (`WEAK_MATCH`, `WEAK_SHARE`, `MIN_VIDEOS`,
`NOISY_ROUNDS`, `NOISY_VIDEOS`); sửa ở đó thì sửa cả tài liệu này.

## Hệ quả

- `npm run setup:voice` thêm Python vào yêu cầu môi trường của repo (venv riêng ở `voice/.venv`, ghim
  Python 3.10–3.12 vì wheel của CTranslate2 chạy sau bản Python mới nhất). Model Whisper `small` khoảng
  460 MB, nằm ở `voice/cache/whisper`, không commit.
- Nhận diện chạy trên CPU là đủ: một video khoảng 5 phút lời mất cỡ một tới ba phút, và kết quả được
  cache theo sha256 của từng tệp audio nên thu lại một câu chỉ nhận diện lại câu đó.
- `--no-align` vẫn nhập được nhưng mất cả mốc từng từ lẫn khả năng phát hiện lệch câu. Chỉ dùng để thử
  quy trình, không dùng cho video giao nộp.
