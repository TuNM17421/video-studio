"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  AuditOutlined, CheckCircleFilled, EditOutlined, ExportOutlined, FilePdfOutlined, FilePptOutlined, FileSearchOutlined,
  LoadingOutlined, SafetyCertificateOutlined, SearchOutlined, UserOutlined, WarningFilled,
} from "@ant-design/icons";
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeChange, type NodeProps } from "@xyflow/react";
import { DIFFICULTY_LABEL, VERDICT_LABEL, type ResearchStage, type ResearchView } from "@/lib/research";

/**
 * Workflow của một lượt research, dựng như n8n: mỗi chặng một nút, mỗi claim một nút riêng trong làn
 * research, ba cổng duyệt là ba nút có hình người. Chỉ để xem và bấm vào — hình dạng luồng do pipeline
 * quyết, không kéo được, không nối dây.
 */

export type Tone = "pending" | "active" | "done" | "warn" | "error" | "skipped";

type Side = "left" | "right" | "top" | "bottom";
const SIDE: Record<Side, Position> = { left: Position.Left, right: Position.Right, top: Position.Top, bottom: Position.Bottom };

interface StepData extends Record<string, unknown> {
  title: string;
  /** Phía nhận dây vào / đưa dây ra — hàng dưới của hình chữ S đi từ phải sang trái. */
  into?: Side;
  out?: Side;
  subtitle?: string;
  meta?: string;
  badge?: string;
  tone: Tone;
  icon: ReactNode;
}

const TONE_LABEL: Record<Tone, string> = { pending: "Chờ", active: "Đang làm", done: "Xong", warn: "Chờ bạn", error: "Cần xem", skipped: "Bỏ dở" };

function StepNode({ data, selected }: NodeProps<Node<StepData>>) {
  return <div className={`vs-flow-node is-${data.tone}${selected ? " is-selected" : ""}`}>
    <Handle type="target" position={SIDE[data.into ?? "left"]} isConnectable={false} />
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
    {data.meta && <span className="vs-flow-node-meta mono">{data.meta}</span>}
    <Handle type="source" position={SIDE[data.out ?? "right"]} isConnectable={false} />
  </div>;
}

const NODE_TYPES = { step: StepNode };
const COLUMN = 250;
const ROW = 100;
/** Nút claim cao hơn nút chặng (tiêu đề hai dòng + dòng soát) — khoảng cách hàng riêng để chúng không đè nhau. */
const CLAIM_ROW = 136;

/** Thứ tự các chặng — một nút "xong" khi lượt đã đi qua nó. */
const ORDER: Record<ResearchStage, number> = { extract: 1, gate1: 2, research: 3, gate2: 5, write: 6, review: 7, revise: 7, gate3: 8, done: 9 };

