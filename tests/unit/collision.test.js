import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCircleAABB, resolveAll, box } from '../../src/game/collision.js';
import { buildColliders, SPAWNS, ROOM } from '../../src/missions/mission1/layout.js';
import { INTERACTABLES_POSITIONS } from './helpers.js';

test('circle is pushed out of a box', () => {
  const p = { x: 0.3, z: 0 };
  assert.ok(resolveCircleAABB(p, 0.5, box(1, 0, 1, 1)));
  assert.ok(p.x <= 0.0 + 1e-9);
});

test('circle whose centre is inside a box is ejected', () => {
  const p = { x: 1.1, z: 0 };
  resolveCircleAABB(p, 0.4, box(1, 0, 1, 1));
  assert.ok(p.x >= 1.5 + 0.4 - 1e-9);
});

test('walls keep a player inside the room, but the open door gap lets them through', () => {
  const cols = buildColliders();
  const p = { x: 5, z: -8.9 };
  resolveAll(p, 0.42, cols);
  assert.ok(p.z >= ROOM.minZ + 0.42 - 1e-6, 'blocked by north wall');
  const d = { x: 0, z: -9.0 };
  resolveAll(d, 0.42, cols);
  assert.ok(d.z > -9.0, 'locked door blocks');
  cols.find((c) => c.id === 'door').enabled = false;
  const e = { x: 0, z: -9.2 };
  resolveAll(e, 0.42, cols);
  assert.ok(Math.abs(e.z + 9.2) < 1e-6, 'open door lets player pass');
});

test('spawn points and interaction points are not inside furniture', () => {
  const cols = buildColliders();
  for (const [x, z] of [...SPAWNS, ...INTERACTABLES_POSITIONS]) {
    const p = { x, z };
    resolveAll(p, 0.42, cols.filter((c) => c.id !== 'door'));
    assert.ok(Math.hypot(p.x - x, p.z - z) < 0.6, `point ${x},${z} is reachable (moved ${Math.hypot(p.x - x, p.z - z).toFixed(2)})`);
  }
});
