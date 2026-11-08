import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { world } from '../game/world.js';
import { useGame } from '../game/store.js';

const damp = THREE.MathUtils.damp;

// Shared material cache: one material per colour keeps draw state cheap.
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts }));
  return matCache.get(key);
}

function B({ s, p = [0, 0, 0], r, c, o }) {
  return (
    <mesh position={p} rotation={r} material={mat(c, o)} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}
function RB({ s, p, c, radius = 0.06 }) {
  return (
    <RoundedBox args={s} radius={radius} smoothness={3} position={p} material={mat(c)} castShadow receiveShadow />
  );
}

// ---------- Face ----------
function Face({ refs, look }) {
  const dark = '#1b1b22';
  return (
    <group position={[0, 0.36, 0.315]}>
      {/* eyes */}
      <group ref={refs.eyes}>
        {[-0.14, 0.14].map((x) => (
          <group key={x} position={[x, 0.05, 0]}>
            <B s={[0.11, 0.13, 0.02]} c="#ffffff" />
            <B s={[0.065, 0.085, 0.02]} p={[0, -0.01, 0.006]} c={dark} />
            <B s={[0.022, 0.022, 0.02]} p={[0.018, 0.015, 0.012]} c="#ffffff" />
          </group>
        ))}
      </group>
      {/* eyebrows */}
      <group ref={refs.browL} position={[-0.14, 0.17, 0.005]}><B s={[0.14, 0.035, 0.02]} c={look.hair} /></group>
      <group ref={refs.browR} position={[0.14, 0.17, 0.005]}><B s={[0.14, 0.035, 0.02]} c={look.hair} /></group>
      {/* cheeks */}
      <B s={[0.08, 0.04, 0.01]} p={[-0.22, -0.06, 0]} c="#f19a9a" o={{ transparent: true, opacity: 0.55 }} />
      <B s={[0.08, 0.04, 0.01]} p={[0.22, -0.06, 0]} c="#f19a9a" o={{ transparent: true, opacity: 0.55 }} />
      {/* mouths (one visible at a time) */}
      <group position={[0, -0.13, 0.005]}>
        <mesh ref={refs.smile} rotation={[0, 0, Math.PI]} material={mat(dark)}>
          <torusGeometry args={[0.085, 0.02, 6, 16, Math.PI]} />
        </mesh>
        <mesh ref={refs.frown} position={[0, -0.06, 0]} material={mat(dark)}>
          <torusGeometry args={[0.07, 0.02, 6, 16, Math.PI]} />
        </mesh>
        <group ref={refs.open}>
          <B s={[0.15, 0.1, 0.02]} c="#5b1d24" />
          <B s={[0.11, 0.03, 0.022]} p={[0, 0.03, 0.002]} c="#ffffff" />
        </group>
        <group ref={refs.flat}><B s={[0.14, 0.03, 0.02]} c={dark} /></group>
      </group>
    </group>
  );
}

// ---------- Hair & accessories ----------
function Hair({ look }) {
  const h = look.hair;
  switch (look.hairStyle) {
    case 'neat':
      return (<group>
        <B s={[0.7, 0.14, 0.66]} p={[0, 0.69, -0.01]} c={h} />
        <B s={[0.72, 0.3, 0.12]} p={[0, 0.52, -0.3]} c={h} />
        <B s={[0.36, 0.1, 0.1]} p={[-0.16, 0.6, 0.3]} r={[0, 0, 0.15]} c={h} />
      </group>);
    case 'cap':
      return (<group>
        <B s={[0.72, 0.18, 0.7]} p={[0, 0.72, 0]} c="#16a34a" />
        <B s={[0.5, 0.05, 0.32]} p={[0, 0.64, -0.48]} c="#15803d" />
        <B s={[0.12, 0.08, 0.02]} p={[0, 0.72, 0.355]} c="#facc15" />
      </group>);
    case 'slick':
      return (<group>
        <B s={[0.7, 0.12, 0.68]} p={[0, 0.68, -0.02]} c={h} o={{ roughness: 0.2, metalness: 0.2 }} />
        <B s={[0.72, 0.22, 0.12]} p={[0, 0.55, -0.31]} c={h} o={{ roughness: 0.2 }} />
      </group>);
    case 'curly':
      return (<group>
        {[-0.24, -0.08, 0.08, 0.24].map((x) => [-0.2, 0.05, 0.25].map((z) => (
          <B key={x + ':' + z} s={[0.2, 0.2, 0.2]} p={[x, 0.7 + ((x * 7 + z * 5) % 0.06), z - 0.03]} c={h} />
        )))}
        <B s={[0.72, 0.3, 0.14]} p={[0, 0.5, -0.3]} c={h} />
      </group>);
    case 'buzz':
    default:
      return <B s={[0.68, 0.06, 0.64]} p={[0, 0.66, 0]} c={h} />;
  }
}

function HeadAccessory({ look }) {
  switch (look.accessory) {
    case 'glasses':
      return (<group position={[0, 0.41, 0.33]}>
        <B s={[0.17, 0.15, 0.02]} p={[-0.14, 0, 0]} c="#111" o={{ transparent: true, opacity: 0.35 }} />
        <B s={[0.17, 0.15, 0.02]} p={[0.14, 0, 0]} c="#111" o={{ transparent: true, opacity: 0.35 }} />
        <B s={[0.5, 0.025, 0.025]} p={[0, 0.07, 0.01]} c="#222" />
        <B s={[0.08, 0.02, 0.02]} p={[0, 0.02, 0.01]} c="#222" />
      </group>);
    case 'suit':
      return (<group position={[0, 0.42, 0.33]}>
        <B s={[0.22, 0.11, 0.02]} p={[-0.13, 0, 0]} c="#0a0a0a" o={{ roughness: 0.1, metalness: 0.6 }} />
        <B s={[0.22, 0.11, 0.02]} p={[0.13, 0, 0]} c="#0a0a0a" o={{ roughness: 0.1, metalness: 0.6 }} />
        <B s={[0.62, 0.03, 0.02]} p={[0, 0.04, 0]} c="#0a0a0a" />
      </group>);
    case 'headset':
      return (<group>
        <B s={[0.74, 0.06, 0.1]} p={[0, 0.72, 0]} c="#111827" />
        <B s={[0.08, 0.2, 0.2]} p={[-0.36, 0.38, 0]} c="#111827" />
        <B s={[0.08, 0.2, 0.2]} p={[0.36, 0.38, 0]} c="#111827" />
        <B s={[0.03, 0.03, 0.3]} p={[0.32, 0.26, 0.17]} r={[0, -0.4, 0]} c="#111827" />
        <B s={[0.07, 0.07, 0.07]} p={[0.22, 0.24, 0.32]} c="#ef4444" o={{ emissive: '#ef4444', emissiveIntensity: 0.6 }} />
      </group>);
    case 'headband':
      return (<group>
        <B s={[0.7, 0.09, 0.66]} p={[0, 0.56, 0]} c="#ffffff" />
        <B s={[0.06, 0.2, 0.06]} p={[0.1, 0.44, -0.35]} r={[0.4, 0, 0.3]} c="#ffffff" />
        <B s={[0.06, 0.2, 0.06]} p={[-0.05, 0.44, -0.35]} r={[0.4, 0, -0.2]} c="#ffffff" />
      </group>);
    default:
      return null;
  }
}

function TorsoDetails({ look }) {
  const d = look.shirtDetail;
  switch (look.accessory) {
    case 'glasses': // cardigan over shirt + brain badge
      return (<group>
        <B s={[0.3, 0.86, 0.02]} p={[0, 0.46, 0.262]} c={d} />
        <B s={[0.05, 0.05, 0.02]} p={[0, 0.66, 0.275]} c="#c4b5fd" />
        <B s={[0.05, 0.05, 0.02]} p={[0, 0.46, 0.275]} c="#c4b5fd" />
        <B s={[0.14, 0.12, 0.02]} p={[-0.3, 0.68, 0.265]} c="#f472b6" />
        <B s={[0.2, 0.02, 0.02]} p={[0.28, 0.75, 0.265]} c="#111" />
      </group>);
    case 'hoodie':
      return (<group>
        <B s={[0.6, 0.26, 0.04]} p={[0, 0.2, 0.27]} c={look.shirt} o={{ roughness: 0.9 }} />
        <B s={[0.5, 0.3, 0.02]} p={[0, 0.58, 0.262]} c={d} />
        <B s={[0.04, 0.26, 0.03]} p={[-0.1, 0.62, 0.28]} c="#fff" />
        <B s={[0.04, 0.26, 0.03]} p={[0.1, 0.62, 0.28]} c="#fff" />
        <B s={[0.8, 0.2, 0.2]} p={[0, 0.94, -0.22]} c={look.shirt} />
      </group>);
    case 'suit':
      return (<group>
        <B s={[0.3, 0.6, 0.02]} p={[0, 0.6, 0.262]} c={d} />
        <B s={[0.1, 0.5, 0.03]} p={[0, 0.58, 0.272]} c="#dc2626" />
        <B s={[0.14, 0.08, 0.03]} p={[0, 0.86, 0.272]} c="#b91c1c" />
        <B s={[0.12, 0.56, 0.02]} p={[-0.2, 0.6, 0.27]} r={[0, 0, -0.25]} c="#152038" />
        <B s={[0.12, 0.56, 0.02]} p={[0.2, 0.6, 0.27]} r={[0, 0, 0.25]} c="#152038" />
        <B s={[0.14, 0.06, 0.02]} p={[0.3, 0.7, 0.275]} c="#ffffff" />
        <B s={[1.02, 0.08, 0.54]} p={[0, 0.04, 0]} c="#0f172a" />
        <B s={[0.1, 0.07, 0.02]} p={[0, 0.04, 0.275]} c="#d4af37" o={{ metalness: 0.8, roughness: 0.3 }} />
      </group>);
    case 'headset': // blazer with name badge + clipboard pocket
      return (<group>
        <B s={[0.3, 0.86, 0.02]} p={[0, 0.46, 0.262]} c={d} />
        <B s={[0.24, 0.14, 0.02]} p={[-0.3, 0.66, 0.267]} c="#ffffff" />
        <B s={[0.18, 0.03, 0.02]} p={[-0.3, 0.68, 0.272]} c="#2563eb" />
        <B s={[0.2, 0.12, 0.02]} p={[0.28, 0.3, 0.268]} c="#ca8a04" />
      </group>);
    case 'headband': // tracksuit stripes + number
      return (<group>
        <B s={[0.06, 0.92, 0.02]} p={[-0.4, 0.46, 0.262]} c={d} />
        <B s={[0.06, 0.92, 0.02]} p={[0.4, 0.46, 0.262]} c={d} />
        <B s={[0.04, 0.6, 0.03]} p={[0, 0.56, 0.27]} c="#e5e7eb" />
        <B s={[0.26, 0.22, 0.02]} p={[0, 0.5, -0.262]} c="#ffffff" />
      </group>);
    default:
      return null;
  }
}

// ---------- Main avatar ----------
export default function BlockyAvatar({ index, cfg }) {
  const { look } = cfg;
  const root = useRef(), hips = useRef(), torso = useRef(), head = useRef();
  const armL = useRef(), armR = useRef(), legL = useRef(), legR = useRef();
  const face = { eyes: useRef(), browL: useRef(), browR: useRef(), smile: useRef(), frown: useRef(), open: useRef(), flat: useRef() };
  const seed = useMemo(() => index * 1.7 + 0.3, [index]);
  const sleeve = look.accessory === 'headband' || look.accessory === 'hoodie' ? look.shirt : look.accessory === 'suit' ? '#1e2a4a' : look.shirt;

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const c = world.chars[index];
    const t = state.clock.elapsedTime + seed;
    const spd = Math.min(1, c.speed);
    const ph = c.walkPhase;
    const st = useGame.getState();
    const line = st.dialogue.current;
    const talking = line && line.who === cfg.id;
    let mood = talking && line.mood ? line.mood : cfg.defaultMood;
    const emoteName = c.emote && world.time < c.emoteUntil ? c.emote : null;
    if (emoteName === 'cheer' || emoteName === 'dance') mood = 'excited';
    if (emoteName === 'facepalm') mood = 'sad';

    // --- targets ---
    let lA = { x: 0, z: 0.06 }, rA = { x: 0, z: -0.06 }, lL = 0, rL = 0;
    let bob = 0, headX = 0, headY = 0, headZ = 0, torsoY = 0, torsoX = 0;
    const swing = Math.sin(ph) * 0.75 * spd;
    lL = swing; rL = -swing;
    lA.x = -swing * 0.9; rA.x = swing * 0.9;
    bob = Math.abs(Math.sin(ph)) * 0.07 * spd;
    torsoX = spd * 0.08;

    const idle = 1 - Math.min(1, spd * 3);
    if (idle > 0 && !emoteName) {
      bob += Math.sin(t * 2) * 0.012;
      switch (cfg.idleStyle) {
        case 'thinker':
          rA = { x: -2.1 * idle, z: 0.55 * idle };
          lA = { x: -0.6 * idle, z: -0.6 * idle };
          headZ = Math.sin(t * 0.8) * 0.12 * idle; headX = 0.1 * idle;
          break;
        case 'bouncy':
          bob += Math.abs(Math.sin(t * 5)) * 0.06 * idle;
          lA = { x: -0.3 * idle, z: (0.9 + Math.sin(t * 10) * 0.2) * idle };
          rA = { x: -0.3 * idle, z: -(0.9 + Math.cos(t * 10) * 0.2) * idle };
          headZ = Math.sin(t * 5) * 0.1 * idle;
          break;
        case 'boss': {
          const watch = (t % 7) < 1.4;
          lA = { x: (watch ? -1.6 : -1.15) * idle, z: (watch ? -0.2 : -0.85) * idle };
          rA = { x: -1.15 * idle, z: 0.85 * idle };
          headX = (watch ? 0.35 : -0.05) * idle;
          break;
        }
        case 'talker':
          rA = { x: (-0.9 + Math.sin(t * 3.2) * 0.45) * idle, z: (-0.2 + Math.sin(t * 2.1) * 0.25) * idle };
          lA = { x: (-0.5 + Math.cos(t * 2.7) * 0.35) * idle, z: (0.3 + Math.cos(t * 1.7) * 0.2) * idle };
          headY = Math.sin(t * 1.3) * 0.25 * idle; headX = Math.sin(t * 4) * 0.05 * idle;
          break;
        case 'boxer': {
          const jab = Math.max(0, Math.sin(t * 3.5)) ** 8;
          bob += Math.abs(Math.sin(t * 7)) * 0.04 * idle;
          lA = { x: (-1.5 - jab * 0.3) * idle, z: -0.35 * idle };
          rA = { x: -1.3 * idle, z: 0.35 * idle };
          torsoY = Math.sin(t * 3.5) * 0.15 * idle;
          break;
        }
        default:
      }
    }
    if (talking && spd < 0.2) {
      // emphatic talking gesture layered on top
      rA.x += Math.sin(t * 6) * 0.2; headX += Math.sin(t * 9) * 0.04;
    }
    if (emoteName === 'cheer') {
      lA = { x: -0.2, z: 2.7 + Math.sin(t * 12) * 0.15 }; rA = { x: -0.2, z: -2.7 - Math.sin(t * 12) * 0.15 };
      bob += Math.abs(Math.sin(t * 8)) * 0.18;
    } else if (emoteName === 'dance') {
      const k = Math.sin(t * 7 + index);
      lA = { x: -0.4, z: 1.6 + k * 1.0 }; rA = { x: -0.4, z: -1.6 + k * 1.0 };
      torsoY = k * 0.35; lL = Math.max(0, k) * 0.5; rL = Math.max(0, -k) * 0.5;
      bob += Math.abs(k) * 0.1; headZ = k * 0.15;
    } else if (emoteName === 'facepalm') {
      rA = { x: -2.5, z: 0.5 }; headX = 0.35;
    } else if (emoteName === 'shrug') {
      lA = { x: -0.8, z: 0.9 }; rA = { x: -0.8, z: -0.9 }; headZ = 0.15;
    }
    if (!c.grounded) { lA.z = 1.3; rA.z = -1.3; lL = 0.5; rL = -0.3; }

    // --- apply with damping (smooth blending between poses) ---
    const k = 12;
    armL.current.rotation.x = damp(armL.current.rotation.x, lA.x, k, dt);
    armL.current.rotation.z = damp(armL.current.rotation.z, lA.z, k, dt);
    armR.current.rotation.x = damp(armR.current.rotation.x, rA.x, k, dt);
    armR.current.rotation.z = damp(armR.current.rotation.z, rA.z, k, dt);
    legL.current.rotation.x = damp(legL.current.rotation.x, lL, k, dt);
    legR.current.rotation.x = damp(legR.current.rotation.x, rL, k, dt);
    head.current.rotation.x = damp(head.current.rotation.x, headX, 8, dt);
    head.current.rotation.y = damp(head.current.rotation.y, headY, 8, dt);
    head.current.rotation.z = damp(head.current.rotation.z, headZ, 8, dt);
    torso.current.rotation.y = damp(torso.current.rotation.y, torsoY, 10, dt);
    torso.current.rotation.x = damp(torso.current.rotation.x, torsoX, 10, dt);
    root.current.position.y = damp(root.current.position.y, bob, 20, dt);

    // --- face ---
    const blink = (t % 3.7) < 0.12 ? 0.1 : 1;
    face.eyes.current.scale.y = damp(face.eyes.current.scale.y, mood === 'excited' || mood === 'shock' ? 1.25 * blink : blink, 30, dt);
    const brow = { smug: [0.15, -0.05], grin: [0.1, 0.1], serious: [-0.25, 0.25], excited: [0.2, -0.2], determined: [-0.35, 0.35], angry: [-0.5, 0.5], sad: [0.4, -0.4], shock: [0.25, -0.25] }[mood] || [0, 0];
    face.browL.current.rotation.z = damp(face.browL.current.rotation.z, -brow[0] + (mood === 'smug' ? 0.2 : 0), 10, dt);
    face.browR.current.rotation.z = damp(face.browR.current.rotation.z, -brow[1], 10, dt);
    face.browL.current.position.y = face.browR.current.position.y = 0.17 + (mood === 'shock' || mood === 'excited' ? 0.04 : 0);
    const mouthOpen = talking ? Math.abs(Math.sin(t * 14)) > 0.35 : mood === 'shock';
    face.open.current.visible = mouthOpen || (mood === 'excited' && !talking);
    face.open.current.scale.y = talking ? 0.6 + Math.abs(Math.sin(t * 14)) * 0.8 : 1;
    face.smile.current.visible = !face.open.current.visible && ['smug', 'grin', 'happy'].includes(mood);
    face.smile.current.scale.x = mood === 'grin' ? 1.4 : 1;
    face.frown.current.visible = !face.open.current.visible && ['sad', 'angry'].includes(mood);
    face.flat.current.visible = !face.open.current.visible && !face.smile.current.visible && !face.frown.current.visible;
  });

  return (
    <group ref={root} scale={0.82}>
      <group ref={hips} position={[0, 0.9, 0]}>
        {/* legs */}
        {[[-0.25, legL], [0.25, legR]].map(([x, ref]) => (
          <group key={x} ref={ref} position={[x, 0, 0]}>
            <B s={[0.44, 0.78, 0.46]} p={[0, -0.39, 0]} c={look.pants} />
            <B s={[0.47, 0.16, 0.58]} p={[0, -0.82, 0.05]} c={look.shoes} />
            {look.accessory === 'headband' && <B s={[0.46, 0.04, 0.48]} p={[0, -0.6, 0]} c="#fff" />}
          </group>
        ))}
        <group ref={torso}>
          <RB s={[1.0, 0.92, 0.52]} p={[0, 0.46, 0]} c={look.shirt} />
          <TorsoDetails look={look} />
          {/* arms */}
          {[[-0.69, armL, 1], [0.69, armR, -1]].map(([x, ref, side]) => (
            <group key={x} ref={ref} position={[x, 0.84, 0]}>
              <B s={[0.36, 0.72, 0.38]} p={[0, -0.34, 0]} c={sleeve} />
              <B s={[0.32, 0.2, 0.34]} p={[0, -0.8, 0]} c={look.skin} />
              {look.accessory === 'headband' && <B s={[0.38, 0.1, 0.4]} p={[0, -0.66, 0]} c="#fff" />}
              {look.accessory === 'suit' && side === 1 && <B s={[0.38, 0.06, 0.4]} p={[0, -0.64, 0]} c="#d4af37" o={{ metalness: 0.8, roughness: 0.3 }} />}
              {look.accessory === 'headset' && side === -1 && <B s={[0.06, 0.3, 0.06]} p={[0, -0.95, 0.12]} c="#111" />}
            </group>
          ))}
          {/* head */}
          <group ref={head} position={[0, 0.94, 0]}>
            <B s={[0.3, 0.1, 0.3]} p={[0, 0.02, 0]} c={look.skin} />
            <RoundedBox args={[0.68, 0.64, 0.62]} radius={0.12} smoothness={4} position={[0, 0.36, 0]} material={mat(look.skin)} castShadow />
            <Face refs={face} look={look} />
            <Hair look={look} />
            <HeadAccessory look={look} />
          </group>
        </group>
      </group>
    </group>
  );
}
