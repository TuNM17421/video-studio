import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 37;
export default function S37() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
