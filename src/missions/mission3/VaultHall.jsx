import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../../game/store.js';
import { world } from '../../game/world.js';
import { makeCanvasTexture, useCanvasTexture, FONT } from '../../scene/canvasTexture.js';
import { HALL, CORRIDOR, CORE, WALL_T, GAP, SEAL_POS, PROPS } from './layout.js';
import { SEALS } from './dilemmas.js';
import { LASERS, CHECKPOINTS, SWEEP_HEIGHT } from './lasers.js';
import { laserStates } from './logic.js';

const damp = THREE.MathUtils.damp;
const M = (color, o = {}) => <meshStandardMaterial color={color} roughness={0.6} {...o} />;
function Box({ s, p, r, c, o, cast = true }) {
  return <mesh position={p} rotation={r} castShadow={cast} receiveShadow><boxGeometry args={s} />{M(c, o)}</mesh>;
}
function Cyl({ a, p, r, c, o }) {
  return <mesh position={p} rotation={r} castShadow receiveShadow><cylinderGeometry args={a} />{M(c, o)}</mesh>;
}
function Panel({ w, h, p, r, tex, emissive = 0.9 }) {
  return (
    <mesh position={p} rotation={r}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={emissive} toneMapped={false} />
    </mesh>
  );
}
const GOLD = { metalness: 0.85, roughness: 0.25 };

function useTextures() {
  return useMemo(() => {
    const marble = makeCanvasTexture(256, 256, (g) => {
      g.fillStyle = '#efe9f5'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#2b2140'; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
      g.strokeStyle = 'rgba(160,140,190,.35)'; g.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(Math.random() * 256, Math.random() * 256); g.bezierCurveTo(Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256); g.stroke(); }
    });
    marble.wrapS = marble.wrapT = THREE.RepeatWrapping; marble.repeat.set(10, 7);
    const grid = makeCanvasTexture(128, 128, (g) => { g.fillStyle = '#111827'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#1f3a5f'; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128); });
    grid.wrapS = grid.wrapT = THREE.RepeatWrapping; grid.repeat.set(3, 10);
    const banner = (txt, col) => makeCanvasTexture(160, 480, (g, w, h) => {
      g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = '#fde68a'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 40, w, 6);
      g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); g.fillStyle = '#fde68a'; g.font = `44px ${FONT}`; g.textAlign = 'center'; g.fillText(txt, 0, 16); g.restore();
    });
    const sign = (lines, bg, fg) => makeCanvasTexture(512, 128, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center';
      g.font = `46px ${FONT}`; g.fillText(lines[0], w / 2, 62); if (lines[1]) { g.font = 'bold 24px system-ui'; g.fillText(lines[1], w / 2, 104); }
    });
    return {
      marble, grid,
      banners: [banner('PRIVACY', '#0c4a6e'), banner('INTEGRITY', '#4c1d95'), banner('FAIRNESS', '#7c2d12'), banner('OVERSIGHT', '#7f1d1d')],
      corridorSign: sign(['LASER CORRIDOR', 'of Mandatory Compliance · jump the low beams'], '#450a0a', '#fecaca'),
      consoleSign: sign(['THE FINAL PROMPT', 'broadcast console · voice authorisation required'], '#3b0764', '#f5d0fe'),
      trophy: sign(['EMPLOYEE OF THE MONTH', 'PROMPTOTRON 3000 · 12 months running'], '#78350f', '#fde68a'),
      brewJr: sign(['BREW-9000 Jr.', 'now with citations'], '#14532d', '#bbf7d0'),
    };
  }, []);
}

