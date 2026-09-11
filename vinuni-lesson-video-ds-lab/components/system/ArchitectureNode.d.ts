import type { FC, ReactNode } from 'react';

export type ArchKind = 'app' | 'host' | 'client' | 'server' | 'api' | 'service' | 'model' | 'database' | 'user';

export interface ArchitectureNodeProps {
  /** Top-left corner, scene px. */
  x: number;
  y: number;
  w: number;
  /** h < 120 → compact row layout (icon · kind · title on one line group). */
  h: number;
  /** Picks icon + kind label: app ỨNG DỤNG · host HOST · client CLIENT · server SERVER · api API · service DỊCH VỤ · model MÔ HÌNH · database DỮ LIỆU · user NGƯỜI DÙNG. Default 'app'. */
  kind?: ArchKind;
  /** Bold title: 'MCP SERVER', 'ỨNG DỤNG CHỦ'. */
  title?: string;
  /** Muted lowercase explanation. */
  subtitle?: string;
  /** Large frame that holds other nodes (header in the top-left corner). */
  container?: boolean;
  /** Dashed stroke. Containers default true, nodes default false. */
  dashed?: boolean;
  /** Stroke / icon color: ROLE_OF name ('process' for a provider zone…), C token name or hex. Default accent. */
  tone?: string;
  /** Override icon (LineIcon or hand Icon name). */
  icon?: string;
  /** Override the micro-caps kind label. */
  kindLabel?: string;
  /** 0–1 red-soft overlay + 5 px red stroke (drive with pulse()). */
  active?: number;
  /** 0–1: dims to 36 %. */
  muted?: number;
  opacity?: number;
  /** Extra SVG drawn inside the group (e.g. child nodes of a container). */
  children?: ReactNode;
}
export declare const ArchitectureNode: FC<ArchitectureNodeProps>;
/** kind → { icon, label }. */
export declare const ARCH_KINDS: Readonly<Record<ArchKind, { icon: string; label: string }>>;
/** anchor() on the node's box: connectors start/end here. */
export declare function nodePort(
  props: { x: number; y: number; w: number; h: number },
  side: 'left' | 'right' | 'top' | 'bottom' | 'center',
  t?: number,
): { x: number; y: number };
