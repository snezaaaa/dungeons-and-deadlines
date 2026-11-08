import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAll } from '../../src/game/collision.js';
import { buildColliders, SPAWNS, BOT_PATHS, PROPS } from '../../src/missions/mission2/layout.js';

const cols = buildColliders().filter((c) => c.enabled !== false && c.id !== 'door');

// interaction points from mission2/logic.js (logic imports browser-only modules)
const POINTS = [
  [PROPS.station.x + 1.1, PROPS.station.z], [PROPS.brew.x + 1.1, PROPS.brew.z], [-8.1, 2.9], [-8.1, -2.9],
  [PROPS.bookshelf.x - 1.1, PROPS.bookshelf.z], [PROPS.fridge.x - 1.2, PROPS.fridge.z], [PROPS.desk.x, PROPS.desk.z + 1.1],
  [PROPS.cctv.x, PROPS.cctv.z + 1.1], [PROPS.dishwasher.x, PROPS.dishwasher.z - 1.15], [PROPS.bulletin.x, PROPS.bulletin.z - 1.0],
  [PROPS.cooler.x - 1.0, PROPS.cooler.z], [PROPS.sofa.x, PROPS.sofa.z - 1.0],
];

test('spawns and interaction points are reachable (not inside furniture)', () => {
  for (const [x, z] of [...SPAWNS, ...POINTS]) {
    const p = { x, z };
    resolveAll(p, 0.42, cols);
    assert.ok(Math.hypot(p.x - x, p.z - z) < 0.6, `point ${x},${z} pushed ${Math.hypot(p.x - x, p.z - z).toFixed(2)}`);
  }
});

test('Mop-Bot patrol routes never clip furniture or walls', () => {
  for (const path of BOT_PATHS) {
    for (let i = 0; i < path.length; i++) {
      const [ax, az] = path[i], [bx, bz] = path[(i + 1) % path.length];
      for (let t = 0; t <= 1; t += 0.02) {
        const p = { x: ax + (bx - ax) * t, z: az + (bz - az) * t };
        const ox = p.x, oz = p.z;
        resolveAll(p, 0.5, cols);
        assert.ok(Math.hypot(p.x - ox, p.z - oz) < 1e-6, `bot path clips at ${ox.toFixed(2)},${oz.toFixed(2)}`);
      }
    }
  }
});

test('Mop-Bots keep clear of the spawn area', () => {
  for (const path of BOT_PATHS) for (const [, z] of path) assert.ok(z < 5.0);
});
