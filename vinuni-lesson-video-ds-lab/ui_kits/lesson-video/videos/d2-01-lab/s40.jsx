import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 40;
export default function S40() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
