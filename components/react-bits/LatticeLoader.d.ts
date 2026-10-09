import type { CSSProperties, JSX } from 'react';
export type LatticeLoaderProps = {
  label?: string; doneLabel?: string; errorLabel?: string;
  status?: 'working' | 'done' | 'error';
  pattern?: string | { cells: (number | null)[]; loop?: number; scale?: number; lit?: number };
  grid?: 3 | 4; shape?: 'square' | 'round'; color?: string; doneColor?: string; errorColor?: string;
  cellSize?: number; gap?: number; fontSize?: number; step?: number; idleOpacity?: number;
  glow?: boolean; glowColor?: string; showTimer?: boolean; elapsed?: number; className?: string; style?: CSSProperties;
};
export default function LatticeLoader(props: LatticeLoaderProps): JSX.Element;
