// The Laser Corridor of Mandatory Compliance. Pure timing + hit logic (unit-testable).
//
// 'gate' : a full-height laser wall at fixed z that blinks. It flickers as a warning before it
//          turns on. Wait in front of it until it is dark and steady, then walk through.
// 'sweep': a low tripwire sliding back and forth inside a SHORT zone (marked on the floor).
//          The zone is short enough that a single running jump clears the whole thing,
//          wherever the beam happens to be.
//
// Design rules (enforced by tests/unit/mission3.test.js):
//  - there is a safe place to stand between every pair of hazards
//  - there is a checkpoint after every hazard
//  - a simulated *human* player (reaction delay, imprecise jump timing, real acceleration)
//    gets through for every start time and every jump timing in a generous window

export const CORRIDOR = { minX: -2.4, maxX: 2.4, minZ: -16, maxZ: 0 };
export const SWEEP_HEIGHT = 0.22;                 // beam height (m)
export const CLEAR_HEIGHT = 0.3;                  // feet must be above this to clear a sweep
export const SWEEP_BAND = 0.3;                    // half-width of a sweep beam's danger band (m)
export const GATE_BAND = 0.42;                    // half-width of a gate's danger band (m)
export const WARN_TIME = 0.7;                     // seconds of flicker before a gate turns on

export const LASERS = [
  { id: 'g1', type: 'gate', z: -2.8, period: 3.2, on: 1.0, offset: 0 },
  { id: 's1', type: 'sweep', z1: -5.8, z2: -6.2, speed: 0.5, offset: 0 },
  { id: 'g2', type: 'gate', z: -9.6, period: 3.0, on: 1.0, offset: 1.2 },
  { id: 's2', type: 'sweep', z1: -12.8, z2: -13.2, speed: 0.5, offset: 0.5 },
];

// respawn points after a zap: one before the first hazard and one after each hazard
export const CHECKPOINTS = [-0.9, -4.3, -8.0, -11.2, -14.6];

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

/** Danger zone [nearZ, farZ] of a laser along the corridor (nearZ > farZ). */
export function dangerZone(l) {
  if (l.type === 'gate') return [l.z + GATE_BAND, l.z - GATE_BAND];
  return [Math.max(l.z1, l.z2) + SWEEP_BAND, Math.min(l.z1, l.z2) - SWEEP_BAND];
}

/** Does laser l (in state s) hit a character at (x, y, z)? */
export function laserHits(l, s, c) {
  if (c.x < CORRIDOR.minX || c.x > CORRIDOR.maxX || c.z > CORRIDOR.maxZ || c.z < CORRIDOR.minZ) return false;
  if (l.type === 'gate') return s.on && Math.abs(c.z - s.z) < GATE_BAND;
  return Math.abs(c.z - s.z) < SWEEP_BAND && c.y < CLEAR_HEIGHT;
}

/** Most advanced checkpoint reached, given the furthest (most negative) z reached so far. */
export function checkpointFor(furthestZ) {
  const reached = CHECKPOINTS.filter((cp) => furthestZ <= cp);
  return reached.length ? Math.min(...reached) : CHECKPOINTS[0];
}
