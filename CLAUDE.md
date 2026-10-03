# Claude-Design — lesson videos for VinUni "AI in Action 20K"

## One design system, experiments on a branch
`vinuni-lesson-video-ds/` is the only design system (the approved former "lab" direction: AgentLoop, Gate,
Swimlane, ChatWindow, CodeBlock, role hues…). Colors beyond the 9 base colors may only be declared in
`lib/tokens.js`; `tools/verify.mjs` must pass (warnings allowed, no problems).
- `main` — approved design system and official videos.
- `lab` — research, new components/colors/features. Merge into `main` only when the user approves.
Never keep a second copy of the design system in another folder. Commit before and after larger changes;
the repo is pushed to GitHub (private), `.env`, audio, MP4, `node_modules`, `ds-bundle/` are ignored.

Setup (see README "Setup lần đầu"): `npm install` (deps + links `node_modules/vinuni-lesson-video-ds`),
`npm run setup` (playwright Chromium), `npm run setup:voice` (only for imported voice: faster-whisper venv +
Whisper model, see `docs/decisions/voice-align.md`; like `setup:omnivoice` it is one install per machine —
reused from this checkout, the shared `~/.cache/video-studio/`, another worktree or the HF cache, see
`tools/lib/shared-env.mjs`), `tts-elevenlabs/.env` from `.env.example`. Tools find Chrome via
`$CHROME` → playwright's Chromium → system Chrome, and ffmpeg via `$FFMPEG` → ffmpeg-static → `ffmpeg` on PATH.
Read `vinuni-lesson-video-ds/README.md` (rules, tokens, components) and `vinuni-lesson-video-ds/SKILL.md`
before designing anything.

## Reference implementation
`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab/` (with `projects/d2-01-lab/`) is a complete,
QA'd video in the current style; `n2-00-gioi-thieu-ngay-2/` is a shorter one. Copy the structure:
- `cues.js` — one cue per narrated sentence: locked text (verbatim from the script), seconds, title
  (on-screen text). `spokenAt(n, phrase)` gives beat frames.
- `shared.jsx` — eyebrow, captions, common scene shell. `sNN.jsx` — one scene per cue, beats in `T`.
- `video.jsx` + `timeline.js` + `voice.js` — Series of scenes, retimed to the recorded voice.
- `STORYBOARD.md`, `card.html`, `player.html`.
Source script, notes and outputs live in `projects/<video-id>/` (kich-ban-goc.md, PROMPTS.md, render/).

## Pipeline for a new video (voice first) — skill `make-video`
`.claude/skills/make-video/SKILL.md` is the source of truth; the request is `projects/<id>/REQUEST.md`, the
style is `styles/<style>.json` (palette, showcase components, rules — they override defaults).
1. **cues** — script → `projects/<id>/kich-ban-goc.md`; `cues.js` (text verbatim; `createSpeech(RAW, VOICE)`
   from lib/speech.js); `voice-timing.mjs --clear`; TTS `--dry-run`.
2. **voice** — giọng đọc chọn trong `voices.json` (danh mục được commit: id, tên, giới tính, key file mẫu
   trên R2, một giọng `"default": true`). Studio có bộ chọn kèm nút nghe thử; CLI nhận `--voice <id|tên>`,
   thứ tự ưu tiên `--voice` → `ELEVENLABS_VOICE_ID` → mặc định trong danh mục. Hai nguồn audio, đều kết thúc ở `voice/out/<id>/{voice.wav, voice.cues.json}`:
   *ElevenLabs* — `node tts-elevenlabs/tts.mjs generate --cues <video>/cues.js --pronounce projects/<id>/pronounce.json --out voice/out/<id>`
   (dry-run first, ask before spending credit; key in `tts-elevenlabs/.env`, never print/commit it).
   *Recorded or local model* — `node tools/voice-export.mjs <video dir> --out projects/<id>/voice-script`
   gives the reading script + an OmniVoice batch JSONL; the member returns a folder of `01.wav, 02.wav …`
   and `node tools/voice-import.mjs --cues <video>/cues.js --from <folder>` (run `--scan` first) assembles
   it. Whisper checks each file against its câu and blocks a folder that is off by one.
   Then `node tools/voice-timing.mjs voice/out/<id>/voice.cues.json <video dir> --write-cues`
   (measured frames/speech into cues.js, word timestamps into voice.js).
3. **scenes** — author every scene at its recorded length; beats with `spokenAt(n, phrase)` (real word
   starts). Content zone y 250–960, captions ≤ 78 chars via lib/captions.js, colors from the style + lib/tokens.js,
   Montserrat, connectors: particle on the drawn path, hidden on card faces, one pulse per arrival; no
   numbers/results the script does not give. Parallel forks per scene group work well.
   `npm run build && npm run verify -- --video <id>` (chỉ video đó + phép soát chung của design system — Studio cũng
   gọi đúng như vậy, nên lỗi của một video khác trên máy không chặn video này); QA stills to `projects/<id>/qa/` with
   `node tools/shoot.mjs --batch`.
4. **render** — `node tools/render.mjs --scene <id> --audio voice/out/<id>/voice.wav --out projects/<id>/render/<id>.mp4`
   (+ `--base` of the preview server; `--no-captions` bỏ thanh phụ đề — Studio hỏi "Phụ đề: Có/Không" ở bước
   Render, mặc định Có), QA the MP4; `node tools/transcript.mjs <voice.cues.json> transcripts/DayNN/<id>.txt`.
   Bản mix có giọng được đưa về −16 LUFS qua limiter (giọng ElevenLabs gốc chỉ ~−21 LUFS); `--loudness <LUFS>`
   đổi mức, `--no-loudnorm` bỏ bước này.
   Studio render với `--keep-frames projects/<id>/render/frames`: bấm Dừng (hoặc render hỏng) rồi Render lại thì
   chỉ chụp nốt frame còn thiếu. Vân tay (`studio/src/lib/server/render-frames.ts`: bundle, CSS/token/font của
   design system, thư mục video, phụ đề, fps, chính `render.mjs`) lệch thì Studio tự bỏ frame cũ; `render.mjs` từ
   chối thư mục (stamp `render.json` lệch) thì Studio cũng bỏ để lần sau chụp lại; render xong thì xoá thư mục frame.
