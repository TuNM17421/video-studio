import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 9;
export default function S09() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
