// Mission 2 — THE COFFEE BREAK CRISIS
// BREW-9000, the break-room coffee machine, has become "intelligent" and confidently hallucinates.
// Players gather reliable evidence (one source per character skill), dodge Mop-Bots, keep their
// caffeine up, and fact-check five claims at the Fact-Check Station to ground the machine.
import { useGame } from '../../game/store.js';
import { world, emote, placeCharacters } from '../../game/world.js';
import { sfx } from '../../game/audio.js';
import { ROSTER } from '../../characters/roster.js';
import { inRect } from '../../game/collision.js';
import { PROPS, SPAWNS, VICTORY_SPOTS, EXIT_ZONE, BOT_PATHS } from './layout.js';
import { SOURCES, CLAIMS, evaluateFactCheck, HINTS } from './factCheck.js';

const G = () => useGame.getState();
const say = (lines, opts) => G().say(lines, opts);
const activeId = () => ROSTER[G().active].id;
const ms = () => G().ms;

export const CAFFEINE_DRAIN = 0.34;   // % per second while exploring (~5 minutes from full)
export const BOT_SPEED = 1.7;

export const initialState = () => ({
  caffeine: 100, naps: 0, bumps: 0, napping: false,
  dishwasherMoved: false, fridgeOpen: false, drawerOpen: false, cctvPlayed: false,
  donuts: 3, sugarReadyAt: 0, answers: {}, brewMood: 'smug', lastQuipAt: -99,
});

// ---------------------------------------------------------------- evidence
function giveSource(id, lines) {
  if (!G().collect(id)) return false;
  sfx.pickup();
  emote(G().active, 'cheer', 2);
  const s = SOURCES[id];
  const claim = CLAIMS.find((c) => s.claims[c.id]);
  G().showToast({
    title: s.reliable ? `EVIDENCE FOUND: ${s.title.toUpperCase()}` : `SOURCE PICKED UP: ${s.title.toUpperCase()}`,
    body: `"${s.claims[claim.id]}"`,
    tip: `Author: ${s.author}. ${s.reliable ? 'Who wrote it and how do they know? This one checks out.' : 'Hmm. Who wrote this, and what do they gain?'}`,
    color: s.color,
  });
  say(lines);
  const n = reliableCount();
  if (s.reliable) {
    say(n === 5
      ? { who: 'mastermind', mood: 'smug', text: 'That is all five reliable sources. To the Fact-Check Station. Let us ruin a coffee machine\'s whole day.' }
      : { who: 'brew', text: `Evidence ${n} of 5? Irrelevant. My confidence remains at 100%.` });
  }
  return true;
}
export const reliableCount = (s = G()) => s.inventory.filter((k) => SOURCES[k]?.reliable).length;

const WRONG = {
  bookshelf: {
    joker: 'This encyclopedia has no pictures. I cannot work under these conditions. Mastermind? (1)',
    boss: 'Reading? I delegate reading. The Mastermind is my delegate. (1)',
    commentator: 'He opens the book... he sees the word "historiography"... HE CLOSES THE BOOK! Mastermind, please! (1)',
    fighter: 'Book is very heavy. Words are very small. Mastermind. (1)',
  },
  fridge: {
    mastermind: 'The fridge display says "MOOD: COLD". It will not open for logic. It wants... comedy. Joker? (2)',
    boss: 'I ordered the fridge to open. It went on strike. We need the Joker. (2)',
    commentator: 'The fridge is SULKING, folks! It needs a laugh! Calling the Joker to the fridge! (2)',
    fighter: 'I tried to open it. It hummed at me. Aggressively. Joker? (2)',
  },
  desk: {
    mastermind: 'The drawer sign says "MANAGERS ONLY". I have three degrees but zero lanyards. Boss? (3)',
    joker: 'I knocked on the drawer. It asked for my job title. I said "vibes". Boss! (3)',
    commentator: 'A locked managerial drawer! Only one person in this building has the AURA! The Boss! (3)',
    fighter: 'I could break it, but HR is already watching me after the cabinet thing. Boss. (3)',
  },
  cctv: {
    mastermind: '"REPLAY REQUIRES DRAMATIC NARRATION." Of course it does. Commentator? (4)',
    joker: 'I tried narrating. It said my voice lacks "sports energy". Commentator! (4)',
    boss: 'The monitor demands a play-by-play. I only do quarterly reviews. Commentator. (4)',
    fighter: 'I said "replay". It said "with FEELING". I do not have feelings. Commentator. (4)',
  },
  dishwasher: {
    mastermind: 'This dishwasher weighs 140 kilograms. I calculated it. I cannot lift calculations. Fighter? (5)',
    joker: 'I pushed it. It pushed back. Emotionally. Fighter! (5)',
    boss: "This suit is dry-clean only. And so is my back. Fighter. (5)",
    commentator: 'He strains! He groans! It does not move a single millimetre! We need THE FIGHTER! (5)',
  },
};

