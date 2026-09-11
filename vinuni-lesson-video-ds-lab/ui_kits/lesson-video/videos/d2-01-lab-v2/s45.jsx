import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 45;
export default function S45() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
