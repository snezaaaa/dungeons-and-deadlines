import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../../game/store.js';
import { world } from '../../game/world.js';
import { ROSTER } from '../../characters/roster.js';
import { makeCanvasTexture, useCanvasTexture, FONT, wrapText } from '../../scene/canvasTexture.js';
import { ROOM, LOBBY, DOOR, WALL_T, DESKS, DESK_SIZE, PROPS } from './layout.js';

const M = (color, o = {}) => <meshStandardMaterial color={color} roughness={0.7} {...o} />;
function Box({ s, p, r, c, o, cast = true, children }) {
  return (
    <mesh position={p} rotation={r} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
      {children || M(c, o)}
    </mesh>
  );
}
function Panel({ w, h, p, r, tex, emissive = 0.9 }) {
  return (
    <mesh position={p} rotation={r}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={emissive} toneMapped={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------- static textures
function useStaticTextures() {
  return useMemo(() => {
    const carpet = makeCanvasTexture(256, 256, (g) => {
      g.fillStyle = '#3a4a6b'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#34435f'; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    });
    carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(12, 9);
    const tiles = makeCanvasTexture(128, 128, (g) => {
      g.fillStyle = '#d9d4c7'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#b8b2a3'; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128);
    });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(10, 8);
    const skyline = makeCanvasTexture(512, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#ff7e5f'); grd.addColorStop(0.6, '#feb47b'); grd.addColorStop(1, '#6a3093');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 22 + Math.random() * 20) {
        const bh = 60 + Math.random() * 150; g.fillStyle = '#2b1d44'; g.fillRect(x, h - bh, 18 + Math.random() * 24, bh);
        g.fillStyle = '#ffd36e'; for (let y = h - bh + 8; y < h - 6; y += 12) for (let k = 0; k < 2; k++) if (Math.random() > 0.5) g.fillRect(x + 4 + k * 8, y, 4, 5);
      }
    });
    const banner = makeCanvasTexture(1024, 160, (g, w, h) => {
      g.fillStyle = '#111827'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#facc15'; g.font = `64px ${FONT}`; g.textAlign = 'center'; g.fillText('AI READY EDUCATORS', w / 2, 78);
      g.fillStyle = '#e5e7eb'; g.font = `bold 34px system-ui`; g.fillText('ADVANCED TRAINING  •  ROOM 204  •  NO ESCAPE*', w / 2, 128);
      g.font = '18px system-ui'; g.fillText('*without a good prompt', w - 140, 152);
    });
    const whiteboard = makeCanvasTexture(1024, 512, (g, w, h) => {
      g.fillStyle = '#f8fafc'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1d4ed8'; g.font = `bold 46px "Comic Sans MS", "Chalkboard SE", system-ui`; g.fillText('RIDDLE #1  (for geniuses only)', 40, 70);
      g.fillStyle = '#111827'; g.font = `36px "Comic Sans MS", "Chalkboard SE", system-ui`;
      wrapText(g, '"I am an expert, but not a person. I play a part, but not on stage. Give me to the AI and it knows who to be. What am I?"', 40, 140, w - 80, 50);
      g.fillStyle = '#dc2626'; g.fillText('?????', 40, 420);
      g.fillStyle = '#16a34a'; g.font = `28px "Comic Sans MS", system-ui`; g.fillText('- Joker: "is it a mime?"   - Boss: "it is me"', 40, 480);
      g.fillStyle = '#fde047'; g.fillRect(820, 300, 160, 140); g.fillStyle = '#111'; g.font = '24px system-ui'; g.fillText('Mastermind:', 832, 340); g.fillText('only YOU can', 832, 372); g.fillText('solve this :)', 832, 404);
    });
    const vending = makeCanvasTexture(256, 512, (g, w, h) => {
      g.fillStyle = '#0f172a'; g.fillRect(0, 0, w, h);
      const cols = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { g.fillStyle = cols[(r * 4 + c) % 6]; g.fillRect(20 + c * 56, 30 + r * 80, 40, 56); }
      g.fillStyle = '#fbbf24'; g.font = `22px ${FONT}`; g.fillText('SNACKS 4 MANAGERS', 14, 470);
      g.fillStyle = '#fff'; g.font = 'bold 16px system-ui'; g.fillText('EXECUTIVE ACCESS ONLY', 30, 498);
    });
    const coffeeSign = makeCanvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = '#fef3c7'; g.fillRect(0, 0, w, h); g.fillStyle = '#b91c1c'; g.font = `30px ${FONT}`; g.textAlign = 'center';
      g.fillText('OUT OF ORDER', w / 2, 55); g.fillStyle = '#111'; g.font = 'bold 18px system-ui'; g.fillText('See: Mission 2', w / 2, 95);
    });
    const exitSign = makeCanvasTexture(256, 96, (g, w, h) => {
      g.fillStyle = '#065f46'; g.fillRect(0, 0, w, h); g.fillStyle = '#d1fae5'; g.font = `56px ${FONT}`; g.textAlign = 'center'; g.fillText('EXIT', w / 2, 70);
    });
    const m2 = makeCanvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#3b2412'; g.fillRect(0, 0, w, h); g.fillStyle = '#fbbf24'; g.font = `40px ${FONT}`; g.textAlign = 'center';
      g.fillText('MISSION 2', w / 2, 70); g.fillStyle = '#fff'; g.font = `32px ${FONT}`; g.fillText('THE COFFEE BREAK', w / 2, 130); g.fillText('CRISIS', w / 2, 172);
      g.fillStyle = '#86efac'; g.font = 'bold 24px system-ui'; g.fillText('NEXT MISSION', w / 2, 222);
    });
    const m3 = makeCanvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#1e1b4b'; g.fillRect(0, 0, w, h); g.fillStyle = '#c4b5fd'; g.font = `40px ${FONT}`; g.textAlign = 'center';
      g.fillText('MISSION 3', w / 2, 70); g.fillStyle = '#fff'; g.font = `32px ${FONT}`; g.fillText('THE FINAL', w / 2, 130); g.fillText('CERTIFICATE', w / 2, 172);
      g.fillStyle = '#fca5a5'; g.font = 'bold 24px system-ui'; g.fillText('VAULT SEALED', w / 2, 222);
    });
    const clock = makeCanvasTexture(256, 256, (g, w) => {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#111'; g.stroke();
      g.fillStyle = '#111'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 98 - 4, 128 - Math.cos(a) * 98 - 4, 8, 8); }
      g.font = 'bold 22px system-ui'; g.textAlign = 'center'; g.fillText('DEADLINE', w / 2, 180);
    });
    const poster = makeCanvasTexture(256, 360, (g, w, h) => {
      g.fillStyle = '#7c3aed'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `34px ${FONT}`; g.textAlign = 'center';
      g.fillText('BE', w / 2, 70); g.fillText('SPECIFIC', w / 2, 112); g.font = 'bold 20px system-ui';
      g.fillText('"Write something good"', w / 2, 200); g.fillText('is not a prompt.', w / 2, 228); g.fillText('It is a wish.', w / 2, 256);
      g.fillStyle = '#facc15'; g.fillRect(40, 290, w - 80, 8);
    });
    const poster2 = makeCanvasTexture(256, 360, (g, w, h) => {
      g.fillStyle = '#0e7490'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `30px ${FONT}`; g.textAlign = 'center';
      g.fillText('DUNGEONS', w / 2, 70); g.fillText('&', w / 2, 110); g.fillText('DEADLINES', w / 2, 150);
      g.font = 'bold 20px system-ui'; g.fillText('Professional', w / 2, 220); g.fillText('Development', w / 2, 248); g.fillText('Season 2026', w / 2, 290);
    });
    return { carpet, tiles, skyline, banner, whiteboard, vending, coffeeSign, exitSign, m2, m3, clock, poster, poster2 };
  }, []);
}

