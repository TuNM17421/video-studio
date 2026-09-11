import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 4;
export default function S04() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
