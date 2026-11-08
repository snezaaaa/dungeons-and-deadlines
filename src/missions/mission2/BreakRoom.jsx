import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../../game/store.js';
import { world } from '../../game/world.js';
import { makeCanvasTexture, useCanvasTexture, FONT, wrapText } from '../../scene/canvasTexture.js';
import { ROOM, ANTE, DOOR, WALL_T, PROPS } from './layout.js';
import { CLAIMS } from './factCheck.js';
import { bots } from './logic.js';

const damp = THREE.MathUtils.damp;
const M = (color, o = {}) => <meshStandardMaterial color={color} roughness={0.7} {...o} />;
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
const sign = (w, h, bg, fg, lines, font = 48) => makeCanvasTexture(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center';
  lines.forEach((t, i) => { g.font = `${i === 0 ? font : Math.round(font * 0.55)}px ${FONT}`; g.fillText(t, w / 2, h / (lines.length + 1) * (i + 1) + font * 0.3); });
});

// ---------------------------------------------------------------- textures
function useTextures() {
  return useMemo(() => {
    const floor = makeCanvasTexture(256, 256, (g) => {
      g.fillStyle = '#e8dcc6'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#c9b48f'; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
      g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; g.strokeRect(0, 0, 256, 256);
    });
    floor.wrapS = floor.wrapT = THREE.RepeatWrapping; floor.repeat.set(10, 8);
    const books = makeCanvasTexture(256, 512, (g, w, h) => {
      g.fillStyle = '#5b3a1e'; g.fillRect(0, 0, w, h);
      const cols = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#7e22ce', '#0f766e', '#be185d', '#f5f5f4'];
      for (let row = 0; row < 5; row++) {
        let x = 8;
        while (x < w - 12) { const bw = 10 + ((x * 7 + row * 13) % 18); g.fillStyle = cols[(x + row * 3) % cols.length]; g.fillRect(x, row * 100 + 18, bw, 74 - ((x * 3) % 20)); x += bw + 2; }
        g.fillStyle = '#3f2a14'; g.fillRect(0, row * 100 + 92, w, 8);
      }
    });
    const skyline = makeCanvasTexture(512, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#7dd3fc'); grd.addColorStop(1, '#fef3c7');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 26 + ((x * 13) % 20)) { const bh = 50 + ((x * 37) % 140); g.fillStyle = '#64748b'; g.fillRect(x, h - bh, 22, bh); g.fillStyle = '#e0f2fe'; for (let y = h - bh + 8; y < h - 6; y += 12) g.fillRect(x + 4, y, 4, 5), g.fillRect(x + 13, y, 4, 5); }
    });
    return {
      floor, books, skyline,
      breakSign: sign(512, 128, '#7c2d12', '#fde68a', ['BREAK ROOM'], 64),
      noNap: sign(256, 128, '#1e3a8a', '#ffffff', ['NO NAPPING', 'per Policy 7.4(b)'], 34),
      station: sign(512, 128, '#f59e0b', '#111111', ['FACT-CHECK STATION', 'trust · but · verify'], 46),
      manager: sign(256, 64, '#111827', '#facc15', ['MANAGER · KEEP OUT'], 26),
      m3: sign(512, 256, '#1e1b4b', '#c4b5fd', ['MISSION 3', 'THE FINAL CERTIFICATE', 'VAULT SEALED'], 44),
      vaultSign: sign(256, 96, '#065f46', '#d1fae5', ['VAULT'], 56),
      donutLabel: sign(256, 64, '#fce7f3', '#be185d', ['FREE DONUTS'], 30),
      bulletin: makeCanvasTexture(512, 320, (g, w, h) => {
        g.fillStyle = '#b45309'; g.fillRect(0, 0, w, h); g.fillStyle = '#d97706'; g.fillRect(12, 12, w - 24, h - 24);
        const notes = [['#fef9c3', 'LOST: my will to live. Last seen near the coffee machine.'], ['#e0f2fe', 'Fire drill Thursday. (Actual fire: please ignore.)'], ['#ffffff', 'CoffeeTruthz420 says: "decaf is just brown water lol"'], ['#fce7f3', 'Yoga @ lunch. Bring your own stress.']];
        notes.forEach(([c, t], i) => { const x = 30 + (i % 2) * 240, y = 30 + Math.floor(i / 2) * 140; g.save(); g.translate(x + 100, y + 60); g.rotate((i - 1.5) * 0.04); g.fillStyle = c; g.fillRect(-100, -60, 200, 120); g.fillStyle = '#111'; g.font = 'bold 17px system-ui'; wrapText(g, t, -88, -32, 176, 21); g.fillStyle = '#dc2626'; g.beginPath(); g.arc(0, -52, 6, 0, 7); g.fill(); g.restore(); });
      }),
    };
  }, []);
}

