#!/usr/bin/env python3
"""Word timestamps for imported narration, one câu per audio file.

Reads a job on stdin and writes the result to stdout, both JSON:

    {"model": "small", "device": "cpu", "language": "vi",
     "items": [{"n": 1, "wav": "/abs/path/01.wav"}, ...]}

    {"model": "small", "items": [{"n": 1, "text": "...", "avgLogprob": -0.21,
                                  "words": [["từ", 0.12, 0.35], ...]}, ...]}

The narration text is deliberately NOT given to Whisper as a prompt. tools/voice-import.mjs compares this
independent transcript against the locked cue text to catch a folder whose files are off by one — biasing
the model towards the expected sentence would make that check say yes to anything.

Failures are per item (`"error": "..."`), never fatal for the batch: import then keeps the câu without
word timings and says so, rather than losing the whole run.
"""
import json
import os
import sys


def eprint(*a):
    print(*a, file=sys.stderr, flush=True)


def main() -> int:
    raw = sys.stdin.read()
    job = json.loads(raw) if raw.strip() else {}
    check_only = "--check" in sys.argv

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        eprint("faster-whisper chưa được cài. Chạy: npm run setup:voice")
        return 3

    model_name = job.get("model") or os.environ.get("VOICE_ALIGN_MODEL") or "small"
    device = job.get("device") or os.environ.get("VOICE_ALIGN_DEVICE") or "cpu"
    compute = job.get("compute") or ("int8" if device == "cpu" else "float16")
    root = job.get("cacheDir") or os.environ.get("VOICE_ALIGN_CACHE") or None

    try:
        model = WhisperModel(model_name, device=device, compute_type=compute, download_root=root)
    except Exception as e:  # noqa: BLE001 — the message is what the user needs, not the traceback
        eprint(f"Không tải được model Whisper '{model_name}': {e}")
        return 4

    if check_only:
        print(json.dumps({"ok": True, "model": model_name, "device": device, "compute": compute}))
        return 0

    items = job.get("items") or []
    out = []
    for i, item in enumerate(items, 1):
        eprint(f"align {i}/{len(items)} · câu {item.get('n')}")
        try:
            segments, _info = model.transcribe(
                item["wav"],
                language=job.get("language") or "vi",
                word_timestamps=True,
                vad_filter=True,
                condition_on_previous_text=False,
            )
            words, texts, logprobs = [], [], []
            for seg in segments:
                texts.append(seg.text)
                logprobs.append(seg.avg_logprob)
                for w in seg.words or []:
                    words.append([w.word.strip(), round(w.start, 3), round(w.end, 3)])
            out.append({
                "n": item.get("n"),
                "text": "".join(texts).strip(),
                "avgLogprob": round(sum(logprobs) / len(logprobs), 3) if logprobs else None,
                "words": words,
            })
        except Exception as e:  # noqa: BLE001
            out.append({"n": item.get("n"), "error": str(e)})

    print(json.dumps({"model": model_name, "device": device, "items": out}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
