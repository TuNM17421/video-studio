import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 10;
export default function S10() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
