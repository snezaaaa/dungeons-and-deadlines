import React, { useEffect, useState } from 'react';
import { useGame } from '../../game/store.js';
import { sfx } from '../../game/audio.js';
import { CLAIMS, SOURCES, sourcesFor } from './factCheck.js';
import { submitFactCheck, startGroundedSequence } from './logic.js';

// ---------------------------------------------------------------- caffeine meter (HUD)
export function CaffeineMeter() {
  const caffeine = useGame((s) => Math.round(s.ms.caffeine ?? 100));
  const doorOpen = useGame((s) => s.doorOpen);
  const level = doorOpen ? 100 : caffeine;
  const low = level < 25;
  const color = level > 50 ? '#22c55e' : level > 25 ? '#facc15' : '#ef4444';
  return (
    <div className={`caffeine ${low ? 'low' : ''}`} data-testid="caffeine">
      <span>☕ CAFFEINE</span>
      <div className="caffeine-bar"><div style={{ width: `${level}%`, background: color }} /></div>
      <b>{level}%</b>
      {low && <em>SO SLEEPY… grab a snack!</em>}
    </div>
  );
}

// ---------------------------------------------------------------- nap overlay (failure state)
export function NapOverlay() {
  const napping = useGame((s) => s.ms.napping);
  if (!napping) return null;
  return (
    <div className="nap-overlay" data-testid="nap-overlay">
      <div className="zzz"><span>Z</span><span>z</span><span>z</span></div>
      <div className="nap-text">CAFFEINE DEPLETED</div>
    </div>
  );
}

// ---------------------------------------------------------------- fact-check station
const VERDICTS = [[true, '✔ TRUE'], [false, '✖ HALLUCINATION']];
const NONE = {};

export function FactChecker() {
  const inventory = useGame((s) => s.inventory);
  const answers = useGame((s) => s.ms.answers || NONE);
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

  const setAnswer = (claimId, patch) => {
    sfx.interact();
    useGame.getState().patchMs((m) => ({ answers: { ...m.answers, [claimId]: { ...(m.answers?.[claimId] || {}), ...patch } } }));
  };

  const onSubmit = () => {
    if (busy) return;
    setBusy(true); setTyped(''); setResult(null);
    setTimeout(() => {
      const r = submitFactCheck();
      setResult(r);
      if (r.success) setTimeout(() => startGroundedSequence(), 5200);
    }, 700);
  };

  const showStatus = result && !result.success && attempts >= 2;
  const reliableFound = inventory.filter((k) => SOURCES[k]?.reliable).length;

  return (
    <div className="builder-wrap" data-testid="fact-checker">
      <div className="builder factcheck">
        <div className="builder-head">
          <div>
            <div className="builder-title">FACT-CHECK STATION <span>// grounding BREW-9000</span></div>
            <div className="builder-sub">
              For each claim, pick the source you trust, then decide whether the claim is TRUE or a HALLUCINATION.
              Check who wrote each source. Reliable evidence found: <b>{reliableFound}/5</b>.
            </div>
          </div>
          <button className="btn small" onClick={() => useGame.getState().closeBuilder()} data-testid="builder-close">✕ Close (Esc)</button>
        </div>

        <div className="claims">
          {CLAIMS.map((c, idx) => {
            const a = answers[c.id] || {};
            const options = sourcesFor(c.id, inventory);
            const status = showStatus ? result.results[c.id] : null;
            return (
              <div key={c.id} className={`claim ${status ? (status === 'ok' ? 'ok' : 'bad') : ''}`} data-testid={`claim-${c.id}`}>
                <div className="claim-text"><span className="claim-num">#{idx + 1}</span> “{c.text}” {status && <em className="claim-status">{status === 'ok' ? '✔ verified' : status === 'lucky' ? '⚠ right answer, unreliable source' : status === 'unreliable' ? '✖ unreliable source' : status === 'wrong' ? '✖ wrong verdict' : '✖ incomplete'}</em>}</div>
                <div className="claim-body">
                  <div className="sources">
                    {options.map((sid) => {
                      const s = SOURCES[sid];
                      return (
                        <button key={sid} data-testid={`src-${c.id}-${sid}`} disabled={busy}
                          className={`source ${a.source === sid ? 'sel' : ''}`} style={{ '--c': s.color }}
                          onClick={() => setAnswer(c.id, { source: a.source === sid ? null : sid })}>
                          <b>{s.title}</b>
                          <small>{s.author}</small>
                          <span>“{s.claims[c.id]}”</span>
                        </button>
                      );
                    })}
                    {!options.some((sid) => SOURCES[sid].reliable) && (
                      <div className="source missing">🔍 No independent evidence yet. Search the break room (each character can unlock one source).</div>
                    )}
                  </div>
                  <div className="verdicts">
                    {VERDICTS.map(([v, label]) => (
                      <button key={label} data-testid={`verdict-${c.id}-${v}`} disabled={busy}
                        className={`verdict ${v ? 'true' : 'false'} ${a.verdict === v ? 'sel' : ''}`}
                        onClick={() => setAnswer(c.id, { verdict: a.verdict === v ? null : v })}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="builder-foot">
          <button className="btn primary big" onClick={onSubmit} disabled={busy} data-testid="submit-factcheck">{busy && !result ? 'BREW-9000 IS REVIEWING…' : '⚡ SUBMIT FACT-CHECK'}</button>
          <span className="muted">Attempts: {attempts}</span>
        </div>

        {(result || busy) && (
          <div className={`ai-output ${result ? (result.success ? 'success' : 'fail') : ''}`} data-testid="ai-output">
            <div className="ai-head">{!result ? 'ANALYZING…' : result.success ? `✅ ALL CLAIMS VERIFIED — ACCURACY ${result.score}%` : `❌ FACT-CHECK REJECTED — ACCURACY ${result.score}%`}</div>
            <pre>{typed}</pre>
            {result?.success && <div className="ai-foot">Brewing coffee… unlocking the vault corridor…</div>}
          </div>
        )}
      </div>
    </div>
  );
}
