// Records smooth gameplay videos for social media, frame by frame.
//
// The page's clock is taken over (Playwright page.clock), so every frame is rendered at an exact
// time step. That gives a perfectly smooth 30 fps video even on a slow machine or software GPU:
// animations, cutscenes, dialogue timers and physics all run on the same controlled clock.
//
// Usage (with the built game served, e.g. `npm run build && npx vite preview --port 4173`):
//   node tools/record/record.mjs --format landscape --segment m1
//   formats:  landscape (1920x1080) | vertical (1080x1920)
//   segments: intro | m1 | m2 | m3 | outro
// Frames go to recordings/<format>/<segment>/, then tools/record/assemble.sh builds the MP4s.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright'); // install with: npm i -D playwright

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const FORMAT = args.format || 'landscape';
const SEGMENT = args.segment || 'm1';
const BASE = args.url || 'http://localhost:4173/';
const FPS = Number(args.fps || 30);   // use e.g. --fps 6 for a quick draft
const SITE = args.site || 'snezaaaa.github.io/dungeons-and-deadlines';
const OUT = path.resolve(args.out || 'recordings', FORMAT, SEGMENT);
const FORMATS = {
  landscape: { viewport: { width: 1280, height: 720 }, scale: 1.5, fov: 55 },   // -> 1920x1080
  vertical: { viewport: { width: 540, height: 960 }, scale: 2, fov: 78 },       // -> 1080x1920
};
const F = FORMATS[FORMAT];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: F.viewport, deviceScaleFactor: F.scale });
const page = await ctx.newPage();
await page.clock.install();
await page.goto(BASE);
await page.waitForSelector('[data-testid=start]', { timeout: 120000 });
await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 300);

// recording-only styling: hide hints/buttons that only make sense with a mouse, add overlay layers
await page.addStyleTag({ content: `
  .look-hint, .btn.skip, .skip-hint { display: none !important; }
  * { cursor: none !important; }
  #rec-card { position: fixed; inset: 0; z-index: 999; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; text-align: center; padding: 24px; background: radial-gradient(circle at 50% 40%, #2a1f4d, #0b0d17 72%); color: #fff;
    font-family: 'Arial Black', Impact, system-ui, sans-serif; opacity: 0; pointer-events: none; }
  #rec-card .k { font-size: clamp(16px, 2.6vw, 26px); letter-spacing: .12em; color: #fde68a; }
  #rec-card .t { font-size: clamp(40px, 8vw, 92px); line-height: .95; color: #facc15; -webkit-text-stroke: 3px #111; text-shadow: 6px 6px 0 #c2410c; transform: rotate(-2deg); }
  #rec-card .s { font: 700 clamp(16px, 2.4vw, 26px) system-ui, sans-serif; color: #e2e8f0; max-width: 900px; }
  #rec-card .u { font: 800 clamp(15px, 2.2vw, 24px) system-ui, sans-serif; color: #111; background: #facc15; padding: 10px 18px; border-radius: 12px; }
  #rec-cert { position: fixed; inset: 0; z-index: 997; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
    padding: 24px; background: radial-gradient(circle at 50% 40%, #2a1f4d, #0b0d17 72%); opacity: 0; pointer-events: none; }
  #rec-cert .k { font: 900 clamp(16px, 2.4vw, 26px) 'Arial Black', Impact, sans-serif; letter-spacing: .08em; color: #facc15; text-align: center; }
  #rec-cert .certificate { width: min(1000px, 92vw); box-shadow: 0 20px 60px rgba(0,0,0,.6); }
  ${FORMAT === 'vertical' ? '#rec-cert .certificate { padding: 22px 14px; } #rec-cert .k { font-size: 20px; }' : ''}
  #rec-tag { position: fixed; left: 50%; top: 13%; transform: translateX(-50%); z-index: 998; pointer-events: none; opacity: 0;
    font: 900 clamp(18px, 3vw, 34px) 'Arial Black', Impact, sans-serif; color: #facc15; -webkit-text-stroke: 1.5px #111;
    text-shadow: 3px 3px 0 #111; white-space: nowrap; text-align: center; }
  ${FORMAT === 'vertical' ? '#rec-tag { top: 21%; font-size: 25px; white-space: normal; width: 92%; line-height: 1.15; }' : ''}
`});
await page.evaluate(() => {
  const c = document.createElement('div'); c.id = 'rec-card'; document.body.appendChild(c);
  const t = document.createElement('div'); t.id = 'rec-tag'; document.body.appendChild(t);
});
if (F.fov !== 55) await page.evaluate((fov) => { window.__camera.fov = fov; window.__camera.updateProjectionMatrix(); }, F.fov);

