import type { LineIconName } from './LineIcon';
import type { FC, SVGProps } from 'react';

export type IconName =
  | 'bulb' | 'coin' | 'trend-up' | 'database' | 'neural-net' | 'chat-bubble' | 'robot'
  | 'document' | 'eye' | 'calendar-x' | 'alert-bubble' | 'scale' | 'layers' | 'split-path'
  | 'edit' | 'code' | 'check' | 'users' | 'scissors' | 'gear';

/** 64×64 line icon; stroke = currentColor — set `color`. Accepts any <svg> prop (x, y, width…). */
export type IconComponent = FC<SVGProps<SVGSVGElement>>;

export declare const BulbIcon: IconComponent;
export declare const CoinIcon: IconComponent;
export declare const TrendUpIcon: IconComponent;
export declare const DatabaseIcon: IconComponent;
export declare const NeuralNetIcon: IconComponent;
export declare const ChatBubbleIcon: IconComponent;
export declare const RobotIcon: IconComponent;
export declare const DocumentIcon: IconComponent;
export declare const EyeIcon: IconComponent;
export declare const CalendarXIcon: IconComponent;
export declare const AlertBubbleIcon: IconComponent;
export declare const ScaleIcon: IconComponent;
export declare const LayersIcon: IconComponent;
export declare const SplitPathIcon: IconComponent;
export declare const EditIcon: IconComponent;
export declare const CodeIcon: IconComponent;
export declare const CheckIcon: IconComponent;
export declare const UsersIcon: IconComponent;
export declare const ScissorsIcon: IconComponent;
export declare const GearIcon: IconComponent;

export declare const ICONS: Readonly<Record<IconName, IconComponent>>;
export declare const ICON_NAMES: readonly IconName[];
/** Any name accepted by Icon / every `icon` prop: hand-drawn or LineIcon (Lucide). */
export type AnyIconName = IconName | LineIconName;
/** Standalone <svg> component for any icon name (HTML contexts); null when unknown. */
export declare function iconComponent(name: AnyIconName): IconComponent | null;

export interface IconProps {
  /** Hand-drawn name, or any LineIcon (Lucide) name — rendered with the matching stroke weight. */
  name: IconName | LineIconName;
  /** Center x (scene px). */
  x: number;
  /** Center y (scene px). */
  y: number;
  /** Rendered size in px. Default 48. */
  size?: number;
  /** A C token. Default C.accent. */
  color?: string;
  opacity?: number;
}
/** Places an icon inside a scene SVG, centered on (x, y). */
export declare const Icon: FC<IconProps>;
