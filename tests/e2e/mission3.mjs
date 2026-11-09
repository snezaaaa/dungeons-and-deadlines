// End-to-end play-through of Mission 3 (The Final Certificate) in headless Chromium with WebGL.
// Usage: npm run build && (npx vite preview --port 4173 &) && npm run test:e2e:m3
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright'); // install with: npm i -D playwright

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const SHOTS = process.env.SHOTS || 'tests/e2e/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const st = () => page.evaluate(() => { const s = window.__game.useGame.getState(); return { phase: s.phase, missionId: s.missionId, active: s.active, inventory: s.inventory, attempts: s.attempts, builderOpen: s.builderOpen, doorOpen: s.doorOpen, ms: s.ms, line: s.dialogue.current?.text || '' }; });
const pos = (i) => page.evaluate((i) => { const c = window.__world.chars[i]; return { x: c.x, z: c.z }; }, i);
const teleport = (i, x, z, yaw) => page.evaluate(([i, x, z, yaw]) => { const c = window.__world.chars[i]; c.x = x; c.z = z; c.vx = c.vz = 0; if (yaw !== undefined) window.__world.cam.yaw = yaw; }, [i, x, z, yaw]);
const wait = (ms) => page.waitForTimeout(ms);
const hold = async (key, ms) => { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); };
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const waitFor = async (fn, timeout = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await fn(await st())) return true; await wait(150); } return false; };
const advanceUntil = async (phase, max = 14) => { for (let i = 0; i < max && (await st()).phase !== phase; i++) { await page.keyboard.press('Enter'); await wait(450); } return (await st()).phase === phase; };
const SEAL_SPOT = { privacy: [-4.6, 4], integrity: [4.6, 4], bias: [-4.6, 10], oversight: [4.6, 10] };
const useSeal = async (key, idx, seal) => {
  await page.keyboard.press(key); await wait(250);
  await teleport(idx, ...SEAL_SPOT[seal]); await wait(300);
  await page.keyboard.press('KeyE'); await wait(400);
};
// Stand in gate g1's beam (re-placing every frame) until the game registers a zap.
const zapAtGate = (i) => page.evaluate((i) => new Promise((resolve) => {
  const g = window.__game.useGame, start = g.getState().ms.zaps, t0 = performance.now();
  const f = () => {
    if (g.getState().ms.zaps > start) return resolve(true);
    if (performance.now() - t0 > 12000) return resolve(false);
    if (window.__lasers[0].on) { const c = window.__world.chars[i]; c.x = 0; c.z = -2.8; c.vx = c.vz = 0; }
    requestAnimationFrame(f);
  };
  f();
}), i);
const pick = async (opt) => { await page.click(`[data-testid=opt-${opt}]`); await wait(350); };

await page.goto(BASE);
await page.waitForSelector('[data-testid=start]', { timeout: 60000 });
await page.click('[data-testid=select-mission3]');
check('mission select shows Mission 3', /START MISSION 3/.test(await page.textContent('[data-testid=start]')));

// ---- intro
await page.click('[data-testid=start]');
await wait(3600);
const ann = await page.textContent('[data-testid=announcement]').catch(() => '');
check('Mission 3 cinematic announcement', /ONE LAST PROMPT/.test(ann), JSON.stringify(ann));
await shot('m3-01-intro');
await wait(4500); await shot('m3-02-intro-admin');
await page.keyboard.press('Enter');
check('intro skippable -> playing in the vault hall', await waitFor((s) => s.phase === 'playing' && s.missionId === 'mission3', 5000));
check('strikes HUD visible', await page.isVisible('[data-testid=strikes]'));
await wait(1200); await shot('m3-03-hall');

// ---- barrier blocks the corridor
await teleport(0, 0, 1.2, 0);
await hold('KeyW', 900);
check('energy barrier blocks the corridor before the seals', (await pos(0)).z >= 0.4, JSON.stringify(await pos(0)));

// ---- wrong character, wrong answer, right answer
await useSeal('Digit2', 1, 'privacy');
let s = await st();
check('wrong character cannot open the PRIVACY seal', !s.builderOpen && /Boss/.test(s.line), s.line.slice(0, 70));
await useSeal('Digit3', 2, 'privacy');
check('The Boss opens the PRIVACY dilemma', await page.isVisible('[data-testid=seal-dilemma]'));
await shot('m3-04-dilemma');
await pick('p_all');
s = await st();
check('irresponsible choice = strike + explanation', s.ms.strikes === 1 && /confidential/i.test(await page.textContent('[data-testid=seal-result]')));
await pick('p_anon');
check('responsible choice secures the PRIVACY seal', (await st()).inventory.includes('privacy'));
await shot('m3-05-seal-secured');
await page.click('[data-testid=seal-continue]'); await wait(300);

// ---- three strikes -> lockdown (failure state)
await useSeal('Digit1', 0, 'integrity');
await pick('i_zero');
await pick('i_rerun');
check('third strike triggers LOCKDOWN', await waitFor((s) => s.ms.lockdown && s.phase === 'cutscene', 5000));
await wait(1000);
check('compliance-training overlay shown', await page.isVisible('[data-testid=lockdown-overlay]'));
await shot('m3-06-lockdown');
check('lockdown ends, back to playing', await advanceUntil('playing'));
s = await st();
check('strikes reset after lockdown, seals kept', s.ms.strikes === 0 && s.ms.lockdowns === 1 && s.inventory.includes('privacy'));
await useSeal('Digit1', 0, 'integrity');
check('previously wrong options stay marked', await page.isDisabled('[data-testid=opt-i_zero]'));
await pick('i_talk');
await page.click('[data-testid=seal-continue]'); await wait(250);
await useSeal('Digit2', 1, 'bias');
await pick('b_fix');
await page.click('[data-testid=seal-continue]'); await wait(250);
await useSeal('Digit5', 4, 'oversight');
await pick('o_human');
await page.click('[data-testid=seal-continue]'); await wait(300);
s = await st();
check('all four seals secured', ['privacy', 'integrity', 'bias', 'oversight'].every((k) => s.inventory.includes(k)));
check('barrier is down', await page.evaluate(() => window.__world.colliders.find((c) => c.id === 'sealgate').enabled === false));