// ---------------------------------------------------------------- director helpers
let n = 0;
const MAX_FRAMES = args.maxsec ? Math.round(Number(args.maxsec) * FPS) : Infinity;   // --maxsec 3: short preview
class Done extends Error {}
const frame = async () => {
  if (n >= MAX_FRAMES) throw new Done();
  await page.clock.runFor(1000 / FPS);
  const file = path.join(OUT, `f${String(n).padStart(5, '0')}.jpg`);
  for (let attempt = 1; ; attempt++) {   // software rendering under load can be slow: be patient, retry
    try { await page.screenshot({ path: file, type: 'jpeg', quality: 92, timeout: 180000 }); break; }
    catch (e) { if (attempt >= 3) throw e; console.warn(`screenshot retry ${attempt}: ${e.message.split('\n')[0]}`); }
  }
  n++;
};
/** Record `sec` seconds; onFrame(i, total) runs before each frame (camera moves, fades...). */
const shoot = async (sec, onFrame) => { const total = Math.round(sec * FPS); for (let i = 0; i < total; i++) { if (onFrame) await onFrame(i, total); await frame(); } };
const hold = async (keys, sec, onFrame) => { for (const k of keys) await page.keyboard.down(k); await shoot(sec, onFrame); for (const k of keys) await page.keyboard.up(k); };
const tap = (k) => page.keyboard.press(k);
const click = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const G = (fn, arg) => page.evaluate(fn, arg);
const teleport = (i, x, z, yaw) => G(([i, x, z, yaw]) => { const c = window.__world.chars[i]; Object.assign(c, { x, z, vx: 0, vz: 0 }); if (yaw !== undefined) { c.yaw = yaw + Math.PI; window.__world.cam.yaw = yaw; } }, [i, x, z, yaw]);
const card = (html, opacity) => G(([h, o]) => { const c = document.getElementById('rec-card'); if (h !== null) c.innerHTML = h; c.style.opacity = o; }, [html, opacity]);
const tag = (text, opacity) => G(([t, o]) => { const el = document.getElementById('rec-tag'); if (t !== null) el.textContent = t; el.style.opacity = o; }, [text, opacity]);
/** A fading on-screen title that can span several shoot()/hold() calls. */
const tagger = (text, sec) => {
  let i = 0; const total = Math.round(sec * FPS), ramp = Math.max(2, Math.round(FPS / 4));
  return async () => { const o = i < ramp ? i / ramp : i > total - ramp ? Math.max(0, (total - i) / ramp) : 1; await tag(i === 0 ? text : null, o); i++; };
};
const startMission = async (id, skip = true) => {
  await click(`[data-testid=select-${id}]`);
  if (skip) await page.evaluate(() => [...document.querySelectorAll('.title-buttons .btn')].find((b) => /Skip intro/.test(b.textContent)).click());
  else await click('[data-testid=start]');
  // wait out the start-of-mission tip (it arrives ~0.6 s in), then start from a clean slate
  await shoot(0.75);
  await G(() => window.__game.useGame.getState().clearDialogue());
};
const say = (lines) => G((l) => window.__game.useGame.getState().say(l, { interrupt: true }), lines);

