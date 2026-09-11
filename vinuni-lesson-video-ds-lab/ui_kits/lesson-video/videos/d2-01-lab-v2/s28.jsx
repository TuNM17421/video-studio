import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 28;
export default function S28() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
