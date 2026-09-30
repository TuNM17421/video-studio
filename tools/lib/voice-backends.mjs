/**
 * Sổ đăng ký BACKEND GIỌNG — một chỗ duy nhất mô tả từng backend, để `voice-export` · `voice-import`
 * · `voice-risk` · `voice-pace` · `audio-qa` không mỗi nơi giả định một kiểu.
 *
 * ── Vì sao phải có file này ───────────────────────────────────────────────────────────────────
 * Trước 21/09/2026 harness chỉ có một đường giọng, nên mọi hằng số đều viết thẳng vào tool: nhịp
 * đọc 5,12 âm tiết/giây nằm trong `audio-qa.mjs`, mức lời ~−16 LUFS là thứ OmniVoice tình cờ cho
 * ra, và `voice-risk` gắn cờ MỌI số viết bằng chữ vì OmniVoice đọc sai số. Thêm backend thứ hai làm
 * cả ba giả định đó sai cùng lúc. Đây là chỗ khai chúng ra thành DỮ LIỆU.
 *
 * ── Thái chốt 21/09/2026 ──────────────────────────────────────────────────────────────────────
 *   video kiểu DẪN, không tương tác với người nghe  → ZeroTTS `baotrang`
 *   còn lại                                          → OmniVoice
 *
 * ── Con số ở đây đến từ đâu ───────────────────────────────────────────────────────────────────
 * `rate`/`targetLufs` của OmniVoice là số đo trên 7 video đã bind (`tools/voice-pace.mjs`).
 * Của ZeroTTS là MẪU NHỎ từ lượt so model 21/09 + smoke-test nối backend — mỗi mục ghi rõ `samples`
 * và `measuredOn`. Đừng đọc chúng như số đã ổn định; đo lại khi có video thật đầu tiên.
 */

/**
 * `readsDigits` / `readsEnglish` = model TỰ đọc đúng dạng đó, nên `voice-risk` KHÔNG gắn cờ.
 * Đo 21/09/2026 trên `baotrang`: Z1 (số viết chữ) khớp Whisper 89,0% ≈ Z2 (chữ số) 89,4% — chênh
 * 0,4 điểm, tức viết kiểu nào cũng như nhau; `ChatGPT` đọc đúng. OmniVoice thì ngược lại: số viết
 * bằng chữ và từ tiếng Anh lạ chính là hai nguồn lỗi đã đo được (xem `voice-risk.mjs`).
 */
export const BACKENDS = Object.freeze({
  omnivoice: {
    id: 'omnivoice',
    label: 'OmniVoice (k2-fsa/OmniVoice)',
    model: 'k2-fsa/OmniVoice',
    version: null, // pip không pin ở đường này; giọng đến từ ref audio chứ không từ package
    voices: null, // clone từ ref audio — không có danh sách giọng dựng sẵn
    defaultVoice: null,
    clone: true,
    license: 'CC-BY-NC (trọng số)',
    hardware: 'GPU (Kaggle T4)',
    sampleRate: 24000,
    /** Không chuẩn hoá: đây LÀ mức chuẩn nhà, mọi video đang chạy đều từ đường này. */
    targetLufs: null,
    rate: { value: 5.12, samples: 7, measuredOn: '2026-09-21 · 7 video đã bind', unit: 'âm tiết/giây' },
    readsDigits: false,
    readsEnglish: false,
    tool: 'tools/voice-kaggle.mjs',
  },
  zerotts: {
    id: 'zerotts',
    label: 'ZeroTTS (zeroweight-ai/ZeroTTS)',
    model: 'zeroweight-ai/ZeroTTS',
    /**
     * PIN phiên bản package. Để trống thì một lượt Kaggle sau có thể kéo bản khác và giọng đổi mà
     * không ai biết. Số này do smoke-test đọc `zerotts.__version__` rồi điền lại — xem
     * `voice-zerotts.md` §Pin phiên bản.
     */
    version: '0.1.2', // bản đã chạy smoke-test 21/09/2026 (`report.json` → `zerotts_version`)
    /** 8 giọng dựng sẵn của package, đọc từ `tts.list_voices()` lượt 21/09/2026. */
    voices: ['baotrang', 'giahuy', 'hamy', 'huuduc', 'kimoanh', 'maichi', 'quangminh', 'tiendat'],
    defaultVoice: 'baotrang',
    /** KHÔNG clone: clone của ZeroTTS bắt upload ref audio lên `platform.zeroweight.ai`. Thái chưa duyệt. */
    clone: false,
    license: 'MIT',
    hardware: 'CPU (không tốn quota GPU)',
    sampleRate: 48000,
    /** Đo 21/09: `baotrang` ra −21,6 LUFS, `giahuy` −19,5. Nhà chạy ~−16. Phải kéo lên lúc import. */
    targetLufs: -16.0,
    /**
     * Trần đỉnh khi kéo mức. Gain KHÔNG ĐỦ một mình: 10 clip smoke-test có LUFS trung vị −22,35 mà
     * đỉnh thật chỉ −4,1…−6,8 dBFS, tức crest ~17 dB. Cộng +6,35 dB để tới −16 LUFS sẽ đẩy đỉnh lên
     * **+2,25 dBFS** — và `audio-qa` chặn ngay (đo thật: clipping 0,0624%, ngưỡng 0,01%). Vì vậy
     * chuỗi là `volume` rồi `alimiter`, đúng như bus SFX: limiter chỉ chạm phần đỉnh vượt trần.
     */
    peakCeilingDb: -1.0,
    /** 112 âm tiết / 27,4 s trên 10 câu smoke-test `baotrang`. MẪU NHỎ — chưa có video thật nào. */
    rate: { value: 4.08, samples: 10, measuredOn: '2026-09-21 · MẪU NHỎ, 10 câu smoke-test baotrang', unit: 'âm tiết/giây' },
    readsDigits: true,
    readsEnglish: true,
    tool: 'tools/voice-zerotts.mjs',
  },
});

