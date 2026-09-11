import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 13;
export default function S13() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
