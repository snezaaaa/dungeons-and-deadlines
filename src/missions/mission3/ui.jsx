import React, { useEffect, useState } from 'react';
import { useGame } from '../../game/store.js';
import { ROSTER } from '../../characters/roster.js';
import PromptBuilderBase from '../../ui/PromptBuilderBase.jsx';
import { SEALS, sealById, STRIKES_FOR_LOCKDOWN } from './dilemmas.js';
import { SLOTS, CARDS, isFinalCardAvailable, assembleFinal } from './finalPrompt.js';
import { chooseSealOption, closeModal, testFinalPrompt, startVaultSequence } from './logic.js';

// ---------------------------------------------------------------- modal switch
export function VaultPuzzle() {
  const modal = useGame((s) => s.ms.modal);
  if (modal === 'seal') return <SealDilemma />;
  if (modal === 'final') return <FinalPromptBuilder />;
  return null;
}

function SealDilemma() {
  const sealId = useGame((s) => s.ms.seal);
  const wrong = useGame((s) => s.ms.wrongPicks?.[sealId]) || [];
  const last = useGame((s) => s.ms.lastAnswer);
  const strikes = useGame((s) => s.ms.strikes);
  const solved = useGame((s) => s.inventory.includes(sealId));
  const seal = sealById(sealId);
  if (!seal) return null;
  const owner = ROSTER.find((c) => c.id === seal.who);
  return (
    <div className="builder-wrap" data-testid="seal-dilemma">
      <div className="builder seal" style={{ '--c': seal.color }}>
        <div className="builder-head">
          <div>
            <div className="builder-title" style={{ color: seal.color }}>SEAL OF {seal.label} <span>// answered by {owner.name}</span></div>
            <div className="builder-sub">Choose the most responsible action. Strikes: <b>{strikes}/{STRIKES_FOR_LOCKDOWN}</b> (at {STRIKES_FOR_LOCKDOWN}: mandatory compliance training).</div>
          </div>
          <button className="btn small" onClick={closeModal} data-testid="builder-close">✕ Close (Esc)</button>
        </div>
        <div className="scenario">📋 {seal.scenario}</div>
        <div className="options">
          {seal.options.map((o, i) => {
            const isWrong = wrong.includes(o.id);
            const isRight = solved && o.good;
            return (
              <button key={o.id} data-testid={`opt-${o.id}`} disabled={solved || isWrong}
                className={`option ${isWrong ? 'wrong' : ''} ${isRight ? 'right' : ''}`}
                onClick={() => chooseSealOption(seal.id, o.id)}>
                <span className="opt-letter">{'ABC'[i]}</span> {o.text}
                {(isWrong || isRight) && <small>{o.why}</small>}
              </button>
            );
          })}
        </div>
        {last && (
          <div className={`ai-output ${last.correct ? 'success' : 'fail'}`} data-testid="seal-result">
            <div className="ai-head">{last.correct ? `✅ SEAL SECURED — guardrail unlocked: "${seal.clause}"` : '❌ STRIKE — the Administrator is delighted'}</div>
            <pre>{last.why}</pre>
          </div>
        )}
        {solved && <div className="builder-foot"><button className="btn primary big" onClick={closeModal} data-testid="seal-continue">Continue ▸</button></div>}
      </div>
    </div>
  );
}

function FinalPromptBuilder() {
  return (
    <PromptBuilderBase
      theme="gold"
      title="THE FINAL PROMPT" tag="// a parent newsletter about AI in your class"
      subtitle="Everything you learned: Role, Task, Context and Format from Mission 1, plus the Guardrails you earned at the four Seals."
      slots={SLOTS} cards={CARDS}
      isAvailable={isFinalCardAvailable}
      lockedText={() => 'Secure all four Seals of Responsible AI to unlock these guardrails'}
      assemble={assembleFinal}
      onTest={testFinalPrompt} onSuccess={startVaultSequence}
      testLabel="📡 BROADCAST THE FINAL PROMPT" thinkingLabel="THE ADMINISTRATOR IS JUDGING…" successFoot="Opening the vault…"
      successDelay={5200}
    />
  );
}

