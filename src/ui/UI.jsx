import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store.js';
import { ROSTER, SPEAKERS } from '../characters/roster.js';
import { MISSIONS, getMission } from '../missions/registry.js';
import { sfx } from '../game/audio.js';
import { startMission, skipIntro, resume, restartMission, switchTo, lockPointer } from './actions.js';

export default function UI() {
  const phase = useGame((s) => s.phase);
  const paused = useGame((s) => s.paused);
  const builderOpen = useGame((s) => s.builderOpen);
  const mission = getMission(useGame((s) => s.missionId));
  const { PuzzleUI, Overlay } = mission;
  return (
    <div className="ui">
      <DialogueDirector />
      {phase === 'loading' && <LoadingScreen />}
      {phase === 'title' && <TitleScreen />}
      {(phase === 'intro' || phase === 'cutscene' || phase === 'victory') && <Letterbox />}
      {phase === 'intro' && <IntroOverlay text={mission.announcement} />}
      {phase === 'victory' && <div className="victory-banner">MISSION {mission.number} COMPLETE</div>}
      {Overlay && phase !== 'title' && phase !== 'loading' && <Overlay />}
      {(phase === 'playing' || phase === 'cutscene') && <HUD />}
      {phase !== 'title' && phase !== 'loading' && <Subtitles />}
      <Toast />
      {builderOpen && PuzzleUI && <PuzzleUI />}
      {paused && <PauseMenu />}
      {phase === 'complete' && <CompleteScreen />}
    </div>
  );
}

// ---------------------------------------------------------------- dialogue timing
function DialogueDirector() {
  const current = useGame((s) => s.dialogue.current);
  const qlen = useGame((s) => s.dialogue.queue.length);
  const paused = useGame((s) => s.paused);
  useEffect(() => {
    const s = useGame.getState();
    if (!current && qlen) { s.advanceDialogue(); return; }
    if (!current || paused) return;
    const ms = (current.duration ?? Math.min(8, Math.max(2.4, 1.4 + current.text.length * 0.052))) * 1000;
    const id = setTimeout(() => { if (useGame.getState().dialogue.current === current) useGame.getState().advanceDialogue(); }, ms);
    return () => clearTimeout(id);
  }, [current, qlen, paused]);
  return null;
}

function Subtitles() {
  const line = useGame((s) => s.dialogue.current);
  const builderOpen = useGame((s) => s.builderOpen);
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!line) { setShown(''); return; }
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 2;
      setShown(line.text.slice(0, i));
      if (i % 6 === 0) sfx.blip();
      if (i >= line.text.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [line]);
  if (!line) return null;
  const sp = SPEAKERS[line.who] || SPEAKERS.narrator;
  const charIndex = ROSTER.findIndex((c) => c.id === line.who);
  return (
    <div className={`subtitles ${line.who === 'system' ? 'system' : ''} ${builderOpen ? 'top' : ''}`} onClick={() => useGame.getState().advanceDialogue()} data-testid="subtitles">
      {sp.name && (
        <div className="speaker" style={{ color: sp.color }}>
          {charIndex >= 0 && <span className="speaker-chip" style={{ background: sp.color }}>{charIndex + 1}</span>}
          {sp.name}
        </div>
      )}
      <div className="line">{shown}<span className="caret">▌</span></div>
      <div className="skip-hint">click / Enter ▸</div>
    </div>
  );
}

// ---------------------------------------------------------------- loading & title
function LoadingScreen() {
  const [p, setP] = useState(5);
  useEffect(() => { const id = setInterval(() => setP((x) => Math.min(95, x + (100 - x) * 0.08)), 80); return () => clearInterval(id); }, []);
  const tips = ['Compiling dramatic lighting…', 'Locking certificates…', 'Hiding prompt components…', 'Teaching the printer to laugh…'];
  return (
    <div className="screen loading">
      <Logo small />
      <div className="bar"><div style={{ width: `${p}%` }} /></div>
      <div className="loading-tip">{tips[Math.floor(p / 25) % tips.length]}</div>
    </div>
  );
}

function Logo({ small }) {
  return (
    <div className={`logo ${small ? 'small' : ''}`}>
      <div className="logo-top">DUNGEONS <span>&amp;</span> DEADLINES</div>
      <div className="logo-main">THE FINAL PROMPT</div>
    </div>
  );
}

