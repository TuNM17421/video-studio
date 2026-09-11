import React from 'react';
import { useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

const N = 31;
export default function S31() {
  const frame = useFrame();
  return <Scene n={N} frame={frame} />;
}
