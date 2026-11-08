// End-to-end play-through of Mission 2 (The Coffee Break Crisis) in headless Chromium with WebGL.
// Usage: npm run build && (npx vite preview --port 4173 &) && npm run test:e2e:m2
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
const patchMs = (patch) => page.evaluate((p) => window.__game.useGame.getState().patchMs(p), patch);
const parkBots = () => page.evaluate(() => window.__bots.forEach((b, i) => { b.x = -6.5; b.z = i ? 3.9 : -4.6; b.seg = 0; }));
const wait = (ms) => page.waitForTimeout(ms);
const hold = async (key, ms) => { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); };
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const waitFor = async (fn, timeout = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await fn(await st())) return true; await wait(200); } return false; };
const advanceUntil = async (phase, max = 12) => { for (let i = 0; i < max && (await st()).phase !== phase; i++) { await page.keyboard.press('Enter'); await wait(450); } return (await st()).phase === phase; };

await page.goto(BASE);
await page.waitForSelector('[data-testid=start]', { timeout: 60000 });
await page.click('[data-testid=select-mission2]');
await wait(300);
check('mission select shows Mission 2', /START MISSION 2/.test(await page.textContent('[data-testid=start]')));
await shot('m2-01-title-select');

// ---- intro
await page.click('[data-testid=start]');
await wait(2600);
const ann = await page.textContent('[data-testid=announcement]').catch(() => '');
check('Mission 2 cinematic announcement', /COFFEE SERVICE HAS BEEN SUSPENDED/.test(ann), JSON.stringify(ann));
await shot('m2-02-intro');
await wait(5500); await shot('m2-03-intro-brew');
await page.keyboard.press('Enter');
check('intro skippable -> playing in the break room', await waitFor((s) => s.phase === 'playing' && s.missionId === 'mission2', 5000));
let s = await st();
check('the brochure (unreliable source) is handed over', s.inventory.includes('brochure'));
check('caffeine meter in HUD', await page.isVisible('[data-testid=caffeine]'));
await wait(1200); await shot('m2-04-gameplay');

// ---- movement still works here
const p0 = await pos(0);
await hold('KeyW', 900);
const p1 = await pos(0);
check('movement works in the break room', Math.hypot(p1.x - p0.x, p1.z - p0.z) > 1.5);

// ---- caffeine drains over time
const c0 = (await st()).ms.caffeine;
await wait(3000);
const c1 = (await st()).ms.caffeine;
check('caffeine drains while exploring', c1 < c0, `${c0.toFixed(1)} -> ${c1.toFixed(1)}`);

// ---- Mop-Bot collision
const bot = await page.evaluate(() => ({ x: window.__bots[0].x, z: window.__bots[0].z }));
const before = (await st()).ms;
await teleport(0, bot.x + 0.3, bot.z);
check('a Mop-Bot knocks you back and drains caffeine', await waitFor((s) => s.ms.bumps > before.bumps, 3000));
s = await st();
check('bump costs caffeine', s.ms.caffeine < before.caffeine - 5, `${before.caffeine.toFixed(1)} -> ${s.ms.caffeine.toFixed(1)}`);
await wait(900);

// ---- wrong character, then each character's evidence
await parkBots();
await page.keyboard.press('Digit2'); await wait(250);
await teleport(1, 8.5, -3.5); await wait(300);
await page.keyboard.press('KeyE'); await wait(400);
s = await st();
check('wrong character cannot use the bookshelf', !s.inventory.includes('encyclopedia') && /Mastermind/.test(s.line), s.line.slice(0, 50));

const plan = [
  ['Digit1', 0, [8.5, -3.5], 'encyclopedia', 'Mastermind / bookshelf'],
  ['Digit2', 1, [8.15, 5], 'botany', 'Joker / sulking fridge'],
  ['Digit3', 2, [6, -5.5], 'spec', "Boss / manager's drawer"],
  ['Digit4', 3, [-6, -6.3], 'cctv', 'Commentator / CCTV replay'],
  ['Digit5', 4, [-3, 6.3], 'log', 'Fighter / dishwasher'],
];
for (const [key, idx, spot, src, label] of plan) {
  await parkBots();
  await page.keyboard.press(key); await wait(250);
  await teleport(idx, ...spot); await wait(300);
  await page.keyboard.press('KeyE'); await wait(500);
  check(`${label} -> ${src}`, (await st()).inventory.includes(src));
  if (src === 'botany') { await wait(600); await shot('m2-05-evidence-toast'); }
}
check('dishwasher moved (collider swapped)', await page.evaluate(() => window.__world.colliders.find((c) => c.id === 'dishwasher').enabled === false));
await parkBots();
await teleport(4, 4, 7.0); await wait(300);
await page.keyboard.press('KeyE'); await wait(400);
check('decoy forum printout can be picked up', (await st()).inventory.includes('forum'));

