// High-level game flow actions used by UI buttons and keyboard shortcuts.
import { useGame } from '../game/store.js';
import { world, emote } from '../game/world.js';
import { initAudio, sfx } from '../game/audio.js';
import { getMission } from '../missions/registry.js';
import { ROSTER } from '../characters/roster.js';
import { findNearby } from '../game/interaction.js';

const G = () => useGame.getState();
const mission = () => getMission(G().missionId);

export function lockPointer() {
  const el = document.querySelector('canvas');
  try { const p = el?.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* ignore */ }
}

export function startMission({ skipIntro = false, missionId } = {}) {
  initAudio();
  if (missionId) useGame.setState({ missionId });
  G().resetMission();
  useGame.setState({ ms: mission().initialState?.() || {} });
  mission().reset();
  world.cam = { yaw: mission().startYaw ?? Math.PI / 2, pitch: 0.35, dist: 5.2 };
  useGame.setState({ active: 0 });
  if (skipIntro) {
    G().setPhase('intro');
    mission().endIntro();
  } else {
    world.cine = { mode: 'intro', t: 0 };
    G().setPhase('intro');
    mission().intro();
  }
}

export function skipIntro() {
  if (G().phase !== 'intro') return;
  G().clearDialogue();
  mission().endIntro();
}

export function pause() {
  const s = G();
  if (s.phase === 'title' || s.phase === 'loading' || s.paused) return;
  s.setPaused(true);
  pausedAt = performance.now();
  document.exitPointerLock?.();
}
let pausedAt = 0;
export const pausedRecently = () => performance.now() - pausedAt < 400;

export function resume() {
  G().setPaused(false);
  if (G().phase === 'playing' && !G().builderOpen) lockPointer();
}

export function restartMission() {
  G().setPaused(false);
  startMission({ skipIntro: true });
}

const SWITCH_LINES = {
  mastermind: ['I have a plan.', 'Stand back. Thinking in progress.', 'Let me handle the clever part.'],
  joker: ['Did someone order comic relief?', "I'm here! Nobody panic. Except for comedic effect.", 'Joker time, baby.'],
  boss: ['Right. Let me show you how leadership works.', 'I am taking control of this situation. And the snacks.', 'Synergy. Deploy.'],
  commentator: ['AND THE COMMENTATOR ENTERS THE FIELD!', 'Live, exclusive, and unbelievably loud!', 'Testing, testing. Oh, I am always on.'],
  fighter: ['Ready.', "Point me at the problem.", 'Stretching. Mentally.'],
};

export function switchTo(i) {
  const s = G();
  if (!['playing'].includes(s.phase) || s.builderOpen || s.paused) return;
  if (!s.switchCharacter(i)) return;
  sfx.switch();
  emote(i, 'cheer', 0.9);
  const id = ROSTER[i].id;
  const lines = SWITCH_LINES[id];
  s.say({ who: id, text: lines[Math.floor(Math.random() * lines.length)], duration: 1.8 }, { interrupt: true });
}

export function interact() {
  const s = G();
  if (s.phase !== 'playing' || s.paused || s.builderOpen) return;
  const near = findNearby(s);   // computed now, so it never lags behind the render loop
  if (!near) return;
  const it = world.interactables.find((x) => x.id === near.id);
  it?.use();
}
