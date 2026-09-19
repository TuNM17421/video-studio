import type { FC } from 'react';

export interface IcebergNote {
  /** 17/700 label. */
  label: string;
  /** Up to 3 muted lines. */
  lines?: readonly string[];
}
export interface IcebergProps {
  x: number;
  /** Top of the tip. */
  y: number;
  /** Default 560. Notes need ~420 px to the right. */
  w?: number;
  /** Default 480; the waterline is at 22 %. */
  h?: number;
  above?: IcebergNote;
  below?: IcebergNote;
  /** 0–1 reveal of the submerged body and its note. */
  depth?: number;
  opacity?: number;
}
export declare const Iceberg: FC<IcebergProps>;