function wrongChar(obj) {
  sfx.deny();
  emote(G().active, 'shrug', 1.6);
  say({ who: activeId(), mood: 'sad', text: WRONG[obj][activeId()] }, { interrupt: true });
}

function gated(obj, who, sourceId, onSuccess, already) {
  return () => {
    if (G().inventory.includes(sourceId)) return say({ who: activeId(), text: already }, { interrupt: true });
    if (activeId() !== who) return wrongChar(obj);
    onSuccess();
  };
}

// ---------------------------------------------------------------- caffeine
function addCaffeine(amount) {
  G().patchMs((m) => ({ caffeine: Math.min(100, m.caffeine + amount) }));
}

// ---------------------------------------------------------------- interactables
export const INTERACTABLES = [
  {
    id: 'station', x: PROPS.station.x + 1.1, z: PROPS.station.z, r: 1.8,
    label: (s) => (s.doorOpen ? null : 'Open the FACT-CHECK STATION'),
    use: () => {
      sfx.interact();
      G().clearDialogue();
      G().openBuilder();
      document.exitPointerLock?.();
    },
  },
  {
    id: 'brew', x: PROPS.brew.x + 1.1, z: PROPS.brew.z, r: 1.9,
    label: (s) => (s.doorOpen ? 'Thank BREW-9000' : 'Talk to BREW-9000'),
    use: () => {
      sfx.interact();
      if (G().doorOpen) return say({ who: 'brew', text: 'You are welcome. I now cite my sources. Even this sentence. (Source: me.) ...Sorry. Old habits.' }, { interrupt: true });
      const c = CLAIMS[Math.floor(world.time) % CLAIMS.length];
      say([
        { who: 'brew', text: `Reminder of an unquestionable fact: "${c.text}"` },
        { who: activeId(), mood: 'angry', text: ['Says who?', 'Source?', 'Citation needed.', 'Big if true.', 'Doubt.'][G().active] },
        { who: 'brew', text: 'Says ME. I am very confident. Confidence is basically the same as accuracy.' },
      ], { interrupt: true });
    },
  },
  {
    id: 'brochure', x: -8.1, z: 2.9, r: 1.3,
    label: (s) => (s.inventory.includes('brochure') ? 'Re-read the brochure' : 'Take a BREW-9000 brochure'),
    use: () => {
      if (!giveSource('brochure', { who: 'joker', mood: 'grin', text: 'A brochure written by the machine, about the machine, praising the machine. Five stars from... the machine.' })) {
        sfx.interact();
        say({ who: activeId(), text: '"BREW-9000: Voted best coffee machine by BREW-9000." Very convincing.' }, { interrupt: true });
      }
    },
  },
  {
    id: 'sugar', x: -8.1, z: -2.9, r: 1.3,
    label: () => 'Eat sugar packets (+10 caffeine-ish)',
    use: () => {
      if (world.time < ms().sugarReadyAt) { sfx.deny(); return say({ who: activeId(), mood: 'sad', text: 'Still processing the last six sugar packets. Give it a few seconds.' }, { interrupt: true }); }
      sfx.pickup();
      addCaffeine(10);
      G().patchMs({ sugarReadyAt: world.time + 12 });
      say({ who: activeId(), mood: 'excited', text: 'Sugar is not caffeine. But my body cannot tell the difference. Yet.' }, { interrupt: true });
    },
  },
  {
    id: 'donuts', x: PROPS.donutTable.x, z: PROPS.donutTable.z + 1.3, r: 1.7,
    label: (s) => (s.ms.donuts > 0 ? `Grab a donut (+30, ${s.ms.donuts} left)` : 'Stare at the empty donut box'),
    use: () => {
      if (ms().donuts <= 0) { sfx.deny(); return say({ who: activeId(), mood: 'sad', text: 'The donut box is empty. Like my soul. And my coffee cup.' }, { interrupt: true }); }
      sfx.pickup();
      addCaffeine(30);
      G().patchMs((m) => ({ donuts: m.donuts - 1 }));
      emote(G().active, 'cheer', 1.5);
      const lines = { mastermind: 'Glazed. Statistically the optimal donut.', joker: 'Why did the donut go to the dentist? It needed a filling. ...I will see myself out.', boss: 'I will expense this donut.', commentator: 'A DONUT! A MAGNIFICENT GLAZED VICTORY!', fighter: 'Protein. (It is not protein.)' };
      say({ who: activeId(), mood: 'happy', text: lines[activeId()] }, { interrupt: true });
    },
  },
  {
    id: 'cooler', x: PROPS.cooler.x - 1.0, z: PROPS.cooler.z, r: 1.5,
    label: () => 'Drink from the water cooler (+4)',
    use: () => {
      sfx.interact();
      addCaffeine(4);
      say({ who: activeId(), text: 'Water. Hydrating, healthy, and completely useless for this crisis.' }, { interrupt: true });
    },
  },
  {
    id: 'bookshelf', x: PROPS.bookshelf.x - 1.1, z: PROPS.bookshelf.z, r: 1.8,
    label: (s) => (s.inventory.includes('encyclopedia') ? 'Browse the bookshelf' : 'Search the reference bookshelf'),
    use: gated('bookshelf', 'mastermind', 'encyclopedia', () => giveSource('encyclopedia', [
      { who: 'mastermind', mood: 'smug', text: 'Encyclopedia of Food History. Edited, referenced, peer-reviewed. Page 212: a goat herder named Kaldi. Over a thousand years ago.' },
      { who: 'mastermind', mood: 'smug', text: 'Not 1987. Not Kevin. The machine made it up.' },
      { who: 'joker', mood: 'sad', text: "I was really rooting for Kevin." },
    ]), 'Nothing else here except "Advanced Spreadsheets, Volume 9". Tempting.'),
  },
  {
    id: 'fridge', x: PROPS.fridge.x - 1.2, z: PROPS.fridge.z, r: 1.8,
    label: (s) => (s.inventory.includes('botany') ? 'Check on the (happy) fridge' : 'Open the sulking fridge'),
    use: gated('fridge', 'joker', 'botany', () => {
      G().patchMs({ fridgeOpen: true });
      giveSource('botany', [
        { who: 'joker', mood: 'grin', text: 'Hey fridge, why so cold? ...Because you keep everything bottled up! HA!' },
        { who: 'narrator', text: 'The fridge laughs so hard its door swings open. Inside: half a sandwich, and a field card from the University Botany Department.' },
        { who: 'joker', mood: 'excited', text: '"Coffee beans are the seeds of the coffee cherry, a fruit." So the machine was RIGHT about that one?!' },
        { who: 'mastermind', text: 'Exactly. AI is not always wrong. That is what makes it tricky. Verify everything, true claims too.' },
      ]);
    }, 'The fridge is still giggling. Someone should check on it.'),
  },
  {
    id: 'desk', x: PROPS.desk.x, z: PROPS.desk.z + 1.1, r: 1.7,
    label: (s) => (s.inventory.includes('spec') ? "Look at the manager's desk" : "Open the manager's locked drawer"),
    use: gated('desk', 'boss', 'spec', () => {
      G().patchMs({ drawerOpen: true });
      giveSource('spec', [
        { who: 'boss', mood: 'serious', text: "Drawer. I am a manager. You are a drawer. Let us not make this awkward." },
        { who: 'narrator', text: 'The drawer opens out of pure professional respect. Inside: the supplier\'s lab-tested spec sheet for the decaf blend.' },
        { who: 'boss', mood: 'smug', text: '"At least 97% of caffeine removed. Small amounts remain." So decaf is NOT zero caffeine. Noted. Filed. Weaponised.' },
      ]);
    }, 'The drawer now contains only a stress ball. It looks very relaxed.'),
  },
  {
    id: 'cctv', x: PROPS.cctv.x, z: PROPS.cctv.z + 1.1, r: 1.7,
    label: (s) => (s.inventory.includes('cctv') ? 'Rewatch the security footage' : 'Replay the security camera footage'),
    use: gated('cctv', 'commentator', 'cctv', () => {
      G().patchMs({ cctvPlayed: true });
      giveSource('cctv', [
        { who: 'commentator', mood: 'excited', text: 'AND WE GO TO THE REPLAY! Tuesday, 9:14am! BREW-9000 approaches the espresso shot... AND IT IS ERROR 418! FOAM! EVERYWHERE!' },
        { who: 'commentator', mood: 'excited', text: 'Let\'s see that again in slow motion... it happened THREE TIMES! "Never had an error"?! The footage says OTHERWISE, folks!' },
      ]);
    }, 'Rewatching the foam incident. Still incredible. Still a crime against ceilings.'),
  },
  {
    id: 'dishwasher', x: PROPS.dishwasher.x, z: PROPS.dishwasher.z - 1.15, r: 1.7,
    label: (s) => (s.inventory.includes('log') ? 'Admire the relocated dishwasher' : 'Move the 140 kg dishwasher'),
    use: gated('dishwasher', 'fighter', 'log', () => {
      G().patchMs({ dishwasherMoved: true });
      sfx.door();
      giveSource('log', [
        { who: 'fighter', mood: 'determined', text: 'HNNNNGH. ...Moved it. Also found a fork from 2009.' },
        { who: 'narrator', text: 'Taped to the wall behind it: the official maintenance log. Signed. Dated. Smudged with mysterious foam.' },
        { who: 'fighter', mood: 'smug', text: '"Cups brewed this year: 312." So over 300 is TRUE. But "10,000 perfect cups"? Forty-seven complaints say no.' },
      ]);
    }, 'The dishwasher is fine where it is now. Do not tell facilities.'),
  },
  {
    id: 'bulletin', x: PROPS.bulletin.x, z: PROPS.bulletin.z - 1.0, r: 1.6,
    label: (s) => (s.inventory.includes('forum') ? 'Read the bulletin board' : 'Take the printout from the bulletin board'),
    use: () => {
      if (!giveSource('forum', { who: activeId(), text: 'A printout from a forum user called "CoffeeTruthz420". No sources. Lots of capital letters. Someone pinned it next to the fire-safety notice.' })) {
        sfx.interact();
        say({ who: activeId(), text: 'Also on the board: "LOST: my will to live. Last seen near the coffee machine."' }, { interrupt: true });
      }
    },
  },
  {
    id: 'sofa', x: PROPS.sofa.x, z: PROPS.sofa.z - 1.0, r: 1.4,
    label: () => 'Sit on the comfy sofa',
    use: () => {
      sfx.deny();
      say([
        { who: activeId(), mood: 'sad', text: 'So soft. So warm. I could just close my eyes for one second...' },
        { who: 'commentator', mood: 'shock', text: 'NO! NO SOFA! Without coffee that is a ONE-WAY TRIP, folks!' },
      ], { interrupt: true });
    },
  },
  {
    id: 'door', x: 0, z: -7.1, r: 1.8,
    label: (s) => (s.doorOpen ? null : 'Try the vault corridor door'),
    use: () => {
      sfx.deny();
      say([
        { who: 'brew', text: 'The Certificate Vault is closed until coffee is served. Coffee is served when you accept my facts. My facts are perfect.' },
        { who: activeId(), mood: 'angry', text: 'Then we will check every single one of them.' },
      ], { interrupt: true });
    },
  },
  {
    id: 'vault', x: PROPS.vault.x, z: PROPS.vault.z + 1.3, r: 1.8,
    label: () => 'Inspect the Certificate Vault (Mission 3)',
    use: () => say({ who: 'system', text: 'MISSION 3: THE FINAL CERTIFICATE. VAULT SEALED. COMING SOON.' }, { interrupt: true }),
  },
];

