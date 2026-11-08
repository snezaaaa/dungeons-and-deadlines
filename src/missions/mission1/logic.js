// Mission 1 — THE IMPOSSIBLE PROMPT: interactables, dialogue, objectives and win flow.
import { useGame } from '../../game/store.js';
import { world, emote, placeCharacters } from '../../game/world.js';
import { sfx } from '../../game/audio.js';
import { ROSTER } from '../../characters/roster.js';
import { PROPS, DESKS, EXIT_ZONE, VICTORY_SPOTS, SPAWNS } from './layout.js';
import { inRect } from '../../game/collision.js';
import { evaluatePrompt, HINTS, SLOTS, CARDS } from './promptPuzzle.js';

const G = () => useGame.getState();
const say = (lines, opts) => G().say(lines, opts);
const activeId = () => ROSTER[G().active].id;

// ---------------------------------------------------------------- component pickups
const COMPONENT_INFO = {
  role: { title: 'ROLE', color: '#f472b6', tip: 'Tell the AI WHO to be, e.g. "You are an experienced instructional designer..."' },
  task: { title: 'TASK', color: '#60a5fa', tip: 'Tell the AI exactly WHAT to do: one clear, specific job.' },
  context: { title: 'CONTEXT', color: '#34d399', tip: 'Explain the audience, situation and constraints.' },
  format: { title: 'OUTPUT FORMAT', color: '#fbbf24', tip: 'Describe HOW the answer should look: table, list, length...' },
};

function collect(slot, lines) {
  if (!G().collect(slot)) return;
  sfx.pickup();
  emote(G().active, 'cheer', 2);
  const info = COMPONENT_INFO[slot];
  const card = CARDS[slot].find((c) => c.good);
  G().showToast({ title: `PROMPT COMPONENT FOUND: ${info.title}`, body: `"${card.text}"`, tip: info.tip, color: info.color });
  say(lines);
  const n = G().inventory.length;
  if (n === 4) {
    say([
      { who: 'commentator', mood: 'excited', text: 'ALL FOUR COMPONENTS! Role! Task! Context! Format! The crowd is on its feet! The crowd is... five people!' },
      G().flags.terminalOn
        ? { who: 'mastermind', text: 'To the lectern terminal. Time to assemble the perfect prompt.' }
        : { who: 'mastermind', text: 'Now we need PROMPTOTRON awake. Its mic is voice-locked. Commentator, this is your moment. (Press 4)' },
    ]);
  } else {
    say({ who: 'ai', text: `Component ${n} of 4 detected. I am mildly impressed. Mildly.` });
  }
}

// Per-object "wrong character" reactions. Each points to who CAN do it.
const WRONG = {
  whiteboard: {
    joker: "It's a riddle written by someone who LOVES riddles. I only love punchlines. Get the Mastermind (1).",
    boss: 'I do not read whiteboards. I have people for that. The Mastermind is my people. (1)',
    commentator: 'And he squints at the board... and he understands NOTHING! The Mastermind could crack this. (1)',
    fighter: 'I tried to punch the riddle. The riddle won. Mastermind? (1)',
  },
  printer: {
    mastermind: 'Error code PC LOAD LETTER. Logic is useless here. Printers only respond to... humor. Joker? (2)',
    boss: "I told it to print. It said 'no'. Nobody says no to me. Except printers. Try the Joker (2).",
    commentator: 'The printer is JAMMED, folks! It needs cheering up. Paging the Joker! (2)',
    fighter: 'I would hit it, but my lawyer says no more printers. Joker, make it laugh. (2)',
  },
  vending: {
    mastermind: 'It wants "authority". I have a PhD, but apparently that is not authority. Boss? (3)',
    joker: 'I asked nicely. It replied: "INSUFFICIENT EXECUTIVE PRESENCE." Rude. Boss! (3)',
    commentator: "The machine demands to speak to a MANAGER! Where's the Boss when you need... oh, key 3.",
    fighter: 'I shook it. It shook back. We are even now. The Boss should negotiate. (3)',
  },
  cabinet: {
    mastermind: 'The drawer is rusted shut. My plan requires 40 kilos of pure muscle. Fighter? (5)',
    joker: "Knock knock. Who's there? A locked drawer. A locked drawer who? A locked drawer only the Fighter can open. (5)",
    boss: "I'd pull it myself, but this suit costs more than the building. Fighter. (5)",
    commentator: 'He pulls! He strains! He gives up immediately! We need the FIGHTER in the ring! (5)',
  },
  lectern: {
    mastermind: '"VOICE NOT LOUD ENOUGH." I whispered a perfectly reasonable request. We need the Commentator (4).',
    joker: 'I did my best announcer voice. It asked me to stop. Forever. Commentator? (4)',
    boss: 'I spoke in my meeting voice. It fell asleep. Like everyone in my meetings. Commentator. (4)',
    fighter: 'I yelled "HELLO". The microphone filed a complaint. Commentator! (4)',
  },
};