export function buildGraph(view: ResearchView) {
  const { state, claims, evidence, findings } = view;
  const at = ORDER[state.stage];
  const running = state.status === "running";
  const failed = state.status === "failed";
  const nodes: Node<StepData>[] = [];
  const edges: Edge[] = [];

  /** Tông của một nút chặng theo vị trí của lượt. */
  const tone = (order: number, gate = false): Tone => {
    if (at > order || state.stage === "done") return "done";
    if (at < order) return "pending";
    if (gate) return state.status === "waiting" ? "warn" : running ? "active" : "pending";
    return running ? "active" : failed ? "error" : "pending";
  };
  /**
   * Hình chữ S hai hàng, năm cột: hàng trên đi từ slide tới soát bằng chứng (trái → phải), hàng dưới từ
   * cổng 2 tới bàn giao (phải → trái). Mười chặng trên một hàng thì canvas phải thu nhỏ tới mức chữ trong
   * nút không đọc được.
   */
  const lane = Math.max(1, claims.length);
  const rowB = Math.max(ROW, ((lane - 1) / 2) * CLAIM_ROW + CLAIM_ROW / 2) + ROW * 1.2;
  const add = (id: string, col: number, y: number, data: StepData) =>
    nodes.push({ id, type: "step", position: { x: col * COLUMN, y }, data, draggable: false, connectable: false });
  const bottom = (id: string, col: number, data: StepData) => add(id, col, rowB, { into: "right", out: "left", ...data });
  const link = (from: string, to: string) => {
    const target = nodes.find((n) => n.id === to);
    edges.push({ id: `${from}->${to}`, source: from, target: to, type: "smoothstep", animated: target?.data.tone === "active", className: `is-${target?.data.tone ?? "pending"}` });
  };

  const deck = state.deck;
  add("input", 0, 0, {
    title: deck.name,
    subtitle: `${deck.format.toUpperCase()} · ${deck.slides ? `${deck.slides} slide` : "chưa rõ số slide"}`,
    tone: "done",
    icon: deck.format === "pdf" ? <FilePdfOutlined /> : <FilePptOutlined />,
  });
  add("extract", 1, 0, {
    title: "Bóc tách",
    subtitle: view.outline ? `${claims.length} claim · ${view.outline.length} mục dàn ý` : "Đọc slide, chọn điều cần kiểm",
    tone: tone(1), icon: <FileSearchOutlined />,
  });
  link("input", "extract");
  add("gate1", 2, 0, { title: "Cổng 1 · duyệt claim", subtitle: state.gates.gate1 ? `đã duyệt ${state.gates.gate1.claims} claim` : "bạn duyệt danh sách", tone: tone(2, true), icon: <UserOutlined /> });
  link("extract", "gate1");

  // Làn research: mỗi claim một nút. Chưa qua cổng 1 thì một nút chung.
  const lastRun = state.runs.at(-1);
  const busy = new Set(running && lastRun && !lastRun.endedAt && lastRun.step === "research" ? lastRun.claims ?? [] : []);
  let before = ["gate1"];
  if (at >= 3 && claims.length) {
    claims.forEach((c, i) => {
      const check = evidence[c.id];
      const finding = findings[c.id];
      // Kết luận (slide đúng / cần sửa / sai) nằm ở nhãn; màu chỉ nói claim đã qua soát chưa.
      const t: Tone = busy.has(c.id) ? "active"
        : check?.ok ? "done"
        : check && !check.missing ? "error"
        : at > 3 ? "skipped" : "pending";
      add(`claim:${c.id}`, 3, (i - (claims.length - 1) / 2) * CLAIM_ROW, {
        title: c.text,
        subtitle: `${c.id} · ${DIFFICULTY_LABEL[c.difficulty]}${c.timeSensitive ? " · hay đổi" : ""}${c.slides.length ? ` · slide ${c.slides.join(", ")}` : ""}`,
        badge: finding && check?.ok ? VERDICT_LABEL[finding.verdict] : undefined,
        meta: check ? `${check.quotes.verified}/${check.quotes.total} trích đoạn khớp${check.reused ? " · dùng lại" : ""}` : undefined,
        tone: t,
        icon: <SearchOutlined />,
      });
      link("gate1", `claim:${c.id}`);
    });
    before = claims.map((c) => `claim:${c.id}`);
  } else {
    add("research", 3, 0, { title: "Research", subtitle: at >= 3 ? "không có claim nào cần kiểm" : "tìm và đọc nguồn cho từng claim", tone: tone(3), icon: <SearchOutlined /> });
    link("gate1", "research");
    before = ["research"];
  }

  const passed = claims.filter((c) => evidence[c.id]?.ok).length;
  add("evidence", 4, 0, {
    title: "Soát bằng chứng",
    subtitle: claims.length ? `${passed}/${claims.length} claim đạt` : "tools/research-verify.mjs",
    // "Chờ bạn" chỉ khi lượt thật sự dừng lại chờ — đang research thì vài claim chưa đạt là chuyện bình thường.
    tone: at > 4 ? "done" : at < 3 ? "pending" : running ? "active" : Object.keys(evidence).length ? (passed === claims.length ? "done" : "warn") : tone(3),
    icon: <SafetyCertificateOutlined />,
    out: "bottom",
  });
  for (const from of before) link(from, "evidence");
  bottom("gate2", 4, {
    into: "top",
    title: "Cổng 2",
    subtitle: state.gates.gate2 ? (state.gates.gate2.auto ? "tự qua — mọi soát đạt" : "bạn đã quyết định") : "tự qua nếu soát đạt",
    tone: tone(5, true), icon: <UserOutlined />,
  });
  link("evidence", "gate2");
  bottom("write", 3, { title: "Viết kịch bản", subtitle: view.script ? "output/kich-ban.md" : "theo mẫu kịch bản cơ bản", tone: tone(6), icon: <EditOutlined /> });
  link("gate2", "write");
  const sc = view.scriptCheck;
  bottom("review", 2, {
    title: "Soát & biên tập",
    subtitle: sc ? `${sc.stats.cues} câu · ~${Math.round(sc.stats.seconds / 6) / 10} phút · phủ ${sc.coverage.covered}/${sc.coverage.slides} slide` : "code soát mẫu, agent biên tập",
    meta: view.edit ? `biên tập: ${view.edit.issues.length} góp ý` : undefined,
    tone: tone(7), icon: <AuditOutlined />,
  });
  link("write", "review");
  bottom("gate3", 1, { title: "Cổng 3 · duyệt kịch bản", subtitle: state.gates.gate3 ? "đã duyệt" : "bạn duyệt hoặc góp ý", tone: tone(8, true), icon: <UserOutlined /> });
  link("review", "gate3");
  bottom("handoff", 0, { title: "Bàn giao", subtitle: "tạo video từ kịch bản", tone: state.stage === "done" ? "done" : "pending", icon: <ExportOutlined /> });
  link("gate3", "handoff");
  return { nodes, edges };
}

export function ResearchFlow({ view, selected, onSelect }: { view: ResearchView; selected: string | null; onSelect: (id: string) => void }) {
  const { nodes, edges } = useMemo(() => buildGraph(view), [view]);
  /**
   * Kích thước React Flow đo được của từng nút. Nút được dựng lại từ trạng thái mỗi lần có sự kiện, nên
   * React Flow không tự giữ kích thước đã đo — mà nút chưa có `measured` thì nó để ẩn.
   */
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const onNodesChange = useCallback((changes: NodeChange<Node<StepData>>[]) => {
    const measured = changes.flatMap((c) => (c.type === "dimensions" && c.dimensions ? [[c.id, c.dimensions] as const] : []));
    if (measured.length) setSizes((current) => ({ ...current, ...Object.fromEntries(measured) }));
    // Tab tới một nút rồi Enter/Space: React Flow chỉ phát thay đổi "select", không gọi onNodeClick.
    const chosen = changes.find((c) => c.type === "select" && c.selected);
    if (chosen && "id" in chosen) onSelect(chosen.id);
  }, [onSelect]);
  const shown = useMemo(() => nodes.map((n) => ({ ...n, selected: n.id === selected, measured: sizes[n.id] })), [nodes, selected, sizes]);
  // Đổi số nút (duyệt xong danh sách claim) thì dựng lại canvas để fitView canh lại cả luồng.
  const shape = nodes.map((n) => n.id).join("|");
  return <div className="vs-scout-canvas vs-rs-canvas" aria-label="Workflow của lượt research">
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
      fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
      minZoom={0.25}
      maxZoom={1.5}
    >
      <Background gap={20} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  </div>;
}