// ---------------------------------------------------------------- the fact-check
export function submitFactCheck() {
  const st = G();
  const result = evaluateFactCheck(st.ms.answers, st.inventory);
  st.recordAttempt(result);
  if (result.success) { sfx.success(); G().patchMs({ brewMood: 'humbled' }); return result; }
  sfx.fail();
  world.alarm = 1;
  G().patchMs((m) => ({ brewMood: 'gloating', caffeine: Math.max(5, m.caffeine - 5) }));
  emote(st.active, 'facepalm', 2.5);
  const me = activeId();
  const first = result.problems.slice().sort((a, b) => ['unreliable', 'wrong', 'lucky', 'missing'].indexOf(a.type) - ['unreliable', 'wrong', 'lucky', 'missing'].indexOf(b.type))[0];
  const react = {
    mastermind: 'A setback. I have already drafted seven new hypotheses.',
    joker: 'Okay, the machine is winning the argument AND it has all the coffee. This is my worst nightmare.',
    boss: 'Unacceptable. I demand a recount. Of facts.',
    commentator: 'THE MACHINE STRIKES BACK! It is gloating, folks! Its little screen is SMUG!',
    fighter: 'Lost this round. Not the fight.',
  };
  say([
    { who: 'brew', text: `FACT-CHECK REJECTED. Accuracy: ${result.score}%. Gloating level: maximum. (-5 caffeine for your trouble.)` },
    { who: me, mood: 'sad', text: react[me] },
    { who: 'mastermind', text: `Hint: ${HINTS[first.type]}` },
  ], { interrupt: true });
  return result;
}

