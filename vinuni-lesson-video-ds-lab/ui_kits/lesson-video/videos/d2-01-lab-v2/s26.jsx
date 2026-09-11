import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 26;
export default function S26() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