// ---------------------------------------------------------------- the Administrator's screen
function AdminScreen() {
  const strikes = useGame((s) => s.ms.strikes ?? 0);
  const lockdown = useGame((s) => s.ms.lockdown);
  const doorOpen = useGame((s) => s.doorOpen);
  const seals = useGame((s) => SEALS.filter((x) => s.inventory.includes(x.id)).length);
  const [slide, setSlide] = useState(1);
  useEffect(() => { const id = setInterval(() => setSlide((n) => (n % 3999) + 1), lockdown ? 150 : 4000); return () => clearInterval(id); }, [lockdown]);
  const tex = useCanvasTexture(1024, 512, (g, w, h) => {
    const mood = doorOpen ? 'humbled' : strikes > 0 || lockdown ? 'gleeful' : 'smug';
    g.fillStyle = mood === 'humbled' ? '#052e16' : '#1e0b2e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const col = mood === 'humbled' ? '#4ade80' : '#e879f9';
    // face: a stern geometric administrator with one monocle
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(170, 150); g.lineTo(270, mood === 'humbled' ? 140 : 175); g.stroke();
    g.beginPath(); g.moveTo(330, mood === 'humbled' ? 140 : 175); g.lineTo(430, 150); g.stroke();
    g.beginPath(); g.arc(220, 215, 24, 0, 7); g.fill(); g.beginPath(); g.arc(380, 215, 24, 0, 7); g.fill();
    g.beginPath(); g.arc(380, 215, 46, 0, 7); g.stroke(); g.beginPath(); g.moveTo(420, 245); g.lineTo(450, 330); g.stroke();
    g.beginPath();
    if (mood === 'humbled') g.arc(300, 360, 70, Math.PI + 0.4, -0.4);
    else if (mood === 'gleeful') g.arc(300, 300, 80, 0.15, Math.PI - 0.15);
    else { g.moveTo(230, 330); g.lineTo(370, 320); }
    g.stroke();
    // slide panel
    g.fillStyle = '#f8fafc'; g.fillRect(560, 70, 410, 300); g.fillStyle = '#7c3aed'; g.fillRect(560, 70, 410, 50);
    g.fillStyle = '#fff'; g.font = 'bold 24px system-ui'; g.fillText(lockdown ? 'MANDATORY TRAINING' : doorOpen ? 'THANK YOU' : 'POLICY OVERVIEW', 580, 104);
    g.fillStyle = '#1f2937'; g.font = 'bold 22px system-ui';
    const bullets = doorOpen ? ['• You wrote a responsible prompt', '• I am... proud?', '• Slides 2–4,000 cancelled'] : ['• Protect student data', '• Detectors are not judges', '• Check for bias', '• Humans decide'];
    bullets.forEach((b, i) => g.fillText(b, 580, 165 + i * 46));
    g.textAlign = 'center'; g.fillStyle = col; g.font = `40px ${FONT}`;
    g.fillText(doorOpen ? 'VAULT OPEN' : `SLIDE ${slide} OF 4,000`, 765, 430);
    g.font = 'bold 26px system-ui'; g.fillStyle = '#fff';
    g.fillText(doorOpen ? 'Certificates released' : `Seals ${seals}/4 · Strikes ${strikes}/3`, 765, 475);
    g.fillText('THE ADMINISTRATOR', 300, 470);
  }, [strikes, lockdown, doorOpen, seals, slide]);
  return (
    <group position={[0, 0, HALL.minZ + 0.06]}>
      {/* sits above the corridor opening (top at 3.6 m) so it never hides the way forward */}
      <Box s={[4.9, 2.45, 0.12]} p={[0, 4.8, -0.04]} c="#0f0a1a" />
      <Panel w={4.6} h={2.3} p={[0, 4.8, 0.04]} tex={tex} emissive={1} />
    </group>
  );
}