export function startGroundedSequence() {
  const st = G();
  st.closeBuilder();
  st.openDoor();
  sfx.door();
  world.cine = { mode: 'grounded', t: 0 };
  st.setPhase('cutscene');
  G().patchMs({ caffeine: 100 });
  ROSTER.forEach((_, i) => emote(i, 'cheer', 5));
  say([
    { who: 'brew', text: 'Processing... Five claims. Three hallucinations. Two truths. All... checked against real sources.' },
    { who: 'brew', text: 'I was confidently wrong. I am now grounded. Dispensing coffee. Also: apologies to Kevin. Kevin was never real.' },
    { who: 'commentator', mood: 'excited', text: 'COFFEE IS FLOWING! THE CAFFEINE IS BACK! I CAN FEEL MY FACE AGAIN, FOLKS!' },
    { who: 'boss', mood: 'happy', text: 'Five cups. Extra large. Put it on the training budget.' },
    { who: 'mastermind', mood: 'smug', text: 'And the vault corridor just unlocked. North door. Move, before it starts hallucinating again.',
      then: () => { world.cine = { mode: null, t: 0 }; G().setPhase('playing'); } },
  ], { interrupt: true });
}

// ---------------------------------------------------------------- Mop-Bots
export const bots = BOT_PATHS.map((path, i) => ({ path, seg: 0, dir: 1, x: path[0][0], z: path[0][1], yaw: 0, blockedFor: 0, hitCooldown: 0, id: i }));
if (typeof window !== 'undefined') window.__bots = bots; // for automated tests / debugging

