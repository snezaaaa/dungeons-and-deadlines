import React, { useEffect, useState } from 'react';
import { useGame } from '../game/store.js';
import { SLOTS, CARDS, isCardAvailable, assemblePrompt } from '../missions/mission1/promptPuzzle.js';
import { testPrompt, startDoorSequence } from '../missions/mission1/logic.js';
import { sfx } from '../game/audio.js';

export default function PromptBuilder() {
  const inventory = useGame((s) => s.inventory);
  const selection = useGame((s) => s.selection);
  const attempts = useGame((s) => s.attempts);
  const [result, setResult] = useState(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!result) return;
    let i = 0;
    const id = setInterval(() => {
      i += 3; setTyped(result.output.slice(0, i));
      if (i >= result.output.length) { clearInterval(id); setBusy(false); }
    }, 14);
    return () => clearInterval(id);
  }, [result]);

  const onTest = () => {
    if (busy) return;
    setBusy(true); setTyped('');
    // short "thinking" beat for drama
    setTimeout(() => {
      const r = testPrompt();
      setResult(r);
      if (r.success) setTimeout(() => startDoorSequence(), 4200);
    }, 700);
  };

  const showSlotResult = result && !result.success && attempts >= 2;

  return (
    <div className="builder-wrap" data-testid="prompt-builder">
      <div className="builder">
        <div className="builder-head">
          <div>
            <div className="builder-title">PROMPT BUILDER <span>// PROMPTOTRON 3000</span></div>
            <div className="builder-sub">Pick one card for each part. Glowing cards were found in the room. The others came with the software. (Suspicious.)</div>
          </div>
          <button className="btn small" onClick={() => useGame.getState().closeBuilder()} data-testid="builder-close">✕ Close (Esc)</button>
        </div>

        <div className="slots">
          {SLOTS.map((slot) => {
            const status = showSlotResult ? result.results[slot.id] : null;
            return (
              <div key={slot.id} className={`slot ${status || ''}`} style={{ '--c': slot.color }}>
                <div className="slot-label">{slot.label}{status === 'ok' && ' ✔'}{status && status !== 'ok' && ' ✖'}</div>
                <div className="slot-q">{slot.question}</div>
                {CARDS[slot.id].map((card) => {
                  const avail = isCardAvailable(card, slot.id, inventory);
                  const sel = selection[slot.id] === card.id;
                  return (
                    <button
                      key={card.id}
                      data-testid={`card-${card.id}`}
                      className={`card ${sel ? 'sel' : ''} ${card.good ? 'found' : ''} ${!avail ? 'locked' : ''}`}
                      disabled={!avail || busy}
                      onClick={() => { sfx.interact(); useGame.getState().choose(slot.id, sel ? null : card.id); }}
                    >
                      {avail ? card.text : `🔒 Not found yet — search the room for the ${slot.label} component`}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="assembled">
          <b>YOUR PROMPT:</b> {assemblePrompt(selection)}
        </div>

        <div className="builder-foot">
          <button className="btn primary big" onClick={onTest} disabled={busy} data-testid="test-prompt">{busy && !result ? 'PROMPTOTRON IS THINKING…' : '⚡ TEST PROMPT'}</button>
          <span className="muted">Attempts: {attempts}</span>
        </div>

        {(result || (busy && !result)) && (
          <div className={`ai-output ${result ? (result.success ? 'success' : 'fail') : ''}`} data-testid="ai-output">
            <div className="ai-head">{!result ? 'GENERATING…' : result.success ? `✅ PROMPT ACCEPTED — QUALITY ${result.score}%` : `❌ PROMPT REJECTED — QUALITY ${result.score}%`}</div>
            <pre>{typed}</pre>
            {result?.success && <div className="ai-foot">Unlocking door…</div>}
          </div>
        )}
      </div>
    </div>
  );
}
