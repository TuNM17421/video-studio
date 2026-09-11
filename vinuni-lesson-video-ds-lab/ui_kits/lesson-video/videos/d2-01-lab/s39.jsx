import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 39;
export default function S39() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
