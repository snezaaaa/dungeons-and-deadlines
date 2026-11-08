# Dungeons and Deadlines: THE FINAL PROMPT

A browser-based 3D comedy escape adventure. Five friends at an *AI Ready Educators* training find that their certificates have been locked, and the only way out is to write a good AI prompt.

Built with **Vite + React + Three.js + React Three Fiber**. It needs no backend, no AI API and no accounts, and it builds to plain static files.

## Mission 1: The Impossible Prompt (playable)

1. A cinematic opening plays: *"ATTENTION PARTICIPANTS. YOUR CERTIFICATES HAVE BEEN LOCKED."*
2. Explore the training center. Each of the four prompt components can only be retrieved by one character, so you have to switch between them:

| Component | Where | Who can get it |
|---|---|---|
| ROLE | Riddle on the whiteboard | 1 · The Mastermind (decodes riddles) |
| TASK | Jammed printer | 2 · The Joker (makes the printer laugh) |
| OUTPUT FORMAT | Vending machine | 3 · The Boss (negotiates) |
| CONTEXT | Rusted filing cabinet | 5 · The Fighter (brute force) |
| *Wake PROMPTOTRON* | Lectern microphone | 4 · The Commentator (broadcast voice) |

3. At the lectern terminal, open the **Prompt Builder**, pick one card for each part and press **TEST PROMPT**.
   - Decoy cards fail with absurd AI output, an alarm, a reaction from the current character and a teaching hint. From the second attempt on, the wrong slots are highlighted.
   - The right combination unlocks the door and plays a cutscene.
4. Walk through the door to trigger the victory sequence. The debrief screen then explains the Role / Task / Context / Format method with a weak-vs-strong example.

There are also extra interactions (5 snoopable computers, coffee machine, clock, presentation screen, plant, Mission 2 door) that add jokes, tips and hints about future missions.

## Mission 2: The Coffee Break Crisis (playable)

Teaches **fact-checking AI output**: hallucinations, source credibility and verification. Start it from the debrief's **Continue to Mission 2** button, or pick **M2** on the title screen.

1. Opening announcement: *"ATTENTION PARTICIPANTS. COFFEE SERVICE HAS BEEN SUSPENDED."* BREW-9000, the break-room coffee machine, has turned "intelligent". It refuses to serve coffee until you accept five claims that it states with total confidence. It also hands you its own brochure as "proof".
2. Find **reliable evidence** for every claim. Each source needs one character's skill:

| Evidence | Where | Who |
|---|---|---|
| Encyclopedia of Food History | Bookshelf | 1 · The Mastermind |
| University botany field card | Sulking fridge (tell it a joke) | 2 · The Joker |
| Supplier spec sheet | Manager's locked drawer | 3 · The Boss |
| Security camera replay | CCTV monitor (needs narration) | 4 · The Commentator |
| Maintenance log | Behind the 140 kg dishwasher | 5 · The Fighter |

   You can also pick up unreliable decoys: BREW-9000's own brochure, and a forum printout from "CoffeeTruthz420".
3. **Stay awake.** A caffeine meter drains while you explore (about 5 minutes from full). Patrolling **Mop-Bots** knock you back and cost caffeine. Donuts, sugar packets and the water cooler refill it. If it hits 0, everyone naps: that's the failure state, and you wake up at 60% to try again.
4. At the **Fact-Check Station**, choose a source and a verdict (TRUE or HALLUCINATION) for each claim. A claim only counts when the verdict is right *and* the source is reliable. If you cite the brochure, BREW-9000 gloats. Two of the five claims are actually true, because AI isn't always wrong.
5. When all five are verified, BREW-9000 is grounded, the coffee flows and the vault door opens. Walk into the antechamber for the victory sequence and the debrief on hallucinations and sources (certificate 66%).

## Mission 3: The Final Certificate (playable finale)

Teaches **responsible AI use in the classroom**, then brings all three missions together.

1. Opening announcement: *"ATTENTION PARTICIPANTS. THE FINAL CERTIFICATE REQUIRES... ONE LAST PROMPT."* THE ADMINISTRATOR guards the Certificate Vault with a 4,000-slide presentation.
2. **Hall of Seals:** four realistic classroom dilemmas. Each needs one character, and each correct answer unlocks a guardrail for the final prompt:

