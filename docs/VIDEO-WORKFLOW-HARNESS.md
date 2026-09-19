# Video workflow harness

Harness này chia pipeline thành hai loại việc để coding agent chỉ dùng token cho phần cần phán đoán.

## Luồng chuẩn

```text
request
  → script/cues agent
  → TTS dry-run (runner, miễn phí — bắt speaker/delivery sai)
  → người dùng duyệt lời
  → voice + timing (runner)
  → scenes agent
  → build + verify + stills (runner)
  → visual QA (phiên riêng, chỉ đọc)
  → xử lý feedback còn mở
  → người dùng duyệt scenes
  → render + transcript (runner)
  → deliver agent
  → final build + verify (runner)
```

Coding agent chỉ viết hoặc sửa deliverable của stage. Build, verify, screenshot, render, transcript,
đo media và tổng hợp telemetry thuộc runner. Vì vậy một lỗi deterministic không tiêu thêm một lượt
agent chỉ để chạy lại cùng một lệnh.

## Cổng và khả năng resume

- Mỗi job ghi event `started → metrics → finished` vào `projects/<id>/.studio/runs.jsonl`.
- Event append-only giúp giữ được lần chạy lỗi và nhận ra run còn dang dở sau khi process chết.
- Stage chỉ chuyển sang `review` khi agent và deterministic gate đều chạy xong.
- Cues chỉ sang `review` sau `tts.mjs generate --dry-run` (không truyền key, không tốn credit): nó ép
  mọi `speaker` qua danh mục `voices.json`, chặn `delivery` lạ và báo nhân vật thiếu avatar.
- Ảnh QA do gate chụp nằm ở `projects/<id>/qa/auto/`; gate chỉ dọn thư mục đó, ảnh người làm tự chụp
  trong `qa/` không bị đụng.
- Scene QA là một **phiên riêng, context sạch, chỉ đọc** — giá trị nằm ở đó, không ở tên nhà cung cấp.
  Lane chỉ nhận một packet tạm ngoài repo (để CLI không tự nạp `CLAUDE.md`/`AGENTS.md`): request,
  improvement plan, output verify và ảnh still. Provider theo `STUDIO_QA_PROVIDER`
  (`claude | codex | antigravity | auto`, mặc định `auto`): `auto` chọn CLI đã cài **khác** provider
  đang dựng cảnh (thứ tự Antigravity → Codex → Claude); máy chỉ có một CLI thì CLI đó tự QA.

  | Provider | Chỉ đọc bằng | Schema |
  |---|---|---|
  | Claude | `--tools Read Glob Grep`, cấm Write/Edit/Bash | `--json-schema` |
  | Codex | `--sandbox read-only`, ảnh đính kèm bằng `--image` | `--output-schema` |
  | Antigravity | `--mode plan --sandbox` | `--json-schema` |

- Tiêu chí QA = tiêu chí chung + mục `## Tiêu chí QA` của đúng những module đang bật
  (`templates/modules/<id>.md`). Video không bật module nào thì QA không thấy tiêu chí của module đó.
- QA có finding `blocker` hoặc `major` thì API không cho duyệt scene.
- Deliver chỉ `done` sau final build + verify.
- Các command tạo artifact dùng đường dẫn cố định; chạy lại thay artifact của chính stage, không tạo
  bản sao khó truy nguồn.

## Telemetry

Mỗi run có: `runId`, stage, actor, mode (`agent|deterministic`), thời gian, status, checks, artifacts,
tool calls, input/cached/output tokens và cost khi provider có trả usage. Số chưa được provider trả về
được giữ là “chưa đo”, không tự ghi bằng 0.

Xem báo cáo:

```bash
npm run workflow -- report --video <id>
npm run workflow -- report --video <id> --json
```

Báo cáo nêu automation ratio, số lượt agent/deterministic, failure count, token/cost, coverage của
usage và stage tốn token nhất. Dashboard Video Studio hiển thị cùng số liệu.

## Feedback không bị trôi

Feedback là event có `id`, fingerprint, source, stage, severity, owner, acceptance check, recurrence
và status:

```text
open → planned → applied → verified
                         ↘ wontfix
```

Feedback trùng fingerprint được tăng `recurrence` thay vì tạo item mới. Finding QA có `code` cố định
(`text-overflow`, `overlap`, `unreadable`, `low-contrast`, `empty-layout`, `clipped`, `misaligned`,
`repetitive`, `off-script`, `module`, `other`) và fingerprint là `stage + cảnh + code` — câu `message`
do model viết chỉ để người đọc, vì model không bao giờ viết lại y hệt một câu ở hai lượt. Feedback của
người dùng không có code nên vẫn nhận dạng theo câu chữ. Mỗi thay đổi tự viết lại
`projects/<id>/.studio/IMPROVEMENT-PLAN.md`, ưu tiên blocker → major → minor. Agent retry luôn nhận
toàn bộ item còn mở của đúng stage. QA tự xác nhận finding cũ khi lượt sau không còn cùng `cảnh + code`; feedback của người dùng chỉ `verified` khi người dùng duyệt stage.

CLI:

```bash
npm run workflow -- feedback add --video <id> --stage scenes --severity major --message "..."
npm run workflow -- feedback list --video <id>
npm run workflow -- feedback set --video <id> --id <fb-id> --status verified --evidence "..."
npm run workflow -- plan --video <id>
```

## Cách tối ưu dần

Sau mỗi video, đọc report theo thứ tự:

1. Stage có `agentTokens` cao nhất: rút gọn prompt/context hoặc chuyển check lặp lại sang runner.
2. Feedback có `recurrence > 1`: biến acceptance check thành static check hoặc visual rubric.
3. Deterministic run lỗi lặp lại: sửa gate hoặc preflight; không thêm lời nhắc dài cho agent.
4. `measuredRuns < agent runs`: sửa parser usage của provider trước khi so chi phí.
5. Chỉ thêm agent lane khi đầu ra cần phán đoán độc lập. QA thị giác là một phiên riêng chỉ đọc; build,
   verify, capture và media validation vẫn là runner.

Không dùng automation ratio làm mục tiêu tuyệt đối. Một lượt agent có chất lượng tốt hơn nhiều retry
vẫn rẻ hơn pipeline “tự động” nhưng liên tục trả feedback.
