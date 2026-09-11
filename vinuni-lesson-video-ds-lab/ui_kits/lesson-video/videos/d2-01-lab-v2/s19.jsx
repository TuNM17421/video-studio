import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 19;
export default function S19() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
