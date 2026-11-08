// Mutable per-frame simulation state, shared by physics, avatars and camera.
import { ROSTER } from '../characters/roster.js';

export const world = {
  chars: ROSTER.map(() => ({
    x: 0, z: 0, y: 0, vy: 0, yaw: 0, vx: 0, vz: 0,
    speed: 0,            // 0..1 normalised horizontal speed (for animation blending)
    walkPhase: 0,
    emote: null,         // 'cheer' | 'dance' | 'facepalm' | 'shrug' | null
    emoteUntil: 0,
    grounded: true,
  })),
  colliders: [],         // AABBs from the current level
  interactables: [],     // from the current mission
  cam: { yaw: Math.PI / 2, pitch: 0.35, dist: 5.2 },
  cine: { mode: null, t: 0 },  // cinematic camera mode
  alarm: 0,              // 0..1 red alarm light intensity
  keys: new Set(),
  jumpRequest: false,
  time: 0,
};

export function placeCharacters(spawns) {
  spawns.forEach((s, i) => {
    const c = world.chars[i];
    Object.assign(c, { x: s[0], z: s[1], yaw: s[2] ?? 0, y: 0, vy: 0, vx: 0, vz: 0, speed: 0, emote: null });
  });
}

export function emote(i, name, seconds = 2.5) {
  const c = world.chars[i];
  if (!c) return;
  c.emote = name;
  c.emoteUntil = world.time + seconds;
}

if (typeof window !== 'undefined') window.__world = world;
