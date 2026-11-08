// Mission 3 — THE FINAL CERTIFICATE
// The Certificate Vault, guarded by THE ADMINISTRATOR and its 4,000-slide presentation.
//  1. Hall of Seals: four responsible-AI dilemmas, each answered by one character (3 strikes = lockdown).
//  2. Laser Corridor of Mandatory Compliance: blinking gates + low sweeping lasers to jump over.
//  3. Vault Core: the Commentator powers the console; write THE FINAL PROMPT (RTCF + guardrails).
import { useGame } from '../../game/store.js';
import { world, emote, placeCharacters } from '../../game/world.js';
import { sfx } from '../../game/audio.js';
import { ROSTER, indexOfChar } from '../../characters/roster.js';
import { SEALS, sealById, answerSeal, STRIKES_FOR_LOCKDOWN } from './dilemmas.js';
import { evaluateFinalPrompt, hasAllSeals, HINTS } from './finalPrompt.js';
import { LASERS, laserState, laserHits, checkpointFor, CORRIDOR } from './lasers.js';
import { SEAL_POS, PROPS, SPAWNS, CORE_SPOTS, VICTORY_SPOTS, CORE_ENTRY_Z } from './layout.js';

const G = () => useGame.getState();
const say = (lines, opts) => G().say(lines, opts);
const activeId = () => ROSTER[G().active].id;
const ms = () => G().ms;

export const initialState = () => ({
  modal: null, seal: null, wrongPicks: {}, lastAnswer: null,
  strikes: 0, lockdowns: 0, lockdown: false,
  zaps: 0, furthestZ: 1, lastZapAt: -99,
  teamInCore: false, consoleOn: false,
});

// ---------------------------------------------------------------- seals
const WRONG_FLAVOR = {
  mastermind: 'The seal scanned me and said "too clever by half".',
  joker: 'I told the seal a joke. It said "ACCESS DENIED. ALSO NOT FUNNY."',
  boss: 'I tried pulling rank. The seal does not recognise rank.',
  commentator: 'The seal says my voice is "reserved for the grand finale". Flattering!',
  fighter: 'I tried to punch the seal. It is made of ethics. You cannot punch ethics.',
};
const SEAL_WIN = {
  privacy: { who: 'boss', mood: 'serious', text: 'Confidential means confidential. Need-to-know basis. And the public chatbot does not need to know.' },
  integrity: { who: 'mastermind', mood: 'smug', text: 'A detector score is a hypothesis, not a verdict. When in doubt: talk to the human.' },
  bias: { who: 'joker', mood: 'grin', text: 'Brad the engineer, Brad the scientist, Brad the astronaut... the joke writes itself, and it is NOT funny. Fixed.' },
  oversight: { who: 'fighter', mood: 'determined', text: 'HUMAN. OVERRIDE. (The lever was very stiff. I am stiffer.)' },
};
const ADMIN_WRONG = [
  'INCORRECT. Wonderful. I am adding forty slides to your presentation.',
  'Fascinating choice. Legally fascinating. Strike recorded.',
  'Ah, the "move fast and break students" approach. Strike.',
];

function openModal(modal, extra = {}) {
  G().patchMs({ modal, lastAnswer: null, ...extra });
  G().clearDialogue();
  G().openBuilder();
  document.exitPointerLock?.();
}
export function closeModal() {
  G().closeBuilder();
  G().patchMs({ modal: null, lastAnswer: null });
}

function sealInteractable(seal) {
  const p = SEAL_POS[seal.id];
  return {
    id: `seal_${seal.id}`, x: p.x + (p.x < 0 ? 1.4 : -1.4), z: p.z, r: 1.8,
    label: (s) => (s.inventory.includes(seal.id) ? `${seal.label} seal secured` : `Unlock the ${seal.label} seal`),
    use: () => {
      if (G().inventory.includes(seal.id)) return say({ who: activeId(), text: `The ${seal.label} seal is glowing proudly. As it should.` }, { interrupt: true });
      if (activeId() !== seal.who) {
        sfx.deny();
        emote(G().active, 'shrug', 1.6);
        const owner = ROSTER[indexOfChar(seal.who)];
        return say({ who: activeId(), mood: 'sad', text: `${WRONG_FLAVOR[activeId()]} The ${seal.label} seal answers to ${owner.name} (${seal.key}).` }, { interrupt: true });
      }
      sfx.interact();
      openModal('seal', { seal: seal.id });
    },
  };
}

