# ArchitectureNode

A typed box for architecture diagrams — MCP host / client / server, app ↔ API, provider zones.

**Use for** "Ứng dụng chủ bao quanh mô hình và thành phần khách", "hai hộp phần mềm nối bằng mũi tên Yêu cầu và
Kết quả", "vùng nhà cung cấp có bánh răng thực thi" — anything where the KIND of system matters.
**Not for** a lesson step or state (→ `Card`), an editorial hero node with a brand logo (→ `GlassNode`), a black
box you open (→ `GlassBox`), who-does-what over time (→ `Swimlane`).

Anatomy: radius-22 bgAlt card, 3 px tone stroke · icon + kind micro-caps (HOST, CLIENT, SERVER, API, DỊCH VỤ,
MÔ HÌNH, DỮ LIỆU, NGƯỜI DÙNG, ỨNG DỤNG) top-left · title 26/700 + subtitle 19/500 muted centered; h < 120 →
compact row. `container`: radius-28 frame, dashed '12 10' by default, faint tint, header row (icon · kind ·
title, subtitle below) in the top-left — draw child nodes after it (keep them ≥ 100 px below its top).

States: `active` 0–1 (red-soft overlay + 5 px red stroke; container → red frame) · `muted` 0–1 (36 %) ·
`opacity` for reveals · `tone` = role color (e.g. `process` for the provider zone).

```jsx
const HOST = { x: 120, y: 300, w: 860, h: 400 }, CLIENT = { x: 600, y: 420, w: 330, h: 190 };
const SERVER = { x: 1320, y: 400, w: 420, h: 230 };
<ArchitectureNode {...HOST} container kind="host" title="ỨNG DỤNG CHỦ" subtitle="trợ lý học tập" />
<ArchitectureNode x={170} y={420} w={320} h={190} kind="model" title="LLM" subtitle="quyết định gọi tool" />
<ArchitectureNode {...CLIENT} kind="client" title="MCP CLIENT" />
<ArchitectureNode {...SERVER} kind="server" title="MCP SERVER" subtitle="tools · resources" active={pulse(frame, 90)} />
<Flow points={[nodePort(CLIENT, 'right', 0.3), nodePort(SERVER, 'left', 0.3)]} frame={frame} start={60} end={90} color={C.red} />
```

Rules: connectors via `nodePort(box, side, t)` (= `anchor`) · request = red Flow, result = accent Flow, both
labeled (`Pill` / text) · named products use `<Brand>`, never a look-alike icon · for many nodes compute
positions once with `layoutGraph` (lib/paths) and feed the boxes in · structural → no `MINH HỌA` by itself.