// ---- snacks refill caffeine
await patchMs({ caffeine: 20 });
await parkBots();
await teleport(4, 2, 3.8); await wait(300);
await page.keyboard.press('KeyE'); await wait(400);
s = await st();
check('donut refills caffeine (+30)', s.ms.caffeine >= 49 && s.ms.donuts === 2, `caffeine=${s.ms.caffeine.toFixed(1)} donuts=${s.ms.donuts}`);

// ---- failure state: caffeine runs out -> nap
await patchMs({ caffeine: 0.4 });
check('caffeine at 0 triggers the nap failure state', await waitFor((s) => s.ms.napping && s.phase === 'cutscene', 4000));
await wait(1200); await shot('m2-06-nap');
check('nap overlay shown', await page.isVisible('[data-testid=nap-overlay]'));
check('wake up after the nap with 60% caffeine', await advanceUntil('playing'));
s = await st();
check('nap counted and caffeine restored', s.ms.naps === 1 && Math.round(s.ms.caffeine) >= 58, `naps=${s.ms.naps} caffeine=${s.ms.caffeine.toFixed(1)}`);

// ---- the fact-check
await parkBots();
await teleport(4, -3.4, 0); await wait(300);
await page.keyboard.press('KeyE'); await wait(500);
check('fact-check station opens', (await st()).builderOpen && await page.isVisible('[data-testid=fact-checker]'));
const answer = async (claim, src, verdict) => {
  await page.click(`[data-testid=src-${claim}-${src}]`);
  await page.click(`[data-testid=verdict-${claim}-${verdict}]`);
};
await answer('c1', 'brochure', 'false');  // right verdict, unreliable source
await answer('c2', 'log', 'true');
await answer('c3', 'spec', 'false');
await answer('c4', 'botany', 'true');
await answer('c5', 'cctv', 'false');
await shot('m2-07-factcheck');
await page.click('[data-testid=submit-factcheck]');
await page.waitForSelector('.ai-output.fail', { timeout: 6000 });
await wait(1500);
s = await st();
check('citing BREW-9000\'s own brochure is rejected', s.attempts === 1 && !s.doorOpen && s.ms.brewMood === 'gloating');
await page.click('[data-testid=submit-factcheck]');
await page.waitForSelector('.claim.bad', { timeout: 6000 });
await wait(1200);
check('second failure highlights the bad claim', (await page.$$('.claim.bad')).length === 1);
await shot('m2-08-factcheck-fail');
await page.click('[data-testid=src-c1-encyclopedia]');
await page.click('[data-testid=submit-factcheck]');
await page.waitForSelector('.ai-output.success', { timeout: 6000 });
await wait(2500); await shot('m2-09-factcheck-success');
check('correct fact-check grounds BREW-9000 -> cutscene', await waitFor((s) => s.phase === 'cutscene' && s.doorOpen, 9000));
await wait(2500); await shot('m2-10-grounded');
check('back to gameplay after the cutscene', await advanceUntil('playing'));

// ---- through the vault door
const a = (await st()).active;
await teleport(a, 0, -6.2, 0);
await hold('KeyW', 2400);
check('walking into the vault antechamber triggers victory', await waitFor((s) => s.phase === 'victory', 4000), JSON.stringify(await pos(a)));
await wait(2500); await shot('m2-11-victory');
check('mission 2 complete screen', await advanceUntil('complete'));
await wait(600);
const txt = await page.textContent('[data-testid=complete-screen]');
check('debrief: 66% certificate + fact-checking lesson', /66%/.test(txt) && /Hallucinations/i.test(txt) && /MISSION 2 COMPLETE/.test(txt));
await shot('m2-12-complete');
check('debrief offers "Continue to Mission 3"', /Mission 3/.test(await page.textContent('[data-testid=next-mission]').catch(() => '')));

const real = errors.filter((e) => !/GPU stall|WebGL|AudioContext/i.test(e));
check('no runtime errors in console', real.length === 0, real.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
