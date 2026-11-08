import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAll } from '../../src/game/collision.js';
import { buildColliders, SPAWNS, CORE_SPOTS, VICTORY_SPOTS, SEAL_POS, PROPS } from '../../src/missions/mission3/layout.js';
import { CHECKPOINTS } from '../../src/missions/mission3/lasers.js';

const cols = buildColliders();
const open = cols.filter((c) => c.id !== 'sealgate');

// interaction points from mission3/logic.js (logic imports browser-only modules)
const POINTS = [
  ...Object.values(SEAL_POS).map((p) => [p.x + (p.x < 0 ? 1.4 : -1.4), p.z]),
  [0, 1.3], [PROPS.trophy.x + 1.2, PROPS.trophy.z], [PROPS.brewJr.x - 1.2, PROPS.brewJr.z],
  [PROPS.console.x, PROPS.console.z + 1.2], [PROPS.vault.x, PROPS.vault.z + 1.6],
];

test('spawns, interaction points, checkpoints and team spots are reachable', () => {
  for (const [x, z] of [...SPAWNS, ...POINTS, ...CORE_SPOTS, ...VICTORY_SPOTS, ...CHECKPOINTS.map((z) => [0, z])]) {
    const p = { x, z };
    resolveAll(p, 0.42, open);
    assert.ok(Math.hypot(p.x - x, p.z - z) < 0.6, `point ${x},${z} pushed ${Math.hypot(p.x - x, p.z - z).toFixed(2)}`);
  }
});

test('the seal barrier blocks the corridor until it is disabled', () => {
  const p = { x: 0, z: -0.1 };
  resolveAll(p, 0.42, cols);
  assert.ok(p.z >= 0.4, 'blocked by the barrier');
  const q = { x: 0, z: -0.1 };
  resolveAll(q, 0.42, open);
  assert.ok(Math.abs(q.z + 0.1) < 1e-6, 'passes once the barrier is down');
});

test('a straight walk from the hall to the vault core is unobstructed once the barrier is down', () => {
  for (let z = 11; z > -25; z -= 0.1) {
    const p = { x: 0, z };
    resolveAll(p, 0.42, open);
    assert.ok(Math.abs(p.x) < 1e-6 && Math.abs(p.z - z) < 1e-6, `blocked at z=${z.toFixed(1)}`);
  }
});
