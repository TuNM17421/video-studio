"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircleFilled, EditOutlined, FilePdfOutlined, FilePptOutlined, FileSearchOutlined, LoadingOutlined,
  SafetyCertificateOutlined, SearchOutlined, WarningFilled,
} from "@ant-design/icons";
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeChange, type NodeProps } from "@xyflow/react";
import { currentStep, KIND_LABEL, RESEARCH_STEPS, SCRIPT_NODE, VERDICT_LABEL, type NodeState, type ScoutEvent, type ScoutRun } from "@/lib/scout";

/**
 * Workflow của một lượt "Đóng gói kịch bản", dựng như n8n: mỗi bước là một nút, mỗi mục research là một
 * nút riêng. Chỉ để xem — không kéo được nút, không nối dây: hình dạng của luồng do Studio quyết, người
 * dùng chỉ cần thấy agent đang ở đâu và bấm vào nút để xem nó đã làm gì.
 */

export type Tone = "pending" | "active" | "done" | "warn" | "error" | "skipped";

interface StepData extends Record<string, unknown> {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  tone: Tone;
  icon: ReactNode;
  /** Bảy bước research của một mục — chỉ nút mục có. */
  steps?: ("done" | "active" | "pending")[];
}

const TONE_LABEL: Record<Tone, string> = {
  pending: "Chờ",
  active: "Đang làm",
  done: "Xong",
  warn: "Cần xem",
  error: "Lỗi",
  skipped: "Bỏ dở",
};

function StepNode({ data, selected }: NodeProps<Node<StepData>>) {
  return <div className={`vs-flow-node is-${data.tone}${selected ? " is-selected" : ""}`}>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <div className="vs-flow-node-head">
      <span className="vs-flow-node-icon" aria-hidden="true">{data.icon}</span>
      <span className="vs-flow-node-state">
        {data.tone === "active" ? <LoadingOutlined spin /> : data.tone === "done" ? <CheckCircleFilled /> : data.tone === "warn" || data.tone === "error" ? <WarningFilled /> : null}
        {TONE_LABEL[data.tone]}
      </span>
      {data.badge && <span className="vs-flow-node-badge">{data.badge}</span>}
    </div>
    <strong className="vs-flow-node-title">{data.title}</strong>
    {data.subtitle && <span className="vs-flow-node-sub">{data.subtitle}</span>}
    {data.steps && <span className="vs-flow-steps" aria-hidden="true">{data.steps.map((s, i) => <span key={i} className={`vs-flow-step is-${s}`} />)}</span>}
    {data.meta && <span className="vs-flow-node-meta mono">{data.meta}</span>}
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </div>;
}

const NODE_TYPES = { step: StepNode };
const COLUMN = 250;
const ROW = 128;

/** Đếm theo nút: agent làm mục nào thì mọi lượt tìm/đọc/ghi lúc đó thuộc về mục ấy; `null` = đếm hết. */
function tally(events: ScoutEvent[], item: string | null) {
  let search = 0;
  let fetch = 0;
  let save = 0;
  for (const e of events) {
    if (item !== null && e.item !== item) continue;
    if (e.kind === "search") search++;
    else if (e.kind === "fetch") fetch++;
    else if (e.kind === "save") save++;
  }
  return search + fetch + save ? `${search} tìm · ${fetch} đọc · ${save} ghi` : undefined;
}

const finished = (run: ScoutRun) => run.status === "done" || run.status === "error" || run.status === "stopped";

/** Trạng thái một nút mục/kịch bản theo tiến độ agent báo và kết quả lượt chạy. */
function nodeTone(run: ScoutRun, state: NodeState | undefined): Tone {
  if (state === "done") return "done";
  if (state === "active") return run.status === "running" ? "active" : "skipped";
  return finished(run) ? "skipped" : "pending";
}