function TitleScreen() {
  const missionId = useGame((s) => s.missionId);
  const selected = getMission(missionId);
  return (
    <div className="screen title">
      <Logo />
      <p className="pitch">Five educators. One locked door. Zero certificates.<br />A dramatic action thriller about writing a good AI prompt.</p>
      <div className="lineup">
        {ROSTER.map((c, i) => (
          <div key={c.id} className="lineup-card" style={{ '--c': c.color }}>
            <div className="num">{i + 1}</div>
            <div className="mini-head" style={{ background: c.look.skin, borderTopColor: c.look.hair }}><i /><i /></div>
            <div className="mini-body" style={{ background: c.look.shirt }} />
            <b>{c.name}</b>
            <small>{c.tagline}</small>
          </div>
        ))}
      </div>
      <div className="title-buttons">
        <button className="btn primary" data-testid="start" onClick={() => startMission()}>▶ START MISSION {selected.number}</button>
        <button className="btn" onClick={() => startMission({ skipIntro: true })}>Skip intro</button>
      </div>
      <div className="missions-row" role="radiogroup" aria-label="Choose a mission">
        {MISSIONS.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={m.id === missionId}
            data-testid={`select-${m.id}`}
            disabled={m.status !== 'available'}
            className={`mission-pill ${m.status} ${m.id === missionId ? 'selected' : ''}`}
            onClick={() => useGame.setState({ missionId: m.id })}
          >
            M{m.number}: {m.title} {m.status !== 'available' && <em>coming soon</em>}
          </button>
        ))}
      </div>
      <p className="mission-tagline">{selected.tagline}</p>
      <Controls />
    </div>
  );
}

function Controls() {
  return (
    <div className="controls">
      <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span>
      <span><kbd>Shift</kbd> run</span>
      <span><kbd>Mouse</kbd> camera</span>
      <span><kbd>E</kbd> interact</span>
      <span><kbd>1</kbd>–<kbd>5</kbd> switch</span>
      <span><kbd>Space</kbd> jump</span>
      <span><kbd>Esc</kbd> pause</span>
    </div>
  );
}

// ---------------------------------------------------------------- cinematics
function Letterbox() { return (<><div className="letterbox top" /><div className="letterbox bottom" /></>); }

function IntroOverlay({ text }) {
  const [t, setT] = useState(0);
  useEffect(() => { const start = performance.now(); const id = setInterval(() => setT((performance.now() - start) / 1000), 50); return () => clearInterval(id); }, []);
  const typed = text.slice(0, Math.floor(Math.max(0, t - 0.4) * 28));
  return (
    <>
      {t < 8.5 && (
        <div className={`announce ${t > 7.5 ? 'fade' : ''}`}>
          <div className="announce-tag">⚠ EMERGENCY BROADCAST ⚠</div>
          <div className="announce-text" data-testid="announcement">{typed}</div>
        </div>
      )}
      <div className="alarm-vignette" />
      <button className="btn skip" data-testid="skip-intro" onClick={skipIntro}>Skip ▸▸ <small>(Enter)</small></button>
    </>
  );
}

// ---------------------------------------------------------------- HUD
function HUD() {
  const st = useGame();
  const mission = getMission(st.missionId);
  const [locked, setLocked] = useState(!!document.pointerLockElement);
  useEffect(() => {
    const f = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', f);
    return () => document.removeEventListener('pointerlockchange', f);
  }, []);
  const objective = mission.objective(st);
  const items = mission.hudItems(st);
  const { HudExtra } = mission;
  return (
    <>
      <div className="hud-objective" data-testid="objective">
        <div className="mission-name">MISSION {mission.number} · {mission.title.toUpperCase()}</div>
        <div className="objective-text">▸ {objective}</div>
        <div className="components">
          {items.map(({ id, label, color, got }) => (
            <div key={id} className={`comp ${got ? 'got' : ''}`} style={{ '--c': color }} data-testid={`comp-${id}`}>
              {got ? '✔' : '?'} {label}
            </div>
          ))}
        </div>
        {HudExtra && <HudExtra />}
      </div>
      <div className="char-bar">
        {ROSTER.map((c, i) => (
          <button key={c.id} className={`char-btn ${st.active === i ? 'active' : ''}`} style={{ '--c': c.color }} onClick={() => switchTo(i)} data-testid={`char-${i + 1}`}>
            <span className="num">{i + 1}</span>
            <span className="cname">{c.name.replace('The ', '')}</span>
            <span className="skill">{c.skill}</span>
          </button>
        ))}
      </div>
      {st.nearby && st.phase === 'playing' && (
        <div className="interact-prompt" data-testid="interact-prompt"><kbd>E</kbd> {st.nearby.label}</div>
      )}
      {!locked && st.phase === 'playing' && !st.builderOpen && (
        <div className="look-hint" onClick={lockPointer}>Click the game to look around with the mouse (or drag)</div>
      )}
    </>
  );
}

