import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** Create a THREE.CanvasTexture drawn with 2D canvas (used for all in-world text: no font downloads). */
export function makeCanvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.redraw = (fn) => { g.clearRect(0, 0, w, h); fn(g, w, h); tex.needsUpdate = true; };
  return tex;
}

/** Hook: texture that redraws whenever deps change. */
export function useCanvasTexture(w, h, draw, deps) {
  const tex = useMemo(() => makeCanvasTexture(w, h, () => {}), [w, h]);
  useEffect(() => { tex.userData.redraw(draw); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

export const FONT = '"Arial Black", "Segoe UI Black", Impact, system-ui, sans-serif';

export function wrapText(g, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lineH; }
    else line = test;
  }
  if (line) g.fillText(line, x, y);
  return y;
}