5. **deliver** — `chapters/DayNN/<id>-chương.txt` (`MM:SS: tên chương`, one per script section),
   `projects/<id>/PROMPTS.md`, final build + verify.
Optional: `/design-sync` pushes `vinuni-lesson-video-ds/` to the Claude Design project in
`.design-sync/config.json` — only after the user approves the file list (each member uses their own account;
`/design-login` if DesignSync reports an auth error).

## Video Studio (`studio/`, Next.js, `npm run studio` → http://127.0.0.1:3100)
Local web UI over the same pipeline: the form writes REQUEST.md + `projects/<id>/.studio/state.json`; stages
cues/scenes/deliver run headless `claude -p` (dontAsk, allowlist in `studio/src/lib/server/agent.ts`); the
server itself runs TTS (key in RAM only), the audio import, voice-timing, render and transcript. It serves the design system at
`/ds` (render/QA base). `STUDIO_TTS_MOCK=1` = silent mock voice for development. New styles = new
`styles/<id>.json` (palette, showcase, rules, `unsupportedModules`) + `styles/<id>.md` (how that style builds
scenes, its reference video, `## Tiêu chí QA`; front matter `extends: <parent>` adds to the parent's guide),
no code change. The skill `make-video` is the core every style shares; REQUEST.md and the agent prompt name
the style's guides, and the QA lane adds their criteria.

### Sửa một câu tay, báo khi xong, chi phí từng video
- **Sửa một câu** không qua agent: `tools/cue-edit.mjs` (lõi ở `tools/lib/cue-edit.mjs`) thay đúng chuỗi `text` /
  `title` / `visual` của một câu trong `RAW`, nạp lại file để kiểm rồi mới ghi, đồng bộ dòng `- **Lời:**` trong
  `kich-ban-goc.md`, và từ chối khi cảnh đã dựng `spokenAt(N, 'cụm')` vào cụm mà lời mới làm mất. Studio (`lib/server/
  cue-edit.ts`) chỉ cho sửa trước khi có giọng (`lib/cue-edit.ts` → `cueEditBlocked`), chạy lại TTS dry-run, giữ cue
  đã duyệt ở "đã duyệt" (duyệt lại sẽ chạy lại đề xuất ảnh từ đầu) và xoá dry-run/báo cáo quét audio cũ khi lời đổi.
- **Chi phí** (`lib/video-cost.ts`, đọc ở `lib/server/cost.ts`): giữ đơn vị mỗi nguồn báo — USD của Claude Code, token
  của Codex (không quy ra giá), "không báo số" cho Antigravity và lượt trước khi có ledger; không bao giờ biến thiếu số
  thành $0. Ký tự ElevenLabs lấy từ dòng `câu NN → ElevenLabs … · tính phí N ký tự` mà `tts.mjs` in ở từng câu —
  **đổi định dạng dòng đó thì sửa `billedFromLine` cùng lúc**. `ELEVENLABS_API_BASE` và `TTS_CACHE_DIR` chỉ để test
  chạy đường request thật với server giả (`tools/tts-billing.test.mjs`), không tốn credit, không đụng cache thật.
- **Báo khi xong** (`lib/job-notice.ts`, `lib/use-job-notice.ts`, `lib/notify.ts`): tiêu đề tab + thông báo trình
  duyệt cho job từ 30 giây, chỉ khi người dùng không nhìn trang; lựa chọn lưu ở localStorage của trình duyệt.

### Giao diện Studio đi theo design system, không tự chế
Mọi thay đổi UI/UX trong `studio/` phải theo **`studio/src/lib/design-tokens.ts`** — nguồn chuẩn duy nhất
cho màu, bộ chữ, token bố cục, mức nhấn của luồng sản xuất và motion. Xem trực quan tại
**`/design-system`** (`npm run studio` rồi mở http://127.0.0.1:3100/design-system).
- Màu: dùng token (`brand.primary`, `neutral.600`, `status.warning`…) hoặc biến CSS tương ứng trong
  `vinuni-tokens.css`. **Không** viết mã hex mới vào component hay `.css`; màu thương hiệu khớp
  stylesheet của vinuni.edu.vn nên đổi tuỳ tiện là lệch nhận diện.
- Chữ: Montserrat (tiêu đề/thương hiệu) · Be Vietnam Pro (nội dung, biểu mẫu, bảng) · IBM Plex Mono
  (mã video, timecode, số frame, nhật ký agent).
- Kích thước khung (sidebar, hàng bước, panel xem trước…) lấy từ `STUDIO_LAYOUT` thay vì số tự đặt.
- Cần một giá trị chưa có? Thêm token vào `design-tokens.ts` trước, rồi mới dùng — đừng đặt riêng trong
  một file CSS.
Lưu ý: đây là design system **của giao diện Studio**, khác với design system của video bài giảng
(`vinuni-lesson-video-ds/lib/tokens.js`, 9 màu, dùng khi dựng cảnh). Đừng lẫn hai bên.

### Tour hướng dẫn (Griffin dẫn đường)
Lời thoại và điểm chỉ của tour nằm ở `studio/src/lib/tours.ts` (dữ liệu thuần); `components/tour.tsx` chạy
bằng antd `Tour`, tìm phần tử theo `data-tour="…"` (đừng chỉ bằng class CSS), bỏ bước không có trên màn
hình, nhớ "đã xem" theo `version` trong localStorage. Sửa lời một tour thì tăng `version`. Tour chỉ **chỉ
vào** nút tốn credit / chạy agent, không bao giờ bấm hộ. Nút Griffin ở góc phải mở lại tour của trang.
**Video mẫu của chế độ tập** là `mau-huong-dan` (Griffin kể năm bước, 8 câu): một video đã đi đủ năm bước,
`state.json` có `"sample": true` nên Studio mở ở chế độ **chỉ xem** (API chặn agent/giọng/render như với video
làm ngoài Studio). Phần chữ nằm trong git dù `projects/`, `videos/`, `voice/out/` bị ignore — đã `git add -f`
từng file, sửa thì add lại; phần nặng (`voice.wav`, MP4, ảnh QA) ở R2 `samples/mau-huong-dan/…`, tải về bằng
`npm run sample` (`tools/sample-fetch.mjs`). Tour `practice` (nút Griffin → "Chế độ tập", có ở mọi trang) mở
`/?id=mau-huong-dan` rồi đi qua năm bước: bước tour khai `studioStep`, `tour.tsx` phát sự kiện
`video-studio:tour-step` và trang video tự mở bước đó. Dựng lại video mẫu thì đẩy lại ba loại file đó vào
`media/files/samples/<id>/` rồi `npm run media`.

## Đóng gói kịch bản: slide giảng viên → research → kịch bản (skill `research-script`)
Pipeline riêng, tách khỏi luồng video; mỗi lượt là `research/<rid>/` — **gitignore, chỉ trên máy người dùng**, như
video. Lượt mẫu chỉ-xem sẽ ở `research/template-research/` (`git add -f`, không kèm `sources/` và log) — **chưa có**,
chờ chọn slide được phép commit; Studio đã hỗ trợ sẵn (`"sample": true` trong state.json). Không có API key
LLM nào: Studio gọi agent coding của người dùng (Claude Code / Codex / Antigravity), từng chặng nhỏ, token chỉ dùng
cho phán đoán. `.claude/skills/research-script/SKILL.md` là nguồn chuẩn; mỗi chặng một file (`extract.md`,
`research.md`, `write.md`, `edit.md`) để agent chỉ đọc đúng phần của mình.
- Chặng: nạp slide (code, `tools/research-slide.mjs`) → bóc tách claim (agent, không web) → **cổng 1** người duyệt →
  research từng lô claim (agent có web search; đọc trang bằng `node tools/page.mjs research/<rid> <url> --find "…"`,
  chỉ trả đoạn nguyên văn có từ khoá) → soát bằng chứng (code) → **cổng 2** tự qua nếu đạt → viết theo
  `templates/kich-ban-co-ban.md`, mỗi câu có dòng `**Nguồn:** slide:N, cN` → soát mẫu (code) + agent biên tập →
  **cổng 3** duyệt/góp ý → "Tạo video từ kịch bản này" mở bước Kế hoạch với kịch bản điền sẵn (`/?fromResearch=<rid>`).
- Soát là một lệnh cho cả Studio và agent tự chạy: `node tools/research-verify.mjs research/<rid> --stage
  extract|evidence|script` (ghi `checks/*.json`). Trích đoạn so với trang gốc Studio tự tải (WebFetch của Claude
  trả bản một model nhỏ đã đọc lại); nguồn độc lập và độ mới tính theo `difficulty`/`timeSensitive` của claim.
  Năm chỗ **không được tin vào chữ agent viết ra**, mỗi chỗ đã tái hiện được trước khi vá: (1) cờ `reused`
  nằm trong `claims/**` nên phải khớp đúng dữ kiện thật trong `_facts/` (khoá, câu slide, ngày soát, từng
  trích đoạn) mới miễn soát; (2) verdict `insufficient` **qua** được soát bằng chứng nhưng phải dừng ở cổng 2,
  không thì một lượt agent mất mạng mở cổng với dòng "mọi claim đạt"; (3) nhãn `kind: official` là chữ agent
  gõ — tên miền không tự nhận ra được thì thành cảnh báo cho người duyệt, và cổng 2 dừng khi claim `high`
  hoặc `timeSensitive` có cảnh báo; (4) `sources/<sid>/page.txt` có vân tay sha256 do code ghi ở
  `research/_pages/<rid>.json` (ngoài mọi glob `WRITABLE`) — lệch thì tải lại trang thật, nên "khớp trang gốc"
  đúng cả với Codex/Antigravity, hai CLI ghi được khắp repo; (5) mỗi dòng của `checks/evidence.json` giữ vân tay
  `finding.json` lúc soát — mỗi lượt chỉ soát claim của lô nó, nên finding của claim **ngoài lô** mà đổi (agent lô sau
  ghi đè con số của claim đã đạt) thì bị soát lại ngay, kèm cảnh báo, thay vì giữ dấu "đạt" cũ.
- Con số **người xem nghe thấy** cũng được soát: `spokenNumbers()` đọc lời đọc tiếng Việt về giá trị ("một
  trăm triệu" → 100000000) rồi đối chiếu với slide và finding đã qua soát. Trước đó không phép soát nào nhìn
  vào lời đọc — luật lint bắt viết số thành chữ, còn vòng quét chữ số chỉ đọc dòng **Trên màn hình**.
  Số thập phân ("hai phẩy năm", "một phẩy năm triệu") là một con số và được soát cả khi dưới mười.
- **Độ dài theo "Số câu"** người dùng đặt: ~24 từ mỗi câu (`WORDS_PER_CUE` trong `script-lint.mjs` =
  `SCRIPT_BUDGET` trong `research.ts`, có test giữ khớp). Prompt viết báo trước mức đó; `--stage script` so cả số
  câu lẫn số từ (quá 1,2 lần → cảnh báo, quá 1,5 lần → lỗi, lượt sửa rút gọn) và ghi lại dòng **Thời lượng dự
  kiến:** theo lời đọc thật. Lượt thật đầu tiên: đặt 20 câu, ra 34 câu, khoảng 6 phút thay vì khoảng 3.
- Lượt sửa không được "mua" hết cảnh báo: viết tắt có trong slide/finding (LLM, API) không bị cảnh báo; loại
  `code: 'pronounce'` (tên có chữ số) là việc của bước làm video, không gửi agent sửa; câu dài thì cắt ý, không
  tách câu. Góp ý biên tập mang `quote` để Studio gắn đúng câu sau khi lượt sửa đánh số lại.
- **Chi phí** (lượt test 22/9: $8,06 giá API quy đổi, research 60%, và gần nửa tiền research là làm lại): agent
  research **tự soát trước khi dừng** bằng `research-verify … --stage evidence --dry --claims …` (chỉ đọc, không tải
  web; `--dry` ghép với chế độ ghi nào cũng bị từ chối, vì lệnh nằm trong allowlist); lượt làm lại nhận lỗi + bảng
  nguồn + trang đã tải ngay trong prompt và đi từng cặp claim (`RETRY_BATCH`); bóc tách chọn tối đa `claimCap(cues)`
  claim (nửa số câu); trang giá/docs chính thức của đúng hãng không ghi ngày tính là hiện hành (`asOf` = ngày tải);
  vòng đầu sửa lỗi định dạng chạy Haiku (`lint` trong `CLAUDE_MODEL`), vòng hai lên Sonnet.
- **Bóc tách đọc chữ, không đọc PDF:** nạp slide PDF thì `unpdf` (PDF.js, MIT, cần Node 22+) bóc chữ từng trang vào
  `input/slides.json` + `slide.md`, bỏ chân trang lặp lại (`stripRepeated`). `outline.json` do **code** dựng
  (`outlineFromSlides`, PPTX cũng vậy) và dựng lại mỗi lần `--stage extract` — agent bóc tách chỉ ghi `claims.json`
  (kèm `skip` tuỳ chọn), chỉ mở trang PDF "ít chữ" khi cần xem hình. Đo trên bộ 78 trang: $0,69 / 8 phút → $0,26 /
  48 giây, và số trang đúng tuyệt đối. PDF quét ảnh, mã hoá hay Node cũ thì agent đọc thẳng PDF như trước. PDF
  nguồn khi research cũng qua PDF.js (`pdfTextAsync`) sau `pdftotext`.
- Nguồn gốc hay là PDF (system card, báo cáo, bài nghiên cứu): `tools/lib/pdf-text.mjs` đọc được bằng Node
  thuần (giải nén stream, mở `/ObjStm`, đọc bảng `/ToUnicode`), dùng `pdftotext` nếu máy có. Không ra chữ thì
  trả "không đọc được" chứ không trả rác. Trước đó mọi PDF bị loại, nên phép soát **thưởng cho nguồn kém**.
- Claim qua soát được lưu vào `research/_facts/` (theo `key`, hạn 90 ngày nếu hay đổi, 365 ngày nếu ổn định)
  **chỉ khi cổng 2 đã qua** (`--save-facts`), kèm cảnh báo lúc soát — lưu sớm hơn thì claim người duyệt bỏ vẫn tự qua ở
  bài sau. `--reuse` điền lại cho bài sau; lượt không bao giờ dùng lại dữ kiện của chính nó, và "Research lại" gỡ dữ
  kiện lượt đó đã lưu (`--forget-facts`). Dòng "dùng lại dữ kiện…" là `notes`, không phải cảnh báo làm cổng 2 dừng.
- Agent đọc slide và trang web của người khác, nên Claude chỉ được ghi **đúng file của chặng đó** (`WRITABLE` trong
  `runner.ts`: bóc tách → outline/claims.json, research → `claims/<id>/**` của đúng các claim trong lô, viết/sửa → `output/**`, biên tập →
  `checks/edit.json`). `sources/<sid>/page.txt`, `checks/evidence.json` và `state.json` chỉ đọc — agent ghi được vào
  `page.txt` thì nó "chứng minh" trích đoạn bằng chính chữ nó viết. Đo thật: ghi vào `tools/` bị chặn, `node
  tools/page.mjs … > tools/x` cũng bị chặn dù lệnh nằm trong allowlist, và chặng research bị chặn khi ghi vào
  `sources/` — một câu chèn trong trang không thành lệnh chạy
  trên máy. Codex (`workspace-write`) và Antigravity (không allowlist) không giới hạn được theo thư mục; bộ chọn ghi
  Antigravity là "thử nghiệm, không giới hạn quyền".
- Mỗi lượt Claude chạy `--tools` chỉ công cụ của chặng, `--strict-mcp-config` (không MCP), `--no-session-persistence`,
  model `sonnet` trừ chặng viết (model mặc định của người dùng; `STUDIO_RESEARCH_MODELS='{"write":"opus"}'` đổi được).
  Đo thật: ~21k token nạp sẵn mỗi lượt so với ~66k của một lượt mặc định. Dừng agent khi kẹt (không có hoạt động
  vài phút) hoặc vượt trần tính theo số slide/claim/câu — không có thời gian cố định. Cờ Codex (`web_search`,
  `sandbox_workspace_write.network_access`) theo tài liệu, **chưa chạy thử trên máy có Codex**.
- Code: `studio/src/lib/server/research/` (store, runner, agent, prompts), `components/research/`, API
  `/api/research/*`; luồng sự kiện của ba CLI đọc chung ở `lib/server/agent-stream.ts` (pipeline video dùng lại).
- **Giao diện `/research`**: hàng đầu trang 56 px, dải sơ đồ bảy ô bằng HTML (`research-strip.tsx`, không React Flow —
  N điều cần kiểm thành N ô nhỏ trong ô Tra nguồn), vùng làm việc của ô đang chọn (`node-views.tsx`) với **một** thanh
  "Việc của bạn" dính đáy (`decision-bar.tsx`, luôn đúng một nút chính), ngăn **Chi tiết** cho nhật ký, chi phí, file và
  làm lại một bước. Trạng thái và câu chữ là hàm thuần ở `lib/research-ui.ts` (có test); cổng 1/2 đang chờ thì panel
  luôn được dựng để lựa chọn chưa gửi không mất. Soát giao diện: `node studio/scripts/research-ui-check.mjs` (Studio
  đang chạy; chỉ GET, dựng tám trạng thái từ một lượt thật, ba bề ngang, sáng/tối).

## Mẫu kịch bản: một mẫu cơ bản, mỗi năng lực một file
Mọi video viết theo **`templates/kich-ban-co-ban.md`** (clip thường: một người dẫn, không hội thoại, không
quiz). Mỗi năng lực chọn thêm là **một file `templates/modules/<id>.md`**, chỉ ghi phần thêm so với mẫu cơ
bản — hiện có `dialogue.md`, `quiz.md`, `mascot.md` và `images.md`. Frontmatter của file (`name`, `summary`, `icon`, `preview`,
`default`, `order`) chính là card ở bước Kế hoạch: Studio đọc thẳng thư mục qua `studio/src/lib/server/modules.ts`, và
`REQUEST.md` tự dặn agent đọc file của từng năng lực đã bật. **Thêm năng lực = thêm một file**, không sửa
code; chỉ năng lực cần dữ liệu chèn vào REQUEST.md (danh sách nhân vật, mục Quiz) mới cần dev. Tên file là
id lưu trong `state.json` — đừng đổi tên file đã có video dùng. `default: true` = **video mới tick sẵn**
năng lực đó (hiện là `images` và `sfx` — hai năng lực chỉ *đề xuất* rồi chờ người dựng duyệt); bỏ tick vẫn
bỏ được, và video đã tạo không bao giờ bị bật thêm. Xem `templates/modules/README.md`.

Mẫu này là **chỗ bàn giao** giữa hai pipeline (đóng gói kịch bản sinh ra, dựng video nhận vào), nên nó được
soát bằng code, **một lệnh cho cả hai bên**: `node tools/script-check.mjs <kịch bản .md>` (thêm
`--run research/<rid>` thì soát cả phần căn cứ: câu dẫn nguồn nào, con số *nghe thấy* có trong slide hay
finding không). Bảng "mục nào bắt buộc" nằm trong chính `templates/kich-ban-co-ban.md`. Hai dòng chỉ pipeline
đóng gói mới sinh ra — `- **Nguồn:** slide:4, c3` ở mỗi câu và `- **Nguồn kịch bản:**` ở phần đầu — là mục
hợp lệ của mẫu: bên dựng video **giữ nguyên, không đọc thành tiếng, không đưa vào `text` của cue**. Kịch bản
đời trước (khối `**Lời đọc nguyên văn:**` kèm mốc giờ, như bộ Day 2) bị báo bằng **đúng một** dòng "không
theo mẫu hiện tại" — chuyển cả file, đừng vá từng câu.

## Khổ hình: ngang cho máy tính, dọc cho điện thoại
Khổ là **cấu hình của video, chọn ở bước Kế hoạch**, không phải một cờ lúc render — vì nó đổi *cách bày
cảnh*, không chỉ đổi cỡ khung. `vinuni-lesson-video-ds/lib/tokens.js` → `FORMATS` giữ hai khổ: `16x9`
(1920×1080, mặc định) và `9x16` (1080×1920), mỗi khổ một bộ toạ độ đầy đủ trong `layout`. Cảnh đọc bằng
`useLayout()` / `useFormat()`; hằng số `LAYOUT` **chính là** layout của khổ ngang nên mọi video cũ chạy y
nguyên (đã kiểm: render trước/sau cho MP4 giống hệt từng pixel).
- Video khai khổ ở `meta.format` trong `video.jsx`. Player phát ra `window.vkFormat`, `render.mjs` và
  `shoot.mjs` tự mở cửa sổ đúng cỡ — **không có cờ `--format` nào**, và đó là chủ ý.
- Khổ dọc **bày theo cột**: mũi tên đi xuống, so sánh A/B là hai thẻ chồng nhau, mỗi màn ít khối hơn vì bề
  ngang chỉ còn 56 %. Phụ đề 46 ký tự một dòng thay vì 78. Vùng nội dung x 48–1032, y 360–1740. Chrome tự
  xếp lại (watermark lên trên, eyebrow xuống dưới nó). Mẫu: `ui_kits/lesson-video/scenes/11-doc-cot-9x16.jsx`.
- **Đừng cắt cảnh ngang vào khung dọc.** #62 đã đo: khung dọc chỉ lấy góc trái 1080×1080, mất một nhân vật,
  nửa tiêu đề, 44 % khung trống. Đó là lý do khổ phải chọn trước khi dựng.
- Thêm một khổ nữa = thêm một mục vào `FORMATS` (test `tools/lib/formats.test.mjs` bắt khổ nào khai thiếu
  token — thiếu một cái thì SVG nhận `y="NaN"` mà build vẫn xanh, đã vấp thật).

## Nhịp hình: 60 fps mặc định, chọn ở bước Render
Khác khổ hình: nhịp **không** đổi cách bày cảnh nên không phải chọn trước. Cảnh vẫn viết bằng frame nguyên ở
30 fps — đơn vị của `cues.js`, `voice.js`, `timeline.js`, `spokenAt()` — còn `render.mjs --fps 60` chỉ lấy mẫu
cùng cái đồng hồ đó dày gấp đôi: hỏi player frame 40, 40,5, 41 và nhận đúng hình ở giữa, vì `clampFrame`
(`lib/player.jsx`) không làm tròn và mọi hàm motion đều liên tục theo frame. Nên đổi nhịp **không** phải viết
lại cảnh, không chạy lại TTS, không tốn thêm credit; chỉ lượt render dài thêm (+82 % thời gian, +23 % cỡ file).
Đã soát: không chỗ nào trong design system dùng frame làm chỉ số mảng hay `frame % n`, nên cảnh không quan
tâm render ở nhịp nào.
- Danh mục lựa chọn và mặc định ở `studio/src/lib/render-spec.ts`; `RenderFps` khai cạnh `VideoFormat` trong
  `lib/types.ts`. Studio luôn truyền `--fps` tường minh và ghi nhịp vào dòng đầu nhật ký render.
- **Video mới 60 fps; video đã có giữ 30.** Video tạo trước lựa chọn này (`state.json` không có `fps`) và
  video làm **ngoài** Studio đều về `LEGACY_RENDER_FPS` — chúng đã QA xong ở 30, một lượt render lại không
  được âm thầm đổi nhịp của bản người ta đã duyệt. Cùng luật với năng lực chọn thêm: `default: true` chỉ
  tick sẵn cho video mới.
- **`manifest.json` khai đúng nhịp của MP4.** Trước đây nó luôn ghi 30 vì lấy số đó từ `voice.cues.json`.
  Hai file QA giờ có **một chỗ sửa tại chỗ** (`meta.render_fps` trong lib, `--fps` ở CLI) — đánh dấu bằng
  khối `── SỬA TẠI CHỖ ──` ở đầu cả hai file, **đội QA ra bản mới thì áp lại chỗ này**. `fps` của bản thu và
  nhịp lúc render là hai số khác nhau: mọi mốc thời gian vẫn tính theo đồng hồ bản thu (frame trong
  `voice.cues.json` là frame 30 fps, `endFrame / fps` phải giữ hệ ấy), chỉ trường `fps` khai nhịp của chính
  file. Có ffprobe thì số khai được đối chiếu với MP4 và **lệch là dừng**, cùng cách file này đang đối chiếu
  thời lượng — manifest không nói khác được với file nó đi kèm. Đã đo: cùng `test-harness`, manifest của bản
  30 và bản 60 giống nhau từng trường trừ `fps`.
- Vẫn **chưa hỏi đội QA** xem platform xử lý `fps: 60` thế nào. Manifest giờ nói đúng sự thật, nhưng nếu
  platform chỉ nhận 30 thì hạ nhịp ở ô chọn bước Render rồi render lại.

## Video có hội thoại
Nhiều người nói trong một video là **năng lực chọn thêm**, không phải style mới — vẫn Lesson hay Lesson Lab.
Mỗi cue khai `speaker` (tên/id một **nhân vật** — hoặc một giọng, cho video một người dẫn) và `delivery` (kiểu đọc trong
`voices.json → deliveries`, đổi tốc độ). `speaker` phải có sẵn trong danh mục, tên lạ thì `--dry-run` dừng
ngay trước khi tốn credit; thêm nhân vật mới là việc của dev. Đừng nhầm với `cue.voice` — trường đó đã có
từ trước và là audio tag của eleven_v3 (`[curious]`). `tts.mjs` gọi mỗi câu bằng giọng của người nói, và chỉ
nối `previous_text`/`next_text` trong một chuỗi câu cùng người. Một câu có thể khai `model` riêng (`model: 'eleven_v3'`) khi model mặc định đọc sai đúng câu đó — ba câu
còn lại vẫn trúng cache, chỉ câu ấy bị tính phí. Mẫu viết kịch bản:
`templates/modules/dialogue.md` (thêm vào mẫu cơ bản); `npm run voices` in danh sách giọng và kiểu đọc.
Nhân vật là lớp riêng trong `voices.json → characters`: tên, avatar (key trên kho media), phía, màu, và
giọng nó mượn — vì avatar đặt theo nhân vật (Tới, Tú) còn giọng đặt theo người thu (Nhật Phong,
Đô Trịnh, Viên, Cẩm Hồng). `voice.cues.json` ghi sẵn URL avatar cho từng câu để `DialogueCard` dùng thẳng — cả ba nguồn giọng đều ghi,
kể cả giọng nhập từ thư mục audio.
Model local đọc hội thoại được: `omnivoice-generate.mjs` đặt `ref_audio` riêng cho từng dòng JSONL nên các
nhân vật ra hai giọng trong cùng một lượt; mặc định mỗi nhân vật mượn đúng giọng `voices.json` đã gán.
`--cast` in trước dàn vai (miễn phí), `--speaker "Tú=<giọng|đường dẫn file>"` đổi giọng một vai — nhận cả
một file mẫu nằm trên máy, file ở nguyên chỗ đó chứ không đẩy lên R2, lời của mẫu lấy từ `.txt` cùng tên
hoặc do Whisper nghe.
OmniVoice trên Kaggle (tab **Kaggle** của bước Giọng đọc) dùng đúng dàn vai đó: `tools/voice-kaggle.mjs` dựng
một kernel private `vs-<id>-voice` (giọng danh mục tải từ R2, file mẫu nhúng FLAC), Studio đẩy/theo dõi/tải về
`projects/<id>/voice-script/kaggle/out` rồi nhập như audio tự thu. Kaggle CLI là một venv dùng chung cho cả máy (như Whisper/OmniVoice)
(`npm run setup:kaggle`); username/key chỉ ở RAM, CLI chạy với `KAGGLE_CONFIG_DIR` riêng để không lẫn tài
khoản đã đăng nhập sẵn trên máy.
Xem danh sách nhân vật tại Studio → **Thư viện · Nhân vật** (`/library/characters`): thẻ thoại do design system vẽ
(`ui_kits/lesson-video/demos/character.html?name=&tone=&side=&avatar=`), tên dùng được trong `speaker`, giọng mượn.

## Linh vật Griffin (Thư viện · Mascot)
Component `Griffin` / `GriffinBadge` (`components/mascot/`) vẽ linh vật từ ảnh trên **kho media R2**
(`mascot/griffin/<tên>.<vân tay>.png`). Ảnh và hai bảng tư thế (`griffinPoses.js`, `assets/mascot/griffin/poses.json`
— giữ base URL và tên file) đều **sinh** bởi `tools/griffin-assets.py` từ bộ ảnh gốc của nhóm thiết kế theo
`tools/griffin-assets.json`; đừng sửa tay. Bổ sung biểu cảm = thêm một dòng vào json, chạy lại script, `npm run
media`, commit hai bảng + `media/manifest.json` (xem `assets/mascot/griffin/README.md`). Studio →
**Thư viện · Mascot** (`/library/mascot`) xem thử bằng trang `demos/mascot.html` của design system.
Griffin trong video là **năng lực chọn thêm** (`templates/modules/mascot.md`, card "Video có linh vật Griffin" ở
bước Kế hoạch): bật thì kịch bản chọn vai *Đi cùng* hoặc *Dẫn* và đánh dấu câu nào có Griffin; tắt thì REQUEST.md
ghi rõ không dùng `Griffin` / `GriffinBadge` — agent không tự thêm linh vật.

## Ảnh tư liệu (đề xuất ảnh)
Năng lực `images` (`templates/modules/images.md`, card "Video có ảnh tư liệu") — **bật sẵn cho video mới**: animation vẫn là mặc
định, Studio chỉ **đề xuất** vài ảnh thật (người/sự kiện lịch sử, hiện vật, hình kinh điển) cho đúng những câu cần,
**người dựng video duyệt**. Duyệt Lời & cue là tự chạy, song song với Giọng đọc, dưới job riêng `images:<id>`
(`studio/src/lib/server/images.ts`) — không chặn bước nào; chỗ chưa quyết = animation. Luồng và định dạng file là
của skill `.claude/skills/image-suggest/` và `tools/image-{search,check,apply}.mjs`: agent chọn chỗ (`triage.json`) →
code tìm trên Wikimedia Commons + Openverse, lọc giấy phép theo `images.policy.json` (thương mại: **không NC/ND**, không
ảnh không rõ giấy phép) → agent nhìn thumbnail xếp hạng (`suggest.json`) → panel "Ảnh đề xuất" ghi `decisions.json` →
`image-apply` tải ảnh vào `<video>/img/` và sinh `<video>/images.js` (`src` tính từ gốc design system). Cảnh dùng
`PhotoCard` (`components/media/`) cho kind `use`, vẽ lại cho kind `reference`. Agent chỉ được ghi đúng một file mỗi
chặng (luật `Write`+`Edit` — Claude Code xét quyền ghi theo luật Edit). Openverse ẩn danh ~200 lượt/ngày
(`OPENVERSE_TOKEN` nếu cần hơn). Video đóng gói từ "Đóng gói kịch bản" (dòng `**Nguồn kịch bản:** … research/<rid>`)
có thêm nguồn `research` (`tools/lib/image-research.mjs`): og:image của đúng những trang research đã dẫn cho câu đó.
Giấy phép không rõ → `referenceOnly`: mặc định chỉ tham khảo; dùng trong video thì người dựng tự kiểm trang nguồn
và chọn giấy phép (`decision.license`, images.js ghi `licenseConfirmedBy`).

## Bàn giao cho platform QA của trường (`manifest.json`)
Mỗi MP4 gửi đi soát phải có **một `manifest.json` nằm cạnh nó**, nếu không platform từ chối upload. File
này gắn mỗi lỗi người soát ghi vào đúng câu thoại, tìm ba bộ câu hỏi hiểu bài, và so bản dựng mới với bản
cũ. `tools/qa-manifest.mjs` + `tools/lib/qa-manifest.mjs` là **bản do đội QA giao, chép vào nguyên văn** —
luật trong lib là hợp đồng với platform, hỏng thì sửa video chứ đừng sửa luật; đội QA ra bản mới thì chép
lại cả hai file. Studio chạy nó ngay sau transcript ở bước Render; CLI gọi ở Stage 4.
- Hai thứ repo không tự biết, nên phải hỏi người dùng: **`item_id`** (ô "Mã item gửi QA" ở bước Kế hoạch,
  để trống thì dùng id video) và **`build_no`** (ô chọn ở bước Render: gửi soát lần đầu / sau sửa / phát
  hành). Lưu ý tài liệu của đội QA nói `item_id` **không** phải id thư mục và schema chặn ở 32 ký tự —
  repo này dùng id video theo yêu cầu, ô nhập cảnh báo khi quá dài.
- **Bộ quiz** là ba cue liền nhau platform đọc được: câu hỏi có lời mang `tag: 'CÂU HỎI'` → cue `silent`
  (khoảng chờ) → câu chữa bài. Nó lấy **đúng câu ngay sau khoảng chờ** làm đáp án mẫu, nên một câu đệm
  ("Hết giờ.") chen vào đó thành đáp án hiện cho người học — đã ăn thật ở `d2-v2-mr-toi`. Đừng lẫn với
  `quiz: true`: trường đó chỉ là cờ nhạc, đặt ở cue im lặng.
- Soát **sớm, không đợi tới render**: `tools/script-check.mjs` chặn cứng trên chính kịch bản (chỗ dừng
  thiếu số giây, không có câu hỏi trước hoặc câu chữa bài sau, câu đệm thành đáp án; dưới ba chỗ dừng là
  cảnh báo) — lúc đó chưa tốn một ký tự credit. `npm run verify` chỉ **cảnh báo** cho cả repo, vì video
  làm xong trước khi có platform sẽ không thu lại.

## Nhạc nền và nhạc quiz
`music.json` ở gốc repo là danh mục nhạc (giống `voices.json`): mỗi bản có `id`, `media` (key trên R2),
`seconds` và `lufs` — độ to đo được. Các bản master chênh nhau tới 15 dB nên **không** dùng gain cố định:
`tools/lib/music.mjs` suy gain từ `lufs` về mức −32 LUFS (nhạc nền) / −28 LUFS (nhạc quiz), và tải file về
`assets/music/` lần đầu dùng. Thêm bản mới = đẩy file lên R2, thêm key vào `media/manifest.json`, thêm mục
vào `music.json` kèm `lufs` đo bằng `ffmpeg -af ebur128`.
- **Nhạc nền** chọn ở bước Render (quyết định lúc hoàn thiện) → `render.mjs --music-track <id>`. Bản đánh dấu
  `"default": true` trong `music.json` (hiện là `bg-goc`, "bg (bản gốc)") là mặc định: video mới trong Studio
  chọn sẵn nó, và `render.mjs` không có `--music-track` cũng dùng nó; muốn im thì `--music-track none` (Studio luôn
  gửi rõ lựa chọn).
- **Nhạc quiz** cũng chỉ chọn ở bước Render (ô chọn hiện khi `cues.js` có câu `quiz: true`). Bước Kế hoạch
  chỉ có ô tick **"Video có quiz"** — đủ để REQUEST.md dặn agent đánh dấu `quiz: true` lúc viết `cues.js`,
  dù chưa biết dùng bài nhạc nào. Cờ này chỉ đặt ở **khoảng chờ người xem suy nghĩ** (cue `silent`, lúc
  đồng hồ chạy) — **không** đặt ở câu đọc câu hỏi và **không** ở phần chữa bài. Người hỏi đang nói thì vẫn là nhạc nền; nhạc quiz chỉ vào khi
  câu hỏi đã dứt. Các câu liền nhau gom thành một đoạn; `render.mjs --quiz-track <id>` tự đọc `cues.js` để
  lấy mốc thời gian. Trong đoạn quiz nhạc nền **tắt hẳn**, nhạc quiz vào, fade 0,5 giây hai đầu. Câu có lời
  mà mang cờ thì `npm run verify` báo problem, còn `render.mjs` bỏ câu đó khỏi đoạn nhạc quiz.
- `quiz: true` phải đặt ở cuối phần khai của câu — `voice-timing.mjs --write-cues` ghi đè vùng ngay sau `n:`.

## Tiếng động (SFX)
Năng lực `sfx` (`templates/modules/sfx.md`, card "Video có tiếng động") — **bật sẵn cho video mới**.
Bật năng lực không có nghĩa là có tiếng: chưa duyệt chỗ nào thì video vẫn **không có tiếng động nào**. Bật thì Studio **đề xuất** chỗ, người dựng nghe thử rồi mới duyệt — cùng nguyên tắc
với ảnh tư liệu. Danh mục là `sfx.json` ở gốc repo, xem và nghe thử ở Studio → **Thư viện · Tiếng động**
(`/library/sfx`); file nằm trên R2 (`sfx/<id>.wav`), tải về `assets/sfx/` bằng `tools/sfx-fetch.mjs`.
- **Bốn lớp** (`sfx.json._layers`): `accent` kéo sự chú ý — **trần cứng 4 lần mỗi video**; `transition`
  ranh giới phần; `foley` tiếng của chính chuyển động trên hình, ngân sách 12 sự kiện/phút (một chuỗi
  `burst` là MỘT sự kiện); `ambience` bed theo cảnh. Mức khai bằng **đích** (`peakTargetDb`), không bằng
  độ lợi, nên một master to hơn chỉ cần đo lại là xong — chuẩn theo ĐỈNH chứ không theo RMS.
- **Chủ bucket** dựng file một lần: `node tools/sfx-fetch.mjs --prepare [thư mục bản thô]` chuẩn hoá từ
  nguồn gốc vào `media/files/sfx/`, rồi `npm run media`, rồi `sfx-fetch --write` ghi số đo. Mọi máy khác
  chỉ tải bản đã chuẩn hoá về, **không xử lý lại** — chạy lại chuỗi cắt trên file đã cắt là cắt phá
  (`chisel` khai `startSec: 0.42` mà clip chỉ còn 0,5 giây). `startSec` cắt TỪ đâu, `trimSec` cắt dài bao
  nhiêu kể từ đó; `silenceremove` không cứu được bản thu có tiếng phòng ở đầu.
- **Luồng trong Studio**: chỗ đề xuất đến từ ba nguồn — Studio (mở màn, ranh giới mỗi phần), kịch bản
  (dòng `- **Tiếng:** <id> @ "<cụm từ>"` của một câu → `sfx:` trong `cues.js`), và agent (nút "Đề xuất
  bằng agent", skill `.claude/skills/sfx-suggest/`, job riêng `sfx:<id>`). Chỗ của agent được **code**
  soát trước khi hiện ra (`agentSpots()` trong `studio/src/lib/sfx-plan.ts`): cụm từ phải có nguyên văn
  trong lời đúng câu đó, tiếng phải có trong danh mục, câu lặng bị bỏ, trần 4 accent áp ngay ở đây.
- **Duyệt ở bước Render**, cạnh nhạc nền — tiếng động cũng là quyết định lúc hoàn thiện, và chỉ đề xuất
  được sau khi có giọng (tiếng căn theo mốc lời thật). Panel nghe thử **đúng đoạn đó của video**, có
  tiếng và không tiếng, bằng chính `sfx-mix --window` nên mức/duck/limiter y hệt bản trộn thật.
- **Trộn**: `tools/sfx-mix.mjs --plan <file>` nhận danh sách đã duyệt và **thay cho** cả ba nguồn tự động
  của chính nó — cộng thêm thì tiếng người dùng vừa bỏ sẽ quay lại. Studio tự trộn ngay trước khi render
  ra `projects/<id>/voice-sfx.wav`, và `tools/lib/render-audio.mjs` chọn file đó thay cho `voice.wav`.
  Chưa duyệt chỗ nào thì bản trộn cũ bị xoá và render dùng lại giọng gốc.
- Không đặt tiếng vào **khoảng chờ quiz** (cue `silent`): luật này cài trong code, không phải nhắc nhở.

## Media nặng (`media/`, Cloudflare R2)
Video/audio minh hoạ không nằm trong git. Chúng ở một bucket R2 **đọc công khai**; `media/manifest.json`
(được commit) giữ base URL + danh sách asset, nên ai clone repo về cũng xem được mà không cần cấu hình gì.
Chủ bucket bỏ file vào `media/files/<key>` (quy ước `styles/<mã style>/sample.mp4` = video mẫu của style,
`sfx/<id>.wav` = một tiếng động đã chuẩn hoá),
`npm run media -- --dry-run` rồi `npm run media`, và commit manifest. Khoá nằm ở `media/.env` (không bao giờ
commit/in ra) — xem `media/README.md`. Mất mạng thì studio hiện card "không khả dụng", không vỡ giao diện.

## Notes
- Imported voice: `docs/decisions/voice-align.md` records why word timestamps come from Whisper alone and
  what would justify moving to forced alignment; `/voice-align-check` measures whether that day has come.
- `studio/AGENTS.md` / `studio/CLAUDE.md` are written by `next dev`; read the Next.js docs in
  `studio/node_modules/next/dist/docs/` before changing studio code.
- ElevenLabs is used only here; the Video-studio Remotion repo (the original style source) mandates Google
  Cloud TTS. This repo no longer depends on Video-studio.
- `node tools/voice-sample.mjs --text "…" "Tên=<voice id>" …` đọc thử một đoạn bằng nhiều giọng ElevenLabs,
  mỗi giọng một WAV trong `voice/samples/` — để chọn người dẫn hoặc lấy mẫu ~10 giây cho model local.
  Luôn `--dry-run` trước vì mỗi yêu cầu đều bị tính ký tự.
- **Sinh ảnh preview cho một component** (`styles/previews/<nhóm>__<Component>.png`, thứ Thư viện của Studio
  hiển thị): repo không có công cụ riêng, làm thủ công bằng `tools/shoot.mjs`. Viết một file HTML tạm **bên
  trong** `vinuni-lesson-video-ds/` (để nạp được `dist/vk.js` và `styles.css`) — đặt ở `ui_kits/lesson-video/demos/`,
  **đừng** đặt trong `components/<nhóm>/` vì verify chỉ cho đúng một file .html mỗi thư mục component.
  Dựng component bằng `VK.mountCard`, chạy `npm run build` trước nếu component vừa thêm, phục vụ thư mục DS
  (`npm run serve`, cổng 8765) rồi:
  `node tools/shoot.mjs "http://127.0.0.1:8765/ui_kits/lesson-video/demos/<file>.html" styles/previews/<nhóm>__<Component>.png 367 210`
  Cỡ chuẩn là rộng **367 px** (cao tuỳ component, 210–250). Hai cái bẫy đã vấp:
  shoot.mjs **cắt** trang theo viewport chứ không thu nhỏ, nên phải tự thu bằng
  `transform: scale(...)` với `transform-origin: top left` trên một div bọc có kích thước thật;
  và component tràn mép thì bị xén âm thầm — chụp xong **phải mở ảnh ra nhìn**, đừng tin exit code.
  Xoá file HTML tạm sau khi chụp.
- Reply to the user in Vietnamese.