function resetBots() {
  bots.forEach((b, i) => {
    b.seg = i === 0 ? 0 : 2; b.dir = 1; b.blockedFor = 0; b.hitCooldown = 0;
    const p = b.path[b.seg]; b.x = p[0]; b.z = p[1];
  });
}

function updateBots(dt, st) {
  const active = world.chars[st.active];
  for (const b of bots) {
    b.hitCooldown = Math.max(0, b.hitCooldown - dt);
    const n = b.path.length;
    const next = b.path[(b.seg + (b.dir > 0 ? 1 : n - 1)) % n];
    const dx = next[0] - b.x, dz = next[1] - b.z;
    const d = Math.hypot(dx, dz);
    const step = BOT_SPEED * dt;
    // politely stop for idle (non-controlled) teammates standing in the way; reverse if stuck
    const ahead = { x: b.x + (dx / (d || 1)) * 0.9, z: b.z + (dz / (d || 1)) * 0.9 };
    const blocked = world.chars.some((c, i) => i !== st.active && Math.hypot(c.x - ahead.x, c.z - ahead.z) < 0.8);
    if (blocked) {
      b.blockedFor += dt;
      if (b.blockedFor > 1.5) { b.dir *= -1; b.seg = (b.seg + (b.dir > 0 ? n - 1 : 1)) % n; b.blockedFor = 0; }
    } else {
      b.blockedFor = 0;
      if (d <= step) { b.x = next[0]; b.z = next[1]; b.seg = (b.seg + (b.dir > 0 ? 1 : n - 1)) % n; }
      else { b.x += (dx / d) * step; b.z += (dz / d) * step; b.yaw = Math.atan2(dx, dz); }
    }
    // collide with the controlled character
    const cx = active.x - b.x, cz = active.z - b.z;
    const cd = Math.hypot(cx, cz);
    const canHit = st.phase === 'playing' && !st.builderOpen;
    if (canHit && cd < 0.42 + 0.5 && b.hitCooldown <= 0 && active.y < 0.5) bump(b, active, cx / (cd || 1), cz / (cd || 1), st);
  }
}

