import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEALS, answerSeal } from '../../src/missions/mission3/dilemmas.js';
import { SLOTS, CARDS, evaluateFinalPrompt, isFinalCardAvailable, SEAL_IDS } from '../../src/missions/mission3/finalPrompt.js';
import { LASERS, laserState, laserHits, checkpointFor, CORRIDOR } from '../../src/missions/mission3/lasers.js';

// ---------------- seals
test('each seal has exactly one responsible answer and explains every option', () => {
  for (const s of SEALS) {
    assert.equal(s.options.filter((o) => o.good).length, 1, s.id);
    for (const o of s.options) assert.ok(o.why.length > 20, o.id);
  }
});
test('the right answer is not always in the same position', () => {
  const positions = new Set(SEALS.map((s) => s.options.findIndex((o) => o.good)));
  assert.ok(positions.size >= 2);
});
test('answerSeal reports correctness and the explanation', () => {
  assert.equal(answerSeal('privacy', 'p_anon').correct, true);
  const r = answerSeal('integrity', 'i_zero');
  assert.equal(r.correct, false);
  assert.match(r.why, /unreliable/);
});
test('each seal needs a different character', () => {
  assert.equal(new Set(SEALS.map((s) => s.who)).size, 4);
  assert.ok(!SEALS.some((s) => s.who === 'commentator'), 'the Commentator is saved for the final broadcast');
});

// ---------------- final prompt
const good = Object.fromEntries(SLOTS.map((s) => [s.id, CARDS[s.id].find((c) => c.good).id]));
test('perfect final prompt succeeds once all seals are secured', () => {
  const r = evaluateFinalPrompt(good, SEAL_IDS);
  assert.equal(r.success, true);
  assert.equal(r.score, 100);
  assert.match(r.output, /reviewed by your child's teacher/);
});
test('guardrails card is locked until all four seals are secured', () => {
  const g = CARDS.guardrails.find((c) => c.good);
  assert.equal(isFinalCardAvailable(g, 'guardrails', SEAL_IDS.slice(0, 3)), false);
  assert.equal(isFinalCardAvailable(g, 'guardrails', SEAL_IDS), true);
  const r = evaluateFinalPrompt(good, SEAL_IDS.slice(0, 3));
  assert.equal(r.success, false);
  assert.match(r.output, /four Seals/);
});
test('guardrail mistakes are reported before other mistakes', () => {
  const r = evaluateFinalPrompt({ ...good, role: 'f_role_pirate', guardrails: 'f_guard_grades' }, SEAL_IDS);
  assert.deepEqual(r.wrong.sort(), ['guardrails', 'role']);
  assert.match(r.output, /PRIVACY ALERT/);
});
test('the good guardrails mention every seal clause', () => {
  const text = CARDS.guardrails.find((c) => c.good).text;
  for (const s of SEALS) assert.ok(text.includes(s.clause), s.clause);
});

// ---------------- lasers
test('gates blink with a warning before turning on', () => {
  const g = LASERS.find((l) => l.type === 'gate');
  const states = [];
  for (let t = 0; t < g.period * 2; t += 0.05) states.push(laserState(g, t));
  assert.ok(states.some((s) => s.on) && states.some((s) => !s.on) && states.some((s) => s.warn));
  assert.ok(!states.some((s) => s.on && s.warn));
});
test('sweeps stay within their range', () => {
  for (const l of LASERS.filter((l) => l.type === 'sweep')) {
    for (let t = 0; t < 30; t += 0.07) {
      const z = laserState(l, t).z;
      assert.ok(z <= Math.max(l.z1, l.z2) + 1e-9 && z >= Math.min(l.z1, l.z2) - 1e-9);
    }
  }
});
test('jumping clears a sweep, standing does not', () => {
  const l = LASERS.find((l) => l.type === 'sweep');
  const s = laserState(l, 0);
  assert.equal(laserHits(l, s, { x: 0, y: 0, z: s.z }), true);
  assert.equal(laserHits(l, s, { x: 0, y: 0.6, z: s.z }), false);
});
test('checkpoints: halfway pad is kept once reached', () => {
  assert.equal(checkpointFor(-3), -0.9);
  assert.equal(checkpointFor(-9), -8.3);
});

// Simulate the corridor with the game's real movement constants and a simple look-ahead
// player (walk / wait / jump). Proves the timing is fair: it must be crossable without a hit.
const WALK = 4.0, JUMP_V = 6.2, GRAVITY = 20, DT = 1 / 60;
function step(st, action) {
  const n = { ...st };
  if (action.jump && n.y === 0) n.vy = JUMP_V;
  if (n.y > 0 || n.vy > 0) { n.vy -= GRAVITY * DT; n.y = Math.max(0, n.y + n.vy * DT); if (n.y === 0) n.vy = 0; }
  if (action.walk) n.z -= WALK * DT;
  n.t += DT;
  return n;
}
const hit = (st) => LASERS.some((l) => laserHits(l, laserState(l, st.t), { x: 0, y: st.y, z: st.z }));
function safeFor(st, first, horizon) {
  let s = step(st, first);
  if (hit(s)) return false;
  for (let i = 0; i < horizon; i++) { s = step(s, { walk: first.walk }); if (hit(s)) return false; }
  return true;
}
for (const startT of [0, 0.7, 1.9, 3.3]) {
  test(`laser corridor is crossable (start time ${startT}s)`, () => {
    let st = { z: CORRIDOR.maxZ - 0.6, y: 0, vy: 0, t: startT };
    const options = [{ walk: true }, { walk: true, jump: true }, { walk: false }, { walk: false, jump: true }];
    for (let i = 0; i < 60 * 40 && st.z > CORRIDOR.minZ + 0.3; i++) {
      const a = options.find((o) => safeFor(st, o, 45)) || options.find((o) => safeFor(st, o, 10)) || { walk: false };
      st = step(st, a);
      assert.equal(hit(st), false, `zapped at z=${st.z.toFixed(2)} t=${st.t.toFixed(2)}`);
    }
    assert.ok(st.z <= CORRIDOR.minZ + 0.3, `did not reach the end (z=${st.z.toFixed(2)})`);
  });
}
