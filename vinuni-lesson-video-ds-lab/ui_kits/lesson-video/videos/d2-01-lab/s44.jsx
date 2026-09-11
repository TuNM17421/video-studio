import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 44;
export default function S44() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