/** Called by the seal dilemma UI. Returns the answerSeal() result. */
export function chooseSealOption(sealId, optionId) {
  const r = answerSeal(sealId, optionId);
  const seal = sealById(sealId);
  G().patchMs({ lastAnswer: { optionId, ...r } });
  if (r.correct) {
    G().collect(sealId);
    sfx.pickup();
    emote(G().active, 'cheer', 2.5);
    G().showToast({ title: `SEAL SECURED: ${seal.label}`, body: `Guardrail unlocked: "${seal.clause}"`, tip: r.why, color: seal.color });
    const n = SEALS.filter((s) => G().inventory.includes(s.id)).length;
    const lines = [SEAL_WIN[sealId]];
    if (n === SEALS.length) {
      lines.push(
        { who: 'admin', text: 'All four seals? Hmm. The barrier is... lowered. Beyond it lies the Laser Corridor of Mandatory Compliance. Mind your ankles.' },
        { who: 'commentator', mood: 'excited', text: 'THE BARRIER IS DOWN! Jump the low lasers with SPACE, folks, and wait for the blinking gates!' },
      );
    } else {
      lines.push({ who: 'admin', text: `Seal ${n} of 4. I remain unimpressed. Slide 2 of 4,000 is loading.` });
    }
    say(lines, { interrupt: true });
    return r;
  }
  // wrong answer: strike
  sfx.fail();
  world.alarm = 1;
  emote(G().active, 'facepalm', 2);
  const strikes = ms().strikes + 1;
  G().patchMs((m) => ({ strikes, wrongPicks: { ...m.wrongPicks, [sealId]: [...(m.wrongPicks[sealId] || []), optionId] } }));
  say({ who: 'admin', text: `${ADMIN_WRONG[(strikes - 1) % ADMIN_WRONG.length]} Strike ${strikes} of ${STRIKES_FOR_LOCKDOWN}.` }, { interrupt: true });
  if (strikes >= STRIKES_FOR_LOCKDOWN) setTimeout(startLockdown, 1800);
  return r;
}

// ---------------------------------------------------------------- lockdown (failure state)
function startLockdown() {
  if (ms().lockdown) return;
  closeModal();
  G().patchMs((m) => ({ lockdown: true, lockdowns: m.lockdowns + 1 }));
  world.cine = { mode: 'lockdown', t: 0 };
  G().setPhase('cutscene');
  sfx.siren(3);
  ROSTER.forEach((_, i) => emote(i, 'facepalm', 9));
  say([
    { who: 'system', text: 'THREE STRIKES. VAULT LOCKDOWN. COMMENCING MANDATORY COMPLIANCE TRAINING.', duration: 3.6 },
    { who: 'admin', text: 'Slide 1: "Why Slides Matter". Slide 2: "Slides, Continued". Slide 3: a stock photo of people shaking hands in front of a laptop.', duration: 4.4 },
    { who: 'narrator', text: '...Four hundred slides later, the team has aged slightly and learned nothing new. The strikes have been reset.', duration: 4 },
    { who: activeId(), mood: 'sad', text: 'Never again. Read each dilemma carefully. Think like a responsible teacher, not a robot.',
      then: () => {
        G().patchMs({ lockdown: false, strikes: 0 });
        world.cine = { mode: null, t: 0 };
        G().setPhase('playing');
      } },
  ], { interrupt: true });
}

// ---------------------------------------------------------------- lasers
export const laserStates = LASERS.map((l) => laserState(l, 0));
if (typeof window !== 'undefined') window.__lasers = laserStates; // for automated tests / debugging

