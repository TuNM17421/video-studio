import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 48;
export default function S48() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