| Seal | Dilemma | Who |
|---|---|---|
| INTEGRITY | An AI detector says an essay is "98% AI" | 1 · The Mastermind |
| BIAS | AI word problems full of stereotypes | 2 · The Joker |
| PRIVACY | Pasting a student's support plan into a public chatbot | 3 · The Boss |
| OVERSIGHT | AI graded 120 essays; grades due tonight | 5 · The Fighter |

   Every option comes with an explanation. A wrong answer is a strike, and 3 strikes means **lockdown**: everyone sits through mandatory compliance training (the failure state), then the strikes reset. Secured seals are kept.
3. **Laser Corridor of Mandatory Compliance:** gates that blink on and off (wait for them; they flicker as a warning) and low sweeping lasers you jump over with **Space**. A hit sends you back to the last checkpoint. A unit test simulates the corridor with the game's real movement physics to prove it can be crossed fairly.
4. **Vault Core:** the team catches up with you. The Commentator powers the console, then you write **THE FINAL PROMPT**, a parent newsletter about AI use, using Role, Task, Context and Format plus the guardrails you earned. Unsafe guardrails ("include every student's grades") are rejected.
5. Finale: the vault opens, golden certificates float down to each character, and the debrief covers responsible use with a recap of the whole course. It also has a **printable certificate** you can put your own name on.

### Controls
| Key | Action |
|---|---|
| W A S D / arrows | Move (Shift = run, Space = jump) |
| Mouse | Third-person camera (click the game to lock the mouse, or drag; mouse wheel zooms) |
| E | Interact |
| 1 – 5 | Switch character |
| Esc | Pause (also closes the Prompt Builder) |
| Enter / click subtitles | Skip the current line (Enter during the intro skips it) |

## Run locally