function wrongChar(obj) {
  sfx.deny();
  emote(G().active, 'shrug', 1.6);
  say({ who: activeId(), mood: 'sad', text: WRONG[obj][activeId()] }, { interrupt: true });
}

// ---------------------------------------------------------------- desks / computers
const COMPUTERS = [
  { owner: 'mastermind', text: '47 browser tabs open. All titled "how to seem humble". Sticky note: "TIP: The AI cannot read your mind. Be specific."' },
  { owner: 'joker', text: 'A folder named "SERIOUS WORK" containing 9,000 memes. Desktop note: "Vague prompt in = vague answer out."' },
  { owner: 'boss', text: 'Inbox: "RE: RE: RE: RE: Synergy." Calendar: "3pm - be important." Note: "Give the AI a ROLE like you\'d brief an employee."' },
  { owner: 'commentator', text: 'A live stream with 3 viewers. Two are their mum. Chat says: "tell the AI the OUTPUT FORMAT you want!!"' },
  { owner: 'fighter', text: 'Playlist "EYE OF THE PROMPT". Workout plan: "Day 1: Context. Day 2: More context. Day 3: Leg day."' },
];

function inspectComputer(i) {
  const pc = COMPUTERS[i];
  sfx.interact();
  const me = activeId();
  const lines = [{ who: 'narrator', text: `${ROSTER[i].name.toUpperCase()}'S COMPUTER: ${pc.text}` }];
  if (me === pc.owner) lines.push({ who: me, mood: 'shock', text: "Hey! That's my computer. Please don't look at my... okay you already looked." });
  else lines.push({ who: me, mood: 'grin', text: ['Fascinating. And deeply concerning.', 'I am telling everyone about this.', 'I have seen things I cannot unsee.', 'This explains a lot.'][(i + G().active) % 4] });
  say(lines, { interrupt: true });
}

// ---------------------------------------------------------------- the terminal / puzzle
function activateLectern() {
  const st = G();
  if (!st.flags.terminalOn) {
    if (activeId() !== 'commentator') return wrongChar('lectern');
    sfx.success();
    st.setFlag('terminalOn');
    emote(G().active, 'cheer', 2.5);
    say([
      { who: 'commentator', mood: 'excited', text: 'LAAADIES AND GENTLEMEN! LIVE FROM ROOM 204! PLEASE WELCOME... THE PROMPTOTRON THREE THOUSAAAAND!' },
      { who: 'ai', text: 'Voice authenticated. Volume: excessive. PROMPTOTRON 3000 is online.' },
      { who: 'ai', text: 'Submit one effective prompt and I will unlock the door. Submit a bad one and I will judge you. Out loud.' },
    ], { interrupt: true });
    return;
  }
  if (st.doorOpen) {
    say({ who: 'ai', text: 'The door is already open. Please leave. I need some me-time.' }, { interrupt: true });
    return;
  }
  sfx.interact();
  st.clearDialogue();
  st.openBuilder();
  document.exitPointerLock?.();
}

const FAIL_REACT = {
  mastermind: ['According to my calculations... that was bad.', 'I had a 97% confidence interval. It was wrong.'],
  joker: ['Okay, that was funny, but in the bad way.', "In my defence, the toaster really wanted the job."],
  boss: ['Unacceptable. Who wrote that? ...I wrote that? Circle back.', "Let's take this offline. Forever."],
  commentator: ['OH, AND IT IS A DISASTER! A CATASTROPHE! A LEARNING OPPORTUNITY!', 'The judges are NOT impressed, folks!'],
  fighter: ["I'm not mad. I'm just... going to do pushups about this.", 'The prompt took a hit. But it will get back up.'],
};

