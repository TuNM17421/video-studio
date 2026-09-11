import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 17;
export default function S17() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