function updateLasers(st) {
  LASERS.forEach((l, i) => { laserStates[i] = laserState(l, world.time); });
  if (st.phase !== 'playing' || st.builderOpen) return;
  const c = world.chars[st.active];
  const inCorridor = c.z < CORRIDOR.maxZ && c.z > CORRIDOR.minZ;
  if (!inCorridor) return;
  if (c.z < ms().furthestZ - 0.5) G().patchMs({ furthestZ: c.z });
  if (world.time - ms().lastZapAt < 0.8) return;
  const hitIdx = LASERS.findIndex((l, i) => laserHits(l, laserStates[i], c));
  if (hitIdx < 0) return;
  zap(c, st);
}

function zap(c, st) {
  const cp = checkpointFor(ms().furthestZ);
  Object.assign(c, { x: 0, z: cp, vx: 0, vz: 0, vy: 0, y: 0, grounded: true, stunUntil: world.time + 0.5 });
  world.cam.yaw = 0;
  world.alarm = 0.7;
  sfx.fail();
  emote(st.active, 'shrug', 1.2);
  const zaps = ms().zaps + 1;
  G().patchMs({ zaps, lastZapAt: world.time });
  const quips = [
    'ZAP! Mandatory Training Module 47 assigned. Returning you to the checkpoint.',
    'ZAP! That laser was rated "PG: Painfully Graded". Back to the checkpoint.',
    'ZAP! Your compliance has been noted. Loudly.',
  ];
  if (!G().dialogue.current) say({ who: 'admin', text: quips[zaps % quips.length], duration: 2.4 });
}

// ---------------------------------------------------------------- final prompt
export function testFinalPrompt() {
  const st = G();
  const result = evaluateFinalPrompt(st.selection, st.inventory);
  st.recordAttempt(result);
  if (result.success) { sfx.success(); return result; }
  sfx.fail();
  world.alarm = 1;
  emote(st.active, 'facepalm', 2);
  const first = result.wrong.includes('guardrails') ? 'guardrails' : result.wrong[0] || result.missing[0];
  say([
    { who: 'admin', text: `PROMPT REJECTED. Quality: ${result.score}%. I knew you would fail. I made a slide about it.` },
    { who: 'mastermind', text: `Hint: ${HINTS[first]}` },
  ], { interrupt: true });
  return result;
}

export function startVaultSequence() {
  const st = G();
  closeModal();
  st.openDoor();
  sfx.door();
  world.cine = { mode: 'vault', t: 0 };
  st.setPhase('cutscene');
  ROSTER.forEach((_, i) => emote(i, 'cheer', 8));
  say([
    { who: 'admin', text: 'Role. Task. Context. Format. Guardrails. Privacy, honesty, fairness... and a human in charge. That is... that is actually a good prompt.' },
    { who: 'admin', text: 'Very well. Opening the vault. Cancelling slides 2 through 4,000. ...I will miss them.' },
    { who: 'commentator', mood: 'excited', text: 'THE VAULT! IS! OPEN! I can see them, folks! FIVE! GOLDEN! CERTIFICATES!' },
    { who: 'boss', mood: 'shock', text: 'Is that... gold leaf? The training budget is in serious trouble.', then: startVictory },
  ], { interrupt: true });
}