export function testPrompt() {
  const st = G();
  const result = evaluatePrompt(st.selection, st.inventory);
  st.recordAttempt(result);
  const me = activeId();
  if (result.success) {
    sfx.success();
    return result;
  }
  sfx.fail();
  world.alarm = 1;
  emote(st.active, 'facepalm', 2.5);
  const attempts = G().attempts;
  const firstBad = result.wrong[0] || result.missing[0];
  const lines = [
    { who: 'ai', text: `PROMPT REJECTED. Quality score: ${result.score}%. ${attempts >= 3 ? 'At this point I am rooting for you. Quietly.' : ''}` },
    { who: me, mood: 'sad', text: FAIL_REACT[me][attempts % 2] },
  ];
  if (result.missing.length && !st.inventory.includes(result.missing[0]) && !result.wrong.length) {
    lines.push({ who: 'mastermind', text: `We haven't even found the ${SLOTS.find((s) => s.id === result.missing[0]).label} component yet. Keep exploring!` });
  } else if (firstBad) {
    lines.push({ who: 'mastermind', text: `Hint: ${HINTS[firstBad]}` });
  }
  say(lines, { interrupt: true });
  return result;
}

/** Called by the prompt builder after the success output has been shown. */
export function startDoorSequence() {
  const st = G();
  st.closeBuilder();
  st.openDoor();
  sfx.door();
  world.cine = { mode: 'door', t: 0 };
  st.setPhase('cutscene');
  ROSTER.forEach((_, i) => emote(i, 'cheer', 4));
  say([
    { who: 'ai', text: 'PROMPT ACCEPTED. Role, task, context, format. Chef\'s kiss. Unlocking door.' },
    { who: 'commentator', mood: 'excited', text: 'THE DOOR IS OPENING! I REPEAT, THE DOOR IS OPENING! THIS IS THE GREATEST MOMENT IN DOOR HISTORY!' },
    { who: 'boss', mood: 'happy', text: 'Excellent work, team. I will be taking full credit in the newsletter.' },
    { who: 'fighter', mood: 'determined', text: "Let's move before it changes its mind.",
      then: () => { world.cine = { mode: null, t: 0 }; G().setPhase('playing'); } },
  ], { interrupt: true });
}

