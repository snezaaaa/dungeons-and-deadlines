// Certificate Vault geometry: Hall of Seals (south) -> Laser Corridor -> Vault Core (north).
import { box } from '../../game/collision.js';
import { CORRIDOR } from './lasers.js';

export const HALL = { minX: -10, maxX: 10, minZ: 0, maxZ: 14, h: 6 };
export { CORRIDOR };
export const CORE = { minX: -7, maxX: 7, minZ: -28, maxZ: -16, h: 6 };
export const WALL_T = 0.4;
export const GAP = CORRIDOR.maxX; // half-width of the corridor openings

export const SEAL_POS = {
  privacy: { x: -6, z: 4 },
  integrity: { x: 6, z: 4 },
  bias: { x: -6, z: 10 },
  oversight: { x: 6, z: 10 },
};

export const PROPS = {
  console: { x: -4.2, z: -20.5 },
  vault: { x: 0, z: -28 },
  trophy: { x: -9.3, z: 12.6 },
  brewJr: { x: 9.3, z: 12.6 },
};

export const SPAWNS = [
  // far enough from the south wall that the third-person camera has room behind the player
  [-2, 8.6, Math.PI], [-1, 9.1, Math.PI], [0, 8.6, Math.PI], [1, 9.1, Math.PI], [2, 8.6, Math.PI],
];
export const CORE_SPOTS = [[-3, -18.6], [-1.6, -17.9], [1.6, -17.9], [3, -18.6], [0, -19.2]];
export const VICTORY_SPOTS = [
  [-2.4, -24.4, 0], [-1.2, -23.9, 0], [0, -23.6, 0], [1.2, -23.9, 0], [2.4, -24.4, 0],
];
export const CORE_ENTRY_Z = -16.6;

export function buildColliders() {
  const t = WALL_T;
  return [
    // hall
    { minX: HALL.minX - t, maxX: HALL.minX, minZ: HALL.minZ - t, maxZ: HALL.maxZ + t },
    { minX: HALL.maxX, maxX: HALL.maxX + t, minZ: HALL.minZ - t, maxZ: HALL.maxZ + t },
    { minX: HALL.minX, maxX: HALL.maxX, minZ: HALL.maxZ, maxZ: HALL.maxZ + t },
    { minX: HALL.minX, maxX: -GAP, minZ: HALL.minZ - t, maxZ: HALL.minZ },
    { minX: GAP, maxX: HALL.maxX, minZ: HALL.minZ - t, maxZ: HALL.minZ },
    { id: 'sealgate', minX: -GAP, maxX: GAP, minZ: HALL.minZ - t, maxZ: HALL.minZ },
    // corridor
    { minX: -GAP - t, maxX: -GAP, minZ: CORRIDOR.minZ, maxZ: CORRIDOR.maxZ },
    { minX: GAP, maxX: GAP + t, minZ: CORRIDOR.minZ, maxZ: CORRIDOR.maxZ },
    // core
    { minX: CORE.minX, maxX: -GAP, minZ: CORE.maxZ - t, maxZ: CORE.maxZ },
    { minX: GAP, maxX: CORE.maxX, minZ: CORE.maxZ - t, maxZ: CORE.maxZ },
    { minX: CORE.minX - t, maxX: CORE.minX, minZ: CORE.minZ - t, maxZ: CORE.maxZ },
    { minX: CORE.maxX, maxX: CORE.maxX + t, minZ: CORE.minZ - t, maxZ: CORE.maxZ },
    { minX: CORE.minX, maxX: CORE.maxX, minZ: CORE.minZ - t, maxZ: CORE.minZ },
    // props
    ...Object.values(SEAL_POS).map((p) => box(p.x, p.z, 1.2, 1.2)),
    ...[2, 7, 12].flatMap((z) => [box(-9.3, z, 0.9, 0.9), box(9.3, z, 0.9, 0.9)]),
    box(PROPS.console.x, PROPS.console.z, 1.4, 1.0),
    box(PROPS.trophy.x, PROPS.trophy.z + 0.4, 1.0, 1.6),
    box(PROPS.brewJr.x, PROPS.brewJr.z + 0.4, 1.0, 1.0),
    box(-5.5, -26.6, 1.0, 1.0), box(5.5, -26.6, 1.0, 1.0),
  ];
}

export const OPEN_SPACES = [
  { minX: HALL.minX + 0.25, maxX: HALL.maxX - 0.25, minZ: HALL.minZ + 0.25, maxZ: HALL.maxZ - 0.25, maxY: 5.6 },
  { minX: -GAP + 0.25, maxX: GAP - 0.25, minZ: CORRIDOR.minZ - 0.6, maxZ: CORRIDOR.maxZ + 0.6, maxY: 3.3 },   // low corridor ceiling
  { minX: CORE.minX + 0.25, maxX: CORE.maxX - 0.25, minZ: CORE.minZ + 0.25, maxZ: CORE.maxZ - 0.25, maxY: 5.6 },
];
