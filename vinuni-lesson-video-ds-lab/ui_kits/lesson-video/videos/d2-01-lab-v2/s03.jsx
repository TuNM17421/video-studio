import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 3;
export default function S03() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
