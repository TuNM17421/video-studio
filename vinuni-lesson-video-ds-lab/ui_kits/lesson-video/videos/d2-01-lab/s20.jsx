import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 20;
export default function S20() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