export const DEFAULT_BACKEND = 'omnivoice';

/**
 * Đọc một khai báo `zerotts:baotrang` | `zerotts` | `omnivoice` → `{ backend, voice, spec }`.
 * Ném lỗi khi tên backend hoặc tên giọng không có thật — im lặng rơi về mặc định là cách chắc chắn
 * nhất để một video chạy sai backend mà không ai phát hiện.
 */
export function resolveBackend(spec, { fallback = DEFAULT_BACKEND } = {}) {
  const raw = String(spec ?? '').trim() || fallback;
  const [name, voice] = raw.split(':').map((s) => s.trim());
  const backend = BACKENDS[name];
  if (!backend) throw new Error(`backend giọng "${name}" không có — chọn: ${Object.keys(BACKENDS).join(', ')}`);
  if (voice) {
    if (!backend.voices) throw new Error(`backend "${name}" clone giọng từ ref audio, không nhận ":${voice}"`);
    if (!backend.voices.includes(voice)) {
      throw new Error(`giọng "${voice}" không có trong ${name} — 8 giọng package: ${backend.voices.join(', ')}`);
    }
  }
  const chosen = voice || backend.defaultVoice || null;
  return { backend, voice: chosen, spec: chosen ? `${backend.id}:${chosen}` : backend.id };
}

/**
 * Chuỗi đưa vào HASH của `gen-manifest.json`. Phải gồm backend + giọng + phiên bản: đổi bất kỳ thứ
 * nào trong ba thứ đó thì clip cũ KHÔNG dùng lại được, dù lời không đổi một chữ. Trước đây hash chỉ
 * có text, nên đổi backend mà `voice-batch.jsonl` vẫn ra rỗng — tức là im lặng ghép giọng OmniVoice
 * vào một video đã chuyển sang ZeroTTS.
 */
export function backendHashKey({ backend, voice }) {
  return `backend=${backend.id}\u0000voice=${voice ?? ''}\u0000version=${backend.version ?? 'unpinned'}`;
}

/** `voice: zerotts:baotrang` trong `projects/<id>/REQUEST.md`. Không có dòng đó → `null`. */
export function backendFromRequest(text) {
  const m = String(text ?? '').match(/^\s*(?:[-*]\s*)?(?:\*\*)?voice(?:\*\*)?\s*:\s*`?([a-z0-9]+(?::[a-z0-9]+)?)`?\s*$/im);
  return m ? m[1] : null;
}

/**
 * Nhịp đọc + cỡ mẫu của một backend, để `audio-qa`/`voice-pace` nói rõ số nào là đo thật, số nào là
 * mẫu nhỏ. Không có thì rơi về OmniVoice và ĐÁNH DẤU là đang mượn số của backend khác.
 */
export function rateFor(backendId) {
  const b = BACKENDS[backendId] || BACKENDS[DEFAULT_BACKEND];
  const borrowed = !BACKENDS[backendId];
  return { ...b.rate, backend: b.id, borrowed };
}