// ---------------------------------------------------------------- interactables
export const INTERACTABLES = [
  {
    id: 'whiteboard', x: PROPS.whiteboard.x, z: 7.9, r: 2.0,
    label: (s) => (s.inventory.includes('role') ? 'Read the whiteboard' : 'Inspect the riddle on the whiteboard'),
    use: () => {
      const s = G();
      if (s.inventory.includes('role')) return say({ who: activeId(), text: 'It now just says "Mastermind was here". Classic.' }, { interrupt: true });
      if (activeId() !== 'mastermind') return wrongChar('whiteboard');
      collect('role', [
        { who: 'mastermind', mood: 'smug', text: '"I am an expert, but not a person. I play a part, but not on stage." Elementary. The answer is: a ROLE.' },
        { who: 'joker', mood: 'grin', text: 'I thought the answer was "a mime".' },
      ]);
    },
  },
  {
    id: 'printer', x: PROPS.printer.x - 1.2, z: PROPS.printer.z, r: 1.9,
    label: (s) => (s.inventory.includes('task') ? 'Pet the printer' : 'Fix the jammed printer'),
    use: () => {
      const s = G();
      if (s.inventory.includes('task')) return say({ who: activeId(), text: 'The printer purrs. Is that... normal?' }, { interrupt: true });
      if (activeId() !== 'joker') return wrongChar('printer');
      collect('task', [
        { who: 'joker', mood: 'grin', text: 'Hey printer. Why did the PDF break up with the JPEG? It needed more SPACE. ...Get it? Compression?' },
        { who: 'ai', text: 'The printer is laughing. The printer is... printing. Nobody has ever seen this before.' },
        { who: 'joker', mood: 'excited', text: 'It printed the TASK component! Comedy: 1. Technology: 0.' },
      ]);
    },
  },
  {
    id: 'vending', x: PROPS.vending.x - 1.3, z: PROPS.vending.z, r: 1.9,
    label: (s) => (s.inventory.includes('format') ? 'Look at the vending machine' : 'Negotiate with the vending machine'),
    use: () => {
      const s = G();
      if (s.inventory.includes('format')) return say({ who: activeId(), text: 'It only sells "Decaf Regret" now. Pass.' }, { interrupt: true });
      if (activeId() !== 'boss') return wrongChar('vending');
      collect('format', [
        { who: 'boss', mood: 'serious', text: "Listen, machine. I'm not here to buy a snack. I'm here to acquire one. Hand over the OUTPUT FORMAT. Now." },
        { who: 'ai', text: 'The vending machine has agreed to the merger. It has also given the Boss a free granola bar.' },
      ]);
    },
  },
  {
    id: 'cabinet', x: PROPS.cabinet.x - 1.2, z: PROPS.cabinet.z, r: 1.8,
    label: (s) => (s.inventory.includes('context') ? 'Inspect the (broken) filing cabinet' : 'Open the rusted filing cabinet'),
    use: () => {
      const s = G();
      if (s.inventory.includes('context')) return say({ who: activeId(), text: 'The drawer is now a modern art installation.' }, { interrupt: true });
      if (activeId() !== 'fighter') return wrongChar('cabinet');
      collect('context', [
        { who: 'fighter', mood: 'determined', text: 'HRRRAAAGH! ...The drawer is open. And the wall is slightly further away now.' },
        { who: 'mastermind', text: 'A folder labeled CONTEXT. Audience, situation, constraints. This is the good stuff.' },
      ]);
    },
  },
  {
    id: 'lectern', x: PROPS.lectern.x + 1.1, z: PROPS.lectern.z, r: 1.9,
    label: (s) => (!s.flags.terminalOn ? 'Wake up PROMPTOTRON (voice mic)' : s.doorOpen ? 'Talk to PROMPTOTRON' : 'Open the PROMPT BUILDER terminal'),
    use: activateLectern,
  },
  {
    id: 'door', x: 0, z: -8.1, r: 1.8,
    label: (s) => (s.doorOpen ? null : 'Try the locked door'),
    use: () => {
      sfx.deny();
      const me = activeId();
      const lines = {
        mastermind: 'Magnetic lock. Reinforced frame. Motivational poster. This door has thought of everything.',
        joker: 'I tried "please". I tried "open sesame". I tried "Alexa". Nothing.',
        boss: 'I have scheduled a meeting with this door. It declined.',
        commentator: 'He reaches for the handle... and it is LOCKED! What a twist! Nobody saw that coming!',
        fighter: 'I could break it. But then we would not learn anything about prompt engineering.',
      };
      say([{ who: 'ai', text: 'ACCESS DENIED. This door opens only for a well-crafted prompt.' }, { who: me, mood: 'angry', text: lines[me] }], { interrupt: true });
    },
  },
  {
    id: 'coffee', x: PROPS.coffee.x, z: PROPS.coffee.z - 1.2, r: 1.8,
    label: () => 'Use the coffee machine',
    use: () => {
      sfx.deny();
      say([
        { who: 'narrator', text: 'A sign reads: "OUT OF ORDER. COFFEE BREAK HAS BEEN CANCELLED UNTIL FURTHER NOTICE."' },
        { who: 'boss', mood: 'shock', text: 'No coffee? This is no longer a training. This is a hostage situation.' },
        { who: 'ai', text: 'Coffee access will be addressed in... Mission 2: The Coffee Break Crisis.' },
      ], { interrupt: true });
    },
  },
  {
    id: 'plant', x: PROPS.plant.x - 1.0, z: PROPS.plant.z - 0.9, r: 1.6,
    label: () => 'Talk to the suspicious plant',
    use: () => {
      sfx.interact();
      const me = activeId();
      say([
        { who: me, mood: 'smug', text: 'Psst. Plant. Do you know where the prompt components are?' },
        { who: 'narrator', text: 'The plant says nothing. It is a plastic plant. It has seen too much.' },
      ], { interrupt: true });
    },
  },
  {
    id: 'screen', x: -10.4, z: 2.9, r: 1.4,
    label: () => 'Read the presentation screen',
    use: () => {
      sfx.interact();
      say([
        { who: 'narrator', text: 'SLIDE 1 of 1: "A great prompt = ROLE + TASK + CONTEXT + OUTPUT FORMAT." Slide 2 is just a picture of a cat.' },
        { who: 'mastermind', text: 'So the slide literally tells us the answer. This training is better than I expected.' },
      ], { interrupt: true });
    },
  },
  {
    id: 'clock', x: PROPS.clock.x, z: -8.0, r: 1.5,
    label: () => 'Look at the clock',
    use: () => {
      sfx.interact();
      say({ who: activeId(), mood: 'shock', text: "It's 4:59. It has been 4:59 for three hours. Deadlines are an illusion." }, { interrupt: true });
    },
  },
  ...DESKS.map((d, i) => ({
    id: `pc${i}`, x: d.x + 1.05, z: d.z, r: 1.3,
    label: () => `Snoop on ${ROSTER[i].name}'s computer`,
    use: () => inspectComputer(i),
  })),
  {
    id: 'exitDoor', x: PROPS.exitDoor.x, z: PROPS.exitDoor.z + 1.2, r: 1.8,
    label: () => 'Mission 2 door (locked)',
    use: () => say({ who: 'ai', text: 'MISSION 2: THE COFFEE BREAK CRISIS. The break room is through here. Finish celebrating first. (It unlocks when you complete this mission.)' }, { interrupt: true }),
  },
];