// ---------------------------------------------------------------- dynamic presentation screen
function PresentationScreen() {
  const inventory = useGame((s) => s.inventory);
  const terminalOn = useGame((s) => s.flags.terminalOn);
  const doorOpen = useGame((s) => s.doorOpen);
  const last = useGame((s) => s.lastResult);
  const attempts = useGame((s) => s.attempts);
  const phase = useGame((s) => s.phase);
  const tex = useCanvasTexture(1280, 720, (g, w, h) => {
    const bg = doorOpen ? '#064e3b' : last && !last.success ? '#450a0a' : '#0b1026';
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.textAlign = 'center';
    if (doorOpen) {
      g.fillStyle = '#4ade80'; g.font = `110px ${FONT}`; g.fillText('PROMPT ACCEPTED', w / 2, 280);
      g.fillStyle = '#fff'; g.font = `60px ${FONT}`; g.fillText('DOOR UNLOCKED', w / 2, 400);
      g.font = 'bold 36px system-ui'; g.fillText('Certificate progress: 33%', w / 2, 500);
      return;
    }
    if (!terminalOn) {
      g.fillStyle = '#ef4444'; g.font = `96px ${FONT}`; g.fillText('CERTIFICATES', w / 2, 200); g.fillText('LOCKED', w / 2, 310);
      g.fillStyle = '#fca5a5'; g.font = 'bold 40px system-ui'; g.fillText('PROMPTOTRON 3000 IS ASLEEP', w / 2, 420);
      g.fillStyle = '#fff'; g.font = 'bold 32px system-ui'; g.fillText('Voice activation required at the lectern', w / 2, 480);
    } else {
      g.fillStyle = '#22d3ee'; g.font = `70px ${FONT}`; g.fillText('PROMPTOTRON 3000', w / 2, 120);
      g.fillStyle = '#fff'; g.font = 'bold 34px system-ui'; g.fillText('A great prompt has 4 parts:', w / 2, 190);
    }
    const slots = [['ROLE', 'role', '#f472b6'], ['TASK', 'task', '#60a5fa'], ['CONTEXT', 'context', '#34d399'], ['FORMAT', 'format', '#fbbf24']];
    slots.forEach(([label, id, col], i) => {
      const x = 160 + i * 320, y = terminalOn ? 250 : 540;
      const got = inventory.includes(id);
      g.fillStyle = got ? col : 'rgba(255,255,255,0.08)'; g.fillRect(x - 130, y, 260, 110);
      g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(x - 130, y, 260, 110);
      g.fillStyle = got ? '#111' : col; g.font = `40px ${FONT}`; g.fillText(label, x, y + 55);
      g.font = 'bold 26px system-ui'; g.fillText(got ? 'FOUND' : '???', x, y + 92);
    });
    if (terminalOn) {
      g.font = 'bold 40px system-ui';
      if (last && !last.success) { g.fillStyle = '#f87171'; g.font = `64px ${FONT}`; g.fillText(`REJECTED  (${last.score}%)`, w / 2, 500); g.font = 'bold 30px system-ui'; g.fillStyle = '#fff'; g.fillText(`Attempts: ${attempts}. Hint: check the slots marked in red.`, w / 2, 570); }
      else { g.fillStyle = '#fff'; g.fillText(`${inventory.length}/4 components found`, w / 2, 470); g.fillStyle = '#a5f3fc'; g.font = 'bold 30px system-ui'; g.fillText('Use the terminal at the lectern to build & test your prompt', w / 2, 540); }
    }
  }, [inventory, terminalOn, doorOpen, last, attempts, phase]);
  return <Panel w={7} h={3.94} p={[PROPS.screen.x + 0.05, 2.55, 0]} r={[0, Math.PI / 2, 0]} tex={tex} emissive={1} />;
}