// ---------------------------------------------------------------- seal pedestals
function SealPedestal({ seal }) {
  const solved = useGame((s) => s.inventory.includes(seal.id));
  const p = SEAL_POS[seal.id];
  const lock = useRef(), shackle = useRef(), beam = useRef();
  useFrame((s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    lock.current.rotation.y = s.clock.elapsedTime * (solved ? 1.6 : 0.7);
    lock.current.position.y = 2.25 + Math.sin(s.clock.elapsedTime * 2 + p.x) * 0.08;
    shackle.current.position.y = damp(shackle.current.position.y, solved ? 0.42 : 0.22, 4, dt);
    beam.current.material.opacity = damp(beam.current.material.opacity, solved ? 0.28 : 0, 3, dt);
  });
  const glow = { emissive: seal.color, emissiveIntensity: solved ? 2.2 : 0.6, toneMapped: false };
  return (
    <group position={[p.x, 0, p.z]}>
      <Cyl a={[0.7, 0.8, 0.3, 24]} p={[0, 0.15, 0]} c="#2e1065" />
      <Cyl a={[0.45, 0.55, 1.3, 20]} p={[0, 0.95, 0]} c="#ede9fe" o={{ roughness: 0.3 }} />
      <Cyl a={[0.62, 0.62, 0.12, 24]} p={[0, 1.66, 0]} c="#d4af37" o={GOLD} />
      <mesh position={[0, 1.73, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.35, 0.55, 32]} /><meshStandardMaterial color={seal.color} {...glow} /></mesh>
      <group ref={lock} position={[0, 2.25, 0]}>
        <Box s={[0.5, 0.4, 0.18]} p={[0, 0, 0]} c={seal.color} o={glow} />
        <group ref={shackle} position={[0, 0.22, 0]}>
          <mesh rotation={[0, 0, 0]}><torusGeometry args={[0.15, 0.04, 8, 16, Math.PI]} />{M('#e5e7eb', { metalness: 0.8 })}</mesh>
        </group>
      </group>
      <mesh ref={beam} position={[0, 4.2, 0]}><cylinderGeometry args={[0.35, 0.6, 5, 16, 1, true]} /><meshBasicMaterial color={seal.color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- lasers
function Laser({ index }) {
  const l = LASERS[index];
  const group = useRef();
  const mats = useRef([]);
  useFrame((s) => {
    const st = laserStates[index];
    if (!st || !group.current) return;
    group.current.position.z = st.z;
    const flicker = st.warn ? (Math.sin(s.clock.elapsedTime * 40) > 0 ? 0.6 : 0.1) : st.on ? 1 : 0.06;
    mats.current.forEach((m) => { if (m) { m.opacity = flicker; m.emissiveIntensity = 3 * flicker; } });
  });
  const heights = l.type === 'gate' ? [0.3, 0.75, 1.2, 1.65, 2.1, 2.55] : [SWEEP_HEIGHT];
  return (
    <group ref={group} position={[0, 0, l.type === 'gate' ? l.z : l.z1]}>
      {heights.map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, GAP * 2, 8]} />
          <meshStandardMaterial ref={(m) => (mats.current[i] = m)} color="#ff2d2d" emissive="#ff2d2d" emissiveIntensity={3} transparent toneMapped={false} />
        </mesh>
      ))}
      {[-GAP + 0.05, GAP - 0.05].map((x) => <Box key={x} s={[0.12, l.type === 'gate' ? 2.8 : 0.3, 0.3]} p={[x, l.type === 'gate' ? 1.4 : SWEEP_HEIGHT, 0]} c="#1f2937" o={{ metalness: 0.7 }} />)}
    </group>
  );
}

