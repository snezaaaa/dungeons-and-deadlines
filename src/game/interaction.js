import { world } from './world.js';

/** Nearest interactable within reach of the controlled character, or null. */
export function findNearby(st) {
  const a = world.chars[st.active];
  let best = null, bestD = Infinity;
  for (const it of world.interactables) {
    const label = it.label(st);
    if (!label) continue;
    const d = Math.hypot(it.x - a.x, it.z - a.z);
    if (d < it.r && d < bestD) { best = { id: it.id, label }; bestD = d; }
  }
  return best;
}