// ---------------------------------------------------------------- desk with computer
function Desk({ x, z, i }) {
  const owner = ROSTER[i];
  const screen = useMemo(() => makeCanvasTexture(256, 160, (g, w, h) => {
    g.fillStyle = '#0f172a'; g.fillRect(0, 0, w, h); g.fillStyle = owner.color; g.fillRect(0, 0, w, 28);
    g.fillStyle = '#0f172a'; g.font = 'bold 18px system-ui'; g.fillText(owner.name.toUpperCase(), 10, 20);
    g.fillStyle = '#cbd5e1'; for (let k = 0; k < 6; k++) g.fillRect(12, 42 + k * 18, 60 + ((k * 53 + i * 31) % 160), 8);
  }), [i, owner]);
  const nameplate = useMemo(() => makeCanvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = owner.color; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = `28px ${FONT}`; g.textAlign = 'center'; g.fillText(`${i + 1}  ${owner.name.replace('The ', '').toUpperCase()}`, w / 2, 44);
  }), [i, owner]);
  const { w, d } = DESK_SIZE;
  return (
    <group position={[x, 0, z]}>
      <Box s={[w, 0.08, d]} p={[0, 0.78, 0]} c="#e7d7bd" />
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => <Box key={a + ':' + b} s={[0.07, 0.78, 0.07]} p={[a * (w / 2 - 0.08), 0.39, b * (d / 2 - 0.08)]} c="#6b7280" />)}
      <Box s={[0.05, 0.5, d - 0.2]} p={[-w / 2 + 0.1, 0.5, 0]} c="#cbbd9f" />
      {/* monitor faces +X (toward the seated student) */}
      <Box s={[0.08, 0.06, 0.3]} p={[-0.2, 0.85, 0]} c="#1f2937" />
      <Box s={[0.05, 0.3, 0.06]} p={[-0.2, 1.0, 0]} c="#1f2937" />
      <RoundedBox args={[0.07, 0.58, 0.9]} radius={0.02} position={[-0.22, 1.36, 0]} castShadow><meshStandardMaterial color="#111827" /></RoundedBox>
      <Panel w={0.84} h={0.52} p={[-0.18, 1.36, 0]} r={[0, Math.PI / 2, 0]} tex={screen} emissive={0.8} />
      <Box s={[0.25, 0.03, 0.6]} p={[0.2, 0.835, 0]} c="#374151" />
      <Box s={[0.12, 0.03, 0.08]} p={[0.25, 0.835, 0.5]} c="#374151" />
      <mesh position={[0.15, 0.88, -0.7]} castShadow><cylinderGeometry args={[0.06, 0.05, 0.14, 12]} />{M(owner.color)}</mesh>
      <Panel w={0.5} h={0.12} p={[0.556, 0.7, 0]} r={[0, Math.PI / 2, 0]} tex={nameplate} emissive={0.3} />
      {/* chair */}
      <group position={[1.05, 0, 0]}>
        <Box s={[0.55, 0.08, 0.55]} p={[0, 0.5, 0]} c="#1f2937" />
        <Box s={[0.08, 0.6, 0.5]} p={[0.27, 0.85, 0]} c="#1f2937" />
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />{M('#4b5563')}</mesh>
        <Box s={[0.5, 0.04, 0.06]} p={[0, 0.03, 0]} c="#4b5563" /><Box s={[0.06, 0.04, 0.5]} p={[0, 0.03, 0]} c="#4b5563" />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- floating component beacons
