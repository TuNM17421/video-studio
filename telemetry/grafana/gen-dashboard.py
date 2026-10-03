import json, sys

DS = "Video Telemetry Postgres"
SCOPE = "video_ref IN ($video) AND ('${scope}' = 'all' OR completed) AND $__timeFilter(last_run_at)"
W = "WITH v AS (SELECT * FROM telemetry_video_metrics WHERE " + SCOPE + ") "
PHASES = [("script", "#3987e5"), ("cues", "#d95926"), ("voice", "#199e70"), ("scenes", "#c98500"),
          ("render", "#d55181"), ("deliver", "#008300"), ("other", "#8e8e8e")]
PHASE_COLORS = [{"matcher": {"id": "byName", "options": n}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": c}}]} for n, c in PHASES]
NULL_TEXT = [{"type": "special", "options": {"match": "null", "result": {"text": "không đo"}}}]
BLUE = {"mode": "fixed", "fixedColor": "#3987e5"}
BAR = [{"id": "custom.cellOptions", "value": {"type": "gauge", "mode": "basic", "valueDisplayMode": "text"}},
       {"id": "color", "value": BLUE}, {"id": "min", "value": 0}]
CHECK = [{"id": "mappings", "value": [{"type": "value", "options": {"true": {"text": "✓"}, "false": {"text": "—"}}}]}]
panels = []


def target(sql):
    return [{"datasource": DS, "format": "table", "rawQuery": True, "editorMode": "code", "rawSql": sql, "refId": "A"}]


def unit(name, u, *extra):
    return {"matcher": {"id": "byName", "options": name}, "properties": [{"id": "unit", "value": u}, *extra]}


def stat(title, sql, u, x, desc, decimals=None, w=4, y=0, h=4):
    d = {"type": "stat", "title": title, "description": desc, "datasource": DS, "targets": target(sql),
         "gridPos": {"h": h, "w": w, "x": x, "y": y},
         "options": {"reduceOptions": {"calcs": ["lastNotNull"], "fields": "/.*/", "values": False}, "colorMode": "none",
                     "graphMode": "none", "textMode": "value", "justifyMode": "center"},
         "fieldConfig": {"defaults": {"unit": u, "noValue": "không đo", "color": {"mode": "fixed", "fixedColor": "text"}}, "overrides": []}}
    if decimals is not None:
        d["fieldConfig"]["defaults"]["decimals"] = decimals
    panels.append(d)


def table(title, sql, grid, desc, overrides, mappings=True):
    panels.append({"type": "table", "title": title, "description": desc, "datasource": DS, "targets": target(sql), "gridPos": grid,
                   "options": {"showHeader": True, "cellHeight": "sm"},
                   "fieldConfig": {"defaults": {"mappings": NULL_TEXT if mappings else []}, "overrides": overrides}})


def bar(title, sql, xfield, u, grid, desc, stacked=False, overrides=None, horizontal=True, decimals=None, legend=None):
    d = {"type": "barchart", "title": title, "description": desc, "datasource": DS, "targets": target(sql), "gridPos": grid,
         "transformations": [{"id": "organize", "options": {"excludeByName": {"ord": True, "last": True}}}],
         "options": {"xField": xfield, "orientation": "horizontal" if horizontal else "auto", "stacking": "normal" if stacked else "none",
                     "showValue": "never" if stacked else "auto", "barWidth": 0.65, "barRadius": 0.1, "xTickLabelMaxLength": 28,
                     "legend": {"showLegend": stacked if legend is None else legend, "displayMode": "list", "placement": "bottom"},
                     "tooltip": {"mode": "multi" if stacked else "single", "sort": "desc"}},
         "fieldConfig": {"defaults": {"unit": u, "color": BLUE, "custom": {"lineWidth": 0, "fillOpacity": 90}}, "overrides": overrides or []}}
    if decimals is not None:
        d["fieldConfig"]["defaults"]["decimals"] = decimals
    panels.append(d)


# ── KPI: trung bình chỉ trên giá trị đo được ─────────────────────────────────────────────
stat("Video đo đủ chi phí", W + "SELECT count(*) FILTER (WHERE cost_complete) || ' / ' || count(*) AS v FROM v", "string", 0,
     "Video có mọi run tính phí được đều có chi phí (không run nào 'không đo'). Chi phí TB chỉ tính các video này.", None, 4)
stat("Chi phí / phút TB", W + "SELECT avg(usd_per_minute) AS v FROM v", "currencyUSD", 4,
     "Chi phí chia độ dài MP4 thật (ffprobe) — so được video dài ngắn khác nhau công bằng hơn 'chi phí / video'. Cần cả chi phí đo đủ lẫn đã render xong.", 3, 4)
stat("Chi phí TB / video", W + "SELECT avg(cost_usd) FILTER (WHERE cost_complete) AS v FROM v", "currencyUSD", 8,
     "Trung bình trên các video đo đủ. Video còn run không đo bị loại khỏi trung bình, không tính thành 0.", 3, 4)
stat("Thời gian máy TB / video", W + "SELECT avg(active_s) AS v FROM v", "s", 12,
     "Hợp khoảng thời gian các run đang chạy (không cộng lồng nhau — scenes bọc scenes.gate/scenes.qa).", None, 4)
stat("Lead time TB / video", W + "SELECT avg(lead_time_s) AS v FROM v", "s", 16,
     "Run đầu tiên → run cuối cùng đã kết thúc, gồm cả thời gian chờ duyệt.", None, 4)
stat("Token TB / video", W + "SELECT avg(total_tokens) AS v FROM v", "short", 20,
     "Input mới + cached + output (Codex/Claude đã quy đổi). Video không dùng LLM không tính.", None, 4)

stat("Chi phí do làm lại", W + "SELECT sum(rework_cost_usd) FILTER (WHERE cost_complete) / nullif(sum(cost_usd) FILTER (WHERE cost_complete), 0) AS v FROM v",
     "percentunit", 0, "Phần chi phí của các lượt chạy lại sau feedback/QA/retry, trên các video đo đủ.", 0, 6)
for p in panels:
    if p["gridPos"]["x"] == 0 and p["gridPos"]["y"] == 0 and p["title"] == "Chi phí do làm lại":
        p["gridPos"]["y"] = 4

# ── Theo phase: trung bình trên các video đo được phase đó ─────────────────────────────────
PH = W + "SELECT p.phase, min(p.phase_order) AS ord, __COLS__ FROM telemetry_video_phase_metrics p JOIN v USING (video_ref) WHERE p.phase <> 'setup' GROUP BY p.phase ORDER BY ord"
tok = [("Input mới", "#9085e9"), ("Cached input", "#9a9a9a"), ("Output", "#e66767")]
bar("Token TB / video theo phase", PH.replace("__COLS__", 'avg(p.fresh_input_tokens) AS "Input mới", avg(p.cached_input_tokens) AS "Cached input", avg(p.output_tokens) AS "Output"'),
    "phase", "short", {"h": 9, "w": 10, "x": 0, "y": 8}, "Trung bình trên các video có đo token ở phase đó; phase không dùng LLM để trống.", True,
    [{"matcher": {"id": "byName", "options": n}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": c}}]} for n, c in tok])
bar("Thời gian máy TB / video theo phase", PH.replace("__COLS__", 'avg(p.active_s) AS "Thời gian máy"'), "phase", "s",
    {"h": 9, "w": 7, "x": 10, "y": 8}, "Trung bình trên các video có run đã kết thúc ở phase đó.")
bar("Chi phí TB / video theo phase", PH.replace("__COLS__", 'avg(p.cost_usd) AS "Chi phí"'), "phase", "currencyUSD",
    {"h": 9, "w": 7, "x": 17, "y": 8}, "Trung bình trên các video đo đủ chi phí phase đó. Phase miễn phí hoặc không đo để trống.", decimals=3)

# ── Nhà cung cấp + giọng nói ──────────────────────────────────────────────────────────────
bar("Chi phí TB / video theo nhà cung cấp",
    W + 'SELECT provider AS "Nhà cung cấp", avg(cost) AS "Chi phí" FROM (SELECT r.video_ref, r.provider, sum(r.cost_usd) AS cost FROM telemetry_runs r JOIN v USING (video_ref) WHERE r.has_billable GROUP BY 1, 2) t GROUP BY 1 ORDER BY 2 DESC NULLS LAST',
    "Nhà cung cấp", "currencyUSD", {"h": 8, "w": 12, "x": 0, "y": 17},
    "LLM (codex, claude…) và giọng nói (elevenlabs…) trên cùng thước đo; trung bình trên các video có chi phí từ nhà cung cấp đó. Kaggle/local miễn phí nên trống.", decimals=3)

table("Model theo nhà cung cấp", W + """SELECT r.provider AS "Nhà cung cấp", coalesce(r.model, '(chưa rõ)') AS "Model",
  count(DISTINCT r.video_ref) AS "Số video", count(*) AS "Run",
  sum(r.cost_usd) AS "Tổng chi phí", count(*) FILTER (WHERE r.cost_state = 'unmeasured') AS "Run chưa đo giá"
FROM telemetry_runs r JOIN v USING (video_ref) WHERE r.has_billable GROUP BY 1, 2 ORDER BY 1, sum(r.cost_usd) DESC NULLS LAST""",
      {"h": 8, "w": 24, "x": 0, "y": 25},
      "Mỗi model một dòng, kể cả khi cùng nhà cung cấp — model khác giá khác (ví dụ eleven_v3 đắt gấp đôi eleven_turbo_v2_5). "
      "'Run chưa đo giá' > 0 nghĩa là model đó chưa có trong bảng giá (pricing-catalog.ts với ElevenLabs) hoặc CLI chưa tự báo chi phí.",
      [unit("Tổng chi phí", "currencyUSD", {"id": "decimals", "value": 3})])


def vstat(title, sql, u, x, desc):
    panels.append({"type": "stat", "title": title, "description": desc, "datasource": DS, "targets": target(sql),
                   "gridPos": {"h": 8, "w": 4, "x": x, "y": 17},
                   "options": {"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False}, "colorMode": "none",
                               "graphMode": "none", "textMode": "value", "justifyMode": "center"},
                   "fieldConfig": {"defaults": {"unit": u, "noValue": "không đo", "color": {"mode": "fixed", "fixedColor": "text"}}, "overrides": []}})


vstat("Chi phí giọng nói TB / video", W + "SELECT avg(voice_cost_usd) AS v FROM v", "currencyUSD", 12,
      "ElevenLabs theo giá gói (STUDIO_ELEVENLABS_USD_PER_1K_CREDITS). Kaggle/local miễn phí: không tính vào trung bình.")
vstat("Credit ElevenLabs TB / video", W + "SELECT avg(credits) AS v FROM v", "short", 16,
      "Credit tài khoản ElevenLabs bị trừ thật (bộ đếm trước/sau lượt tạo giọng).")
vstat("GPU Kaggle TB / video", W + "SELECT avg(gpu_seconds) AS v FROM v", "s", 20,
      "Thời gian kernel T4 trên Kaggle (quota miễn phí theo tuần).")

# ── Chi tiết phase ────────────────────────────────────────────────────────────────────────
table("Chi tiết theo phase", W + """SELECT p.phase AS "Phase",
  count(p.cost_usd) || ' / ' || count(*) AS "Video đo được chi phí",
  round(avg(p.runs), 2) AS "Run / video",
  round(avg(p.rework_runs), 2) AS "Làm lại / video",
  sum(p.failed_runs)::numeric / nullif(sum(p.runs), 0) AS "Tỉ lệ lỗi",
  avg(p.active_s) AS "Thời gian TB",
  avg(p.total_tokens) AS "Token TB",
  avg(p.cost_usd) AS "Chi phí TB"
FROM telemetry_video_phase_metrics p JOIN v USING (video_ref)
WHERE p.phase <> 'setup' GROUP BY p.phase, p.phase_order ORDER BY p.phase_order""",
      {"h": 8, "w": 24, "x": 0, "y": 33}, "Mọi trung bình bỏ qua video không đo phase đó; cột 'Video đo được' cho biết trung bình dựa trên bao nhiêu video.",
      [unit("Tỉ lệ lỗi", "percentunit", {"id": "decimals", "value": 0}), unit("Thời gian TB", "s"), unit("Token TB", "short"),
       unit("Chi phí TB", "currencyUSD", {"id": "decimals", "value": 3})])

# ── Từng mã video, chia phase ─────────────────────────────────────────────────────────────
def pivot(expr):
    return ", ".join(f"sum({expr}) FILTER (WHERE p.phase = '{n}') AS \"{n}\"" for n, _ in PHASES)


for i, (title, expr, u, desc) in enumerate([
    ("Chi phí từng video · theo phase", "p.cost_usd", "currencyUSD", "Mỗi thanh một mã video (mới nhất ở trên). Phase không đo để trống, không vẽ 0."),
    ("Token từng video · theo phase", "p.total_tokens", "short", "Tổng token từng mã video, chia theo phase."),
    ("Thời gian máy từng video · theo phase", "p.active_s", "s", "Tổng thời lượng run từng mã video, chia theo phase."),
]):
    bar(title, W + "SELECT v.video_ref AS video, max(v.last_run_at) AS last, " + pivot(expr) +
        " FROM v JOIN telemetry_video_phase_metrics p USING (video_ref) WHERE p.phase <> 'setup' GROUP BY v.video_ref ORDER BY last DESC",
        "video", u, {"h": 9, "w": 8, "x": 8 * i, "y": 41}, desc, True, PHASE_COLORS, decimals=3 if u == "currencyUSD" else None)

panels.append({"type": "timeseries", "title": "Chi phí theo ngày · theo phase", "datasource": DS,
               "description": "Chi phí đo được, gom theo ngày kết thúc run.",
               "targets": target(W + "SELECT date_trunc('day', coalesce(p.finished_at, p.started_at)) AS time, " + pivot("p.cost_usd") +
                                 " FROM telemetry_runs p JOIN v USING (video_ref) WHERE p.phase <> 'setup' GROUP BY 1 ORDER BY 1"),
               "gridPos": {"h": 8, "w": 24, "x": 0, "y": 50},
               "options": {"legend": {"showLegend": True, "displayMode": "list", "placement": "bottom"}, "tooltip": {"mode": "multi", "sort": "desc"}},
               "fieldConfig": {"defaults": {"unit": "currencyUSD", "decimals": 3, "custom": {"drawStyle": "bars", "fillOpacity": 90, "lineWidth": 0,
                                                                                             "stacking": {"mode": "normal", "group": "A"}, "spanNulls": False}},
                               "overrides": PHASE_COLORS}})

# ── Theo mã video ────────────────────────────────────────────────────────────────────────
table("Theo video · mã video", """SELECT video_ref AS "Video", cost_usd AS "Chi phí", usd_per_minute AS "USD/phút", video_duration_s AS "Độ dài (giây)", total_tokens AS "Token", active_s AS "Thời gian máy",
  CASE WHEN cost_complete THEN 'đủ' WHEN billable_runs = 0 THEN 'không có run tính phí' ELSE 'thiếu ' || unmeasured_runs || ' run' END AS "Đo chi phí",
  versions AS "Phiên bản", rework_runs AS "Lượt làm lại", rework_cost_usd AS "Chi phí làm lại",
  characters AS "Ký tự TTS", credits AS "Credit TTS", gpu_seconds AS "GPU Kaggle",
  lead_time_s AS "Lead time", runs AS "Run", failed_runs AS "Lỗi", completed AS "Hoàn tất", last_run_at AS "Chạy cuối"
FROM telemetry_video_metrics WHERE """ + SCOPE + " ORDER BY last_run_at DESC",
      {"h": 10, "w": 24, "x": 0, "y": 58}, "Mỗi dòng một mã video. 'không đo' = không có số liệu, khác với 0. Thanh trong ô so độ lớn giữa các video.",
      [{"matcher": {"id": "byName", "options": "Video"}, "properties": [{"id": "custom.width", "value": 220}]},
       unit("Chi phí", "currencyUSD", {"id": "decimals", "value": 3}, {"id": "custom.width", "value": 170}, *BAR),
       unit("USD/phút", "currencyUSD", {"id": "decimals", "value": 3}, {"id": "custom.width", "value": 130}, *BAR),
       unit("Độ dài (giây)", "s"),
       unit("Token", "short", {"id": "custom.width", "value": 150}, *BAR),
       unit("Thời gian máy", "s", {"id": "custom.width", "value": 150}, *BAR),
       unit("Chi phí làm lại", "currencyUSD", {"id": "decimals", "value": 3}),
       unit("GPU Kaggle", "s"), unit("Lead time", "s"),
       {"matcher": {"id": "byName", "options": "Hoàn tất"}, "properties": CHECK},
       unit("Chạy cuối", "dateTimeAsLocalNoDateIfToday")])

# ── Gen lại nhiều lần: theo phiên bản ────────────────────────────────────────────────────
table("Phiên bản & làm lại", W + """SELECT m.video_ref AS "Video", 'v' || m.version AS "Phiên bản", m.delivered AS "Đã render",
  m.runs AS "Run", m.rework_runs AS "Lượt làm lại", m.feedback_rounds AS "Vòng feedback/QA",
  m.cost_usd AS "Chi phí", m.total_tokens AS "Token", m.active_s AS "Thời gian máy", m.started_at AS "Bắt đầu", m.finished_at AS "Kết thúc"
FROM telemetry_version_metrics m JOIN v USING (video_ref) ORDER BY m.video_ref, m.version DESC""",
      {"h": 9, "w": 24, "x": 0, "y": 68},
      "v1 là mọi thứ tới lần render thành công đầu tiên; mỗi lần render thành công sau đó mở phiên bản mới. Lượt làm lại = chạy lại stage do feedback, QA hoặc retry.",
      [unit("Chi phí", "currencyUSD", {"id": "decimals", "value": 3}, *BAR), unit("Token", "short"), unit("Thời gian máy", "s"),
       {"matcher": {"id": "byName", "options": "Đã render"}, "properties": CHECK},
       unit("Bắt đầu", "dateTimeAsLocalNoDateIfToday"), unit("Kết thúc", "dateTimeAsLocalNoDateIfToday")])

# ── Truy vết feedback QA → lượt AI ───────────────────────────────────────────────────────
table("Truy vết feedback / QA → lượt AI", W + """SELECT t.video_ref AS "Video", t.feedback_id AS "Feedback", t.stage AS "Stage", t.scope AS "Cảnh",
  t.code AS "Mã lỗi", t.severity AS "Mức", t.source || coalesce(' · ' || t.qa_provider, '') AS "Nguồn", t.status AS "Trạng thái",
  t.recurrence AS "Lặp", t.culprit_stage || ' #' || t.culprit_attempt || ' · v' || t.culprit_version AS "Lượt tạo ra",
  t.culprit_provider || coalesce(' · ' || t.culprit_model, '') AS "Agent", t.culprit_session AS "Session", t.culprit_prompt AS "Prompt",
  t.culprit_ai_log AS "Log AI", t.fix_attempts AS "Đã sửa bởi", t.fix_cost_usd AS "Chi phí sửa", t.created_at AS "Ghi nhận"
FROM telemetry_feedback_trace t JOIN v USING (video_ref) ORDER BY t.created_at DESC""",
      {"h": 11, "w": 24, "x": 0, "y": 77},
      "Mỗi feedback (người duyệt hoặc QA) nối về lượt agent cuối cùng của đúng phase trước khi có feedback: agent/model, session để resume, hash prompt, có log AI (opt-in) hay không; và các lượt đã nhận sửa. Nội dung góp ý xem ở Studio theo mã feedback.",
      [unit("Chi phí sửa", "currencyUSD", {"id": "decimals", "value": 3}), unit("Ghi nhận", "dateTimeAsLocalNoDateIfToday"),
       {"matcher": {"id": "byName", "options": "Log AI"}, "properties": CHECK}])

table("Chi phí theo nguồn (provenance)", W + """SELECT r.video_ref AS "Video", r.cost_state AS "Trạng thái", coalesce(r.cost_source, '—') AS "Nguồn",
  count(*) AS "Run", sum(r.cost_usd) AS "Chi phí"
FROM telemetry_runs r JOIN v USING (video_ref) WHERE r.has_billable GROUP BY 1, 2, 3 ORDER BY 1, 2""",
      {"h": 8, "w": 24, "x": 0, "y": 88}, "paid = có số tiền · free = miễn phí (no_charge) · unmeasured = tính phí được nhưng không đo.",
      [unit("Chi phí", "currencyUSD", {"id": "decimals", "value": 3})])

# ── Chi phí viết kịch bản (research) — độc lập với bộ lọc Video/Phạm vi ở trên: một lượt research chưa gắn
# được với video cuối cùng (không có mã video cho tới khi kịch bản được tải lên bước Kế hoạch), và không có
# stage "render" nên luôn nằm ngoài "Video hoàn tất". Nối telemetry từ 26/09/2026 — lượt research trước đó
# không có dữ liệu ở đây (không phải bằng 0: đơn giản là chưa đo).
RESEARCH_NOTE = ("Chi phí viết kịch bản (extract/research/write/fix/edit), TÁCH RIÊNG khỏi bộ lọc Video/Phạm vi vì "
    "kịch bản chưa gắn được với video cuối cùng. Nối telemetry từ 26/09/2026 — lượt research cũ hơn không có ở đây.")
stat("Chi phí viết kịch bản TB / bài", "SELECT avg(cost_usd) FILTER (WHERE cost_complete) AS v FROM telemetry_video_metrics WHERE video_ref LIKE 'research-%'",
     "currencyUSD", 0, RESEARCH_NOTE, 3, w=8, y=96)
stat("Token TB / bài", "SELECT avg(total_tokens) AS v FROM telemetry_video_metrics WHERE video_ref LIKE 'research-%'",
     "short", 8, RESEARCH_NOTE, None, w=8, y=96)
stat("Số bài đã viết", "SELECT count(*) AS v FROM telemetry_video_metrics WHERE video_ref LIKE 'research-%'",
     "short", 16, RESEARCH_NOTE, None, w=8, y=96)
table("Chi phí viết kịch bản · theo bước", """SELECT
  r.video_ref AS "Lượt research", r.stage AS "Bước", min(r.started_at) AS "Bắt đầu",
  count(*) AS "Run", sum(r.total_tokens) AS "Token", sum(r.cost_usd) AS "Chi phí",
  count(*) FILTER (WHERE r.cost_state = 'unmeasured') AS "Chưa đo giá"
FROM telemetry_runs r WHERE r.video_ref LIKE 'research-%' AND r.phase = 'script'
GROUP BY r.video_ref, r.stage ORDER BY r.video_ref, min(r.started_at)""",
      {"h": 10, "w": 24, "x": 0, "y": 100}, RESEARCH_NOTE + " 'Lượt research' là mã research (research-<rid>), không phải mã video.",
      [unit("Chi phí", "currencyUSD", {"id": "decimals", "value": 3}), unit("Bắt đầu", "dateTimeAsLocalNoDateIfToday")])


for i, p in enumerate(panels, 1):
    p["id"] = i

dash = {"title": "Video Telemetry", "timezone": "browser", "schemaVersion": 39, "version": 7, "refresh": "30s",
        "time": {"from": "now-90d", "to": "now"},
        "templating": {"list": [
            {"name": "scope", "label": "Phạm vi", "type": "custom", "query": "Video hoàn tất : completed,Tất cả video : all",
             "current": {"text": "Video hoàn tất", "value": "completed"},
             "options": [{"text": "Video hoàn tất", "value": "completed", "selected": True}, {"text": "Tất cả video", "value": "all", "selected": False}]},
            {"name": "video", "label": "Video", "type": "query", "datasource": DS,
             "query": "SELECT video_ref FROM telemetry_video_metrics ORDER BY last_run_at DESC",
             "definition": "SELECT video_ref FROM telemetry_video_metrics ORDER BY last_run_at DESC",
             "multi": True, "includeAll": True, "current": {"text": "All", "value": "$__all"}, "refresh": 2}]},
        "panels": panels}
json.dump(dash, open(sys.argv[1], "w"), ensure_ascii=False, indent=2)
print(len(panels), "panels")
