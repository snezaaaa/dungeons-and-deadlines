// Tiny WebAudio synth: all sound effects are generated, no audio files needed.
import { useGame } from './store.js';

let ctx = null;
let master = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch { ctx = null; }
}

function tone(freq, dur, { type = 'sine', vol = 0.2, slide = null, delay = 0 } = {}) {
  if (!ctx || useGame.getState().muted) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  blip: () => tone(660 + Math.random() * 120, 0.05, { type: 'square', vol: 0.03 }),
  interact: () => tone(520, 0.08, { type: 'triangle', vol: 0.15 }),
  deny: () => { tone(220, 0.15, { type: 'square', vol: 0.1 }); tone(160, 0.2, { type: 'square', vol: 0.1, delay: 0.15 }); },
  pickup: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.15, delay: i * 0.07 })),
  switch: () => tone(300, 0.15, { type: 'sine', vol: 0.15, slide: 900 }),
  fail: () => { tone(300, 0.5, { type: 'sawtooth', vol: 0.12, slide: 80 }); },
  success: () => [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.16, delay: i * 0.11 })),
  siren: (times = 3) => { for (let i = 0; i < times; i++) tone(440, 0.6, { type: 'sawtooth', vol: 0.07, slide: 880, delay: i * 0.7 }); },
  door: () => { tone(90, 1.2, { type: 'sawtooth', vol: 0.08, slide: 180 }); tone(1200, 0.3, { type: 'sine', vol: 0.08, delay: 1.1 }); },
  jump: () => tone(300, 0.15, { type: 'sine', vol: 0.08, slide: 600 }),
};