// ---------------------------------------------------------------- BREW-9000
function Brew() {
  const mood = useGame((s) => s.ms.brewMood || 'smug');
  const attempts = useGame((s) => s.attempts);
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 3800); return () => clearInterval(id); }, []);
  const face = useCanvasTexture(512, 512, (g, w, h) => {
    const bg = mood === 'humbled' ? '#052e16' : mood === 'gloating' ? '#450a0a' : '#0c0a09';
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < h; y += 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const col = mood === 'humbled' ? '#4ade80' : mood === 'gloating' ? '#f87171' : '#fbbf24';
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 14; g.lineCap = 'round';
    // eyes
    [-1, 1].forEach((sgn) => {
      const x = w / 2 + sgn * 100, y = 170;
      if (mood === 'smug') { g.fillRect(x - 45, y - 8, 90, 26); g.fillRect(x - 45, y - 30, 90, 10); }
      else if (mood === 'gloating') { g.beginPath(); g.moveTo(x - 45, y + 20); g.lineTo(x, y - 20); g.lineTo(x + 45, y + 20); g.stroke(); }
      else { g.beginPath(); g.arc(x, y, 32, 0, Math.PI * 2); g.fill(); g.fillStyle = bg; g.beginPath(); g.arc(x + 8, y - 8, 10, 0, 7); g.fill(); g.fillStyle = col; }
    });
    // mouth
    g.beginPath();
    if (mood === 'smug') { g.moveTo(w / 2 - 90, 290); g.quadraticCurveTo(w / 2 + 40, 330, w / 2 + 110, 270); }
    else if (mood === 'gloating') { g.arc(w / 2, 270, 90, 0.1, Math.PI - 0.1); }
    else { g.arc(w / 2, 330, 60, Math.PI + 0.3, -0.3); }
    g.stroke();
    // caption
    g.textAlign = 'center'; g.font = `28px ${FONT}`;
    if (mood === 'humbled') { g.fillText('I WAS WRONG.', w / 2, 420); g.font = 'bold 22px system-ui'; g.fillText('Now citing sources. Brewing...', w / 2, 460); }
    else if (mood === 'gloating') { g.fillText('HA HA HA HA', w / 2, 420); g.font = 'bold 22px system-ui'; g.fillText(`Failed fact-checks: ${attempts}`, w / 2, 460); }
    else { const c = CLAIMS[tick % CLAIMS.length]; g.font = 'bold 22px system-ui'; g.fillStyle = '#fde68a'; g.fillText(`FACT #${(tick % CLAIMS.length) + 1} (TOTALLY TRUE):`, w / 2, 395); g.fillStyle = '#fff'; g.font = 'bold 24px system-ui'; g.textAlign = 'left'; wrapText(g, c.text, 40, 432, w - 80, 30); }
  }, [mood, tick, attempts]);
  const steam = useRef([]);
  const stream = useRef();
  const doorOpen = useGame((s) => s.doorOpen);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    steam.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.5 + i / 6) % 1;
      m.position.set(0.3 + Math.sin(t + i) * 0.1, 3.3 + k * 1.0, -0.6 + i * 0.25);
      m.scale.setScalar(0.12 + k * 0.25);
      m.material.opacity = 0.35 * (1 - k);
    });
    if (stream.current) stream.current.scale.y = doorOpen ? 1 + Math.sin(t * 20) * 0.05 : 0.0001;
  });
  return (
    <group position={[PROPS.brew.x, 0, PROPS.brew.z]}>
      <RoundedBox args={[1.3, 3.2, 2.6]} radius={0.12} smoothness={3} position={[-0.3, 1.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d6d3d1" metalness={0.6} roughness={0.3} />
      </RoundedBox>
      <Box s={[0.06, 1.7, 1.9]} p={[0.37, 2.2, 0]} c="#1c1917" />
      <Panel w={1.7} h={1.7} p={[0.41, 2.2, 0]} r={[0, Math.PI / 2, 0]} tex={face} emissive={1.1} />
      <Box s={[0.4, 0.12, 2.2]} p={[0.5, 1.15, 0]} c="#57534e" o={{ metalness: 0.7 }} />
      <Cyl a={[0.06, 0.08, 0.3, 12]} p={[0.55, 1.0, 0]} c="#292524" o={{ metalness: 0.8 }} />
      <mesh ref={stream} position={[0.55, 0.78, 0]}><cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />{M('#4a2c17')}</mesh>
      <Cyl a={[0.11, 0.09, 0.2, 16]} p={[0.55, 0.53, 0]} c="#ffffff" />
      <Box s={[1.4, 0.06, 2.8]} p={[-0.2, 0.42, 0]} c="#44403c" />
      {[-0.8, 0.8].map((z) => <Box key={z} s={[0.06, 0.2, 0.2]} p={[0.37, 3.0, z]} c="#ef4444" o={{ emissive: '#ef4444', emissiveIntensity: 1.5 }} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} ref={(el) => (steam.current[i] = el)}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} /></mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- Mop-Bots
function MopBots() {
  const groups = useRef([]), mops = useRef([]), lights = useRef([]);
  useFrame((s, dt) => {
    bots.forEach((b, i) => {
      const g = groups.current[i];
      if (!g) return;
      g.position.set(b.x, 0, b.z);
      g.rotation.y = damp(g.rotation.y, b.yaw, 8, Math.min(dt, 0.1));
      if (mops.current[i]) mops.current[i].rotation.y += dt * 12;
      if (lights.current[i]) lights.current[i].material.emissiveIntensity = 1 + Math.sin(s.clock.elapsedTime * 10 + i) * 1;
    });
  });
  return bots.map((b, i) => (
    <group key={i} ref={(el) => (groups.current[i] = el)}>
      <Cyl a={[0.48, 0.5, 0.42, 24]} p={[0, 0.3, 0]} c="#e2e8f0" o={{ metalness: 0.3, roughness: 0.4 }} />
      <Cyl a={[0.5, 0.5, 0.06, 24]} p={[0, 0.12, 0]} c="#0ea5e9" />
      <mesh position={[0, 0.55, 0]} castShadow><sphereGeometry args={[0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />{M('#94a3b8', { metalness: 0.5 })}</mesh>
      {[-0.12, 0.12].map((x) => <Box key={x} s={[0.09, 0.12, 0.04]} p={[x, 0.66, 0.27]} c="#111" cast={false} />)}
      <mesh ref={(el) => (lights.current[i] = el)} position={[0, 0.92, 0]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.5} toneMapped={false} /></mesh>
      <Cyl a={[0.012, 0.012, 0.3, 6]} p={[0, 0.8, 0]} c="#334155" />
      <group ref={(el) => (mops.current[i] = el)} position={[0, 0.05, 0.42]}>
        {[0, 1, 2, 3, 4, 5].map((k) => <Box key={k} s={[0.05, 0.04, 0.34]} p={[0, 0, 0]} r={[0, (k * Math.PI) / 6, 0]} c="#f8fafc" cast={false} />)}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -0.4]}><circleGeometry args={[0.45, 20]} /><meshStandardMaterial color="#7dd3fc" transparent opacity={0.35} roughness={0.05} /></mesh>
      <Panel w={0.5} h={0.12} p={[0, 0.32, 0.505]} tex={WET} emissive={0.6} />
    </group>
  ));
}
const WET = typeof document !== 'undefined' ? sign(256, 64, '#facc15', '#111', ['WET FLOOR'], 34) : null;

// ---------------------------------------------------------------- evidence props
function Fridge() {
  const open = useGame((s) => s.ms.fridgeOpen);
  const door = useRef();
  useFrame((_, dt) => { door.current.rotation.y = damp(door.current.rotation.y, open ? 1.6 : 0, 4, Math.min(dt, 0.1)); });
  const mood = useMemo(() => sign(256, 96, '#0c4a6e', '#7dd3fc', ['MOOD: COLD'], 34), []);
  const happy = useMemo(() => sign(256, 96, '#14532d', '#86efac', ['MOOD: LOL'], 34), []);
  return (
    <group position={[PROPS.fridge.x, 0, PROPS.fridge.z]}>
      <Box s={[1.1, 2.3, 1.3]} p={[0.05, 1.15, 0]} c="#f1f5f9" o={{ metalness: 0.3, roughness: 0.35 }} />
      <group ref={door} position={[-0.52, 0, 0.65]}>
        <Box s={[0.08, 2.25, 1.3]} p={[0, 1.15, -0.65]} c="#e2e8f0" o={{ metalness: 0.3, roughness: 0.35 }} />
        <Box s={[0.05, 0.6, 0.05]} p={[-0.06, 1.3, -1.15]} c="#94a3b8" />
        <Panel w={0.5} h={0.2} p={[-0.045, 1.7, -0.65]} r={[0, -Math.PI / 2, 0]} tex={open ? happy : mood} emissive={0.9} />
        {[[1.0, -0.4, '#ef4444'], [0.7, -0.9, '#22c55e'], [0.4, -0.5, '#3b82f6']].map(([y, z, c]) => <Box key={y} s={[0.03, 0.1, 0.1]} p={[-0.05, y, z]} c={c} />)}
      </group>
      <Box s={[0.9, 0.04, 1.1]} p={[0.05, 1.2, 0]} c="#cbd5e1" />
      <Box s={[0.3, 0.12, 0.35]} p={[0, 1.28, 0.2]} c="#fde68a" />
      <mesh position={[-0.1, 1.3, -0.3]}><sphereGeometry args={[0.07, 10, 8]} />{M('#b91c1c')}</mesh>
    </group>
  );
}

function Dishwasher() {
  const moved = useGame((s) => s.ms.dishwasherMoved);
  const ref = useRef();
  useFrame((_, dt) => { ref.current.position.x = damp(ref.current.position.x, moved ? PROPS.dishwasher.movedX : PROPS.dishwasher.x, 3, Math.min(dt, 0.1)); });
  const log = useMemo(() => makeCanvasTexture(256, 320, (g, w, h) => {
    g.fillStyle = '#fefce8'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = 'bold 22px system-ui'; g.fillText('MAINTENANCE LOG', 20, 40);
    g.font = '16px system-ui'; ['Cups this year: 312', 'Complaints: 47', '"tastes like a printer"', 'Tue: ERROR 418 (foam)', 'Signed: Facilities'].forEach((t, i) => g.fillText(t, 20, 90 + i * 40));
    g.fillStyle = 'rgba(180,180,180,.6)'; g.fillRect(150, 230, 80, 60);
  }), []);
  return (
    <group>
      <Panel w={0.7} h={0.9} p={[PROPS.dishwasher.x, 0.95, ROOM.maxZ - 0.03]} r={[0, Math.PI, 0]} tex={log} emissive={0.4} />
      <group ref={ref} position={[PROPS.dishwasher.x, 0, PROPS.dishwasher.z]}>
        <Box s={[1.3, 1.0, 1.0]} p={[0, 0.5, 0]} c="#9ca3af" o={{ metalness: 0.7, roughness: 0.3 }} />
        <Box s={[1.2, 0.08, 0.05]} p={[0, 0.85, -0.52]} c="#4b5563" />
        <Box s={[1.4, 0.06, 1.1]} p={[0, 1.03, 0]} c="#e7e5e4" />
        <Box s={[0.2, 0.06, 0.04]} p={[0.4, 0.7, -0.52]} c="#22c55e" o={{ emissive: '#22c55e', emissiveIntensity: 1 }} />
      </group>
    </group>
  );
}

function ManagerDesk({ T }) {
  const open = useGame((s) => s.ms.drawerOpen);
  const drawer = useRef();
  useFrame((_, dt) => { drawer.current.position.z = damp(drawer.current.position.z, open ? 0.75 : 0.3, 4, Math.min(dt, 0.1)); });
  return (
    <group position={[PROPS.desk.x, 0, PROPS.desk.z]}>
      <Box s={[2.2, 0.08, 1.0]} p={[0, 0.78, 0]} c="#3f2a14" />
      <Box s={[0.6, 0.74, 0.9]} p={[0.75, 0.37, 0]} c="#4b3218" />
      <Box s={[0.08, 0.74, 0.9]} p={[-1.04, 0.37, 0]} c="#4b3218" />
      <group ref={drawer} position={[0.75, 0.5, 0.3]}>
        <Box s={[0.55, 0.22, 0.4]} p={[0, 0, 0]} c="#5c3d1e" />
        <Box s={[0.2, 0.04, 0.04]} p={[0, 0, 0.21]} c="#d4af37" o={{ metalness: 0.8 }} />
      </group>
      <Panel w={0.8} h={0.2} p={[-0.3, 0.62, 0.51]} tex={T.manager} emissive={0.6} />
      <Box s={[0.5, 0.35, 0.05]} p={[-0.4, 1.0, -0.3]} c="#111827" />
      <Cyl a={[0.06, 0.05, 0.13, 12]} p={[0.3, 0.88, 0.1]} c="#facc15" />
      {/* executive chair */}
      <Box s={[0.6, 0.1, 0.6]} p={[0, 0.5, -0.85]} c="#111" />
      <Box s={[0.6, 0.9, 0.1]} p={[0, 1.0, -1.15]} c="#111" />
    </group>
  );
}

function Cctv() {
  const played = useGame((s) => s.ms.cctvPlayed);
  const ref = useRef();
  const tex = useMemo(() => makeCanvasTexture(256, 160, () => {}), []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (Math.floor(t * 8) === ref.current) return;
    ref.current = Math.floor(t * 8);
    tex.userData.redraw((g, w, h) => {
      if (!played) {
        for (let i = 0; i < 400; i++) { const v = Math.random() * 255; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 6, 4); }
        g.fillStyle = '#ef4444'; g.font = 'bold 16px system-ui'; g.fillText('NO SIGNAL · NEEDS NARRATION', 14, 24);
      } else {
        g.fillStyle = '#1f2937'; g.fillRect(0, 0, w, h); g.fillStyle = '#d6d3d1'; g.fillRect(40, 50, 60, 90);
        const f = (t * 2) % 1; g.fillStyle = '#fff'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(70 + Math.sin(i * 7) * 40 * f, 50 - f * 50 - i * 3, 8 + i, 0, 7); g.fill(); }
        g.fillStyle = '#ef4444'; g.font = 'bold 18px system-ui'; g.fillText('REPLAY · ERROR 418 x3', 110, 30); g.fillText('● REC TUE 09:14', 120, 150);
      }
    });
  });
  return (
    <group position={[PROPS.cctv.x, 0, PROPS.cctv.z]}>
      <Box s={[1.6, 0.8, 0.8]} p={[0, 0.4, 0]} c="#334155" />
      <Box s={[0.5, 0.05, 0.3]} p={[0.3, 0.83, 0.1]} c="#111827" />
      <Box s={[1.5, 1.0, 0.1]} p={[0, 2.3, -0.32]} c="#111827" />
      <Panel w={1.36} h={0.86} p={[0, 2.3, -0.26]} tex={tex} emissive={1} />
      <Box s={[0.2, 0.15, 0.3]} p={[0.9, 3.6, -0.2]} r={[0.5, -0.5, 0]} c="#e5e7eb" />
    </group>
  );
}