// ---------------------------------------------------------------- vault door + certificates
function VaultDoor() {
  const open = useGame((s) => s.doorOpen);
  const door = useRef(), wheel = useRef(), glow = useRef();
  useFrame((s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    wheel.current.rotation.z += dt * (open ? 4 : 0.15);
    door.current.position.x = damp(door.current.position.x, open ? 4.6 : 0, open ? 0.8 : 4, dt);
    glow.current.intensity = damp(glow.current.intensity, open ? 30 : 0, 1.5, dt);
  });
  return (
    <group position={[PROPS.vault.x, 0, CORE.minZ + 0.1]}>
      <mesh position={[0, 2.8, 0.02]}><circleGeometry args={[2.7, 40]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.4} toneMapped={false} /></mesh>
      <pointLight ref={glow} position={[0, 2.8, 1.2]} color="#fbbf24" intensity={0} distance={16} decay={1.4} />
      <mesh position={[0, 2.8, 0]}><torusGeometry args={[2.85, 0.25, 12, 48]} />{M('#9ca3af', GOLD)}</mesh>
      <group ref={door} position={[0, 0, 0.15]}>
        <mesh position={[0, 2.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[2.65, 2.65, 0.4, 48]} />{M('#a8a29e', { metalness: 0.9, roughness: 0.25 })}</mesh>
        <group ref={wheel} position={[0, 2.8, 0.25]}>
          <mesh><torusGeometry args={[0.9, 0.09, 10, 32]} />{M('#d4af37', GOLD)}</mesh>
          {[0, 1, 2].map((k) => <Box key={k} s={[1.9, 0.12, 0.12]} r={[0, 0, (k * Math.PI) / 3]} c="#d4af37" o={GOLD} />)}
        </group>
        {Array.from({ length: 10 }, (_, k) => <Cyl key={k} a={[0.1, 0.1, 0.2, 10]} p={[Math.cos((k / 10) * Math.PI * 2) * 2.2, 2.8 + Math.sin((k / 10) * Math.PI * 2) * 2.2, 0.25]} r={[Math.PI / 2, 0, 0]} c="#57534e" o={{ metalness: 0.9 }} />)}
      </group>
    </group>
  );
}

function Certificates() {
  const open = useGame((s) => s.doorOpen);
  const refs = useRef([]);
  useFrame((s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    refs.current.forEach((m, i) => {
      if (!m) return;
      const c = world.chars[i];
      const tx = open ? c.x : (i - 2) * 0.5, tz = open ? c.z : CORE.minZ - 0.3, ty = open ? c.y + 2.55 + Math.sin(s.clock.elapsedTime * 2 + i) * 0.08 : 2.8;
      m.position.x = damp(m.position.x, tx, 1.6, dt);
      m.position.y = damp(m.position.y, ty, 1.6, dt);
      m.position.z = damp(m.position.z, tz, 1.6, dt);
      m.rotation.y += dt * 1.5;
      m.visible = open;
    });
  });
  const tex = useMemo(() => makeCanvasTexture(256, 180, (g, w, h) => {
    g.fillStyle = '#fef3c7'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b45309'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#78350f'; g.textAlign = 'center'; g.font = `22px ${FONT}`; g.fillText('CERTIFICATE', w / 2, 60);
    g.font = 'bold 15px system-ui'; g.fillText('AI READY EDUCATOR', w / 2, 90); g.fillStyle = '#dc2626'; g.beginPath(); g.arc(w / 2, 130, 20, 0, 7); g.fill();
  }), []);
  return Array.from({ length: 5 }, (_, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[(i - 2) * 0.5, 2.8, CORE.minZ - 0.3]} visible={false}>
      <planeGeometry args={[0.75, 0.53]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.6} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  ));
}

function Lighting() {
  const alarm = useRef();
  useFrame((s, dt) => {
    if (useGame.getState().phase !== 'intro') world.alarm = Math.max(0, world.alarm - Math.min(dt, 0.1) * 0.35);
    alarm.current.intensity = world.alarm * (0.5 + 0.5 * Math.sin(s.clock.elapsedTime * 9)) * 90;
  });
  return (
    <>
      <hemisphereLight args={['#e9d5ff', '#3b0764', 0.6]} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[8, 18, 10]} intensity={1.4} color="#fff1dc" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-34} shadow-camera-near={1} shadow-camera-far={60} />
      <pointLight position={[0, 5.2, 7]} intensity={22} distance={18} decay={1.4} color="#fde68a" />
      <pointLight position={[0, 3.2, -8]} intensity={10} distance={12} decay={1.5} color="#fca5a5" />
      <pointLight position={[0, 5.2, -21]} intensity={22} distance={16} decay={1.4} color="#f5d0fe" />
      <pointLight ref={alarm} position={[0, 5, 6]} color="#ff1a1a" distance={30} decay={1.3} intensity={0} />
    </>
  );
}

