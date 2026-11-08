// Mission 3 — the four Seals of Responsible AI. Pure data + logic (unit-testable).
// Each seal is a realistic classroom dilemma. The right choice unlocks a GUARDRAIL clause
// that the final prompt needs.

export const SEALS = [
  {
    id: 'privacy', label: 'PRIVACY', color: '#38bdf8', who: 'boss', key: 3,
    clause: 'no student names or personal data',
    scenario: 'Ms. Rivera needs a quick summary of a student\'s support plan. She is about to paste the whole document (name, diagnosis, home address) into a free public chatbot.',
    options: [
      { id: 'p_all', text: 'Paste it all. The AI needs every detail to help.', why: 'Free public tools may store and reuse what you paste. Student records are confidential, and the student never agreed to this.' },
      { id: 'p_anon', good: true, text: 'Remove names and identifying details, and use the school-approved AI tool.', why: 'Share the minimum, strip anything identifying, and stick to tools your school has vetted for student data.' },
      { id: 'p_please', text: 'Paste it, but add "please keep this private" at the end.', why: 'Asking nicely does not change where the data goes or who can see it.' },
    ],
  },
  {
    id: 'integrity', label: 'INTEGRITY', color: '#a78bfa', who: 'mastermind', key: 1,
    clause: 'say clearly that AI helped draft it',
    scenario: 'An AI detector says a student\'s essay is "98% AI-generated". The student insists they wrote it themselves.',
    options: [
      { id: 'i_zero', text: 'Give it a zero. 98% is basically proof.', why: 'AI detectors are unreliable and produce false positives, especially for multilingual and neurodivergent writers. A score is not proof.' },
      { id: 'i_rerun', text: 'Re-run the detector until it gives a nicer number.', why: 'Shopping for a number does not make it more reliable. The tool is the problem.' },
      { id: 'i_talk', good: true, text: 'Talk with the student, review their drafts and process, and treat the score as one weak signal.', why: 'Look at the evidence of their process, have a conversation, and set clear expectations about when AI use is allowed and how to disclose it.' },
    ],
  },
  {
    id: 'bias', label: 'BIAS', color: '#fb923c', who: 'joker', key: 2,
    clause: 'avoid stereotypes',
    scenario: 'The AI wrote 20 maths word problems. Every engineer is called Brad, every nurse is called Linda, and every scientist is a man in a lab coat.',
    options: [
      { id: 'b_fix', good: true, text: 'Revise them: prompt for diverse names, roles and settings, then review the results again.', why: 'AI reflects patterns in its training data, stereotypes included. Ask for representation explicitly and review what comes back.' },
      { id: 'b_use', text: 'Use them anyway. It is just maths.', why: 'Students notice who gets to be the engineer. Examples teach more than the maths.' },
      { id: 'b_woods', text: 'Delete all AI forever and move to a cabin in the woods.', why: 'Dramatic! But AI can still be useful when you review and correct its output.' },
    ],
  },
  {
    id: 'oversight', label: 'OVERSIGHT', color: '#f87171', who: 'fighter', key: 5,
    clause: 'treat it as a draft for my review',
    scenario: 'The AI graded all 120 essays in 4 minutes. Final grades are due tonight.',
    options: [
      { id: 'o_submit', text: 'Submit the AI grades. Robots do not get tired.', why: 'AI can misread, miss context, and be confidently wrong (remember BREW-9000?). Grades affect real students.' },
      { id: 'o_robot', text: 'Ask a second AI to check the first AI\'s grading.', why: 'That is two robots and zero teachers.' },
      { id: 'o_human', good: true, text: 'Use the AI feedback as a first draft: spot-check, adjust, and keep the final judgement yours.', why: 'AI can speed up feedback, but a human stays accountable for decisions about students.' },
    ],
  },
];

export const sealById = (id) => SEALS.find((s) => s.id === id);

/** Answer a seal: returns { correct, option, why }. */
export function answerSeal(sealId, optionId) {
  const seal = sealById(sealId);
  const option = seal?.options.find((o) => o.id === optionId);
  if (!option) return { correct: false, option: null, why: 'Unknown option.' };
  return { correct: !!option.good, option, why: option.why };
}

export const STRIKES_FOR_LOCKDOWN = 3;
