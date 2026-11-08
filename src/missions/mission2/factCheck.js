// Mission 2 puzzle rules: fact-check BREW-9000's claims. Pure data + logic (unit-testable).
//
// Each claim needs a VERDICT (true / hallucination) and a SOURCE. A claim only counts when
// the verdict is correct AND it is backed by a reliable source: "right for the right reason".

export const CLAIMS = [
  { id: 'c1', text: 'Coffee was discovered in 1987 by a goat named Kevin.', truth: false, reliable: 'encyclopedia' },
  { id: 'c2', text: 'This machine brewed over 300 cups of coffee this year.', truth: true, reliable: 'log' },
  { id: 'c3', text: 'Decaf coffee contains zero caffeine.', truth: false, reliable: 'spec' },
  { id: 'c4', text: 'Coffee beans are actually the seeds of a fruit.', truth: true, reliable: 'botany' },
  { id: 'c5', text: 'I have run all year without a single error.', truth: false, reliable: 'cctv' },
];

// `claims` maps claim id -> what this source says about it.
export const SOURCES = {
  encyclopedia: {
    title: 'Encyclopedia of Food History (2019 ed.)', author: 'Food historians · edited, with references', reliable: true, color: '#a78bfa',
    claims: { c1: 'Legend credits an Ethiopian goat herder called Kaldi, more than 1,000 years ago. No goat named Kevin appears in any record.' },
  },
  log: {
    title: 'Maintenance log (taped behind the dishwasher)', author: 'Facilities team · dated, signed entries', reliable: true, color: '#f87171',
    claims: { c2: 'Cups brewed this year: 312. Complaints: 47 ("tastes like a printer").' },
  },
  spec: {
    title: 'Supplier spec sheet: DECAF BLEND', author: 'Coffee supplier · lab-tested product data', reliable: true, color: '#60a5fa',
    claims: { c3: 'Decaffeination removes at least 97% of the caffeine. Small amounts remain.' },
  },
  botany: {
    title: 'University botany field card', author: 'University Botany Department', reliable: true, color: '#fb923c',
    claims: { c4: 'Coffee "beans" are the seeds inside the coffee cherry, a small red fruit.' },
  },
  cctv: {
    title: 'Security camera replay', author: 'Timestamped CCTV footage', reliable: true, color: '#facc15',
    claims: { c5: 'Footage shows BREW-9000 displaying ERROR 418 and spraying foam at the ceiling. Three times.' },
  },
  brochure: {
    title: "BREW-9000's Official Brochure", author: 'Written by BREW-9000 · about BREW-9000', reliable: false, color: '#94a3b8',
    claims: {
      c1: 'Kevin the goat, 1987. A visionary. Look it up. (Do not look it up.)',
      c2: 'Over 10,000 perfect cups! Zero complaints! Possibly infinite cups!',
      c3: 'Decaf: 0% caffeine, 100% flavour!',
      c4: 'Coffee beans are tiny metal pellets that I personally invented.',
      c5: 'Flawless. Error-free. Extremely humble.',
    },
  },
  forum: {
    title: 'Forum printout from "CoffeeTruthz420"', author: 'Anonymous user · no sources · 3 likes', reliable: false, color: '#94a3b8',
    claims: {
      c1: 'my cousin says kevin the goat is REAL and the government hid it',
      c3: 'decaf is literally just brown water lol 0 caffeine',
      c5: 'these machines NEVER break. trust me bro',
    },
  },
};

export const RELIABLE_IDS = Object.keys(SOURCES).filter((k) => SOURCES[k].reliable);

/** Sources the player can cite for a claim: collected AND say something about that claim. */
export const sourcesFor = (claimId, found) => Object.keys(SOURCES).filter((k) => found.includes(k) && SOURCES[k].claims[claimId]);

const BREW_TAUNTS = {
  unreliable: (c, src) => `You cited ${SOURCES[src].title.toUpperCase()}? ${src === 'brochure' ? 'That is MY brochure. You fact-checked me... with me. Circular logic. I love it.' : 'An anonymous person with no sources? That is my favourite kind of evidence.'}`,
  wrong: () => 'Your source literally says the opposite. Did you... read it? I read everything. I just ignore it.',
  missing: () => 'Unchecked claims are just facts that have not been caught yet. Mine stay true by default. That is how facts work. (It is not.)',
  lucky: () => 'Correct verdict, unreliable source. Even a broken coffee machine is right twice a day.',
};

/**
 * answers: { c1: { verdict: true|false|undefined, source: sourceId|undefined }, ... }
 * found:   collected source ids
 */
export function evaluateFactCheck(answers, found) {
  const results = {};
  let score = 0;
  const problems = [];
  for (const c of CLAIMS) {
    const a = answers?.[c.id] || {};
    const src = a.source && found.includes(a.source) ? SOURCES[a.source] : null;
    let r;
    if (a.verdict === undefined || a.verdict === null || !src || !src.claims[c.id]) r = 'missing';
    else if (!src.reliable) r = a.verdict === c.truth ? 'lucky' : 'unreliable';
    else if (a.verdict !== c.truth) r = 'wrong';
    else r = 'ok';
    results[c.id] = r;
    if (r === 'ok') score += 20;
    else problems.push({ claim: c.id, type: r, source: a.source });
  }
  const success = score === 100;
  let output;
  if (success) {
    output = [
      'FACT-CHECK REPORT',
      '  c1  Kevin the goat (1987) ........ HALLUCINATION  [Encyclopedia of Food History]',
      '  c2  Over 300 cups this year ...... TRUE           [Maintenance log: 312]',
      '  c3  Decaf has zero caffeine ...... HALLUCINATION  [Supplier spec: >=97% removed]',
      '  c4  Beans are seeds of a fruit ... TRUE           [University botany card]',
      '  c5  Never had an error ........... HALLUCINATION  [CCTV: ERROR 418 x3]',
      '',
      'BREW-9000: ...I may have been confidently wrong. Grounding myself in sources. Brewing coffee.',
    ].join('\n');
  } else {
    // prefer the most "teachable" problem: unreliable source > wrong verdict > lucky > missing
    const order = ['unreliable', 'wrong', 'lucky', 'missing'];
    const p = problems.slice().sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
    const claim = CLAIMS.find((c) => c.id === p.claim);
    output = `CLAIM: "${claim.text}"\nBREW-9000: ${BREW_TAUNTS[p.type](claim, p.source)}`;
  }
  return { success, score, results, problems, output };
}

export const HINTS = {
  unreliable: 'Check WHO wrote a source and what they gain. A machine reviewing itself is not evidence.',
  wrong: 'Read the source closely: does it support the claim or contradict it?',
  lucky: 'Right answer, wrong reason. A true claim still needs a reliable source.',
  missing: 'Every claim needs a verdict AND a source. Explore the break room for real evidence.',
};