export function startVictory() {
  const st = G();
  useGame.setState({ finishedAt: performance.now() });
  placeCharacters(VICTORY_SPOTS);
  ROSTER.forEach((_, i) => emote(i, 'dance', 90));
  world.cine = { mode: 'victory', t: 0 };
  st.setPhase('victory');
  sfx.success();
  setTimeout(() => sfx.success(), 1600);
  st.say([
    { who: 'system', text: 'CERTIFICATE PROGRESS: 100%. CONGRATULATIONS. YOU ARE OFFICIALLY... AI READY.' },
    { who: 'mastermind', mood: 'smug', text: 'Write clear prompts. Check the facts. Protect the students. Keep a human in charge. Exactly as planned.' },
    { who: 'joker', mood: 'grin', text: 'I would like to thank the printer, the fridge, and Kevin the goat, who never existed.' },
    { who: 'boss', mood: 'happy', text: 'I am framing this. Then I am scheduling a meeting about it.' },
    { who: 'fighter', mood: 'happy', text: 'Best training ever. Still would have liked to punch one door.' },
    { who: 'commentator', mood: 'excited', text: 'AND THAT IS THE FINAL WHISTLE! FIVE EDUCATORS! THREE MISSIONS! ONE FINAL PROMPT! GOODNIGHT, TRAINING CENTER!',
      then: () => G().setPhase('complete') },
  ], { interrupt: true });
}

// ---------------------------------------------------------------- interactables
export const INTERACTABLES = [
  ...SEALS.map(sealInteractable),
  {
    id: 'barrier', x: 0, z: 1.3, r: 1.8,
    label: (s) => (hasAllSeals(s.inventory) ? null : 'Touch the energy barrier'),
    use: () => {
      sfx.deny();
      const n = SEALS.filter((s) => G().inventory.includes(s.id)).length;
      say([
        { who: 'admin', text: `BARRIER ACTIVE. Seals secured: ${n} of 4. Please enjoy this complimentary static shock.` },
        { who: activeId(), mood: 'angry', text: 'Ow. Okay. Seals first.' },
      ], { interrupt: true });
    },
  },
  {
    id: 'trophy', x: PROPS.trophy.x + 1.2, z: PROPS.trophy.z, r: 1.6,
    label: () => 'Read the trophy case',
    use: () => {
      sfx.interact();
      say([
        { who: 'narrator', text: 'EMPLOYEE OF THE MONTH: PROMPTOTRON 3000 (twelve months running). RUNNER-UP: a stapler.' },
        { who: activeId(), mood: 'smug', text: 'Honestly, the stapler deserved it.' },
      ], { interrupt: true });
    },
  },
  {
    id: 'brewJr', x: PROPS.brewJr.x - 1.2, z: PROPS.brewJr.z, r: 1.6,
    label: () => 'Visit BREW-9000 Jr.',
    use: () => {
      sfx.pickup();
      emote(G().active, 'cheer', 1.4);
      say([
        { who: 'brew', text: 'Hello! I am BREW-9000 Jr. Coffee? Fact: coffee beans are seeds of the coffee cherry. Source: University Botany Department. I cite everything now.' },
        { who: activeId(), mood: 'happy', text: 'Character growth. Love to see it.' },
      ], { interrupt: true });
    },
  },
  {
    id: 'console', x: PROPS.console.x, z: PROPS.console.z + 1.2, r: 1.8,
    label: (s) => (s.doorOpen ? null : !s.ms.consoleOn ? 'Power up the FINAL PROMPT console' : 'Write THE FINAL PROMPT'),
    use: () => {
      if (!ms().consoleOn) {
        if (activeId() !== 'commentator') {
          sfx.deny();
          return say({ who: activeId(), mood: 'sad', text: 'The console says: "VOICE AUTHORISATION: GRAND FINALE GRADE ONLY." That is the Commentator (4).' }, { interrupt: true });
        }
        sfx.success();
        emote(G().active, 'cheer', 2.5);
        G().patchMs({ consoleOn: true });
        return say([
          { who: 'commentator', mood: 'excited', text: 'TESTING! ONE, TWO! LIVE FROM THE CERTIFICATE VAULT, IT IS THE FINAL! PROMPT! CONSOLE!' },
          { who: 'admin', text: 'Console online. Write a parent newsletter about AI use in your class. Role, Task, Context, Format... and Guardrails. Impress me. You will not.' },
        ], { interrupt: true });
      }
      sfx.interact();
      openModal('final');
    },
  },
  {
    id: 'vault', x: PROPS.vault.x, z: PROPS.vault.z + 1.6, r: 1.8,
    label: (s) => (s.doorOpen ? null : 'Inspect the vault door'),
    use: () => {
      sfx.deny();
      say({ who: 'admin', text: 'This vault door is 40 centimetres of steel and 4,000 slides of policy. It opens for one thing only: a responsible, well-written prompt.' }, { interrupt: true });
    },
  },
];