// ---- laser corridor: a zap sends you back to the checkpoint
const a = (await st()).active;
await page.evaluate(() => { window.__world.cam.yaw = 0; });
check('touching an active laser gate zaps you', await zapAtGate(a));
const back = await pos(a);
check('zap returns you to the first checkpoint', Math.abs(back.z + 0.9) < 0.6, JSON.stringify(back));
await wait(400); await shot('m3-07-corridor');
check('no exemption offered after just one zap', !(await page.evaluate(() => window.__game.useGame.getState().nearby?.id === 'exemption')));
await page.evaluate(() => window.__game.useGame.getState().patchMs({ zaps: 3 }));
await zapAtGate(a);
await wait(500);
check('after 4 zaps the Administrator offers a skip at the checkpoint', await page.evaluate(() => window.__game.useGame.getState().nearby?.id === 'exemption'));
await shot('m3-07a-exemption');

// ---- play the corridor LIVE: real keyboard input (W + Space), real physics and hit detection.
// The bot only uses what a player can see: gate lit/flickering/dark, and the red JUMP zones.
await page.evaluate((ai) => {
  const w = window.__world, defs = window.__laserDefs;
  window.__botDone = false;
  const press = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  let walking = false, clearSince = null;
  const tick = () => {
    const c = w.chars[ai];
    const s = window.__game.useGame.getState();
    if (s.ms.teamInCore || window.__botDone) { press('KeyW', false); window.__botDone = true; return; }
    w.cam.yaw = 0;
    let go = true;
    defs.forEach((l, i) => {
      const st = window.__lasers[i];
      if (l.type === 'gate') {
        const d = c.z - l.z;
        if (d > 0.95 && d < 1.3) {
          const dark = !st.on && !st.warn;
          clearSince = dark ? (clearSince ?? performance.now()) : null;
          if (!dark || performance.now() - clearSince < 250) go = false;
        }
      } else {
        const d = c.z - l.zone[0];
        if (d > 0 && d < 0.75 && c.grounded) { press('Space', true); press('Space', false); }
      }
    });
    if (go !== walking) { press('KeyW', go); walking = go; }
    setTimeout(tick, 16);
  };
  tick();
}, a);
await page.waitForFunction(() => window.__botDone || window.__game.useGame.getState().ms.teamInCore, null, { timeout: 90000 }).catch(() => {});
await page.evaluate(() => { window.__botDone = true; });
s = await st();
check('the corridor can be crossed live with keyboard controls', s.ms.teamInCore, `zaps during live run: ${s.ms.zaps - 1}`);
check('every teammate is now in the core', await page.evaluate(() => window.__world.chars.every((c) => c.z < -16.4)));
await shot('m3-07b-core');

// ---- final prompt
await page.keyboard.press('Digit1'); await wait(250);
await teleport(0, -4.2, -19.3); await wait(300);
await page.keyboard.press('KeyE'); await wait(400);
check('console requires the Commentator', !(await st()).ms.consoleOn);
await page.keyboard.press('Digit4'); await wait(250);
await teleport(3, -4.2, -19.3); await wait(300);
await page.keyboard.press('KeyE'); await wait(400);
check('Commentator powers up the console', (await st()).ms.consoleOn);
await page.keyboard.press('KeyE'); await wait(500);
check('final prompt builder opens', await page.isVisible('[data-testid=prompt-builder]'));
for (const id of ['f_role_good', 'f_task_good', 'f_ctx_good', 'f_fmt_good', 'f_guard_grades']) await page.click(`[data-testid=card-${id}]`);
await shot('m3-08-final-builder');
await page.click('[data-testid=test-prompt]');
await page.waitForSelector('.ai-output.fail', { timeout: 6000 });
await wait(2200);
check('unsafe guardrail is rejected with a privacy alert', /PRIVACY ALERT/.test(await page.textContent('[data-testid=ai-output]')));
await page.click('[data-testid=card-f_guard_good]');
await page.click('[data-testid=test-prompt]');
await page.waitForSelector('.ai-output.success', { timeout: 6000 });
await wait(2600); await shot('m3-09-final-success');
check('vault-opening cutscene', await waitFor((s) => s.phase === 'cutscene' && s.doorOpen, 9000));
await wait(3000); await shot('m3-10-vault-open');
check('victory sequence', await advanceUntil('victory'));
await wait(3000); await shot('m3-11-victory');
check('finale complete screen', await advanceUntil('complete', 16));
await wait(600);
const txt = await page.textContent('[data-testid=complete-screen]');
check('debrief: 100% + responsible-use lesson + course recap', /100%/.test(txt) && /Responsibly/i.test(txt) && /Mission 2 · Check it/.test(txt));
await page.fill('[data-testid=cert-name]', 'Ms. Example');
check('certificate shows the typed name', /Ms\. Example/.test(await page.textContent('[data-testid=certificate]')));
await page.evaluate(() => document.querySelector('[data-testid=certificate]').scrollIntoView());
await wait(300); await shot('m3-12-certificate');
check('no "Continue to Mission 4" button after the finale', !(await page.isVisible('[data-testid=next-mission]')));

const real = errors.filter((e) => !/GPU stall|WebGL|AudioContext/i.test(e));
check('no runtime errors in console', real.length === 0, real.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
