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
