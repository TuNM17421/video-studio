# ZeroTTS — file tra. Đọc khi `REQUEST.md` khai `voice: zerotts:<giọng>`.

Vai `voice` đọc `voice-kaggle.md` trước; file này chỉ nói phần khác OmniVoice.

## Khác OmniVoice ở đâu

| | OmniVoice | ZeroTTS |
|---|---|---|
| giọng | clone từ `ref.wav` + `ref.txt` | **8 giọng dựng sẵn**, không clone |
| phần cứng | Kaggle **GPU** T4 | Kaggle **CPU** — không tốn quota GPU |
| licence trọng số | CC-BY-NC | **MIT** |
| số viết bằng chữ | đọc lệch (FM-27) | đọc đúng |
| từ tiếng Anh | hay trượt, phải nuôi `pronounce.json` | đọc đúng (`ChatGPT` ✓) |
| mức ra | ~−16 LUFS (đúng mức nhà) | **−19,5…−22,6 LUFS** — import phải kéo lên |
| nhịp đọc | 5,12 âm tiết/giây (7 video) | ~4,1 (**mẫu nhỏ**) |
| lặng đầu clip | ~0,20 s | ~0,03 s |

8 giọng: `baotrang` · `giahuy` · `hamy` · `huuduc` · `kimoanh` · `maichi` · `quangminh` · `tiendat`.

## Ba điều KHÔNG được làm

1. **Không clone.** Clone của ZeroTTS bắt upload giọng mẫu lên `platform.zeroweight.ai` — bên thứ ba
   Thái **chưa duyệt**. Không upload gì lên đó, kể cả để thử.
2. **Không cài `zerotts` lên máy Thái.** Cờ `--local` cố ý thoát 2 kèm hướng dẫn; bật khi Thái duyệt.
3. **Không bỏ `--backend` lúc import.** Thiếu nó thì clip vào ở mức −21,6 LUFS và `audio-qa` chặn.

## Chuỗi lệnh

```console
node tools/voice-export.mjs <vdir> --out projects/<id>/voice-script --backend zerotts:baotrang \
  --pronounce projects/<id>/pronounce.json
npm run voice-zerotts -- --batch projects/<id>/voice-script/voice-batch.jsonl \
  --out projects/<id>/zerotts-kernel --voice baotrang --pin <version>
node tools/run-logged.mjs voice --video <id> -- kaggle kernels push -p projects/<id>/zerotts-kernel
node tools/run-logged.mjs voice --video <id> -- kaggle kernels output <owner>/<slug> -p projects/<id>/zerotts-kernel/results
node tools/voice-import.mjs --cues <vdir>/cues.js --from projects/<id>/zerotts-kernel/results/out \
  --backend zerotts:baotrang --gaps --gaps-report projects/<id>/gaps.md
```

`--backend` lúc import có thể bỏ nếu thư mục clip có `voice-backend.json` (tool tự ghi) hoặc
`REQUEST.md` khai `voice:` — thứ tự ưu tiên: cờ → sidecar → REQUEST.md → mặc định.

## Pin phiên bản

`voice-zerotts.mjs` không tự biết bản nào đã chạy. Lượt đầu chạy không `--pin`, đọc
`zerotts_version` trong `results/out/report.json`, rồi điền vào `tools/lib/voice-backends.mjs`
(`BACKENDS.zerotts.version`) **và** dùng `--pin` từ lượt sau. Không pin thì một lượt Kaggle sau có
thể kéo bản khác và giọng đổi mà không ai biết — và `gen-manifest.json` sẽ không coi đó là "cần
sinh lại" vì nó chỉ biết phiên bản mình được khai.

## Cạm bẫy đã trả giá

- **`External data path escapes model directory`** → FM-34. Phải
  `snapshot_download(local_dir=…, local_dir_use_symlinks=False)`.
- **Đổi backend mà `voice-batch.jsonl` ra rỗng.** `gen-manifest.json` mang `$backendKey`
  (backend + giọng + phiên bản); khác một thứ là MỌI cue phải sinh lại. Manifest cũ không có trường
  đó được coi là OmniVoice.
- **Nhịp đọc.** `audio-qa` lấy nhịp theo backend ghi trong `voice.cues.json`. Số của ZeroTTS hiện là
  **mẫu nhỏ** — tool in kèm cỡ mẫu, đừng đọc nó như số đã ổn định.

## Chạy local (CHƯA BẬT)

`--local` sẽ gọi python trong `voice/.venv`. Phần python của kernel và phần local là **cùng một
đoạn mã**, nên bật chỉ là đổi chỗ chạy. Chờ Thái duyệt cài `zerotts` vào venv.
