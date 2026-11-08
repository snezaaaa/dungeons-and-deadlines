import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePrompt, SLOTS, CARDS, isCardAvailable } from '../../src/missions/mission1/promptPuzzle.js';

const ALL = ['role', 'task', 'context', 'format'];
const good = Object.fromEntries(SLOTS.map((s) => [s.id, CARDS[s.id].find((c) => c.good).id]));

test('perfect prompt with all components collected succeeds at 100%', () => {
  const r = evaluatePrompt(good, ALL);
  assert.equal(r.success, true);
  assert.equal(r.score, 100);
  assert.match(r.output, /Time/);
});

test('good card that was not collected counts as missing', () => {
  const r = evaluatePrompt(good, ['role', 'task', 'context']);
  assert.equal(r.success, false);
  assert.deepEqual(r.missing, ['format']);
  assert.equal(r.score, 75);
});

test('decoy card fails with its funny output', () => {
  const r = evaluatePrompt({ ...good, role: 'role_toaster' }, ALL);
  assert.equal(r.success, false);
  assert.deepEqual(r.wrong, ['role']);
  assert.match(r.output, /TOASTER/);
});

test('empty selection fails and names the empty parts', () => {
  const r = evaluatePrompt({}, ALL);
  assert.equal(r.score, 0);
  assert.equal(r.missing.length, 4);
  assert.match(r.output, /ROLE/);
});

test('every slot has exactly one good card and decoys with failure text', () => {
  for (const s of SLOTS) {
    assert.equal(CARDS[s.id].filter((c) => c.good).length, 1);
    for (const c of CARDS[s.id].filter((c) => !c.good)) assert.ok(c.fail);
  }
});

test('availability: good cards locked until collected, decoys always available', () => {
  const g = CARDS.role.find((c) => c.good), d = CARDS.role.find((c) => !c.good);
  assert.equal(isCardAvailable(g, 'role', []), false);
  assert.equal(isCardAvailable(g, 'role', ['role']), true);
  assert.equal(isCardAvailable(d, 'role', []), true);
});