function Toast() {
  const toast = useGame((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => useGame.getState().clearToast(), 5200);
    return () => clearTimeout(id);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className="toast" key={toast.key} style={{ '--c': toast.color }} data-testid="toast">
      <div className="toast-title">{toast.title}</div>
      <div className="toast-body">{toast.body}</div>
      {toast.tip && <div className="toast-tip">💡 {toast.tip}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- menus
function PauseMenu() {
  const muted = useGame((s) => s.muted);
  return (
    <div className="screen pause" data-testid="pause-menu">
      <div className="panel">
        <h2>PAUSED</h2>
        <p className="muted">The deadline is also paused. (It is not.)</p>
        <button className="btn primary" onClick={resume}>Resume</button>
        <button className="btn" onClick={restartMission}>Restart Mission</button>
        <button className="btn" onClick={() => useGame.getState().toggleMute()}>{muted ? 'Unmute sound' : 'Mute sound'}</button>
        <button className="btn" onClick={() => { useGame.getState().resetMission(); useGame.setState({ phase: 'title' }); }}>Quit to title</button>
        <Controls />
      </div>
    </div>
  );
}

function CompleteScreen() {
  const st = useGame();
  const mission = getMission(st.missionId);
  const secs = st.finishedAt && st.startedAt ? Math.round((st.finishedAt - st.startedAt) / 1000) : 0;
  const L = mission.lesson;
  const next = MISSIONS.find((m) => m.number === mission.number + 1);
  const rank = st.attempts <= 1 ? mission.ranks[0] : st.attempts <= 3 ? mission.ranks[1] : mission.ranks[2];
  return (
    <div className="screen complete" data-testid="complete-screen">
      <div className="panel wide">
        <div className="stamp">{mission.certificate}</div>
        <h1>MISSION {mission.number} COMPLETE</h1>
        <p className="stats">Time: {Math.floor(secs / 60)}m {secs % 60}s · {mission.attemptLabel}: {st.attempts}{mission.extraStats ? ` · ${mission.extraStats(st)}` : ''} · Rank: {rank}</p>
        <h3>📚 What you just learned: {L.title}</h3>
        <div className="lesson-grid">
          {L.points.map(([k, v]) => <div key={k} className="lesson"><b>{k}</b><span>{v}</span></div>)}
        </div>
        <div className="compare">
          <div className="bad"><b>❌ Weak prompt</b><p>“{L.example.bad}”</p></div>
          <div className="good"><b>✅ Strong prompt</b><p>“{L.example.good}”</p></div>
        </div>
        <p className="muted">{L.extra}</p>
        <div className="next">
          {MISSIONS.filter((m) => m.number > mission.number).map((m) => (
            <div key={m.id} className="next-card"><b>Mission {m.number}: {m.title}</b><span>{m.tagline}</span><em>{m.status === 'available' ? 'Unlocked!' : 'Coming soon'}</em></div>
          ))}
        </div>
        <div className="title-buttons">
          {next?.status === 'available' && (
            <button className="btn primary" data-testid="next-mission" onClick={() => startMission({ missionId: next.id })}>▶ Continue to Mission {next.number}</button>
          )}
          <button className={`btn ${next?.status === 'available' ? '' : 'primary'}`} onClick={() => startMission()}>Replay Mission {mission.number}</button>
          <button className="btn" onClick={() => { useGame.setState({ phase: 'title' }); }}>Title screen</button>
        </div>
      </div>
    </div>
  );
}