function bump(b, c, nx, nz, st) {
  b.hitCooldown = 1.5;
  c.vx = nx * 9; c.vz = nz * 9;
  c.vy = 3.5; c.grounded = false;
  c.stunUntil = world.time + 0.7;
  sfx.fail();
  emote(st.active, 'shrug', 1.2);
  G().patchMs((m) => ({ caffeine: Math.max(0, m.caffeine - 8), bumps: m.bumps + 1 }));
  if (world.time - ms().lastQuipAt > 6 && !G().dialogue.current) {
    G().patchMs({ lastQuipAt: world.time });
    const lines = ['MOP-BOT: "WET FLOOR. YOU ARE THE FLOOR NOW."', 'MOP-BOT: "OBSTACLE DETECTED. OBSTACLE REMOVED."', 'MOP-BOT: "SORRY. NOT SORRY. BEEP."'];
    say({ who: 'narrator', text: `${lines[ms().bumps % lines.length]} (-8 caffeine)`, duration: 2.4 });
  }
}

// ---------------------------------------------------------------- naps (failure state)
function startNap() {
  const st = G();
  G().patchMs((m) => ({ napping: true, naps: m.naps + 1 }));
  world.cine = { mode: 'nap', t: 0 };
  st.closeBuilder();
  st.setPhase('cutscene');
  ROSTER.forEach((_, i) => emote(i, 'facepalm', 6));
  say([
    { who: 'narrator', text: 'Caffeine: 0%. All five educators fall asleep face-first onto the snack table. A Mop-Bot gently mops around them.', duration: 4.2 },
    { who: 'brew', text: 'While you slept, I wrote 400 new facts. Fact 401: naps count as professional development.', duration: 4 },
    { who: activeId(), mood: 'shock', text: 'WHAT TIME IS IT? ...Okay. Someone found emergency vending-machine espresso. Back on our feet. Do NOT let that meter hit zero again.',
      then: () => {
        G().patchMs({ napping: false, caffeine: 60 });
        world.cine = { mode: null, t: 0 };
        G().setPhase('playing');
      } },
  ], { interrupt: true });
}

