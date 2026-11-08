import { create } from 'zustand';
import { ROSTER } from '../characters/roster.js';

/**
 * React-facing game state (UI, progress, dialogue). High-frequency per-frame data
 * (positions, velocities, camera) lives in `world.js` to avoid re-renders.
 *
 * phase: 'loading' | 'title' | 'intro' | 'playing' | 'cutscene' | 'victory' | 'complete'
 */
const initialProgress = () => ({
  inventory: [],          // collected prompt component slot ids
  flags: {},              // mission-specific flags (e.g. terminalOn)
  attempts: 0,
  lastResult: null,
  doorOpen: false,
  builderOpen: false,
  selection: { role: null, task: null, context: null, format: null },
  objective: '',
  startedAt: 0,
  finishedAt: 0,
  ms: {},                 // free-form state owned by the current mission (see mission.initialState)
});

export const useGame = create((set, get) => ({
  phase: 'loading',
  missionId: 'mission1',
  paused: false,
  muted: false,
  active: 0,
  nearby: null,           // { id, label }
  toast: null,            // { title, body, color, key }
  dialogue: { current: null, queue: [] },
  ...initialProgress(),

  setPhase: (phase) => set({ phase }),
  setPaused: (paused) => set({ paused }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setObjective: (objective) => set({ objective }),
  setNearby: (nearby) => {
    const cur = get().nearby;
    if (cur?.id === nearby?.id && cur?.label === nearby?.label) return;
    set({ nearby });
  },
  switchCharacter: (i) => {
    if (i < 0 || i >= ROSTER.length || i === get().active) return false;
    set({ active: i });
    return true;
  },
  setFlag: (k, v = true) => set((s) => ({ flags: { ...s.flags, [k]: v } })),
  collect: (slotId) => {
    if (get().inventory.includes(slotId)) return false;
    set((s) => ({ inventory: [...s.inventory, slotId] }));
    return true;
  },
  showToast: (toast) => set({ toast: { ...toast, key: Math.random() } }),
  clearToast: () => set({ toast: null }),

  // ---- dialogue ----
  // line: { who: 'joker'|'ai'|'system'|..., text, mood?, emote?, then?: fn, duration? }
  say: (lines, { interrupt = false } = {}) => {
    const arr = Array.isArray(lines) ? lines : [lines];
    set((s) => ({
      dialogue: interrupt
        ? { current: null, queue: arr }
        : { current: s.dialogue.current, queue: [...s.dialogue.queue, ...arr] },
    }));
  },
  advanceDialogue: () => {
    const { current, queue } = get().dialogue;
    set({ dialogue: { current: queue[0] || null, queue: queue.slice(1) } });
    // run the callback AFTER advancing, so a callback that queues new dialogue (say + interrupt) is kept
    current?.then?.();
  },
  clearDialogue: () => set({ dialogue: { current: null, queue: [] } }),

  // ---- puzzle ----
  openBuilder: () => set({ builderOpen: true }),
  closeBuilder: () => set({ builderOpen: false }),
  choose: (slot, cardId) => set((s) => ({ selection: { ...s.selection, [slot]: cardId } })),
  recordAttempt: (result) => set((s) => ({ attempts: s.attempts + 1, lastResult: result })),
  openDoor: () => set({ doorOpen: true }),
  patchMs: (patch) => set((s) => ({ ms: { ...s.ms, ...(typeof patch === 'function' ? patch(s.ms) : patch) } })),

  resetMission: () => set({ ...initialProgress(), nearby: null, toast: null, paused: false, dialogue: { current: null, queue: [] } }),
}));

// Exposed for the automated play-through test and for debugging in the browser console.
if (typeof window !== 'undefined') window.__game = { useGame };
