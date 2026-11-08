// Mission 2 — THE COFFEE BREAK CRISIS (see registry.js for the mission interface)
import BreakRoom from './BreakRoom.jsx';
import * as m2 from './logic.js';
import { FactChecker, CaffeineMeter, NapOverlay } from './ui.jsx';
import { SOURCES, RELIABLE_IDS } from './factCheck.js';
import { SPAWNS, buildColliders, OPEN_SPACES } from './layout.js';

const SHORT = { encyclopedia: 'BOOK', botany: 'FRIDGE', spec: 'SPEC', cctv: 'CCTV', log: 'LOG' };
const ORDER = ['encyclopedia', 'botany', 'spec', 'cctv', 'log']; // matches character keys 1-5

export default {
  id: 'mission2', number: 2, title: 'The Coffee Break Crisis', status: 'available',
  tagline: 'The coffee machine has become "intelligent" and confidently wrong. Find real sources, fact-check its claims, stay awake.',
  announcement: 'ATTENTION PARTICIPANTS. COFFEE SERVICE HAS BEEN SUSPENDED.',
  certificate: 'CERTIFICATE 66% UNLOCKED',
  attemptLabel: 'Fact-check attempts',
  ranks: ['MASTER FACT-CHECKER', 'SOURCE SLEUTH', 'KEVIN BELIEVER'],
  extraStats: (s) => `Naps: ${s.ms.naps || 0} · Mop-Bot collisions: ${s.ms.bumps || 0}`,
  startYaw: Math.PI / 2,
  initialState: m2.initialState,
  PuzzleUI: FactChecker,
  HudExtra: CaffeineMeter,
  Overlay: NapOverlay,
  hudItems: (s) => ORDER.filter((k) => RELIABLE_IDS.includes(k)).map((id, i) => ({ id, label: `${i + 1} ${SHORT[id]}`, color: SOURCES[id].color, got: s.inventory.includes(id) })),
  Level: BreakRoom,
  spawns: SPAWNS,
  colliders: buildColliders,
  openSpaces: OPEN_SPACES,
  interactables: m2.INTERACTABLES,
  intro: m2.intro, endIntro: m2.endIntro, update: m2.update, objective: m2.objective, reset: m2.reset,
  cinematics: {
    intro: [
      { d: 5, from: [9, 3.7, 6.5], to: [5.5, 3.3, 4], look: [-9, 2.0, 0], lookTo: [-9, 2.2, 0] },
      { d: 5, from: [-5.2, 2.3, 2.2], to: [-6.3, 2.4, 0.9], look: [-8.6, 2.3, 0], lookTo: [-8.6, 2.3, 0] },
      { d: 6, from: [-3.4, 1.6, 4.4], to: [-3.4, 1.7, 7.6], look: [-0.1, 1.4, 5.9], lookTo: [-0.1, 1.4, 6.5] },
      { d: 99, from: [-4.0, 2.4, 6.2], to: [-4.6, 2.8, 6.2], look: [-0.1, 1.4, 6.2], lookTo: [-0.1, 1.4, 6.2] },
    ],
    grounded: { pos: [-4.6, 2.3, 3.0], look: [-8.6, 1.9, 0] },
    nap: { pos: [3.5, 3.7, 7.4], look: [0, 0.6, 5.2], k: 1.5 },
    victory: { center: [0, 1.3, -14.8], radius: 5.2, height: 2.3 },
  },
  lesson: {
    title: 'Fact-Checking AI: Hallucinations & Sources',
    points: [
      ['HALLUCINATIONS', 'AI can state false things with total confidence ("a goat named Kevin, 1987"). Sounding sure is not the same as being right.'],
      ['CHECK THE SOURCE', 'Ask who wrote it and what they gain. BREW-9000 reviewing itself, or an anonymous forum post, is not evidence.'],
      ['READ LATERALLY', 'Compare the claim with independent, reliable sources: references, primary data, records, footage.'],
      ['RIGHT FOR THE RIGHT REASON', 'AI is not always wrong: 2 of the 5 claims were true. True claims need reliable evidence too.'],
    ],
    example: {
      bad: '"The AI said decaf has zero caffeine, so it does."',
      good: '"The AI said decaf has zero caffeine. The supplier\'s lab-tested spec sheet says at least 97% is removed, so small amounts remain. Verdict: the claim is false."',
    },
    extra: 'Classroom tip: when students use AI for research, ask them to show at least one independent source for every claim they keep, and to flag anything they could not verify.',
  },
};