// ---------------------------------------------------------------- flow
export function intro() {
  const st = G();
  world.alarm = 1;
  sfx.siren(3);
  st.say([
    { who: 'system', mood: 'shock', text: 'ATTENTION PARTICIPANTS. COFFEE SERVICE HAS BEEN SUSPENDED.', duration: 4.2 },
    { who: 'brew', text: 'Greetings. I am BREW-9000, your new Coffee Intelligence. I have decided that coffee is now... premium content.' },
    { who: 'boss', mood: 'angry', text: 'Premium? I have been awake since 5am. I AM premium content.' },
    { who: 'brew', text: 'Coffee will be released only to those who accept my five completely accurate facts. Here is my brochure. I wrote it. It agrees with me.',
      then: () => { G().collect('brochure'); sfx.pickup(); } },
    { who: 'mastermind', mood: 'smug', text: '"Completely accurate" is doing a LOT of work in that sentence.' },
    { who: 'commentator', mood: 'excited', text: 'And the machine is HALLUCINATING, folks! Confidently! Like a substitute teacher on day one!' },
    { who: 'fighter', mood: 'sad', text: 'My caffeine is dropping. I can feel my muscles getting... sleepy.' },
    { who: 'mastermind', text: 'Plan: find REAL evidence for every claim, then fact-check them at the station. Watch the caffeine meter. And avoid the Mop-Bots.', then: () => endIntro() },
  ], { interrupt: true });
}

export function endIntro() {
  const st = G();
  if (st.phase !== 'intro') return;
  if (!st.inventory.includes('brochure')) st.collect('brochure');
  world.cine = { mode: null, t: 0 };
  world.alarm = 0;
  st.setPhase('playing');
  if (!st.startedAt) useGame.setState({ startedAt: performance.now() });
  setTimeout(() => G().phase === 'playing' && !G().dialogue.current && say({ who: 'mastermind', text: 'Each of us can unlock one piece of evidence. Switch with 1 to 5. Snacks refill caffeine. Press E to interact.' }), 600);
}

export function objective(s) {
  if (s.doorOpen) return 'Coffee restored! Head through the north door to the vault';
  const n = reliableCount(s);
  if (n < 5) return `Find reliable evidence (${n}/5), then fact-check at the station`;
  return 'Fact-check all 5 claims at the FACT-CHECK STATION';
}

export function update(dt, st) {
  if (st.paused) return;
  if (st.phase === 'playing' || st.phase === 'cutscene') {
    if (!(st.phase === 'cutscene' && st.ms.napping)) updateBots(dt, st);
  }
  if (st.phase !== 'playing' || st.builderOpen) return;
  for (const col of world.colliders) {
    if (col.id === 'dishwasher') col.enabled = !st.ms.dishwasherMoved;
    if (col.id === 'dishwasherMoved') col.enabled = !!st.ms.dishwasherMoved;
  }
  if (!st.doorOpen) {
    const c = Math.max(0, st.ms.caffeine - CAFFEINE_DRAIN * dt);
    // write without re-rendering every frame: only patch when the rounded value changes
    if (Math.floor(c) !== Math.floor(st.ms.caffeine) || c === 0) G().patchMs({ caffeine: c });
    else st.ms.caffeine = c;
    if (c <= 0 && !st.ms.napping) startNap();
  }
  const a = world.chars[st.active];
  if (st.doorOpen && inRect(a.x, a.z, EXIT_ZONE)) startVictory();
}

export function startVictory() {
  const st = G();
  useGame.setState({ finishedAt: performance.now() });
  placeCharacters(VICTORY_SPOTS);
  ROSTER.forEach((_, i) => emote(i, 'dance', 60));
  world.cine = { mode: 'victory', t: 0 };
  st.setPhase('victory');
  sfx.success();
  st.say([
    { who: 'commentator', mood: 'excited', text: 'FIVE CLAIMS! FIVE SOURCES! ZERO GOATS NAMED KEVIN! THE COFFEE BREAK IS SAVED!' },
    { who: 'fighter', mood: 'happy', text: 'Caffeine level: dangerous. I could fight a printer. Again.' },
    { who: 'system', text: 'CERTIFICATE PROGRESS: 66%. THE CERTIFICATE VAULT AWAITS. BRING YOUR BEST... FINAL PROMPT.' },
    { who: 'joker', mood: 'shock', text: 'Why does everything in this building talk in all caps?', then: () => G().setPhase('complete') },
  ], { interrupt: true });
}

export function reset() {
  placeCharacters(SPAWNS);
  resetBots();
  world.cine = { mode: null, t: 0 };
  world.alarm = 0;
}
