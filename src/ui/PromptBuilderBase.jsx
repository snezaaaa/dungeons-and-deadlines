import React, { useEffect, useState } from 'react';
import { useGame } from '../game/store.js';
import { sfx } from '../game/audio.js';

/**
 * Reusable card-based prompt builder (Mission 1's PROMPT BUILDER, Mission 3's FINAL PROMPT).
 * props:
 *   title, tag, subtitle      header text
 *   slots   [{ id, label, color, question }]
 *   cards   { [slotId]: [{ id, text, good? }] }
 *   isAvailable(card, slotId, inventory) -> bool
 *   lockedText(slot)          text for cards that are not unlocked yet
 *   assemble(selection)       -> string preview
 *   onTest()                  -> { success, score, results, output } (also records the attempt)
 *   onSuccess()               called after the success output has been shown
 *   testLabel, thinkingLabel, successFoot, theme ('cyan' | 'gold')
 */
export default function PromptBuilderBase({
  title, tag, subtitle, slots, cards, isAvailable, lockedText, assemble, onTest, onSuccess,
  testLabel = '⚡ TEST PROMPT', thinkingLabel = 'THINKING…', successFoot = 'Unlocking…', theme = 'cyan', successDelay = 4200,
}) {
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

  const test = () => {
    if (busy) return;
    setBusy(true); setTyped(''); setResult(null);
    setTimeout(() => {
      const r = onTest();
      setResult(r);
      if (r.success) setTimeout(() => onSuccess(), successDelay);
    }, 700);
  };

  const showSlotResult = result && !result.success && attempts >= 2;

  return (
    <div className="builder-wrap" data-testid="prompt-builder">
      <div className={`builder theme-${theme}`}>
        <div className="builder-head">
          <div>
            <div className="builder-title">{title} <span>{tag}</span></div>
            <div className="builder-sub">{subtitle}</div>
          </div>
          <button className="btn small" onClick={() => useGame.getState().closeBuilder()} data-testid="builder-close">✕ Close (Esc)</button>
        </div>

        <div className={`slots n${slots.length}`}>
          {slots.map((slot) => {
            const status = showSlotResult ? result.results[slot.id] : null;
            return (
              <div key={slot.id} className={`slot ${status || ''}`} style={{ '--c': slot.color }}>
                <div className="slot-label">{slot.label}{status === 'ok' && ' ✔'}{status && status !== 'ok' && ' ✖'}</div>
                <div className="slot-q">{slot.question}</div>
                {cards[slot.id].map((card) => {
                  const avail = isAvailable(card, slot.id, inventory);
                  const sel = selection[slot.id] === card.id;
                  return (
                    <button
                      key={card.id}
                      data-testid={`card-${card.id}`}
                      className={`card ${sel ? 'sel' : ''} ${card.good ? 'found' : ''} ${!avail ? 'locked' : ''}`}
                      disabled={!avail || busy}
                      onClick={() => { sfx.interact(); useGame.getState().choose(slot.id, sel ? null : card.id); }}
                    >
                      {avail ? card.text : `🔒 ${lockedText(slot)}`}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="assembled"><b>YOUR PROMPT:</b> {assemble(selection)}</div>

        <div className="builder-foot">
          <button className="btn primary big" onClick={test} disabled={busy} data-testid="test-prompt">{busy && !result ? thinkingLabel : testLabel}</button>
          <span className="muted">Attempts: {attempts}</span>
        </div>

        {(result || busy) && (
          <div className={`ai-output ${result ? (result.success ? 'success' : 'fail') : ''}`} data-testid="ai-output">
            <div className="ai-head">{!result ? 'GENERATING…' : result.success ? `✅ PROMPT ACCEPTED — QUALITY ${result.score}%` : `❌ PROMPT REJECTED — QUALITY ${result.score}%`}</div>
            <pre>{typed}</pre>
            {result?.success && <div className="ai-foot">{successFoot}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
