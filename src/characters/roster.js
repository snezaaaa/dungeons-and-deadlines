/**
 * CHARACTER ROSTER
 * ----------------
 * Every character is pure data. The renderer (Avatar.jsx) picks a model based on `model.type`:
 *   - 'procedural' : built-in blocky avatar (BlockyAvatar.jsx) driven by `look`
 *   - 'glb'        : a custom GLB file, e.g. generated from a reference photo.
 *
 * To swap in a custom avatar later, drop a file into /public/avatars and change e.g.:
 *   model: { type: 'glb', url: 'avatars/mastermind.glb', scale: 1, yOffset: 0,
 *            clips: { idle: 'Idle', walk: 'Walk', run: 'Run', cheer: 'Cheer', dance: 'Dance' } }
 * If the GLB fails to load, the game automatically falls back to the procedural avatar.
 */

export const ROSTER = [
  {
    id: 'mastermind',
    name: 'The Mastermind',
    color: '#a78bfa',
    skill: 'Decodes riddles',
    tagline: 'Has a plan. Has a backup plan. Has a spreadsheet of plans.',
    idleStyle: 'thinker',
    defaultMood: 'smug',
    model: { type: 'procedural' },
    look: {
      skin: '#f1c7a5', hair: '#3b2a20', hairStyle: 'neat',
      shirt: '#6d4bd8', shirtDetail: '#f5f0ff', pants: '#3d3f52', shoes: '#1e1e28',
      accessory: 'glasses',
    },
  },
  {
    id: 'joker',
    name: 'The Joker',
    color: '#fb923c',
    skill: 'Tells jokes to machines',
    tagline: 'Treats every crisis as an open mic night.',
    idleStyle: 'bouncy',
    defaultMood: 'grin',
    model: { type: 'procedural' },
    look: {
      skin: '#c98d62', hair: '#1c1c1c', hairStyle: 'cap',
      shirt: '#f97316', shirtDetail: '#22c55e', pants: '#2563eb', shoes: '#f5f5f5',
      accessory: 'hoodie',
    },
  },
  {
    id: 'boss',
    name: 'The Boss',
    color: '#60a5fa',
    skill: 'Negotiates with anything',
    tagline: 'Would like to speak to the manager. Is the manager.',
    idleStyle: 'boss',
    defaultMood: 'serious',
    model: { type: 'procedural' },
    look: {
      skin: '#8d5a3b', hair: '#111111', hairStyle: 'slick',
      shirt: '#1e2a4a', shirtDetail: '#ffffff', pants: '#1a2440', shoes: '#0d0d0d',
      accessory: 'suit',
    },
  },
  {
    id: 'commentator',
    name: 'The Commentator',
    color: '#facc15',
    skill: 'Broadcast-grade voice',
    tagline: 'Narrates everything. Including this sentence.',
    idleStyle: 'talker',
    defaultMood: 'excited',
    model: { type: 'procedural' },
    look: {
      skin: '#f6d3b8', hair: '#d97706', hairStyle: 'curly',
      shirt: '#eab308', shirtDetail: '#1f2937', pants: '#374151', shoes: '#7c2d12',
      accessory: 'headset',
    },
  },
  {
    id: 'fighter',
    name: 'The Fighter',
    color: '#f87171',
    skill: 'Brute force',
    tagline: 'Solves problems. Mostly with shoulders.',
    idleStyle: 'boxer',
    defaultMood: 'determined',
    model: { type: 'procedural' },
    look: {
      skin: '#b0754e', hair: '#2b1810', hairStyle: 'buzz',
      shirt: '#dc2626', shirtDetail: '#ffffff', pants: '#991b1b', shoes: '#111827',
      accessory: 'headband',
    },
  },
];

export const SPEAKERS = {
  system: { name: 'ANNOUNCEMENT', color: '#ff4d4d' },
  ai: { name: 'PROMPTOTRON 3000', color: '#22d3ee' },
  narrator: { name: '', color: '#cbd5e1' },
  ...Object.fromEntries(ROSTER.map((c) => [c.id, { name: c.name, color: c.color }])),
};

export const indexOfChar = (id) => ROSTER.findIndex((c) => c.id === id);
