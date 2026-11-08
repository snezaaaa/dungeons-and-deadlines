/**
 * MISSION REGISTRY
 * Each playable mission exports the same shape so GameScene / UI never hard-code a mission:
 *   {
 *     id, number, title, tagline, status: 'available' | 'coming-soon',
 *     Level,                 // React Three Fiber component with the level geometry
 *     spawns,                // [[x, z, yaw], ...] one per character
 *     colliders(),           // -> AABB list (items with id may be toggled, e.g. 'door')
 *     openSpaces,            // rectangles the camera may occupy
 *     interactables,         // [{ id, x, z, r, label(state) -> string|null, use() }]
 *     intro(), endIntro(),   // opening cinematic dialogue
 *     update(),              // per-frame zone checks
 *     objective(state),      // HUD objective text
 *     reset(),
 *     cinematics: { intro: [...shots], door, victory }  // camera shot definitions
 *     lesson: { title, points[] }                        // educational debrief
 *   }
 * Each mission lives in its own folder and exports this object from index.js.
 * Extra optional fields: announcement, certificate, ranks, attemptLabel, startYaw, initialState(),
 *   hudItems(state), HudExtra, PuzzleUI (modal shown while builderOpen), Overlay, extraStats(state).
 */
import mission1 from './mission1/index.js';
import mission2 from './mission2/index.js';
import mission3 from './mission3/index.js';

export const MISSIONS = [
  mission1,
  mission2,
  mission3,
];

export const getMission = (id) => MISSIONS.find((m) => m.id === id);