function Barrier() {
  const down = useGame((s) => SEALS.every((x) => s.inventory.includes(x.id)));
  const ref = useRef();
  useFrame((s) => { if (ref.current) ref.current.material.opacity = 0.25 + Math.sin(s.clock.elapsedTime * 3) * 0.1; });
  if (down) return null;
  return (
    <mesh ref={ref} position={[0, 1.7, HALL.minZ - 0.2]}>
      <planeGeometry args={[GAP * 2, 3.4]} />
      <meshBasicMaterial color="#a855f7" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------- level
export default function VaultHall() {
  const T = useTextures();
  const HW = HALL.maxX - HALL.minX, HD = HALL.maxZ - HALL.minZ, HC = (HALL.minZ + HALL.maxZ) / 2;
  const CW = CORE.maxX - CORE.minX, CD = CORE.maxZ - CORE.minZ, CC = (CORE.minZ + CORE.maxZ) / 2;
  const KD = CORRIDOR.maxZ - CORRIDOR.minZ, KC = (CORRIDOR.minZ + CORRIDOR.maxZ) / 2;
  const wall = '#3b2366', trim = '#d4af37';
  const sideHall = HALL.maxX - GAP, sideCore = CORE.maxX - GAP;
  return (
    <group>
      <Lighting />
      <fog attach="fog" args={['#1a1030', 26, 60]} />

      {/* ---------- Hall of Seals ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, HC]} receiveShadow><planeGeometry args={[HW, HD]} /><meshStandardMaterial map={T.marble} roughness={0.25} metalness={0.15} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, HC]} receiveShadow><planeGeometry args={[2.6, HD]} />{M('#991b1b', { roughness: 0.9 })}</mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL.h, HC]}><planeGeometry args={[HW, HD]} />{M('#1e1036')}</mesh>
      <Box s={[WALL_T, HALL.h, HD + WALL_T * 2]} p={[HALL.minX - WALL_T / 2, HALL.h / 2, HC]} c={wall} />
      <Box s={[WALL_T, HALL.h, HD + WALL_T * 2]} p={[HALL.maxX + WALL_T / 2, HALL.h / 2, HC]} c={wall} />
      <Box s={[HW, HALL.h, WALL_T]} p={[0, HALL.h / 2, HALL.maxZ + WALL_T / 2]} c={wall} />
      {[-1, 1].map((sgn) => <Box key={sgn} s={[sideHall, HALL.h, WALL_T]} p={[sgn * (GAP + sideHall / 2), HALL.h / 2, HALL.minZ - WALL_T / 2]} c={wall} />)}
      <Box s={[GAP * 2, HALL.h - 3.6, WALL_T]} p={[0, 3.6 + (HALL.h - 3.6) / 2, HALL.minZ - WALL_T / 2]} c={wall} />
      {[HALL.minX + 0.02, HALL.maxX - 0.02].map((x) => <Box key={x} s={[0.04, 0.12, HD]} p={[x, 1.2, HC]} c={trim} o={GOLD} cast={false} />)}
      <Box s={[HW, 0.12, 0.04]} p={[0, 1.2, HALL.maxZ - 0.02]} c={trim} o={GOLD} cast={false} />
      {[2, 7, 12].flatMap((z) => [-9.3, 9.3].map((x) => (
        <group key={x + ':' + z} position={[x, 0, z]}>
          <Cyl a={[0.36, 0.42, HALL.h - 0.6, 18]} p={[0, (HALL.h - 0.6) / 2 + 0.3, 0]} c="#ede9fe" o={{ roughness: 0.3 }} />
          <Box s={[0.9, 0.3, 0.9]} p={[0, 0.15, 0]} c={trim} o={GOLD} />
          <Box s={[0.9, 0.3, 0.9]} p={[0, HALL.h - 0.15, 0]} c={trim} o={GOLD} />
        </group>
      )))}
      {T.banners.map((tex, i) => <Panel key={i} w={1.1} h={3.2} p={[i < 2 ? HALL.minX + 0.03 : HALL.maxX - 0.03, 3.6, i % 2 ? 9.5 : 4.5]} r={[0, i < 2 ? Math.PI / 2 : -Math.PI / 2, 0]} tex={tex} emissive={0.35} />)}
      {[[0, 4], [0, 10]].map(([x, z]) => (
        <group key={z} position={[x, HALL.h - 0.8, z]}>
          <mesh><torusGeometry args={[0.9, 0.06, 8, 32]} />{M(trim, GOLD)}</mesh>
          {Array.from({ length: 8 }, (_, k) => <mesh key={k} position={[Math.cos(k * 0.785) * 0.9, -0.15, Math.sin(k * 0.785) * 0.9]}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color="#fff7d6" emissive="#fde68a" emissiveIntensity={2} toneMapped={false} /></mesh>)}
          <Cyl a={[0.02, 0.02, 0.8, 6]} p={[0, 0.4, 0]} c={trim} />
        </group>
      ))}
      <AdminScreen />
      {SEALS.map((s) => <SealPedestal key={s.id} seal={s} />)}
      <Barrier />
      {/* trophy case & BREW-9000 Jr. */}
      <group position={[PROPS.trophy.x, 0, PROPS.trophy.z + 0.4]}>
        <Box s={[0.8, 2.2, 1.5]} p={[0, 1.1, 0]} c="#78350f" />
        <Box s={[0.02, 1.6, 1.3]} p={[0.41, 1.3, 0]} c="#bae6fd" o={{ transparent: true, opacity: 0.35 }} />
        {[0.8, 1.5].map((y) => <Cyl key={y} a={[0.12, 0.08, 0.3, 12]} p={[0.1, y, 0]} c="#d4af37" o={GOLD} />)}
        <Panel w={1.3} h={0.32} p={[0.43, 2.45, 0]} r={[0, Math.PI / 2, 0]} tex={T.trophy} emissive={0.6} />
      </group>
      <group position={[PROPS.brewJr.x, 0, PROPS.brewJr.z + 0.4]}>
        <Box s={[0.8, 1.6, 0.8]} p={[0, 0.8, 0]} c="#d6d3d1" o={{ metalness: 0.6, roughness: 0.3 }} />
        <Box s={[0.02, 0.5, 0.5]} p={[-0.41, 1.25, 0]} c="#052e16" o={{ emissive: '#4ade80', emissiveIntensity: 0.6 }} />
        <Cyl a={[0.08, 0.07, 0.14, 12]} p={[-0.3, 0.75, 0]} c="#fff" />
        <Panel w={1.2} h={0.3} p={[-0.43, 1.95, 0]} r={[0, -Math.PI / 2, 0]} tex={T.brewJr} emissive={0.6} />
      </group>

      {/* ---------- Laser Corridor ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, KC]} receiveShadow><planeGeometry args={[GAP * 2, KD]} /><meshStandardMaterial map={T.grid} roughness={0.4} metalness={0.4} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.6, KC]}><planeGeometry args={[GAP * 2, KD]} />{M('#0b1020')}</mesh>
      {[-1, 1].map((sgn) => <Box key={sgn} s={[WALL_T, 3.6, KD]} p={[sgn * (GAP + WALL_T / 2), 1.8, KC]} c="#1e293b" o={{ metalness: 0.5 }} />)}
      {[-1, 1].map((sgn) => <Box key={'s' + sgn} s={[0.03, 0.06, KD]} p={[sgn * (GAP - 0.02), 0.08, KC]} c="#ef4444" o={{ emissive: '#ef4444', emissiveIntensity: 1.5 }} cast={false} />)}
      {/* painted on the floor in front of the entrance, so it never blocks the camera's view down the corridor */}
      <Panel w={4.2} h={1.05} p={[0, 0.02, HALL.minZ + 1.6]} r={[-Math.PI / 2, 0, 0]} tex={T.corridorSign} emissive={0.7} />
      {CHECKPOINTS.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}><circleGeometry args={[0.8, 28]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} transparent opacity={0.55} /></mesh>
      ))}
      {LASERS.map((l, i) => <Laser key={l.id} index={i} />)}

      {/* ---------- Vault Core ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, CC]} receiveShadow><planeGeometry args={[CW, CD]} /><meshStandardMaterial map={T.marble} roughness={0.25} metalness={0.15} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -23.5]}><ringGeometry args={[3.2, 3.5, 48]} />{M(trim, GOLD)}</mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CORE.h, CC]}><planeGeometry args={[CW, CD]} />{M('#1e1036')}</mesh>
      <Box s={[WALL_T, CORE.h, CD]} p={[CORE.minX - WALL_T / 2, CORE.h / 2, CC]} c={wall} />
      <Box s={[WALL_T, CORE.h, CD]} p={[CORE.maxX + WALL_T / 2, CORE.h / 2, CC]} c={wall} />
      <Box s={[CW + WALL_T * 2, CORE.h, WALL_T]} p={[0, CORE.h / 2, CORE.minZ - WALL_T / 2]} c={wall} />
      {[-1, 1].map((sgn) => <Box key={sgn} s={[sideCore, CORE.h, WALL_T]} p={[sgn * (GAP + sideCore / 2), CORE.h / 2, CORE.maxZ - WALL_T / 2]} c={wall} />)}
      <Box s={[GAP * 2, CORE.h - 3.6, WALL_T]} p={[0, 3.6 + (CORE.h - 3.6) / 2, CORE.maxZ - WALL_T / 2]} c={wall} />
      <VaultDoor />
      <Certificates />
      {[-5.5, 5.5].map((x) => (
        <group key={x} position={[x, 0, -26.6]}>
          <Box s={[1.0, 1.0, 1.0]} p={[0, 0.5, 0]} c="#4c1d95" />
          <Cyl a={[0.25, 0.25, 3.4, 16]} p={[0, 2.7, 0]} c={trim} o={GOLD} />
          <mesh position={[0, 4.6, 0]}><sphereGeometry args={[0.35, 16, 12]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.5} toneMapped={false} /></mesh>
        </group>
      ))}
      {/* final prompt console */}
      <group position={[PROPS.console.x, 0, PROPS.console.z]}>
        <Box s={[1.3, 1.0, 0.9]} p={[0, 0.5, 0]} c="#2e1065" />
        <Box s={[1.4, 0.06, 1.0]} p={[0, 1.03, 0]} c={trim} o={GOLD} />
        <Box s={[1.1, 0.6, 0.05]} p={[0, 1.4, -0.2]} r={[-0.3, 0, 0]} c="#0f0a1a" o={{ emissive: '#c084fc', emissiveIntensity: 0.6 }} />
        <Cyl a={[0.02, 0.02, 0.5, 6]} p={[0.45, 1.3, 0.25]} c="#111" />
        <mesh position={[0.45, 1.58, 0.25]}><sphereGeometry args={[0.07, 10, 8]} />{M('#222', { metalness: 0.6 })}</mesh>
        <Panel w={2.6} h={0.65} p={[0, 2.6, -0.2]} tex={T.consoleSign} emissive={1} />
      </group>
      <ConsoleRing />
    </group>
  );
}

function ConsoleRing() {
  const on = useGame((s) => s.ms.consoleOn);
  const done = useGame((s) => s.doorOpen);
  const ref = useRef();
  useFrame((s) => { if (ref.current) ref.current.material.opacity = 0.35 + Math.sin(s.clock.elapsedTime * 4) * 0.2; });
  if (done) return null;
  return (
    <mesh ref={ref} position={[PROPS.console.x, 0.03, PROPS.console.z + 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.75, 32]} />
      <meshBasicMaterial color={on ? '#c084fc' : '#facc15'} transparent opacity={0.5} />
    </mesh>
  );
}
