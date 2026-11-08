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
 * Missions 2 & 3 are registered as 'coming-soon' stubs: add a folder like mission1/ and fill in the shape.
 */
import TrainingCenter from './mission1/TrainingCenter.jsx';
import * as m1 from './mission1/logic.js';
import { SPAWNS, buildColliders, OPEN_SPACES } from './mission1/layout.js';

export const MISSIONS = [
  {
    id: 'mission1', number: 1, title: 'The Impossible Prompt', status: 'available',
    tagline: 'Collect Role, Task, Context and Output Format. Build the perfect prompt. Escape.',
    Level: TrainingCenter,
    spawns: SPAWNS,
    colliders: buildColliders,
    openSpaces: OPEN_SPACES,
    interactables: m1.INTERACTABLES,
    intro: m1.intro, endIntro: m1.endIntro, update: m1.update, objective: m1.objective, reset: m1.reset,
    cinematics: {
      // camera shots for the opening: from -> to positions & look targets, duration in seconds
      intro: [
        { d: 5, from: [10, 4.2, 8], to: [4, 3.4, 5], look: [-11, 2.4, 0], lookTo: [-11, 2.6, 0] },
        { d: 5, from: [-7.5, 2.2, 3], to: [-8.2, 2.6, 1.2], look: [-11.7, 2.5, 0], lookTo: [-11.7, 2.6, 0] },
        { d: 6, from: [-9.3, 1.5, -4.5], to: [-9.3, 1.6, 4.5], look: [-6.5, 1.5, -2], lookTo: [-6.5, 1.5, 2] },
        { d: 99, from: [-8.4, 2.4, 0.1], to: [-9.6, 3.0, 0.0], look: [-6.5, 1.4, 0], lookTo: [-6.5, 1.4, 0] },
      ],
      door: { pos: [3.2, 2.4, -4.2], look: [0, 1.5, -9.2] },
      victory: { center: [0, 1.3, -15.0], radius: 5.2, height: 2.3 },
    },
    lesson: {
      title: 'Prompt Engineering in 4 Ingredients',
      points: [
        ['ROLE', 'Tell the AI who to be. "You are an experienced instructional designer" gets expert-level answers.'],
        ['TASK', 'One clear, specific job. "Create a 45-minute lesson plan on photosynthesis" beats "do something with plants".'],
        ['CONTEXT', 'The audience and constraints: grade level, reading levels, available materials. Without it the AI guesses.'],
        ['OUTPUT FORMAT', 'Say how the answer should look: a table, a list, a word limit. Now you can actually use the result.'],
      ],
      example: {
        bad: 'Make a lesson about plants.',
        good: 'You are an experienced instructional designer who helps busy teachers. Create a 45-minute lesson plan that introduces photosynthesis. For 7th graders with mixed reading levels, in a classroom with no lab equipment. Present it as a table with columns: Time, Activity, Materials.',
      },
      extra: 'Pro tip: treat the first answer as a draft. Ask follow-ups ("make step 3 more hands-on") to iterate, and always check facts before using AI output with students.',
    },
  },
  {
    id: 'mission2', number: 2, title: 'The Coffee Break Crisis', status: 'coming-soon',
    tagline: 'The coffee machine has become self-aware. It wants a raise.',
  },
  {
    id: 'mission3', number: 3, title: 'The Final Certificate', status: 'coming-soon',
    tagline: 'The certificate vault. The final prompt. The longest PowerPoint in history.',
  },
];

export const getMission = (id) => MISSIONS.find((m) => m.id === id);
