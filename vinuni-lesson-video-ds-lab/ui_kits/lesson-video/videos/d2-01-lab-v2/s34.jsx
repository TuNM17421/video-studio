import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 34;
export default function S34() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