function Beacon({ id, p, color }) {
  const has = useGame((s) => s.inventory.includes(id));
  const ref = useRef();
  useFrame((s) => { if (ref.current) { ref.current.rotation.y = s.clock.elapsedTime * 1.5; ref.current.position.y = p[1] + Math.sin(s.clock.elapsedTime * 2 + p[0]) * 0.12; } });
  if (has) return null;
  return (
    <group ref={ref} position={p}>
      <mesh><octahedronGeometry args={[0.18]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} /></mesh>
      <mesh scale={2.2}><octahedronGeometry args={[0.18]} /><meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} /></mesh>
    </group>
  );
}
const BEACONS = [
  { id: 'encyclopedia', p: [PROPS.bookshelf.x - 0.5, 3.0, PROPS.bookshelf.z], color: '#a78bfa' },
  { id: 'botany', p: [PROPS.fridge.x - 0.3, 2.8, PROPS.fridge.z], color: '#fb923c' },
  { id: 'spec', p: [PROPS.desk.x + 0.75, 1.5, PROPS.desk.z + 0.3], color: '#60a5fa' },
  { id: 'cctv', p: [PROPS.cctv.x, 3.2, PROPS.cctv.z], color: '#facc15' },
  { id: 'log', p: [PROPS.dishwasher.x, 1.7, PROPS.dishwasher.z], color: '#f87171' },
];

