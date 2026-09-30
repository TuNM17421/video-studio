# OmniVoice trên Kaggle

Cùng model và cùng dàn vai với model local (`castLocal`), chạy trên một kernel private có GPU T4 của Kaggle.
Trong Studio, server tự làm cả lượt (tab **Kaggle** ở bước Giọng đọc) — agent **không** đẩy kernel: mỗi lượt
tiêu quota GPU tuần của thành viên, và credentials chỉ nằm trong RAM của Studio.

Khi thành viên tự chạy tay (đã có `kaggle` CLI — `npm run setup:kaggle` — và đã đăng nhập):

```sh
KAGGLE_USERNAME=<tên> node tools/voice-kaggle.mjs --cues <video dir>/cues.js --out <thư mục kernel> [--voice <giọng|file>] [--speaker "Tú=<giọng|file>"]
kaggle kernels push -p <thư mục kernel> --accelerator NvidiaTeslaT4
kaggle kernels status <tên>/vs-<id>-voice          # chờ tới "COMPLETE"
kaggle kernels output <tên>/vs-<id>-voice -p projects/<id>/voice-script/kaggle
node tools/voice-import.mjs --cues <video dir>/cues.js --from projects/<id>/voice-script/kaggle/out --scan
```

- Kernel mang tên theo mã video (`vs-<id>-voice`), nên hai video không đè lên nhau.
- Video hội thoại: mỗi nhân vật mặc định mượn giọng `voices.json` đã gán; `--speaker` đổi giọng một vai.
- Giọng trong danh mục được kernel tải từ kho media; file mẫu trên máy được nhúng (FLAC 24 kHz mono), tổng
  dưới ~25 giây, cần `.txt` cùng tên hoặc Whisper để biết lời của mẫu.
- Phải dùng T4 (`--accelerator NvidiaTeslaT4`): P100 (`sm_60`) lỗi `no kernel image is available` với torch mới.
- `run.py` sinh bằng `omnivoice-infer-batch` như đường local; câu ngắn hơn `số từ × 0,18 giây` được sinh lại tối
  đa hai lần, giữ bản dài nhất; thiếu câu thì kernel thoát lỗi.
- Sau khi tải về, luôn `--scan` bằng Whisper; cue dưới ngưỡng thì nghe lại, sửa lời nếu cần và sinh lại — đừng
  cắt gọt audio để né bước kiểm tra.

## Ai được đẩy kernel — `--push`

**Mặc định vẫn là Studio đẩy.** Mỗi lượt tiêu quota GPU tuần của thành viên, và credentials chỉ nằm
trong RAM của Studio. Agent **chỉ** được dùng `--push` khi `REQUEST.md` hoặc brief của lượt đó cho
phép rõ bằng chữ; không có câu đó thì dựng kernel rồi dừng lại, in lệnh cho người chạy.

```sh
# chỉ khi REQUEST/brief cho phép: đẩy + chờ status + tải out/ về <thư mục kernel>/results
KAGGLE_USERNAME=<tên> node tools/voice-kaggle.mjs --cues <video dir>/cues.js --out <thư mục kernel> --push [--timeout 45]
node tools/voice-import.mjs --cues <video dir>/cues.js --from <thư mục kernel>/results/out --scan
```

`--push` làm đúng ba lệnh của mục trên (`push` → poll `status` 20 giây một nhịp → `output`) và thoát
lỗi nếu kernel vào trạng thái `error` hoặc quá `--timeout`. Không có CLI `kaggle` thì nó dừng ngay và
bảo chạy `npm run setup:kaggle`.

## Backend khác — `--backend`

`--backend omnivoice` (mặc định) là chính tool này. `--backend zerotts[:<giọng>]` **không** chạy ở
đây: nó chuyển tiếp sang `tools/voice-zerotts.mjs` (8 giọng dựng sẵn, KHÔNG clone, kernel **CPU**,
không tốn quota GPU) và bắt buộc kèm `--batch <voice-batch.jsonl>` — file duy nhất đã áp
`pronounce.json` (sinh batch thẳng từ `cues.js` sẽ nuốt mất pronounce, FM-19).

```sh
node tools/voice-export.mjs <video dir> --out projects/<id>/voice-script --backend zerotts:baotrang --pronounce projects/<id>/pronounce.json
node tools/voice-kaggle.mjs --cues <video dir>/cues.js --out <thư mục kernel> --backend zerotts:baotrang --batch projects/<id>/voice-script/voice-batch.jsonl
```

⚠ ZeroTTS **chạy trên máy** (`--local` của `voice-zerotts.mjs`) vẫn CHƯA bật — chờ Thái duyệt cài
package `zerotts`. Tới lúc đó đường ZeroTTS vẫn qua Kaggle, chỉ khác là kernel CPU.