const BEACONS = [
  { slot: 'role', p: [PROPS.whiteboard.x, 2.0, 8.2], color: '#f472b6' },
  { slot: 'task', p: [PROPS.printer.x - 0.2, 1.9, PROPS.printer.z], color: '#60a5fa' },
  { slot: 'context', p: [PROPS.cabinet.x - 0.2, 2.0, PROPS.cabinet.z], color: '#34d399' },
  { slot: 'format', p: [PROPS.vending.x - 0.4, 2.8, PROPS.vending.z], color: '#fbbf24' },
];
function Beacon({ slot, p, color }) {
  const has = useGame((s) => s.inventory.includes(slot));
  const ref = useRef();
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 1.5;
    ref.current.position.y = p[1] + Math.sin(s.clock.elapsedTime * 2 + p[0]) * 0.12;
  });
  if (has) return null;
  return (
    <group ref={ref} position={p}>
      <mesh><octahedronGeometry args={[0.18]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} /></mesh>
      <mesh scale={2.2}><octahedronGeometry args={[0.18]} /><meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- door
function Door({ tex }) {
  const open = useGame((s) => s.doorOpen);
  const panel = useRef(), lamp = useRef();
  useFrame((_, dt) => {
    panel.current.position.x = THREE.MathUtils.damp(panel.current.position.x, open ? DOOR.w : 0, 2, dt);
    lamp.current.color.set(open ? '#22c55e' : '#ef4444');
    lamp.current.emissive.set(open ? '#22c55e' : '#ef4444');
  });
  return (
    <group position={[0, 0, ROOM.minZ - WALL_T / 2]}>
      <group ref={panel}>
        <Box s={[DOOR.w, 2.8, 0.14]} p={[0, 1.4, 0.0]} c="#94a3b8" o={{ metalness: 0.5, roughness: 0.35 }} />
        <Box s={[DOOR.w - 0.4, 0.5, 0.16]} p={[0, 1.9, 0]} c="#1e293b" o={{ metalness: 0.3 }} />
        <Box s={[0.12, 0.5, 0.2]} p={[DOOR.w / 2 - 0.25, 1.2, 0.08]} c="#475569" />
      </group>
      <Box s={[0.18, 3.0, 0.5]} p={[-DOOR.w / 2 - 0.09, 1.5, 0]} c="#334155" />
      <Box s={[0.18, 3.0, 0.5]} p={[DOOR.w / 2 + 0.09, 1.5, 0]} c="#334155" />
      <Box s={[DOOR.w + 0.36, 0.2, 0.5]} p={[0, 2.95, 0]} c="#334155" />
      <mesh position={[DOOR.w / 2 + 0.4, 1.5, 0.27]}>
        <boxGeometry args={[0.22, 0.32, 0.06]} />
        <meshStandardMaterial ref={lamp} color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <Panel w={0.9} h={0.34} p={[0, 3.35, 0.26]} tex={tex} emissive={1.2} />
    </group>
  );
}

// ---------------------------------------------------------------- lights
function Lighting() {
  const alarm = useRef();
  useFrame((s, dt) => {
    const st = useGame.getState();
    if (st.phase !== 'intro') world.alarm = Math.max(0, world.alarm - dt * 0.35);
    const flash = world.alarm * (0.5 + 0.5 * Math.sin(s.clock.elapsedTime * 9));
    alarm.current.intensity = flash * 90;
  });
  return (
    <>
      <hemisphereLight args={['#dbe7ff', '#3b2f2f', 0.55]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[9, 14, 6]} intensity={1.6} color="#fff1dc" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-camera-near={1} shadow-camera-far={45}
      />
      {[[-6, 0], [6, 0]].map(([x, z]) => <pointLight key={x + ':' + z} position={[x, 4.0, z]} intensity={16} distance={16} decay={1.5} color="#fff6e5" />)}
      <pointLight position={[0, 3.6, -13]} intensity={14} distance={12} decay={1.6} color="#c4b5fd" />
      <pointLight ref={alarm} position={[-2, 4.1, 0]} color="#ff1a1a" distance={30} decay={1.3} intensity={0} />
    </>
  );
}

// ---------------------------------------------------------------- level
export default function TrainingCenter() {
  const T = useStaticTextures();
  const W = ROOM.maxX - ROOM.minX, D = ROOM.maxZ - ROOM.minZ, H = ROOM.h;
  const wallC = '#ece6da', accent = '#5b6b8c';
  const sideW = (W - DOOR.w) / 2;
  return (
    <group>
      <Lighting />
      <fog attach="fog" args={['#1a1830', 22, 48]} />

      {/* floor & ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[W, D]} /><meshStandardMaterial map={T.carpet} roughness={0.95} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}><planeGeometry args={[W, D]} /><meshStandardMaterial map={T.tiles} roughness={0.9} /></mesh>
      {[[-6, -4], [6, -4], [-6, 4], [6, 4], [0, 0], [-6, 0], [6, 0]].map(([x, z]) => (
        <mesh key={x + ':' + z} position={[x, H - 0.02, z]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2.2, 1.0]} /><meshStandardMaterial color="#fffbea" emissive="#fffbea" emissiveIntensity={1.4} toneMapped={false} /></mesh>
      ))}

      {/* walls */}
      <Box s={[WALL_T, H, D + WALL_T * 2]} p={[ROOM.minX - WALL_T / 2, H / 2, 0]} c={wallC} />
      <Box s={[WALL_T, H, D + WALL_T * 2]} p={[ROOM.maxX + WALL_T / 2, H / 2, 0]} c={wallC} />
      <Box s={[W, H, WALL_T]} p={[0, H / 2, ROOM.maxZ + WALL_T / 2]} c={wallC} />
      <Box s={[sideW, H, WALL_T]} p={[ROOM.minX + sideW / 2, H / 2, ROOM.minZ - WALL_T / 2]} c={wallC} />
      <Box s={[sideW, H, WALL_T]} p={[ROOM.maxX - sideW / 2, H / 2, ROOM.minZ - WALL_T / 2]} c={wallC} />
      <Box s={[DOOR.w, H - 3.05, WALL_T]} p={[0, 3.05 + (H - 3.05) / 2, ROOM.minZ - WALL_T / 2]} c={wallC} />
      {/* accent stripe & baseboards */}
      <Box s={[0.02, 0.3, D]} p={[ROOM.maxX - 0.01, 1.1, 0]} c={accent} cast={false} />
      <Box s={[W, 0.3, 0.02]} p={[0, 1.1, ROOM.maxZ - 0.01]} c={accent} cast={false} />
      {[[sideW, ROOM.minX + sideW / 2], [sideW, ROOM.maxX - sideW / 2]].map(([w, x]) => <Box key={x} s={[w, 0.3, 0.02]} p={[x, 1.1, ROOM.minZ + 0.01]} c={accent} cast={false} />)}

      {/* windows on the south wall */}
      {[3, 9].map((x) => (
        <group key={x} position={[x - 6, 2.3, ROOM.maxZ - 0.03]}>
          <Panel w={3.2} h={1.8} p={[0, 0, 0]} r={[0, Math.PI, 0]} tex={T.skyline} emissive={1} />
          <Box s={[3.4, 0.12, 0.08]} p={[0, 0.95, 0]} c="#e5e7eb" /><Box s={[3.4, 0.12, 0.08]} p={[0, -0.95, 0]} c="#e5e7eb" />
          <Box s={[0.08, 1.9, 0.08]} p={[0, 0, 0]} c="#e5e7eb" />
        </group>
      ))}

      {/* banner + posters */}
      <Panel w={6.4} h={1.0} p={[6, 3.6, ROOM.minZ + 0.02]} tex={T.banner} emissive={0.6} />
      <Panel w={1.1} h={1.55} p={[ROOM.maxX - 0.02, 2.2, -4]} r={[0, -Math.PI / 2, 0]} tex={T.poster} emissive={0.35} />
      <Panel w={1.1} h={1.55} p={[-7, 2.2, ROOM.minZ + 0.02]} tex={T.poster2} emissive={0.35} />

      {/* presentation stage */}
      <Box s={[0.8, 0.25, 7.4]} p={[-11.6, 0.125, 0]} c="#4b5563" />
      <Box s={[0.12, 4.1, 7.4]} p={[ROOM.minX + 0.08, 2.55, 0]} c="#111827" />
      <PresentationScreen />
      {/* lectern */}
      <group position={[PROPS.lectern.x, 0, PROPS.lectern.z]}>
        <Box s={[0.8, 1.1, 1.0]} p={[0, 0.55, 0]} c="#7c4a2d" />
        <Box s={[0.95, 0.08, 1.15]} p={[0, 1.14, 0]} r={[0, 0, -0.15]} c="#8b5a3c" />
        <Box s={[0.1, 0.4, 0.1]} p={[0.3, 1.0, 0]} c="#22d3ee" o={{ emissive: '#22d3ee', emissiveIntensity: 1.5 }} />
        <mesh position={[0.2, 1.38, 0.3]} rotation={[0, 0, 0.6]}><cylinderGeometry args={[0.015, 0.015, 0.4]} />{M('#111')}</mesh>
        <mesh position={[0.32, 1.55, 0.3]}><sphereGeometry args={[0.06, 12, 10]} />{M('#222', { metalness: 0.6 })}</mesh>
        <Box s={[0.02, 0.42, 0.62]} p={[0.36, 1.32, -0.15]} r={[0, 0, -0.35]} c="#0f172a" o={{ emissive: '#0891b2', emissiveIntensity: 0.6 }} />
      </group>

      {DESKS.map((d, i) => <Desk key={i} {...d} i={i} />)}

      {/* whiteboard */}
      <group position={[PROPS.whiteboard.x, 0, PROPS.whiteboard.z]}>
        <Box s={[3.6, 1.9, 0.08]} p={[0, 2.0, 0]} c="#9ca3af" o={{ metalness: 0.5 }} />
        <Panel w={3.45} h={1.75} p={[0, 2.0, -0.045]} r={[0, Math.PI, 0]} tex={T.whiteboard} emissive={0.45} />
        <Box s={[3.0, 0.06, 0.18]} p={[0, 1.02, -0.08]} c="#9ca3af" />
      </group>

      {/* printer */}
      <group position={[PROPS.printer.x, 0, PROPS.printer.z]}>
        <Box s={[1.3, 0.8, 1.2]} p={[0, 0.4, 0]} c="#cbd5e1" />
        <RoundedBox args={[0.95, 0.5, 0.85]} radius={0.05} position={[0, 1.05, 0]} castShadow><meshStandardMaterial color="#e2e8f0" /></RoundedBox>
        <Box s={[0.5, 0.04, 0.6]} p={[-0.4, 1.12, 0]} c="#f8fafc" />
        <Box s={[0.12, 0.06, 0.04]} p={[-0.48, 1.25, 0.28]} c="#ef4444" o={{ emissive: '#ef4444', emissiveIntensity: 2 }} />
        <Box s={[0.4, 0.02, 0.5]} p={[-0.62, 1.0, 0.0]} r={[0, 0, 0.5]} c="#ffffff" />
      </group>

      {/* filing cabinet */}
      <group position={[PROPS.cabinet.x, 0, PROPS.cabinet.z]}>
        <Box s={[0.9, 1.5, 0.95]} p={[0, 0.75, 0]} c="#6b7b5e" o={{ metalness: 0.4, roughness: 0.5 }} />
        {[0.3, 0.75, 1.2].map((y) => <group key={y}><Box s={[0.04, 0.36, 0.82]} p={[-0.46, y, 0]} c="#5a684e" /><Box s={[0.05, 0.05, 0.25]} p={[-0.5, y + 0.08, 0]} c="#d1d5db" /></group>)}
        <Box s={[0.04, 0.3, 0.3]} p={[-0.49, 0.45, 0.2]} c="#92400e" />
      </group>

      {/* vending machine */}
      <group position={[PROPS.vending.x, 0, PROPS.vending.z]}>
        <Box s={[1.1, 2.3, 1.3]} p={[0.05, 1.15, 0]} c="#b91c1c" />
        <Panel w={0.8} h={1.6} p={[-0.51, 1.35, -0.12]} r={[0, -Math.PI / 2, 0]} tex={T.vending} emissive={0.7} />
        <Box s={[0.04, 0.3, 0.3]} p={[-0.51, 1.3, 0.45]} c="#111827" />
        <Box s={[0.04, 0.25, 0.9]} p={[-0.51, 0.3, -0.1]} c="#111827" />
      </group>

      {/* coffee counter */}
      <group position={[PROPS.coffee.x, 0, PROPS.coffee.z]}>
        <Box s={[3.2, 0.95, 1.0]} p={[0, 0.475, 0]} c="#7c5c3e" />
        <Box s={[3.3, 0.06, 1.1]} p={[0, 0.98, 0]} c="#e7e5e4" />
        <Box s={[0.7, 0.75, 0.55]} p={[0.4, 1.38, 0.05]} c="#1c1917" o={{ metalness: 0.5 }} />
        <Panel w={0.6} h={0.3} p={[0.4, 1.45, -0.235]} r={[0, Math.PI, 0]} tex={T.coffeeSign} emissive={0.4} />
        {[-1.1, -0.8, -0.5].map((x) => <mesh key={x} position={[x, 1.07, 0]} castShadow><cylinderGeometry args={[0.07, 0.06, 0.13, 12]} />{M('#fafaf9')}</mesh>)}
      </group>

      {/* plants */}
      {[[PROPS.plant.x, PROPS.plant.z, 1.25], [-11.2, -8.2, 1], [-11.2, 8.2, 1]].map(([x, z, sc], i) => (
        <group key={i} position={[x, 0, z]} scale={sc}>
          <Box s={[0.7, 0.6, 0.7]} p={[0, 0.3, 0]} c="#b45309" />
          {[0, 1, 2, 3, 4].map((k) => <Box key={k} s={[0.22, 0.9, 0.08]} p={[Math.sin(k * 1.3) * 0.18, 1.0, Math.cos(k * 1.3) * 0.18]} r={[Math.cos(k * 1.3) * 0.5, k, Math.sin(k * 1.3) * 0.5]} c="#16a34a" />)}
          <Box s={[0.5, 0.5, 0.5]} p={[0, 1.15, 0]} r={[0.4, 0.6, 0]} c="#22c55e" />
        </group>
      ))}

      {/* clock */}
      <Panel w={0.8} h={0.8} p={[PROPS.clock.x, 3.1, ROOM.minZ + 0.03]} tex={T.clock} emissive={0.4} />
      <ClockHands />

      {BEACONS.map((b) => <Beacon key={b.slot} {...b} />)}
      <LecternRing />
      <Door tex={T.exitSign} />
      <Lobby T={T} />
    </group>
  );
}

function ClockHands() {
  const big = useRef(), small = useRef();
  useFrame((s) => { big.current.rotation.z = -s.clock.elapsedTime * 3; small.current.rotation.z = -s.clock.elapsedTime * 0.25; });
  return (
    <group position={[PROPS.clock.x, 3.1, ROOM.minZ + 0.06]}>
      <group ref={big}><Box s={[0.03, 0.32, 0.02]} p={[0, 0.15, 0]} c="#dc2626" cast={false} /></group>
      <group ref={small}><Box s={[0.05, 0.2, 0.02]} p={[0, 0.09, 0]} c="#111" cast={false} /></group>
    </group>
  );
}

function LecternRing() {
  const on = useGame((s) => s.flags.terminalOn);
  const done = useGame((s) => s.doorOpen);
  const ref = useRef();
  useFrame((s) => { if (ref.current) ref.current.material.opacity = 0.35 + Math.sin(s.clock.elapsedTime * 4) * 0.2; });
  if (done) return null;
  return (
    <mesh ref={ref} position={[PROPS.lectern.x + 1.1, 0.03, PROPS.lectern.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.75, 32]} />
      <meshBasicMaterial color={on ? '#22d3ee' : '#facc15'} transparent opacity={0.5} />
    </mesh>
  );
}

function Lobby({ T }) {
  const W = LOBBY.maxX - LOBBY.minX, D = LOBBY.maxZ - LOBBY.minZ, cz = (LOBBY.minZ + LOBBY.maxZ) / 2, H = 4;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, cz - 0.1]} receiveShadow><planeGeometry args={[W, D + 0.6]} /><meshStandardMaterial color="#27213d" roughness={0.4} metalness={0.2} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, cz]}><planeGeometry args={[W, D]} /><meshStandardMaterial color="#1a1530" /></mesh>
      <Box s={[WALL_T, H, D]} p={[LOBBY.minX - WALL_T / 2, H / 2, cz]} c="#3b3360" />
      <Box s={[WALL_T, H, D]} p={[LOBBY.maxX + WALL_T / 2, H / 2, cz]} c="#3b3360" />
      <Box s={[W + WALL_T * 2, H, WALL_T]} p={[0, H / 2, LOBBY.minZ - WALL_T / 2]} c="#3b3360" />
      {/* neon strips */}
      {[LOBBY.minX + 0.03, LOBBY.maxX - 0.03].map((x) => <Box key={x} s={[0.04, 0.06, D]} p={[x, 3.2, cz]} c="#a855f7" o={{ emissive: '#a855f7', emissiveIntensity: 3, toneMapped: false }} cast={false} />)}
      {/* Mission 2 door */}
      <group position={[PROPS.exitDoor.x, 0, LOBBY.minZ + 0.05]}>
        <Box s={[2.2, 2.8, 0.12]} p={[0, 1.4, 0]} c="#78350f" />
        <Panel w={2.0} h={1.0} p={[0, 3.3, 0.08]} tex={T.m2} emissive={0.9} />
        <mesh position={[0, 1.7, 0.12]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.35, 0.3, 0.1, 20]} />{M('#fafaf9')}</mesh>
      </group>
      {/* Mission 3 vault */}
      <group position={[LOBBY.minX + 0.08, 0, PROPS.vault.z]}>
        <mesh position={[0, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.1, 1.1, 0.15, 32]} />{M('#9ca3af', { metalness: 0.8, roughness: 0.3 })}</mesh>
        <mesh position={[0.1, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.4, 0.06, 8, 24]} />{M('#4b5563', { metalness: 0.8 })}</mesh>
        <Panel w={1.8} h={0.9} p={[0.1, 3.3, 0]} r={[0, Math.PI / 2, 0]} tex={T.m3} emissive={0.9} />
      </group>
      {/* benches */}
      {[-3.8, 3.8].map((x) => <group key={x} position={[x, 0, -16.6]}><Box s={[1.6, 0.12, 0.6]} p={[0, 0.5, 0]} c="#a16207" /><Box s={[1.5, 0.44, 0.5]} p={[0, 0.22, 0]} c="#3f3f46" /></group>)}
    </group>
  );
}
