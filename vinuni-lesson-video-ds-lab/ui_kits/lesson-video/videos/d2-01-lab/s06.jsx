import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 6;
export default function S06() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
