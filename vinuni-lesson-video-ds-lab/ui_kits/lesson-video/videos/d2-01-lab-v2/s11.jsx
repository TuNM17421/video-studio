import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 11;
export default function S11() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
