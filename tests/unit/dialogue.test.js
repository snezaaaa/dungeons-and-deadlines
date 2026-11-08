import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useGame } from '../../src/game/store.js';

test('a dialogue callback can queue new dialogue (interrupt) without it being dropped', () => {
  const g = useGame.getState();
  g.say([{ who: 'joker', text: 'one', then: () => useGame.getState().say([{ who: 'boss', text: 'two' }, { who: 'boss', text: 'three' }], { interrupt: true }) }], { interrupt: true });
  useGame.getState().advanceDialogue();           // -> 'one' becomes current
  assert.equal(useGame.getState().dialogue.current.text, 'one');
  useGame.getState().advanceDialogue();           // finishing 'one' runs its callback
  const d = useGame.getState().dialogue;
  const texts = [d.current?.text, ...d.queue.map((l) => l.text)].filter(Boolean);
  assert.deepEqual(texts, ['two', 'three']);
});
