import { useEffect } from 'react';
import { useGame } from '../game/store.js';
import { world } from '../game/world.js';
import { interact, switchTo, pause, resume, pausedRecently, skipIntro } from './actions.js';

export default function KeyboardController() {
  useEffect(() => {
    const down = (e) => {
      const s = useGame.getState();
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        if (e.code === 'Escape') {
          if (s.builderOpen) { s.closeBuilder(); return; }
          if (s.paused) { if (!pausedRecently()) resume(); } else pause();
          return;
        }
        if (s.phase === 'intro' && (e.code === 'Enter' || e.code === 'Space')) { skipIntro(); return; }
        if (e.code === 'Enter' && s.dialogue.current) { s.advanceDialogue(); return; }
        if (e.code === 'KeyE') interact();
        if (e.code === 'Space' && s.phase === 'playing') world.jumpRequest = true;
        const m = /^Digit([1-5])$/.exec(e.code) || /^Numpad([1-5])$/.exec(e.code);
        if (m) switchTo(Number(m[1]) - 1);
      }
      world.keys.add(e.code);
    };
    const up = (e) => world.keys.delete(e.code);
    const blur = () => world.keys.clear();
    const lockChange = () => {
      const s = useGame.getState();
      // Browsers swallow ESC while pointer-locked; losing the lock during play = pause request.
      if (!document.pointerLockElement && s.phase === 'playing' && !s.builderOpen && !s.paused) pause();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('pointerlockchange', lockChange);
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur); document.removeEventListener('pointerlockchange', lockChange);
    };
  }, []);
  return null;
}