export function buildGraph(run: ScoutRun, events: ScoutEvent[]) {
  const nodes: Node<StepData>[] = [];
  const edges: Edge[] = [];
  const researching = run.stage === "research";
  const add = (id: string, col: number, y: number, data: StepData) =>
    nodes.push({ id, type: "step", position: { x: col * COLUMN, y }, data, draggable: false, connectable: false });
  const link = (from: string, to: string) => {
    const target = nodes.find((n) => n.id === to);
    edges.push({ id: `${from}->${to}`, source: from, target: to, animated: target?.data.tone === "active", className: `is-${target?.data.tone ?? "pending"}` });
  };

  // 1 · đầu vào
  if (run.mode === "slide" && run.deck) {
    add("input", 0, 0, {
      title: run.deck.name,
      subtitle: `${run.deck.format.toUpperCase()} · ${run.deck.slides ? `${run.deck.slides} slide` : "chưa rõ số slide"}`,
      tone: "done",
      icon: run.deck.format === "pdf" ? <FilePdfOutlined /> : <FilePptOutlined />,
    });
  } else {
    add("input", 0, 0, { title: run.input.topic, subtitle: "Chủ đề gõ tay", tone: "done", icon: <EditOutlined /> });
  }

  // 2 · bóc tách (chỉ lượt từ slide)
  let col = 1;
  let before = ["input"];
  if (run.mode === "slide") {
    const tone: Tone = run.extraction ? "done" : run.stage === "extract" && run.status === "running" ? "active" : "error";
    add("extract", col, 0, {
      title: "Bóc tách nội dung",
      subtitle: run.extraction ? `${run.extraction.items.length} mục đề xuất · ${run.extraction.outline.length} slide trong dàn ý` : "Đọc slide, chọn chỗ cần research",
      tone,
      icon: <FileSearchOutlined />,
    });
    link("input", "extract");
    before = ["extract"];
    col++;
  }

  // 3 · research: lượt từ slide có một nút mỗi mục; lượt chủ đề là một nút chung
  if (run.mode === "slide" && researching) {
    const items = run.items;
    items.forEach((it, i) => {
      const finding = run.findings[it.id];
      const base = nodeTone(run, run.itemStates[it.id]);
      // Vàng khi chính agent kết luận chưa chắc, hoặc khi bước soát bằng code bắt được vấn đề ở mục này.
      const flagged = Boolean(run.check?.slide?.recency.some((x) => x.item === it.id) || run.check?.slide?.findings.some((x) => x.item === it.id));
      const tone: Tone = base === "done" && (flagged || (finding && (finding.verdict === "mau-thuan" || finding.verdict === "khong-du-nguon"))) ? "warn" : base;
      // Bước đang làm chỉ sáng khi agent thật sự đang ở mục này; mục chờ thì chỉ hiện các bước đã xong.
      const done = run.itemSteps[it.id] ?? [];
      const now = tone === "active" ? currentStep(done) : null;
      const steps = RESEARCH_STEPS.map((st) => (done.includes(st.key) ? "done" : st.key === now ? "active" : "pending") as "done" | "active" | "pending");
      const nowLabel = now ? RESEARCH_STEPS.find((st) => st.key === now)!.label : null;
      add(`item:${it.id}`, col, (i - (items.length - 1) / 2) * ROW, {
        title: it.title,
        subtitle: nowLabel ? `${nowLabel} · bước ${done.length + 1}/7` : `${KIND_LABEL[it.kind]}${it.slides.length ? ` · slide ${it.slides.join(", ")}` : ""}`,
        steps,
        meta: tally(events, it.id),
        badge: finding ? VERDICT_LABEL[finding.verdict] : it.id,
        tone,
        icon: <SearchOutlined />,
      });
      for (const from of before) link(from, `item:${it.id}`);
    });
    if (items.length) {
      before = items.map((it) => `item:${it.id}`);
      col++;
    }
  } else if (run.mode === "topic") {
    const tone: Tone = run.status === "running" ? "active" : run.status === "done" ? "done" : "error";
    add("research", col, 0, { title: "Tìm tài liệu", subtitle: "Một agent tìm, đọc và lưu nguồn", meta: tally(events, null), tone, icon: <SearchOutlined /> });
    link("input", "research");
    before = ["research"];
    col++;
  }
  if (!researching) return { nodes, edges };

  // 4 · viết kịch bản
  const scriptTone: Tone = run.mode === "slide"
    ? nodeTone(run, run.itemStates[SCRIPT_NODE])
    : run.script ? "done" : run.status === "running" ? "pending" : "skipped";
  add("script", col, 0, { title: "Viết kịch bản", subtitle: run.script ? "kich-ban.md" : "Theo mẫu kịch bản cơ bản", tone: scriptTone, icon: <EditOutlined /> });
  for (const from of before) link(from, "script");
  col++;

  // 5 · soát trích dẫn — chạy cục bộ sau khi agent đóng
  const check = run.check;
  add("verify", col, 0, {
    title: "Soát trích dẫn",
    subtitle: check ? `${check.quotes.ok}/${check.quotes.total} trích đoạn khớp trang đã tải` : "tools/scout-verify.mjs",
    tone: check ? (check.ok ? "done" : "warn") : finished(run) ? "skipped" : "pending",
    icon: <SafetyCertificateOutlined />,
  });
  link("script", "verify");
  return { nodes, edges };
}

export function ScoutWorkflow({ run, events, selected, onSelect }: { run: ScoutRun; events: ScoutEvent[]; selected: string | null; onSelect: (id: string) => void }) {
  const { nodes, edges } = useMemo(() => buildGraph(run, events), [run, events]);
  /**
   * Kích thước React Flow đo được của từng nút. Nút ở đây được dựng lại từ trạng thái lượt chạy mỗi lần có
   * sự kiện, nên React Flow không tự giữ được kích thước đã đo — mà nút chưa có `measured` thì nó để ẩn.
   * Chỉ nhận thay đổi `dimensions`: nút không kéo được, chọn nút đi qua `onNodeClick`.
   */
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const onNodesChange = useCallback((changes: NodeChange<Node<StepData>>[]) => {
    const measured = changes.flatMap((c) => (c.type === "dimensions" && c.dimensions ? [[c.id, c.dimensions] as const] : []));
    if (measured.length) setSizes((current) => ({ ...current, ...Object.fromEntries(measured) }));
  }, []);
  const shown = useMemo(() => nodes.map((n) => ({ ...n, selected: n.id === selected, measured: sizes[n.id] })), [nodes, selected, sizes]);
  // Đổi số nút (xác nhận danh sách mục) thì dựng lại canvas để fitView canh lại toàn bộ luồng.
  const shape = nodes.map((n) => n.id).join("|");
  return <div className="vs-scout-canvas" aria-label="Workflow của lượt chạy">
    <ReactFlow
      key={shape}
      nodes={shown}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      onNodeClick={(_, node) => onSelect(node.id)}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      fitView
      fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
      minZoom={0.3}
      maxZoom={1.5}
    >
      <Background gap={20} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  </div>;
}
