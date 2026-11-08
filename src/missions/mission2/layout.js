// Break-room geometry shared by the renderer (BreakRoom.jsx), physics, robots and camera.
import { box } from '../../game/collision.js';

export const ROOM = { minX: -10, maxX: 10, minZ: -8, maxZ: 8, h: 4.2 };
export const ANTE = { minX: -4.5, maxX: 4.5, minZ: -16, maxZ: -8.4 };   // certificate-vault antechamber
export const DOOR = { x: 0, w: 2.6 };
export const WALL_T = 0.4;

export const PROPS = {
  brew: { x: -9.0, z: 0 },          // BREW-9000 (west wall)
  counter: { x: -9.45, z: 0, w: 1.1, d: 8 },
  station: { x: -4.5, z: 0 },       // fact-check station
  bookshelf: { x: 9.6, z: -3.5 },
  fridge: { x: 9.35, z: 5 },
  cooler: { x: 9.55, z: 1.2 },
  dishwasher: { x: -3, z: 7.45, movedX: -1.5 },
  desk: { x: 6, z: -6.6 },
  cctv: { x: -6, z: -7.4 },
  bulletin: { x: 4, z: 7.95 },
  donutTable: { x: 2, z: 2.6 },
  table2: { x: 2.2, z: -2.6 },
  sofa: { x: 6.8, z: 7.3 },
  vault: { x: 0, z: -15.9 },
};

export const SPAWNS = [
  // staggered column (x) so the starting camera, which looks west, isn't blocked by teammates
  [-0.6, 5.0, -Math.PI / 2],
  [0.4, 5.6, -Math.PI / 2],
  [-0.6, 6.2, -Math.PI / 2],
  [0.4, 6.8, -Math.PI / 2],
  [-0.6, 7.4, -Math.PI / 2],
];

export const VICTORY_SPOTS = [
  [-2.4, -15.0, 0], [-1.2, -14.5, 0], [0, -14.2, 0], [1.2, -14.5, 0], [2.4, -15.0, 0],
];
export const EXIT_ZONE = { minX: -4.5, maxX: 4.5, minZ: -16, maxZ: -10.5 };

// Mop-Bot patrol loops (kept to open lanes between furniture).
export const BOT_PATHS = [
  [[-6.5, -4.6], [7.2, -4.6], [7.2, -1.1], [-2.2, -1.1]],
  [[-6.5, 3.9], [6.8, 3.9], [6.8, 1.2], [-1.2, 1.2]],
];

export function buildColliders() {
  const t = WALL_T, hw = DOOR.w / 2;
  return [
    { minX: ROOM.minX - t, maxX: ROOM.minX, minZ: ROOM.minZ - t, maxZ: ROOM.maxZ + t },
    { minX: ROOM.maxX, maxX: ROOM.maxX + t, minZ: ROOM.minZ - t, maxZ: ROOM.maxZ + t },
    { minX: ROOM.minX, maxX: ROOM.maxX, minZ: ROOM.maxZ, maxZ: ROOM.maxZ + t },
    { minX: ROOM.minX, maxX: -hw, minZ: ROOM.minZ - t, maxZ: ROOM.minZ },
    { minX: hw, maxX: ROOM.maxX, minZ: ROOM.minZ - t, maxZ: ROOM.minZ },
    { id: 'door', minX: -hw, maxX: hw, minZ: ROOM.minZ - t, maxZ: ROOM.minZ },
    { minX: ANTE.minX - t, maxX: ANTE.minX, minZ: ANTE.minZ - t, maxZ: ANTE.maxZ },
    { minX: ANTE.maxX, maxX: ANTE.maxX + t, minZ: ANTE.minZ - t, maxZ: ANTE.maxZ },
    { minX: ANTE.minX, maxX: ANTE.maxX, minZ: ANTE.minZ - t, maxZ: ANTE.minZ },
    box(PROPS.counter.x, PROPS.counter.z, PROPS.counter.w, PROPS.counter.d),
    box(PROPS.station.x, PROPS.station.z, 1.2, 1.2),
    box(PROPS.bookshelf.x, PROPS.bookshelf.z, 0.8, 2.6),
    box(PROPS.fridge.x, PROPS.fridge.z, 1.2, 1.4),
    box(PROPS.cooler.x, PROPS.cooler.z, 0.7, 0.7),
    // the heavy dishwasher: one collider per position, toggled when the Fighter moves it
    box(PROPS.dishwasher.x, PROPS.dishwasher.z, 1.4, 1.1, { id: 'dishwasher' }),
    box(PROPS.dishwasher.movedX, PROPS.dishwasher.z, 1.4, 1.1, { id: 'dishwasherMoved', enabled: false }),
    box(PROPS.desk.x, PROPS.desk.z, 2.2, 1.0),
    box(PROPS.cctv.x, PROPS.cctv.z, 1.6, 0.8),
    box(PROPS.donutTable.x, PROPS.donutTable.z, 1.4, 1.4),
    box(PROPS.table2.x, PROPS.table2.z, 1.4, 1.4),
    box(PROPS.sofa.x, PROPS.sofa.z, 2.6, 1.0),
    box(-9.3, 7.3, 0.9, 0.9), box(9.3, -7.3, 0.9, 0.9),          // plants
    box(-3.4, -15.4, 1.4, 0.7), box(3.4, -15.4, 1.4, 0.7),        // antechamber pedestals
  ];
}

export const OPEN_SPACES = [
  { minX: ROOM.minX + 0.25, maxX: ROOM.maxX - 0.25, minZ: ROOM.minZ + 0.25, maxZ: ROOM.maxZ - 0.25 },
  { minX: ANTE.minX + 0.25, maxX: ANTE.maxX - 0.25, minZ: ANTE.minZ + 0.25, maxZ: ANTE.maxZ },
  { minX: -DOOR.w / 2 + 0.2, maxX: DOOR.w / 2 - 0.2, minZ: ROOM.minZ - 0.6, maxZ: ROOM.minZ + 0.6 },
];