You need Node.js 18 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open the URL that Vite prints (usually http://localhost:5173).

### Production build
```bash
npm run build
```

```bash
npm run preview
```

`npm run build` writes a fully static site to `dist/`. The build uses relative paths (`base: './'`), so `dist/` works from any domain or sub-folder.

## Publish as a public website

Any static host works. Pick one:

**Netlify (drag & drop, no account setup beyond sign-in):** run `npm run build`, then drag the `dist/` folder onto https://app.netlify.com/drop. If you connect the Git repo instead, `netlify.toml` is already set up.

**Vercel:** import the repo at https://vercel.com/new. Vercel detects Vite automatically (build: `npm run build`, output: `dist`).

**GitHub Pages:** push the project to GitHub, then go to *Settings → Pages → Source: GitHub Actions*. The included workflow `.github/workflows/deploy-pages.yml` tests, builds and publishes on every push to `main`. The site appears at `https://<user>.github.io/<repo>/`.

**Cloudflare Pages / itch.io / S3:** upload the contents of `dist/`. For itch.io, zip the *contents* of `dist/` and choose "HTML game".

## Tests

```bash
npm test
```
These are unit tests for the puzzle rules and the collision/level layout (Node's built-in test runner).

```bash
npm i -D playwright && npx playwright install chromium
```

```bash
npm run build && (npx vite preview --port 4173 &) && npm run test:e2e
```
This runs automated play-throughs of all three missions in real Chromium with WebGL (`test:e2e:m1`, `test:e2e:m2` and `test:e2e:m3` run them separately). Mission 3's covers its intro, the barrier, wrong-character and wrong-answer handling, the 3-strike lockdown, all four seals, a laser zap and checkpoint, the team catching up, the console, rejection of an unsafe guardrail, the vault cutscene, victory, and the named certificate. Mission 2's covers mission select, its intro, caffeine drain, Mop-Bot knockback, every character's evidence, the dishwasher collider swap, snacks, the nap failure state, rejection of an unreliable source, highlighting of the bad claim, the grounded cutscene, victory and the debrief. Mission 1's covers the loading and title screens, the intro, movement, wall collision, jumping, character switching, wrong-character and right-character interactions, all four pickups, the terminal, pause, a failed prompt, a successful prompt, the door cutscene, walking through the door, victory, the debrief, and the phone-width layout. It saves screenshots to `tests/e2e/screenshots/`.

## Project structure

```
src/
  App.jsx                    Canvas + UI shell
  game/
    store.js                 Zustand store: phase, progress, dialogue queue, puzzle state
    world.js                 Per-frame mutable state (positions, camera, cinematics)
    collision.js             Pure circle-vs-AABB collision (unit tested)
    interaction.js           Nearest-interactable lookup
    audio.js                 Generated WebAudio sound effects (no audio files)
  characters/
    roster.js                The 5 characters as data (look, personality, skill, model)
    BlockyAvatar.jsx         Procedural blocky avatar: faces, moods, clothing, idle styles, emotes
    Avatar.jsx               Chooses procedural or GLB model, with automatic fallback
  scene/
    GameScene.jsx            Physics loop, third-person + cinematic camera, mouse look
    canvasTexture.js         All in-world text drawn on canvas (no font downloads)
  ui/PromptBuilderBase.jsx   Reusable card-based prompt builder (Missions 1 and 3)
  missions/
    registry.js              Mission list + the shared mission interface
    mission1/
      index.js               Mission definition plugged into the registry
      layout.js              Level geometry, colliders, spawns (shared by renderer & physics)
      TrainingCenter.jsx     The 3D training center + lobby
      logic.js               Interactables, dialogue, objectives, cutscenes, win flow
      promptPuzzle.js        Puzzle rules & cards (pure, unit tested)
      PromptBuilder.jsx      The puzzle modal
    mission2/
      index.js               Mission definition (HUD items, caffeine meter, nap overlay, lesson)
      layout.js              Break room, antechamber, colliders, Mop-Bot routes (unit tested)
      BreakRoom.jsx          The 3D break room, BREW-9000, Mop-Bots, vault antechamber
      logic.js               Evidence, snacks, caffeine, naps, Mop-Bots, fact-check flow
      factCheck.js           Claims, sources & evaluation rules (pure, unit tested)
      ui.jsx                 Fact-Check Station, caffeine meter, nap overlay
    mission3/
      index.js               Mission definition (strikes HUD, lockdown overlay, finale/certificate)
      layout.js              Hall of Seals, Laser Corridor, Vault Core (unit tested)
      VaultHall.jsx          The 3D vault: seals, the Administrator's screen, lasers, vault door
      logic.js               Seals, strikes & lockdown, lasers & checkpoints, final prompt, finale
      dilemmas.js            The four responsible-AI dilemmas (pure, unit tested)
      finalPrompt.js         Final prompt cards & rules (pure, unit tested)
      lasers.js              Laser timing & hit rules (pure; corridor solvability is simulated in tests)
      ui.jsx                 Seal dilemma, final prompt builder, strikes HUD, lockdown, certificate
  ui/                        HUD, subtitles, Prompt Builder, menus, keyboard controller
```

### Adding more missions
All three missions plug into `src/missions/registry.js` through the same interface, which is documented at the top of that file. To add a bonus mission, create `src/missions/mission4/` following the existing folders (`layout.js`, a level component, `logic.js`, and an `index.js` that exports the mission object), then add it to the `MISSIONS` list. The title screen, the "Continue to Mission N" button, the HUD, cutscene cameras and the debrief all read from the registry.

## Custom avatars (GLB)

Each character in `src/characters/roster.js` has a `model` field. To replace one with a custom avatar, for example one generated from a reference photo with a tool like Ready Player Me, Meshy, Tripo or Blender:

1. Export a humanoid **.glb** that faces **+Z**, has its feet at **y = 0** and is about 2 units tall.
2. Put it in `public/avatars/`, e.g. `public/avatars/boss.glb`.
3. Change the roster entry:
```js
model: {
  type: 'glb', url: 'avatars/boss.glb', scale: 1, yOffset: 0,
  clips: { idle: 'Idle', walk: 'Walk', run: 'Run', cheer: 'Cheer', dance: 'Dance' },
},
```
`clips` maps game states to the animation clip names inside your GLB. Missing clips are skipped. If the file fails to load, the game falls back to the procedural avatar automatically. Gameplay, switching, dialogue and the camera don't depend on which model is used.

## Credits
All visuals are procedural, made from three.js primitives and canvas textures. All sounds are synthesized with WebAudio. No third-party game assets are used.