function Lighting() {
  const alarm = useRef();
  useFrame((s, dt) => {
    if (useGame.getState().phase !== 'intro') world.alarm = Math.max(0, world.alarm - Math.min(dt, 0.1) * 0.35);
    alarm.current.intensity = world.alarm * (0.5 + 0.5 * Math.sin(s.clock.elapsedTime * 9)) * 80;
  });
  return (
    <>
      <hemisphereLight args={['#fff7ed', '#5b4636', 0.65]} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[-6, 13, 9]} intensity={1.7} color="#ffe8c2" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-camera-near={1} shadow-camera-far={45} />
      <pointLight position={[-4, 3.7, 0]} intensity={14} distance={14} decay={1.5} color="#ffd9a8" />
      <pointLight position={[5, 3.7, 0]} intensity={12} distance={14} decay={1.5} color="#fff1dc" />
      <pointLight position={[0, 3.4, -13]} intensity={14} distance={12} decay={1.5} color="#fcd34d" />
      <pointLight ref={alarm} position={[-3, 3.8, 0]} color="#ff1a1a" distance={26} decay={1.3} intensity={0} />
    </>
  );
}

function Chair({ p, ry = 0 }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Box s={[0.5, 0.06, 0.5]} p={[0, 0.48, 0]} c="#0f766e" />
      <Box s={[0.5, 0.5, 0.06]} p={[0, 0.75, -0.22]} c="#0f766e" />
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => <Box key={x + ':' + z} s={[0.04, 0.46, 0.04]} p={[x, 0.23, z]} c="#334155" />)}
    </group>
  );
}

