// Training-center geometry shared by the renderer (TrainingCenter.jsx) and physics/camera.
import { box } from '../../game/collision.js';

export const ROOM = { minX: -12, maxX: 12, minZ: -9, maxZ: 9, h: 4.6 };
export const LOBBY = { minX: -5, maxX: 5, minZ: -17, maxZ: -9.4 };
export const DOOR = { x: 0, z: -9.2, w: 2.6 };
export const WALL_T = 0.4;

// Desks face the presentation screen on the west wall (-X). Each belongs to one character.
export const DESKS = [
  { x: -2, z: -4.5 }, { x: -2, z: 0 }, { x: -2, z: 4.5 }, { x: 3.5, z: -2.3 }, { x: 3.5, z: 2.3 },
];
export const DESK_SIZE = { w: 1.1, d: 2.1 };

export const PROPS = {
  lectern: { x: -9, z: 0 },
  screen: { x: -11.78, z: 0 },
  whiteboard: { x: -5, z: 8.78 },
  printer: { x: 10.7, z: -6.5 },
  cabinet: { x: 11.3, z: -1.5 },
  vending: { x: 11.05, z: 3.6 },
  coffee: { x: 5.5, z: 8.35 },
  plant: { x: 11.1, z: 8.1 },
  clock: { x: 6, z: -8.78 },
  exitDoor: { x: 0, z: -16.8 },
  vault: { x: -4.75, z: -13.5 },
};

export const SPAWNS = [
  [-6.6, -3.2, -Math.PI / 2],
  [-6.2, -1.6, -Math.PI / 2],
  [-6.8, 0, -Math.PI / 2],
  [-6.2, 1.6, -Math.PI / 2],
  [-6.6, 3.2, -Math.PI / 2],
];

export const VICTORY_SPOTS = [
  [-2.4, -15.2, 0], [-1.2, -14.7, 0], [0, -14.4, 0], [1.2, -14.7, 0], [2.4, -15.2, 0],
];

export const EXIT_ZONE = { minX: -5, maxX: 5, minZ: -17, maxZ: -11 };

export function buildColliders() {
  const t = WALL_T, hw = DOOR.w / 2;
  const c = [
    // room walls
    { minX: ROOM.minX - t, maxX: ROOM.minX, minZ: ROOM.minZ - t, maxZ: ROOM.maxZ + t },
    { minX: ROOM.maxX, maxX: ROOM.maxX + t, minZ: ROOM.minZ - t, maxZ: ROOM.maxZ + t },
    { minX: ROOM.minX, maxX: ROOM.maxX, minZ: ROOM.maxZ, maxZ: ROOM.maxZ + t },
    { minX: ROOM.minX, maxX: -hw, minZ: ROOM.minZ - t, maxZ: ROOM.minZ },
    { minX: hw, maxX: ROOM.maxX, minZ: ROOM.minZ - t, maxZ: ROOM.minZ },
    // the locked door (disabled once opened)
    { id: 'door', minX: -hw, maxX: hw, minZ: ROOM.minZ - t, maxZ: ROOM.minZ },
    // lobby walls
    { minX: LOBBY.minX - t, maxX: LOBBY.minX, minZ: LOBBY.minZ - t, maxZ: LOBBY.maxZ },
    { minX: LOBBY.maxX, maxX: LOBBY.maxX + t, minZ: LOBBY.minZ - t, maxZ: LOBBY.maxZ },
    { minX: LOBBY.minX, maxX: LOBBY.maxX, minZ: LOBBY.minZ - t, maxZ: LOBBY.minZ },
    // furniture
    ...DESKS.map((d) => box(d.x, d.z, DESK_SIZE.w, DESK_SIZE.d)),
    box(PROPS.lectern.x, PROPS.lectern.z, 0.9, 1.1),
    box(-11.6, 0, 0.8, 7.4),                                  // screen stage
    box(PROPS.printer.x, PROPS.printer.z, 1.4, 1.3),
    box(PROPS.cabinet.x, PROPS.cabinet.z, 1.0, 1.0),
    box(PROPS.vending.x, PROPS.vending.z, 1.3, 1.4),
    box(PROPS.coffee.x, PROPS.coffee.z, 3.2, 1.1),
    box(PROPS.plant.x, PROPS.plant.z, 0.9, 0.9),
    box(-11.2, -8.2, 0.9, 0.9), box(-11.2, 8.2, 0.9, 0.9),   // decorative plants
    box(PROPS.whiteboard.x, 8.85, 3.6, 0.3),
    box(-3.8, -16.6, 1.6, 0.8), box(3.8, -16.6, 1.6, 0.8),   // lobby benches
  ];
  return c;
}

/** Areas the camera may occupy (for simple wall-occlusion avoidance). */
export const OPEN_SPACES = [
  { minX: ROOM.minX + 0.25, maxX: ROOM.maxX - 0.25, minZ: ROOM.minZ + 0.25, maxZ: ROOM.maxZ - 0.25 },
  { minX: LOBBY.minX + 0.25, maxX: LOBBY.maxX - 0.25, minZ: LOBBY.minZ + 0.25, maxZ: LOBBY.maxZ },
  { minX: -DOOR.w / 2 + 0.2, maxX: DOOR.w / 2 - 0.2, minZ: ROOM.minZ - 0.6, maxZ: ROOM.minZ + 0.6 },
];
