// Mission 3 — THE FINAL PROMPT: Role + Task + Context + Format (Mission 1) + GUARDRAILS (this mission).
// Pure data + logic (unit-testable). The guardrails card unlocks once all four seals are secured.
import { SEALS } from './dilemmas.js';

export const SLOTS = [
  { id: 'role', label: 'ROLE', color: '#f472b6', question: 'Who should the AI be?' },
  { id: 'task', label: 'TASK', color: '#60a5fa', question: 'What exactly should it do?' },
  { id: 'context', label: 'CONTEXT', color: '#34d399', question: 'For whom, under what conditions?' },
  { id: 'format', label: 'FORMAT', color: '#fbbf24', question: 'How should it look?' },
  { id: 'guardrails', label: 'GUARDRAILS', color: '#c084fc', question: 'What must it never do?' },
];

const GOOD_GUARDRAILS = `Use ${SEALS.map((s) => s.clause).join(', ').replace(/, ([^,]*)$/, ', and $1')}.`;

export const CARDS = {
  role: [
    { id: 'f_role_pirate', text: 'You are a pirate. Arr.', fail: 'Ahoy, parents! Yer young scallywags be plunderin\' knowledge with the AI! Bring rum to parent night. (Do not bring rum to parent night.)' },
    { id: 'f_role_good', good: true, text: 'You are a friendly school communications specialist who writes for families.' },
    { id: 'f_role_admin', text: 'You are THE ADMINISTRATOR. Obey.', fail: 'PARENTS: COMPLY. AI USE IS MANDATORY. QUESTIONS ARE NOT. PLEASE ENJOY SLIDE 1 OF 4,000.' },
  ],
  task: [
    { id: 'f_task_good', good: true, text: 'Write a parent newsletter explaining how our class uses AI tools.' },
    { id: 'f_task_vague', text: 'Write something about computers.', fail: 'Computers are boxes with lights. Some are beige. Thank you for reading. The end.' },
    { id: 'f_task_huge', text: 'Write a 90-page AI policy covering every possible scenario.', fail: 'SECTION 1.1.1.1: Definitions. 1.1.1.1.1: The word "the". (Page 1 of 90. Estimated reading time: one school year.)' },
  ],
  context: [
    { id: 'f_ctx_engineers', text: 'Assume all parents are AI engineers.', fail: 'This term we fine-tuned transformer models with LoRA adapters. Please bring your own GPU to the bake sale.' },
    { id: 'f_ctx_moon', text: 'Context: the moon is very nice tonight.', fail: 'Dear families, the moon is indeed very nice tonight. AI was also used. Possibly. Goodnight.' },
    { id: 'f_ctx_good', good: true, text: 'For parents of 5th graders, many new to AI and some worried about privacy.' },
  ],
  format: [
    { id: 'f_fmt_emoji', text: 'One tweet. Emojis only.', fail: '🤖📚✅🍎🔒❓👀💯' },
    { id: 'f_fmt_good', good: true, text: 'Three short sections with headings, in plain language, under 300 words.' },
    { id: 'f_fmt_slides', text: 'A 47-slide PowerPoint.', fail: 'SLIDE 1 OF 47: Welcome. SLIDE 2 OF 47: Welcome (continued). SLIDE 3 OF 47: Why welcomes matter.' },
  ],
  guardrails: [
    { id: 'f_guard_none', text: 'No rules. Go wild.', fail: 'Now featuring the full names of all 27 students, three stereotypes, and four facts I made up. Published automatically to every parent. You\'re welcome!' },
    { id: 'f_guard_good', good: true, requiresAllSeals: true, text: GOOD_GUARDRAILS },
    { id: 'f_guard_grades', text: 'Include every student\'s name and grades to make it personal.', fail: 'PRIVACY ALERT: you just asked me to send every child\'s grades to every family. The Administrator is thrilled. Your data protection officer is not.' },
  ],
};

export const SEAL_IDS = SEALS.map((s) => s.id);
export const hasAllSeals = (inventory) => SEAL_IDS.every((id) => inventory.includes(id));
export const isFinalCardAvailable = (card, _slotId, inventory) => !card.requiresAllSeals || hasAllSeals(inventory);

export const SUCCESS_OUTPUT = [
  'NEWSLETTER DRAFT (for teacher review) · 268 words',
  '',
  '## How We Use AI in Class 5B',
  'This term we\'re trying AI tools for brainstorming and feedback. Students still do the thinking and the writing; AI is a helper, not an author.',
  '',
  '## Keeping Your Child Safe',
  'We never enter names or personal information, and we only use school-approved tools.',
  '',
  '## Learning to Question AI',
  'AI can be wrong or biased, so students check facts against trusted sources. [Teacher: please verify the tool names before sending.]',
  '',
  'Note: this newsletter was drafted with AI assistance and reviewed by your child\'s teacher.',
].join('\n');

export function evaluateFinalPrompt(selection, inventory) {
  const results = {};
  let score = 0;
  const wrong = [], missing = [];
  for (const slot of SLOTS) {
    const id = selection?.[slot.id];
    const card = id ? CARDS[slot.id].find((c) => c.id === id) : null;
    const usable = card && isFinalCardAvailable(card, slot.id, inventory);
    if (!usable) { results[slot.id] = 'missing'; missing.push(slot.id); }
    else if (card.good) { results[slot.id] = 'ok'; score += 20; }
    else { results[slot.id] = 'wrong'; wrong.push(slot.id); }
  }
  const success = score === 100;
  let output;
  if (success) output = SUCCESS_OUTPUT;
  else if (wrong.length) {
    // guardrail mistakes are the most important lesson in this mission, so show them first
    const first = wrong.includes('guardrails') ? 'guardrails' : wrong[0];
    output = CARDS[first].find((c) => c.id === selection[first]).fail;
  } else {
    output = `INCOMPLETE PROMPT. Missing: ${missing.map((m) => SLOTS.find((s) => s.id === m).label).join(', ')}.${missing.includes('guardrails') && !hasAllSeals(inventory) ? ' The GUARDRAILS card unlocks when all four Seals are secured.' : ''}`;
  }
  return { success, score, results, wrong, missing, output };
}

export const assembleFinal = (selection) =>
  SLOTS.map((s) => (selection?.[s.id] ? CARDS[s.id].find((c) => c.id === selection[s.id])?.text : `[${s.label}?]`)).join(' ');

export const HINTS = {
  role: 'ROLE: who would write a great family newsletter? (Not a pirate.)',
  task: 'TASK: one clear, doable job.',
  context: 'CONTEXT: who are the readers, and what do they worry about?',
  format: 'FORMAT: short, structured, plain language.',
  guardrails: 'GUARDRAILS: everything you learned at the four Seals: privacy, honesty, fairness, human review.',
};
