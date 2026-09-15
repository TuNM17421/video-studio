# OmniVoice trên Kaggle

Xuất lời đã duyệt bằng `node tools/voice-export.mjs <video dir> --out projects/<id>/voice-script`. Mỗi dòng `voice-batch.jsonl` chứa `id`, `text`, `language_id`.

Chuẩn bị WAV giọng mẫu và lời đọc **đúng với WAV** (đưa chuỗi trực tiếp hoặc `@ref.txt`). Tạo kernel:

```sh
KAGGLE_USERNAME=<tên Kaggle> node tools/voice-kaggle.mjs --batch projects/<id>/voice-script/voice-batch.jsonl --ref-audio <ref.wav> --ref-text @<ref.txt> --out <thư mục kernel> --speed 1.0
```

Tool tạo `run.py` và `kernel-metadata.json`. Khi người dùng đã chọn workflow Kaggle/OmniVoice, agent tự chạy private `push`, theo dõi status, tải `output` và retry cue lỗi; không dừng để hỏi lại từng bước. Khi push, **phải dùng `--accelerator NvidiaTeslaT4`**: P100 (`sm_60`) có thể lỗi `no kernel image is available` với PyTorch mới. Nếu không đặt `KAGGLE_USERNAME`, sửa `id` trong metadata trước khi push.

`run.py` cài `omnivoice` và `soundfile`, giải mã WAV mẫu nhúng, sinh từng câu với `num_step=32`. Mặc định `--speed 1.0`: đọc nhanh hơn khiến OmniVoice nuốt mất từ đầu câu, cùng rủi ro đã gặp ở đường model local — chỉ đổi tốc độ khi người dùng chủ động yêu cầu. Audio ngắn hơn `số từ × 0,18 giây` được thử lại tối đa 3 lần; bản dài nhất được ghi thành `out/<id>.wav`. Mở/nghe và kiểm tra WAV trước khi nhập.

Sau khi tải output, chạy `voice-import.mjs --scan` trực tiếp trên WAV gốc để Whisper đối chiếu từng cue. Cue dưới ngưỡng phải nghe/đọc transcript, sửa lời nếu cần và sinh lại riêng cue đó — đừng tự ý cắt gọt phần đầu bằng công cụ hậu kỳ để né kiểm tra.