function RoundTable({ x, z, donuts }) {  // chairs only on the x sides: Mop-Bot lanes run along z
  const left = useGame((s) => s.ms.donuts ?? 3);
  return (
    <group position={[x, 0, z]}>
      <Cyl a={[0.7, 0.7, 0.06, 28]} p={[0, 0.76, 0]} c="#f5f5f4" />
      <Cyl a={[0.06, 0.06, 0.74, 10]} p={[0, 0.38, 0]} c="#57534e" />
      <Cyl a={[0.35, 0.35, 0.04, 20]} p={[0, 0.02, 0]} c="#57534e" />
      {[Math.PI / 2, -Math.PI / 2].map((a) => <Chair key={a} p={[Math.sin(a) * 1.0, 0, Math.cos(a) * 1.0]} ry={a + Math.PI} />)}
      {donuts && (
        <group position={[0, 0.82, 0]}>
          <Box s={[0.6, 0.08, 0.45]} p={[0, 0, 0]} c="#fbcfe8" />
          {[0, 1, 2].map((i) => i < left && (
            <mesh key={i} position={[-0.18 + i * 0.18, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.07, 0.035, 8, 16]} />{M(['#f472b6', '#a16207', '#fde68a'][i])}
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// ---------------------------------------------------------------- level
export default function BreakRoom() {
  const T = useTextures();
  const W = ROOM.maxX - ROOM.minX, D = ROOM.maxZ - ROOM.minZ, H = ROOM.h;
  const sideW = (W - DOOR.w) / 2, wallC = '#f3ead8', accent = '#0f766e';
  const doorOpen = useGame((s) => s.doorOpen);
  const doorRef = useRef(), lamp = useRef();
  useFrame((_, dt) => {
    doorRef.current.position.x = damp(doorRef.current.position.x, doorOpen ? DOOR.w : 0, 2, Math.min(dt, 0.1));
    lamp.current.color.set(doorOpen ? '#22c55e' : '#ef4444'); lamp.current.emissive.set(doorOpen ? '#22c55e' : '#ef4444');
  });
  const cert = useRef();
  useFrame((s) => { if (cert.current) cert.current.rotation.y = s.clock.elapsedTime * 0.8; });
  return (
    <group>
      <Lighting />
      <fog attach="fog" args={['#2a1d14', 22, 46]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[W, D]} /><meshStandardMaterial map={T.floor} roughness={0.6} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}><planeGeometry args={[W, D]} />{M('#f5f5f4')}</mesh>
      {[[-5, -4], [5, -4], [-5, 4], [5, 4]].map(([x, z]) => (
        <mesh key={x + ':' + z} position={[x, H - 0.02, z]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.6, 24]} /><meshStandardMaterial color="#fff7e6" emissive="#fff7e6" emissiveIntensity={1.5} toneMapped={false} /></mesh>
      ))}

      {/* walls */}
      <Box s={[WALL_T, H, D + WALL_T * 2]} p={[ROOM.minX - WALL_T / 2, H / 2, 0]} c={wallC} />
      <Box s={[WALL_T, H, D + WALL_T * 2]} p={[ROOM.maxX + WALL_T / 2, H / 2, 0]} c={wallC} />
      <Box s={[W, H, WALL_T]} p={[0, H / 2, ROOM.maxZ + WALL_T / 2]} c={wallC} />
      <Box s={[sideW, H, WALL_T]} p={[ROOM.minX + sideW / 2, H / 2, ROOM.minZ - WALL_T / 2]} c={wallC} />
      <Box s={[sideW, H, WALL_T]} p={[ROOM.maxX - sideW / 2, H / 2, ROOM.minZ - WALL_T / 2]} c={wallC} />
      <Box s={[DOOR.w, H - 3.05, WALL_T]} p={[0, 3.05 + (H - 3.05) / 2, ROOM.minZ - WALL_T / 2]} c={wallC} />
      {/* teal wainscot */}
      <Box s={[0.02, 1.0, D]} p={[ROOM.maxX - 0.01, 0.5, 0]} c={accent} cast={false} />
      <Box s={[W, 1.0, 0.02]} p={[0, 0.5, ROOM.maxZ - 0.01]} c={accent} cast={false} />
      <Box s={[0.02, 1.0, D]} p={[ROOM.minX + 0.01, 0.5, 0]} c={accent} cast={false} />
      {[ROOM.minX + sideW / 2, ROOM.maxX - sideW / 2].map((x) => <Box key={x} s={[sideW, 1.0, 0.02]} p={[x, 0.5, ROOM.minZ + 0.01]} c={accent} cast={false} />)}

      {/* windows, signs */}
      {[-6, 0.5].map((x) => <Panel key={x} w={3} h={1.6} p={[x, 2.4, ROOM.maxZ - 0.03]} r={[0, Math.PI, 0]} tex={T.skyline} emissive={0.9} />)}
      <Panel w={3.2} h={0.8} p={[-9.78, 3.75, 0]} r={[0, Math.PI / 2, 0]} tex={T.breakSign} emissive={1.1} />
      <Panel w={1.2} h={0.6} p={[9.78, 2.6, 6.8]} r={[0, -Math.PI / 2, 0]} tex={T.noNap} emissive={0.6} />
      <Panel w={2.4} h={1.5} p={[PROPS.bulletin.x, 1.9, ROOM.maxZ - 0.03]} r={[0, Math.PI, 0]} tex={T.bulletin} emissive={0.35} />

      {/* counter + BREW-9000 */}
      <group position={[PROPS.counter.x, 0, PROPS.counter.z]}>
        {[-2.6, 2.6].map((z) => <group key={z}><Box s={[1.1, 0.95, 2.6]} p={[0, 0.475, z]} c="#78350f" /><Box s={[1.2, 0.06, 2.7]} p={[0, 0.98, z]} c="#e7e5e4" /></group>)}
        <Box s={[0.5, 0.25, 0.4]} p={[0.1, 1.13, 2.9]} c="#f8fafc" />
        <Box s={[0.42, 0.04, 0.32]} p={[0.1, 1.27, 2.9]} r={[0, 0.2, 0]} c="#fbbf24" />
        <Cyl a={[0.14, 0.14, 0.3, 16]} p={[0.1, 1.16, -2.9]} c="#e0f2fe" o={{ transparent: true, opacity: 0.7 }} />
        <Box s={[0.2, 0.18, 0.2]} p={[0.1, 1.1, -2.9]} c="#ffffff" />
        <Cyl a={[0.18, 0.18, 0.35, 16]} p={[0.15, 1.18, -1.8]} c="#ef4444" />
      </group>
      <Brew />

      {/* fact-check station */}
      <group position={[PROPS.station.x, 0, PROPS.station.z]}>
        <Box s={[1.1, 1.0, 1.1]} p={[0, 0.5, 0]} c="#1f2937" />
        <Box s={[1.25, 0.06, 1.25]} p={[0, 1.03, 0]} c="#f59e0b" />
        <Box s={[0.5, 0.03, 0.7]} p={[0.15, 1.08, 0]} c="#334155" />
        <Box s={[0.04, 0.42, 0.7]} p={[-0.1, 1.29, 0]} r={[0, 0, -0.25]} c="#0f172a" o={{ emissive: '#f59e0b', emissiveIntensity: 0.5 }} />
        <Cyl a={[0.04, 0.04, 2.0, 8]} p={[0, 2.0, 0]} c="#334155" />
        <Panel w={2.0} h={0.5} p={[0, 3.1, 0]} r={[0, Math.PI / 2, 0]} tex={T.station} emissive={1} />
        <Panel w={2.0} h={0.5} p={[0, 3.1, -0.01]} r={[0, -Math.PI / 2, 0]} tex={T.station} emissive={1} />
      </group>
      <StationRing />

      {/* bookshelf */}
      <group position={[PROPS.bookshelf.x, 0, PROPS.bookshelf.z]}>
        <Box s={[0.7, 3.0, 2.6]} p={[0.05, 1.5, 0]} c="#5b3a1e" />
        <Panel w={2.4} h={2.8} p={[-0.31, 1.5, 0]} r={[0, -Math.PI / 2, 0]} tex={T.books} emissive={0.25} />
      </group>
      <Fridge />
      <group position={[PROPS.cooler.x, 0, PROPS.cooler.z]}>
        <Box s={[0.55, 1.0, 0.55]} p={[0, 0.5, 0]} c="#e5e7eb" />
        <Cyl a={[0.22, 0.22, 0.5, 16]} p={[0, 1.27, 0]} c="#7dd3fc" o={{ transparent: true, opacity: 0.6 }} />
      </group>
      <Dishwasher />
      <ManagerDesk T={T} />
      <Cctv />
      <RoundTable x={PROPS.donutTable.x} z={PROPS.donutTable.z} donuts />
      <Panel w={0.8} h={0.2} p={[PROPS.donutTable.x, 0.4, PROPS.donutTable.z + 0.71]} tex={T.donutLabel} emissive={0.4} />
      <RoundTable x={PROPS.table2.x} z={PROPS.table2.z} />
      {/* sofa */}
      <group position={[PROPS.sofa.x, 0, PROPS.sofa.z]}>
        <Box s={[2.6, 0.45, 1.0]} p={[0, 0.25, 0]} c="#b45309" />
        <Box s={[2.6, 0.7, 0.25]} p={[0, 0.75, 0.38]} c="#92400e" />
        {[-1.2, 1.2].map((x) => <Box key={x} s={[0.25, 0.6, 1.0]} p={[x, 0.5, 0]} c="#92400e" />)}
        {[-0.6, 0.6].map((x) => <Box key={x} s={[1.1, 0.15, 0.8]} p={[x, 0.53, -0.05]} c="#d97706" />)}
      </group>
      {[[-9.3, 7.3], [9.3, -7.3]].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <Box s={[0.7, 0.6, 0.7]} p={[0, 0.3, 0]} c="#e7e5e4" />
          {[0, 1, 2, 3, 4].map((k) => <Box key={k} s={[0.2, 1.0, 0.08]} p={[Math.sin(k * 1.3) * 0.18, 1.05, Math.cos(k * 1.3) * 0.18]} r={[Math.cos(k * 1.3) * 0.5, k, Math.sin(k * 1.3) * 0.5]} c="#15803d" />)}
        </group>
      ))}

      {BEACONS.map((b) => <Beacon key={b.id} {...b} />)}
      <MopBots />

      {/* north door */}
      <group position={[0, 0, ROOM.minZ - WALL_T / 2]}>
        <group ref={doorRef}>
          <Box s={[DOOR.w, 2.8, 0.14]} p={[0, 1.4, 0]} c="#a16207" o={{ metalness: 0.3, roughness: 0.4 }} />
          <Box s={[0.12, 0.5, 0.2]} p={[DOOR.w / 2 - 0.25, 1.2, 0.08]} c="#d4af37" o={{ metalness: 0.8 }} />
        </group>
        <Box s={[0.18, 3.0, 0.5]} p={[-DOOR.w / 2 - 0.09, 1.5, 0]} c="#422006" />
        <Box s={[0.18, 3.0, 0.5]} p={[DOOR.w / 2 + 0.09, 1.5, 0]} c="#422006" />
        <Box s={[DOOR.w + 0.36, 0.2, 0.5]} p={[0, 2.95, 0]} c="#422006" />
        <mesh position={[DOOR.w / 2 + 0.4, 1.5, 0.27]}><boxGeometry args={[0.22, 0.32, 0.06]} /><meshStandardMaterial ref={lamp} color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} toneMapped={false} /></mesh>
        <Panel w={1.0} h={0.38} p={[0, 3.4, 0.26]} tex={T.vaultSign} emissive={1.1} />
      </group>

      {/* certificate-vault antechamber */}
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, (ANTE.minZ + ANTE.maxZ) / 2 - 0.1]} receiveShadow><planeGeometry args={[ANTE.maxX - ANTE.minX, ANTE.maxZ - ANTE.minZ + 0.6]} />{M('#1f1530', { roughness: 0.3, metalness: 0.3 })}</mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, (ANTE.minZ + ANTE.maxZ) / 2]}><planeGeometry args={[ANTE.maxX - ANTE.minX, ANTE.maxZ - ANTE.minZ]} />{M('#140f22')}</mesh>
        <Box s={[WALL_T, 4, ANTE.maxZ - ANTE.minZ]} p={[ANTE.minX - WALL_T / 2, 2, (ANTE.minZ + ANTE.maxZ) / 2]} c="#3b2f5c" />
        <Box s={[WALL_T, 4, ANTE.maxZ - ANTE.minZ]} p={[ANTE.maxX + WALL_T / 2, 2, (ANTE.minZ + ANTE.maxZ) / 2]} c="#3b2f5c" />
        <Box s={[ANTE.maxX - ANTE.minX + WALL_T * 2, 4, WALL_T]} p={[0, 2, ANTE.minZ - WALL_T / 2]} c="#3b2f5c" />
        {[ANTE.minX + 0.03, ANTE.maxX - 0.03].map((x) => <Box key={x} s={[0.04, 0.06, ANTE.maxZ - ANTE.minZ]} p={[x, 3.2, (ANTE.minZ + ANTE.maxZ) / 2]} c="#fbbf24" o={{ emissive: '#fbbf24', emissiveIntensity: 3, toneMapped: false }} cast={false} />)}
        <group position={[0, 0, ANTE.minZ + 0.1]}>
          <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.5, 1.5, 0.2, 40]} />{M('#9ca3af', { metalness: 0.85, roughness: 0.25 })}</mesh>
          <mesh position={[0, 1.7, 0.12]}><torusGeometry args={[0.55, 0.08, 10, 30]} />{M('#4b5563', { metalness: 0.9 })}</mesh>
          {[0, 1, 2].map((k) => <Box key={k} s={[1.2, 0.08, 0.08]} p={[0, 1.7, 0.16]} r={[0, 0, (k * Math.PI) / 3]} c="#4b5563" o={{ metalness: 0.9 }} />)}
          <Panel w={2.2} h={1.1} p={[0, 3.45, 0.15]} tex={T.m3} emissive={0.9} />
        </group>
        {[-3.4, 3.4].map((x) => <group key={x} position={[x, 0, -15.4]}><Box s={[1.2, 1.0, 0.6]} p={[0, 0.5, 0]} c="#4c1d95" /><Box s={[0.9, 0.05, 0.4]} p={[0, 1.03, 0]} c="#fde68a" o={{ emissive: '#fde68a', emissiveIntensity: 0.6 }} /></group>)}
        <group ref={cert} position={[0, 2.9, -12.6]}>
          <mesh><planeGeometry args={[0.9, 0.62]} /><meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.6} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0, 0.002]}><ringGeometry args={[0.12, 0.17, 24]} /><meshBasicMaterial color="#b45309" side={THREE.DoubleSide} /></mesh>
        </group>
      </group>
    </group>
  );
}

function StationRing() {
  const done = useGame((s) => s.doorOpen);
  const ref = useRef();
  useFrame((s) => { if (ref.current) ref.current.material.opacity = 0.35 + Math.sin(s.clock.elapsedTime * 4) * 0.2; });
  if (done) return null;
  return (
    <mesh ref={ref} position={[PROPS.station.x + 1.1, 0.03, PROPS.station.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.75, 32]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.5} />
    </mesh>
  );
}