// ---------------------------------------------------------------- flow
export function intro() {
  const st = G();
  world.alarm = 1;
  sfx.siren(4);
  st.say([
    { who: 'system', mood: 'shock', text: 'ATTENTION PARTICIPANTS. YOUR CERTIFICATES HAVE BEEN LOCKED.', duration: 4.2 },
    { who: 'system', text: 'THEY WILL ONLY BE RELEASED TO THOSE WHO CAN WRITE... THE PERFECT PROMPT.', duration: 4 },
    { who: 'boss', mood: 'angry', text: 'Locked? I have a 3 o\'clock. I always have a 3 o\'clock.' },
    { who: 'joker', mood: 'grin', text: 'Relax. I once escaped a webinar through the chat box.' },
    { who: 'commentator', mood: 'excited', text: 'And the tension in this room is UNBELIEVABLE, folks! Five educators. One door. ZERO snacks.' },
    { who: 'fighter', mood: 'determined', text: "I'll just punch the door." },
    { who: 'mastermind', mood: 'smug', text: 'It\'s rated for 400 punches. I checked. We need a prompt: Role, Task, Context and Output Format, hidden around this room.' },
    { who: 'ai', text: 'Hello. I am PROMPTOTRON 3000. Good luck. I will be judging you. Silently. Constantly.', then: () => endIntro() },
  ], { interrupt: true });
}

export function endIntro() {
  const st = G();
  if (st.phase !== 'intro') return;
  world.cine = { mode: null, t: 0 };
  world.alarm = 0;
  st.setPhase('playing');
  if (!st.startedAt) useGame.setState({ startedAt: performance.now() });
  setTimeout(() => G().phase === 'playing' && !G().dialogue.current && say({ who: 'mastermind', text: 'Tip: each of us has a special skill. Switch with keys 1 to 5 and look around. Press E to interact.' }), 600);
}

export function objective(s) {
  if (s.doorOpen) return 'Escape through the open door!';
  const n = s.inventory.length;
  if (n < 4 && !s.flags.terminalOn) return `Find the 4 prompt components (${n}/4) — each needs the right character`;
  if (n < 4) return `Find the remaining prompt components (${n}/4)`;
  if (!s.flags.terminalOn) return 'Wake PROMPTOTRON at the lectern (needs The Commentator)';
  return 'Build and TEST your prompt at the lectern terminal';
}

/** Per-frame mission update (zone triggers). */
export function update() {
  const s = G();
  if (s.phase !== 'playing' || !s.doorOpen) return;
  const c = world.chars[s.active];
  if (inRect(c.x, c.z, EXIT_ZONE)) startVictory();
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
    { who: 'commentator', mood: 'excited', text: 'THEY DID IT! FIVE EDUCATORS! ONE PROMPT! HISTORY IS WRITTEN — IN A TABLE WITH COLUMNS TIME, ACTIVITY, MATERIALS!' },
    { who: 'joker', mood: 'grin', text: 'I would like to thank the printer. We had something special.' },
    { who: 'system', text: 'CERTIFICATE PROGRESS: 33%. PLEASE PROCEED TO... THE COFFEE BREAK.' },
    { who: 'boss', mood: 'shock', text: 'Why did that sound like a threat?', then: () => G().setPhase('complete') },
  ], { interrupt: true });
}

export function reset() {
  placeCharacters(SPAWNS);
  world.cine = { mode: null, t: 0 };
  world.alarm = 0;
}