// ---------------------------------------------------------------- segments
const SEGMENTS = {
  async intro() {
    await shoot(0.4, async (i, total) => { if (i === 0) await card(`<div class="k">DUNGEONS &amp; DEADLINES</div><div class="t">THE FINAL<br>PROMPT</div><div class="s">A 3D comedy escape adventure about using AI well</div>`, 0); await card(null, (i + 1) / total); });
    await shoot(1.4);
    await shoot(0.4, async (i, total) => card(null, 1 - (i + 1) / total));
    await shoot(1.2);
    await click('[data-testid=start]');
    await shoot(9.5);
  },

  async m1() {
    await startMission('mission1');
    // Mastermind solves the whiteboard riddle
    await teleport(0, -5, 4.4, Math.PI);
    const t1 = tagger('MISSION 1 · THE IMPOSSIBLE PROMPT', 1.9);
    await shoot(1.2, t1);
    await hold(['KeyW'], 0.7, t1);
    await tag('', 0);
    await tap('KeyE');
    await shoot(4.2);
    // the Joker makes the printer laugh
    await tap('Digit2');
    await teleport(1, 9.5, -3.9, 0);
    await shoot(0.8);
    await hold(['KeyW'], 0.4);
    await tap('KeyE');
    await shoot(4.0);
    // build the prompt: fail, then succeed
    await G(() => { const g = window.__game.useGame.getState(); ['role', 'task', 'context', 'format'].forEach((k) => g.collect(k)); g.setFlag('terminalOn'); g.clearDialogue(); g.clearToast(); });
    await tap('Digit4');
    await teleport(3, -7.6, 0, Math.PI / 2);
    await shoot(0.5);
    await tap('KeyE');
    await shoot(0.8);
    for (const id of ['role_toaster', 'task_good', 'context_good', 'format_good']) { await click(`[data-testid=card-${id}]`); await shoot(0.35); }
    await click('[data-testid=test-prompt]');
    await shoot(3.6);
    await click('[data-testid=card-role_good]');
    await shoot(0.4);
    await click('[data-testid=test-prompt]');
    await shoot(5.8);   // success output, then the door cutscene starts
    await shoot(4.0);
  },

  async m2() {
    await startMission('mission2');
    // the Joker cheers up the sulking fridge
    await tap('Digit2');
    await teleport(1, 6.6, 5.0, -Math.PI / 2);
    const t2 = tagger('MISSION 2 · THE COFFEE BREAK CRISIS', 1.45);
    await shoot(1.0, t2);
    await hold(['KeyW'], 0.45, t2);
    await tag('', 0);
    await tap('KeyE');
    await shoot(5.0);
    // a Mop-Bot sends the Fighter flying
    await G(() => window.__game.useGame.getState().clearDialogue());
    await tap('Digit5');
    await G(() => Object.assign(window.__bots[1], { x: -1.5, z: 3.9, seg: 0, dir: 1, hitCooldown: 0 }));   // heading +x along z=3.9
    await teleport(4, 3.2, 3.9, Math.PI / 2);
    await hold(['KeyW'], 1.3);
    await shoot(1.6);
    // fact-check all five claims, step by step
    await G(() => { const g = window.__game.useGame.getState(); ['encyclopedia', 'botany', 'spec', 'cctv', 'log'].forEach((k) => g.collect(k)); g.clearDialogue(); g.clearToast(); });
    await teleport(4, -3.0, 0, Math.PI / 2);
    await shoot(0.4);
    await tap('KeyE');
    await shoot(1.0);
    const answers = [['c1', 'encyclopedia', 'false'], ['c2', 'log', 'true'], ['c3', 'spec', 'false'], ['c4', 'botany', 'true'], ['c5', 'cctv', 'false']];
    for (const [c, src, v] of answers) {
      await click(`[data-testid=claim-tab-${c}]`); await shoot(0.3);
      await click(`[data-testid=src-${c}-${src}]`); await shoot(0.45);
      await click(`[data-testid=verdict-${c}-${v}]`); await shoot(0.45);
    }
    await click('[data-testid=submit-factcheck]');
    await shoot(6.6);   // report types out, then BREW-9000 is grounded
    await shoot(4.0);
  },

  async m3() {
    await startMission('mission3');
    // the Boss faces the Seal of Privacy
    await tap('Digit3');
    await teleport(2, -3.2, 4, Math.PI / 2);
    const t3 = tagger('MISSION 3 · THE FINAL CERTIFICATE', 1.35);
    await shoot(1.0, t3);
    await hold(['KeyW'], 0.35, t3);
    await tag('', 0);
    await tap('KeyE');
    await shoot(1.6);
    await click('[data-testid=opt-p_all]');
    await shoot(2.2);
    await click('[data-testid=opt-p_anon]');
    await shoot(2.6);
    await click('[data-testid=seal-continue]');
    // the Fighter runs the laser corridor (driven by on-screen cues, like a player would)
    await G(() => { const g = window.__game.useGame.getState(); ['privacy', 'integrity', 'bias', 'oversight'].forEach((k) => g.collect(k)); g.clearDialogue(); g.clearToast(); g.patchMs({ corridorHint: true }); });
    await tap('Digit5');
    await teleport(4, 0, 2.2, 0);
    await shoot(0.5);
    await G(() => {
      const w = window.__world, defs = window.__laserDefs, g = window.__game.useGame;
      const press = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
      let walking = false, clearSince = null;
      const tick = () => {
        const s = g.getState(), c = w.chars[s.active];
        if (s.ms.teamInCore) { press('KeyW', false); return; }
        w.cam.yaw = 0;
        let go = true;
        defs.forEach((l, i) => {
          const st = window.__lasers[i];
          if (l.type === 'gate') { const d = c.z - l.z; if (d > 0.95 && d < 1.3) { const dark = !st.on && !st.warn; clearSince = dark ? (clearSince ?? performance.now()) : null; if (!dark || performance.now() - clearSince < 200) go = false; } }
          else { const d = c.z - l.zone[0]; if (d > 0 && d < 0.6 && c.grounded) { press('Space', true); press('Space', false); } }
        });
        if (go !== walking) { press('KeyW', go); walking = go; }
        requestAnimationFrame(tick);
      };
      tick();
    });
    for (let k = 0; k < 14 * FPS && !(await G(() => window.__game.useGame.getState().ms.teamInCore)); k++) await frame();
    await shoot(1.0);
    // the Commentator broadcasts THE FINAL PROMPT
    await G(() => { const g = window.__game.useGame.getState(); g.clearDialogue(); g.patchMs({ consoleOn: true }); });
    await tap('Digit4');
    await teleport(3, -4.2, -18.6, 0);
    await shoot(0.4);
    await tap('KeyE');
    await shoot(0.8);
    for (const id of ['f_role_good', 'f_task_good', 'f_ctx_good', 'f_fmt_good', 'f_guard_good']) { await click(`[data-testid=card-${id}]`); await shoot(0.3); }
    await click('[data-testid=test-prompt]');
    await shoot(6.8);   // newsletter types out, then the vault opens
    for (let k = 0; k < 4; k++) { await shoot(2.0); await tap('Enter'); }
    await shoot(5.5);   // victory dance with certificates
  },

  async outro() {
    await G(() => window.__game.useGame.setState({ missionId: 'mission3', phase: 'complete', ms: {} }));
    await shoot(0.2);
    // full-screen certificate showcase: a copy of the real certificate, with a name typed in live
    await G((vertical) => {
      const src = document.querySelector('[data-testid=certificate]');
      const wrap = document.createElement('div'); wrap.id = 'rec-cert';
      wrap.innerHTML = '<div class="k">COMPLETE ALL 3 MISSIONS<br>AND EARN YOUR</div>';
      const cert = src.cloneNode(true); cert.removeAttribute('data-testid'); wrap.appendChild(cert);
      document.body.appendChild(wrap);
      window.__recCert = { wrap, cert, name: cert.querySelector('.cert-name') };
      window.__recCert.name.textContent = '\u00a0';
    }, FORMAT === 'vertical');
    const NAME = 'Ms. Rivera';
    await shoot(0.5, async (i, total) => G(([o, sc]) => { const r = window.__recCert; r.wrap.style.opacity = o; r.cert.style.transform = `scale(${sc})`; }, [(i + 1) / total, 0.9 + 0.1 * (i + 1) / total]));
    await shoot(0.4);
    const perChar = Math.max(1, Math.round(FPS * 0.09));
    for (let c = 1; c <= NAME.length; c++) { await G((t) => { window.__recCert.name.textContent = t; }, NAME.slice(0, c)); await shoot(perChar / FPS); }
    await shoot(3.0);
    const html = `<div class="k">DUNGEONS &amp; DEADLINES</div><div class="t">THE FINAL<br>PROMPT</div><div class="s">Write better prompts · Fact-check AI · Use AI responsibly</div><div class="u">Play free in your browser: ${SITE}</div>`;
    await shoot(0.5, async (i, total) => card(i === 0 ? html : null, (i + 1) / total));
    await shoot(3.5);
  },
};

const t0 = Date.now();
try { await SEGMENTS[SEGMENT](); } catch (e) { if (!(e instanceof Done)) throw e; }
console.log(`${FORMAT}/${SEGMENT}: ${n} frames (${(n / FPS).toFixed(1)} s of video) in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
await browser.close();
