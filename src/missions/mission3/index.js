// Mission 3 — THE FINAL CERTIFICATE (see registry.js for the mission interface)
import VaultHall from './VaultHall.jsx';
import * as m3 from './logic.js';
import { VaultPuzzle, StrikesHud, LockdownOverlay, Finale } from './ui.jsx';
import { SEALS } from './dilemmas.js';
import { SPAWNS, buildColliders, OPEN_SPACES } from './layout.js';

export default {
  id: 'mission3', number: 3, title: 'The Final Certificate', status: 'available',
  tagline: 'The Certificate Vault. Four Seals of Responsible AI, a laser corridor, and one final prompt. Also: a 4,000-slide PowerPoint.',
  announcement: 'ATTENTION PARTICIPANTS. THE FINAL CERTIFICATE REQUIRES... ONE LAST PROMPT.',
  certificate: 'CERTIFICATE 100% UNLOCKED · AI READY',
  attemptLabel: 'Final prompt attempts',
  ranks: ['AI READY: DISTINCTION', 'AI READY', 'AI READY (EVENTUALLY)'],
  extraStats: (s) => `Seal strikes: ${s.ms.strikes || 0} · Lockdowns: ${s.ms.lockdowns || 0} · Laser zaps: ${s.ms.zaps || 0}`,
  startYaw: 0,
  initialState: m3.initialState,
  PuzzleUI: VaultPuzzle,
  HudExtra: StrikesHud,
  Overlay: LockdownOverlay,
  Finale,
  hudItems: (s) => [
    ...SEALS.slice().sort((a, b) => a.key - b.key).map((x) => ({ id: x.id, label: `${x.key} ${x.label}`, color: x.color, got: s.inventory.includes(x.id) })),
    { id: 'final', label: '4 FINAL PROMPT', color: '#e879f9', got: s.doorOpen },
  ],
  Level: VaultHall,
  spawns: SPAWNS,
  colliders: buildColliders,
  openSpaces: OPEN_SPACES,
  interactables: m3.INTERACTABLES,
  intro: m3.intro, endIntro: m3.endIntro, update: m3.update, objective: m3.objective, reset: m3.reset,
  cinematics: {
    intro: [
      { d: 5, from: [7, 2.4, 13.4], to: [4, 3.0, 11], look: [0, 4.4, 0], lookTo: [0, 4.6, 0] },
      { d: 5, from: [0, 4.0, 5.5], to: [0, 4.4, 3.6], look: [0, 4.8, 0], lookTo: [0, 4.8, 0] },
      { d: 6, from: [-4.5, 1.8, 6.2], to: [4.5, 1.8, 6.2], look: [0, 1.4, 8.8], lookTo: [0, 1.4, 8.8] },
      { d: 99, from: [0, 2.3, 5.6], to: [0, 2.6, 4.8], look: [0, 1.4, 8.8], lookTo: [0, 1.4, 8.8] },
    ],
    lockdown: { pos: [0, 3.0, 5.5], look: [0, 4.6, 0], k: 2 },
    vault: { pos: [2.6, 2.6, -21.2], look: [0, 2.6, -27.9], k: 2 },
    victory: { center: [0, 1.3, -24.2], radius: 5.2, height: 2.3 },
  },
  lesson: {
    title: 'Using AI Responsibly as an Educator',
    points: [
      ['PRIVACY', 'Never paste identifiable student data into public AI tools. Anonymise, share the minimum, and use school-approved tools.'],
      ['INTEGRITY', 'AI detectors are unreliable. Talk with students, look at their process, and set clear rules for when and how AI use is disclosed.'],
      ['BIAS', 'AI mirrors the stereotypes in its training data. Ask for diverse representation explicitly and review what comes back.'],
      ['OVERSIGHT', 'AI drafts, humans decide. Spot-check its work and keep the final judgement on anything that affects students.'],
    ],
    example: {
      bad: '"Write a newsletter about AI for parents. Here are all my students\' names and grades."',
      good: '"You are a friendly school communications specialist who writes for families. Write a parent newsletter explaining how our class uses AI tools. For parents of 5th graders, many new to AI and some worried about privacy. Three short sections with headings, in plain language, under 300 words. Use no student names or personal data, say clearly that AI helped draft it, avoid stereotypes, and treat it as a draft for my review."',
    },
    extra: 'Check your school or district AI policy before using any tool with students. Responsible use is a habit, not a single setting.',
  },
};
