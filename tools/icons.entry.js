// Node-side entry: renders every icon component to standalone SVG markup (assets/icons/*.svg).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ICONS } from '../vinuni-lesson-video-ds/components/icons/Icons.jsx';

export function renderIcons() {
  const out = {};
  for (const [name, Cmp] of Object.entries(ICONS)) {
    out[name] = renderToStaticMarkup(React.createElement(Cmp, { xmlns: 'http://www.w3.org/2000/svg', width: 64, height: 64 }));
  }
  return out;
}