// ---------------------------------------------------------------- flow
export function intro() {
  const st = G();
  world.alarm = 1;
  sfx.siren(3);
  st.say([
    { who: 'system', mood: 'shock', text: 'ATTENTION PARTICIPANTS. THE FINAL CERTIFICATE REQUIRES... ONE LAST PROMPT.', duration: 4.2 },
    { who: 'admin', text: 'Welcome to the Certificate Vault. I am THE ADMINISTRATOR. I have prepared a short presentation. Slide 1 of 4,000.' },
    { who: 'joker', mood: 'shock', text: 'Four THOUSAND?!' },
    { who: 'admin', text: 'Your certificates lie beyond the four Seals of Responsible AI, the Laser Corridor of Mandatory Compliance, and one final prompt. Three wrong answers at the Seals, and you watch the whole presentation.' },
    { who: 'boss', mood: 'serious', text: 'I have sat through worse. I have RUN worse.' },
    { who: 'commentator', mood: 'excited', text: 'THIS IS IT, FOLKS! THE FINALE! Three missions! Five educators! One extremely long PowerPoint!' },
    { who: 'mastermind', text: 'Each Seal is a classroom dilemma and needs one of us. Think like a responsible teacher, not a robot.', then: () => endIntro() },
  ], { interrupt: true });
}

export function endIntro() {
  const st = G();
  if (st.phase !== 'intro') return;
  world.cine = { mode: null, t: 0 };
  world.alarm = 0;
  st.setPhase('playing');
  if (!st.startedAt) useGame.setState({ startedAt: performance.now() });
  setTimeout(() => G().phase === 'playing' && !G().dialogue.current && say({
    who: 'mastermind', text: 'Seals: INTEGRITY is mine (1), BIAS is the Joker\'s (2), PRIVACY is the Boss\'s (3), OVERSIGHT is the Fighter\'s (5). Commentator, save your voice for the finale.',
  }), 600);
}

export function objective(s) {
  if (s.doorOpen) return 'Collect your certificates!';
  const n = SEALS.filter((x) => s.inventory.includes(x.id)).length;
  if (n < SEALS.length) return `Secure the 4 Seals of Responsible AI (${n}/4)`;
  if (!s.ms.teamInCore) return 'Cross the Laser Corridor: SPACE to jump low lasers, wait for blinking gates';
  if (!s.ms.consoleOn) return 'Power up the Final Prompt console (needs The Commentator)';
  return 'Write THE FINAL PROMPT at the console';
}

export function update(dt, st) {
  if (st.paused) return;
  for (const col of world.colliders) if (col.id === 'sealgate') col.enabled = !hasAllSeals(st.inventory);
  updateLasers(st);
  if (st.phase !== 'playing') return;
  const c = world.chars[st.active];
  if (!st.ms.teamInCore && c.z < CORE_ENTRY_Z) {
    // the rest of the team sprints through the corridor behind you
    let k = 0;
    world.chars.forEach((o, i) => {
      if (i === st.active) return;
      const [x, z] = CORE_SPOTS[k++];
      Object.assign(o, { x, z, vx: 0, vz: 0 });
    });
    G().patchMs({ teamInCore: true });
    sfx.pickup();
    say([
      { who: 'narrator', text: 'The rest of the team sprints through the corridor behind you, somehow without touching a single laser. Show-offs.' },
      { who: 'mastermind', text: 'The Final Prompt console. Commentator (4), power it up.' },
    ], { interrupt: true });
  }
}

export function reset() {
  placeCharacters(SPAWNS);
  world.cine = { mode: null, t: 0 };
  world.alarm = 0;
}
