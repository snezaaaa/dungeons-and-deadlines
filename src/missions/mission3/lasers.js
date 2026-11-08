// The Laser Corridor of Mandatory Compliance. Pure timing + hit logic (unit-testable).
//
// 'gate' : a full-height laser wall at fixed z that blinks (warning flicker before it turns on).
// 'sweep': a low tripwire that slides back and forth along z. Jump over it.

export const CORRIDOR = { minX: -2.4, maxX: 2.4, minZ: -16, maxZ: 0 };
export const CHECKPOINTS = [-0.9, -8.3];          // z positions you respawn at after a zap
export const SWEEP_HEIGHT = 0.3;                  // beam height (m)
export const CLEAR_HEIGHT = 0.45;                 // feet must be above this to clear a sweep
export const WARN_TIME = 0.4;                     // seconds of flicker before a gate turns on

export const LASERS = [
  { id: 'g1', type: 'gate', z: -3.2, period: 3.0, on: 1.4, offset: 0 },
  { id: 's1', type: 'sweep', z1: -5.0, z2: -7.0, speed: 1.3, offset: 0 },
  { id: 'g2', type: 'gate', z: -9.8, period: 2.6, on: 1.2, offset: 1.1 },
  { id: 's2', type: 'sweep', z1: -11.0, z2: -12.8, speed: 1.5, offset: 0.6 },
  { id: 's3', type: 'sweep', z1: -13.4, z2: -15.0, speed: 1.1, offset: 1.3 },
];

/** State of a laser at time t: { z, on, warn } */
export function laserState(l, t) {
  if (l.type === 'gate') {
    const ph = (((t + l.offset) % l.period) + l.period) % l.period;
    const on = ph < l.on;
    const warn = !on && ph > l.period - WARN_TIME;
    return { z: l.z, on, warn };
  }
  const len = Math.abs(l.z2 - l.z1);
  const travel = (((t * l.speed + l.offset * l.speed) % (2 * len)) + 2 * len) % (2 * len);
  const d = travel <= len ? travel : 2 * len - travel;
  return { z: l.z1 + Math.sign(l.z2 - l.z1) * d, on: true, warn: false };
}

/** Does laser l (in state s) hit a character at (x, y, z)? */
export function laserHits(l, s, c) {
  if (c.x < CORRIDOR.minX || c.x > CORRIDOR.maxX || c.z > CORRIDOR.maxZ || c.z < CORRIDOR.minZ) return false;
  if (l.type === 'gate') return s.on && Math.abs(c.z - s.z) < 0.45;
  return Math.abs(c.z - s.z) < 0.38 && c.y < CLEAR_HEIGHT;
}

/** Checkpoint to respawn at, given the furthest z reached so far. */
export const checkpointFor = (furthestZ) => (furthestZ <= CHECKPOINTS[1] ? CHECKPOINTS[1] : CHECKPOINTS[0]);