// ---------------------------------------------------------------- HUD + overlays
export function StrikesHud() {
  const strikes = useGame((s) => s.ms.strikes ?? 0);
  const zaps = useGame((s) => s.ms.zaps ?? 0);
  return (
    <div className="strikes" data-testid="strikes">
      <span>⚠ STRIKES</span>
      {Array.from({ length: STRIKES_FOR_LOCKDOWN }, (_, i) => <i key={i} className={i < strikes ? 'on' : ''} />)}
      <span className="zaps">⚡ Laser zaps: {zaps}</span>
    </div>
  );
}

export function LockdownOverlay() {
  const lockdown = useGame((s) => s.ms.lockdown);
  const [n, setN] = useState(1);
  useEffect(() => {
    if (!lockdown) return;
    setN(1);
    const id = setInterval(() => setN((x) => x + 7 + Math.floor(Math.random() * 30)), 180);
    return () => clearInterval(id);
  }, [lockdown]);
  if (!lockdown) return null;
  const titles = ['Why Slides Matter', 'Slides, Continued', 'Synergy: A Journey', 'Our Values (Draft 14)', 'Clip Art Through the Ages', 'Q&A (No Questions)'];
  return (
    <div className="lockdown" data-testid="lockdown-overlay">
      <div className="slide">
        <small>MANDATORY COMPLIANCE TRAINING</small>
        <h2>{titles[Math.floor(n / 37) % titles.length]}</h2>
        <div className="bullets"><i /><i /><i /></div>
        <span>SLIDE {Math.min(n, 4000)} OF 4,000</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- finale extras on the debrief
const NAME_KEY = 'dd-final-prompt-name';
const readName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } };
const writeName = (v) => { try { localStorage.setItem(NAME_KEY, v); } catch { /* storage unavailable */ } };

export function Finale() {
  const [name, setName] = useState(readName);
  const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="finale">
      <div className="certificate" data-testid="certificate">
        <div className="cert-top">AI READY EDUCATORS</div>
        <div className="cert-title">Certificate of Completion</div>
        <div className="cert-small">This certifies that</div>
        <div className="cert-name">{name.trim() || 'Your Name Here'}</div>
        <div className="cert-small">together with The Mastermind, The Joker, The Boss, The Commentator and The Fighter, survived</div>
        <div className="cert-course">DUNGEONS &amp; DEADLINES: THE FINAL PROMPT</div>
        <div className="cert-skills">Prompt Engineering · Fact-Checking AI · Responsible AI Use</div>
        <div className="cert-foot"><span>{date}</span><span className="seal">✦</span><span>THE ADMINISTRATOR<br /><small>(reluctantly)</small></span></div>
      </div>
      <div className="cert-controls">
        <label>Name on certificate <input data-testid="cert-name" value={name} maxLength={40} placeholder="Type your name" onChange={(e) => { setName(e.target.value); writeName(e.target.value); }} /></label>
        <button className="btn" onClick={() => window.print()}>🖨 Print certificate</button>
      </div>
      <h3>🎓 The whole course in three lines</h3>
      <div className="recap">
        <div><b>Mission 1 · Write it well</b><span>Role + Task + Context + Output Format.</span></div>
        <div><b>Mission 2 · Check it</b><span>AI can hallucinate. Verify claims with reliable, independent sources.</span></div>
        <div><b>Mission 3 · Use it responsibly</b><span>Protect student data, don't trust detectors blindly, check for bias, keep a human in charge.</span></div>
      </div>
      <div className="credits">
        <b>STARRING</b>
        {ROSTER.map((c) => <span key={c.id} style={{ color: c.color }}>{c.name}</span>)}
        <b>ALSO STARRING</b>
        <span>PROMPTOTRON 3000 · BREW-9000 (and Jr.) · THE ADMINISTRATOR · two Mop-Bots · a sulking fridge · Kevin the goat (did not exist)</span>
      </div>
    </div>
  );
}

export const SEAL_HUD = SEALS;
