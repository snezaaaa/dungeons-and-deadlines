// Mission 1 puzzle rules. Pure data + logic (no React / three) so it is unit-testable.

export const SLOTS = [
  { id: 'role', label: 'ROLE', color: '#f472b6', question: 'WHO should the AI be?' },
  { id: 'task', label: 'TASK', color: '#60a5fa', question: 'WHAT exactly should it do?' },
  { id: 'context', label: 'CONTEXT', color: '#34d399', question: 'For WHOM / under what conditions?' },
  { id: 'format', label: 'OUTPUT FORMAT', color: '#fbbf24', question: 'HOW should the answer look?' },
];

// `good` cards must be found in the room first. Decoys are always available (and always wrong).
export const CARDS = {
  role: [
    { id: 'role_good', good: true, text: 'You are an experienced instructional designer who helps busy teachers.' },
    { id: 'role_toaster', text: 'You are a toaster. A sentient one.',
      fail: 'BEEP. AS A TOASTER, MY LESSON PLAN IS: 1) Bread. 2) Heat. 3) Toast. Would you like that lightly browned?' },
    { id: 'role_none', text: '(no role, the AI will figure it out)',
      fail: 'Hello! I am a Generic Assistant. Here is a generic answer about generic things, delivered generically.' },
  ],
  task: [
    { id: 'task_good', good: true, text: 'Create a 45-minute lesson plan that introduces photosynthesis.' },
    { id: 'task_vague', text: 'Do something with plants, I guess.',
      fail: 'Task complete. I have emotionally supported a fern. It is doing much better now.' },
    { id: 'task_huge', text: 'Explain all of science. Every part. Now.',
      fail: 'Beginning "All of Science". Estimated completion: 14,000 years. Chapter 1: The Atom (Part 1 of 9,000)...' },
  ],
  context: [
    { id: 'context_good', good: true, text: 'For 7th graders with mixed reading levels, in a classroom with no lab equipment.' },
    { id: 'context_tuesday', text: "Context: it's Tuesday.",
      fail: 'Since it is Tuesday, I assumed your students are 3 to 97 years old and own a particle accelerator.' },
    { id: 'context_vibes', text: 'No context. Vibes only.',
      fail: 'Lesson designed for PhD botanists with a $2M lab. Step 1: Calibrate your electron microscope.' },
  ],
  format: [
    { id: 'format_good', good: true, text: 'Present it as a table with columns: Time, Activity, Materials.' },
    { id: 'format_dance', text: 'Output format: interpretive dance.',
      fail: '[The AI rises. It sways. It gestures vaguely at the sun. It bows deeply.] ...That was the lesson plan.' },
    { id: 'format_wall', text: 'One 47-page paragraph. No line breaks.',
      fail: 'Photosynthesisisaprocessbywhichplantsuselightenergytoconvertwaterandcarbondioxideinto... (page 1 of 47)' },
  ],
};

export const HINTS = {
  role: 'ROLE tells the AI who to be. An expert role = expert answers. Toasters make toast.',
  task: 'TASK must be specific and doable: one clear action with a clear scope.',
  context: 'CONTEXT is who it is for and the constraints. Without it, the AI guesses (badly).',
  format: 'OUTPUT FORMAT tells the AI how the answer should look so you can actually use it.',
};

export const SUCCESS_OUTPUT = [
  'LESSON PLAN: "How Plants Eat Sunlight" (45 min, Grade 7)',
  '| Time      | Activity                                         | Materials            |',
  '| 0-5 min   | Hook: "Why don\'t plants need lunch?" pair-share  | Board                |',
  '| 5-15 min  | Picture-supported mini lesson (light+water+CO2)  | Illustrated handout  |',
  '| 15-30 min | Leaf-in-the-sun window demo + sentence frames    | Leaves, paper, tape  |',
  '| 30-40 min | Leveled reading cards in mixed groups            | Reading cards (3 lvls)|',
  '| 40-45 min | Exit ticket: draw the photosynthesis "recipe"    | Sticky notes         |',
];

export const cardById = (id) => {
  for (const slot of SLOTS) {
    const c = CARDS[slot.id].find((x) => x.id === id);
    if (c) return { ...c, slot: slot.id };
  }
  return null;
};

/** Is this card selectable given what the player has collected? */
export const isCardAvailable = (card, slotId, inventory) => !card.good || inventory.includes(slotId);

/**
 * selection: { role: cardId|null, task: ..., context: ..., format: ... }
 * inventory: array of collected slot ids, e.g. ['role','task']
 */
export function evaluatePrompt(selection, inventory) {
  const results = {};
  let score = 0;
  const wrong = [];
  const missing = [];
  for (const slot of SLOTS) {
    const id = selection?.[slot.id];
    const card = id ? CARDS[slot.id].find((c) => c.id === id) : null;
    const usable = card && (!card.good || inventory.includes(slot.id));
    if (!usable) {
      results[slot.id] = 'missing';
      missing.push(slot.id);
    } else if (card.good) {
      results[slot.id] = 'ok';
      score += 25;
    } else {
      results[slot.id] = 'wrong';
      wrong.push(slot.id);
    }
  }
  const success = score === 100;
  let output;
  if (success) output = SUCCESS_OUTPUT.join('\n');
  else if (wrong.length) output = CARDS[wrong[0]].find((c) => c.id === selection[wrong[0]]).fail;
  else output = `ERROR 418: PROMPT INCOMPLETE. You left the ${missing.map((m) => SLOTS.find((s) => s.id === m).label).join(', ')} empty. I am an AI, not a mind reader. (I tried. It was awkward.)`;

  return { success, score, results, wrong, missing, output };
}

export const assemblePrompt = (selection) =>
  SLOTS.map((s) => (selection?.[s.id] ? CARDS[s.id].find((c) => c.id === selection[s.id])?.text : `[${s.label}?]`)).join(' ');
