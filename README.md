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
This runs an automated play-through in real Chromium with WebGL. It covers the loading and title screens, the intro, movement, wall collision, jumping, character switching, wrong-character and right-character interactions, all four pickups, the terminal, pause, a failed prompt, a successful prompt, the door cutscene, walking through the door, victory, the debrief, and the phone-width layout. It saves screenshots to `tests/e2e/screenshots/`.

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
  missions/
    registry.js              Mission list + the shared mission interface
    mission1/
      layout.js              Level geometry, colliders, spawns (shared by renderer & physics)
      TrainingCenter.jsx     The 3D training center + lobby
      logic.js               Interactables, dialogue, objectives, cutscenes, win flow
      promptPuzzle.js        Puzzle rules & cards (pure, unit tested)
  ui/                        HUD, subtitles, Prompt Builder, menus, keyboard controller
```

### Adding Mission 2 / Mission 3
Missions 2 and 3 are already registered as `coming-soon` in `src/missions/registry.js`, and they are shown on the title and debrief screens and inside the lobby. To build one:
1. Create `src/missions/mission2/` with `layout.js`, a level component, and `logic.js`, following the mission1 layout.
2. In `registry.js`, fill in the same shape as mission1 (`Level, spawns, colliders, openSpaces, interactables, intro, endIntro, update, objective, reset, cinematics, lesson`) and set `status: 'available'`.
3. Set `missionId` in the store, for example from the Mission 1 debrief's "next" card. `GameScene` and the HUD read everything from the registry, so no engine code needs to change.

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
