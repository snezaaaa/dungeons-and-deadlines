import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEALS, answerSeal } from '../../src/missions/mission3/dilemmas.js';
import { SLOTS, CARDS, evaluateFinalPrompt, isFinalCardAvailable, SEAL_IDS } from '../../src/missions/mission3/finalPrompt.js';
import { LASERS, laserState, laserHits, checkpointFor, CORRIDOR, CHECKPOINTS, dangerZone } from '../../src/missions/mission3/lasers.js';

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
test('checkpoints: the most advanced one reached is used', () => {
  assert.equal(checkpointFor(1), -0.9);
  assert.equal(checkpointFor(-3), -0.9);
  assert.equal(checkpointFor(-4.5), -4.3);
  assert.equal(checkpointFor(-9), -8.0);
});

// ---------------- corridor fairness (for humans, not just for a perfect bot)
const zones = LASERS.map((l) => ({ l, zone: dangerZone(l) })).sort((a, b) => b.zone[0] - a.zone[0]);

test('there is a safe place to stand between every pair of hazards', () => {
  for (let i = 0; i < zones.length - 1; i++) {
    const gap = zones[i].zone[1] - zones[i + 1].zone[0];
    assert.ok(gap >= 1.5, `only ${gap.toFixed(2)} m between ${zones[i].l.id} and ${zones[i + 1].l.id}`);
  }
});

test('there is a checkpoint after every hazard, and none inside a danger zone', () => {
  for (const { l, zone } of zones) {
    assert.ok(CHECKPOINTS.some((cp) => cp < zone[1]), `no checkpoint after ${l.id}`);
  }
  for (const cp of CHECKPOINTS) for (const { l, zone } of zones) assert.ok(cp > zone[0] + 0.5 || cp < zone[1] - 0.5, `checkpoint ${cp} too close to ${l.id}`);
});

test('a single running jump clears a whole sweep zone', () => {
  // airtime above the beam clearance at walking speed must exceed the zone length with margin
  const WALK = 4.0, JUMP_V = 6.2, G = 20, CLEAR = 0.3;
  const disc = Math.sqrt(JUMP_V * JUMP_V - 4 * (G / 2) * CLEAR);
  const airborne = (2 * disc) / G;
  for (const { l, zone } of zones.filter((z) => z.l.type === 'sweep')) {
    assert.ok(airborne * WALK > (zone[0] - zone[1]) + 0.9, `${l.id}: jump covers ${(airborne * WALK).toFixed(2)} m, zone is ${(zone[0] - zone[1]).toFixed(2)} m`);
  }
});

test('gates stay dark (and not flickering) long enough to walk through from a standstill', () => {
  for (const { l } of zones.filter((z) => z.l.type === 'gate')) {
    assert.ok(l.period - l.on - 0.7 >= 1.2, `${l.id}: safe window too short`);
  }
});

// Human-like player: real acceleration, waits in front of gates until they are dark and steady
// (with a reaction delay), and jumps somewhere in a generous window before each red JUMP zone.
const WALK = 4.0, JUMP_V = 6.2, GRAVITY = 20, DT = 1 / 60;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
function humanRun(startT, jumpEarly, react) {
  let z = CHECKPOINTS[0], y = 0, vy = 0, v = 0, t = startT, clearSince = null;
  for (let i = 0; i < 60 * 60; i++) {
    let target = WALK, jump = false;
    for (const l of LASERS) {
      const [near] = dangerZone(l);
      if (l.type === 'gate') {
        const d = z - l.z, s = laserState(l, t);
        if (d > 0.95 && d < 1.3) {                    // standing at the WAIT line
          const dark = !s.on && !s.warn;
          clearSince = dark ? (clearSince ?? t) : null;
          if (!dark || t - clearSince < react) target = 0;
        }
      } else if (z - near > 0 && z - near < jumpEarly && y === 0) jump = true;
    }
    v = damp(v, target, 12, DT);
    if (jump) vy = JUMP_V;
    if (y > 0 || vy > 0) { vy -= GRAVITY * DT; y = Math.max(0, y + vy * DT); if (y === 0) vy = 0; }
    z -= v * DT; t += DT;
    if (LASERS.some((l) => laserHits(l, laserState(l, t), { x: 0, y, z }))) return { ok: false, z, t };
    if (z < CORRIDOR.minZ + 0.2) return { ok: true };
  }
  return { ok: false, z, timeout: true };
}

test('a human-like player gets through for every start time, jump timing and reaction delay', () => {
  let runs = 0;
  for (let startT = 0; startT < 6.4; startT += 0.1) {
    for (let jumpEarly = 0.25; jumpEarly <= 1.2; jumpEarly += 0.05) {
      for (const react of [0.1, 0.3, 0.5]) {
        runs++;
        const r = humanRun(startT, jumpEarly, react);
        assert.ok(r.ok, `zapped at z=${r.z?.toFixed(2)} (start ${startT.toFixed(1)}s, jump ${jumpEarly.toFixed(2)} m early, reaction ${react}s)`);
      }
    }
  }
  assert.ok(runs > 3000);
});
