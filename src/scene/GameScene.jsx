import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store.js';
import { world, placeCharacters } from '../game/world.js';
import { resolveAll, inRect } from '../game/collision.js';
import { sfx } from '../game/audio.js';
import { findNearby } from '../game/interaction.js';
import { ROSTER } from '../characters/roster.js';
import Avatar from '../characters/Avatar.jsx';
import { getMission } from '../missions/registry.js';

const WALK = 4.0, RUN = 6.8, RADIUS = 0.42, GRAVITY = 20, JUMP_V = 6.2;
const angleDamp = (a, b, k, dt) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-k * dt));
};

// ---------------------------------------------------------------- characters + physics
function step(dt, st) {
  world.time += dt;
  const controllable = st.phase === 'playing' && !st.paused && !st.builderOpen;
  const keys = world.keys;
  for (const col of world.colliders) if (col.id === 'door') col.enabled = !st.doorOpen;

  world.chars.forEach((c, i) => {
    const isActive = i === st.active;
    let ix = 0, iz = 0, run = false;
    if (isActive && controllable) {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const yaw = world.cam.yaw;
      // forward = away from camera, right = camera right
      ix = -Math.sin(yaw) * f + Math.cos(yaw) * r;
      iz = -Math.cos(yaw) * f - Math.sin(yaw) * r;
      const len = Math.hypot(ix, iz);
      if (len > 0) { ix /= len; iz /= len; }
      run = keys.has('ShiftLeft') || keys.has('ShiftRight');
      if ((world.jumpRequest || keys.has('Space')) && c.grounded) { c.vy = JUMP_V; c.grounded = false; sfx.jump(); }
    }
    const max = run ? RUN : WALK;
    c.vx = THREE.MathUtils.damp(c.vx, ix * max, 12, dt);
    c.vz = THREE.MathUtils.damp(c.vz, iz * max, 12, dt);
    const ox = c.x, oz = c.z;
    c.x += c.vx * dt; c.z += c.vz * dt;
    if (isActive) {
      const others = world.chars.filter((_, j) => j !== i).map((o) => ({ x: o.x, z: o.z, r: 0.42 }));
      resolveAll(c, RADIUS, world.colliders, st.phase === 'victory' ? [] : others);
    }
    const moved = Math.hypot(c.x - ox, c.z - oz);
    const actual = moved / Math.max(dt, 1e-4);
    c.speed = THREE.MathUtils.damp(c.speed, actual / WALK, 10, dt);
    c.walkPhase += moved * 2.3;
    // jump / gravity
    if (!c.grounded || c.y > 0) {
      c.vy -= GRAVITY * dt; c.y += c.vy * dt;
      if (c.y <= 0) { c.y = 0; c.vy = 0; c.grounded = true; }
    }
    // facing
    if (Math.hypot(ix, iz) > 0.1) c.yaw = angleDamp(c.yaw, Math.atan2(ix, iz), 12, dt);
    else if (!isActive && (st.phase === 'playing' || st.phase === 'cutscene')) {
      const a = world.chars[st.active];
      if (Math.hypot(a.x - c.x, a.z - c.z) < 7) c.yaw = angleDamp(c.yaw, Math.atan2(a.x - c.x, a.z - c.z), 2.5, dt);
    } else if (st.phase === 'victory' || st.phase === 'complete') {
      c.yaw = angleDamp(c.yaw, 0, 4, dt);
    }

  });
}

function Characters({ mission }) {
  const groups = useRef([]);
  const rings = useRef([]);

  useFrame((_, dtRaw) => {
    // Fixed sub-steps keep movement speed & collisions correct even at low frame rates.
    const total = Math.min(dtRaw, 0.25);
    const steps = Math.max(1, Math.ceil(total / 0.034));
    const st = useGame.getState();
    for (let n = 0; n < steps; n++) step(total / steps, st);
    world.jumpRequest = false;
    world.chars.forEach((c, i) => {
      const g = groups.current[i];
      if (g) { g.position.set(c.x, c.y, c.z); g.rotation.y = c.yaw; }
      const ring = rings.current[i];
      if (ring) {
        const isActive = i === st.active;
        ring.material.opacity = isActive ? 0.85 : 0.25;
        ring.scale.setScalar(isActive ? 1 + Math.sin(world.time * 4) * 0.06 : 0.8);
      }
    });
    const controllable = st.phase === 'playing' && !st.paused && !st.builderOpen;

    // ---- interaction detection (nearest object in range of the controlled character) ----
    if (controllable) {
      st.setNearby(findNearby(st));
    } else if (st.nearby) st.setNearby(null);

    mission.update?.();
  });

  return ROSTER.map((cfg, i) => (
    <group key={cfg.id} ref={(el) => (groups.current[i] = el)}>
      <Avatar index={i} cfg={cfg} />
      <mesh ref={(el) => (rings.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.5, 0.62, 32]} />
        <meshBasicMaterial color={cfg.color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  ));
}

// ---------------------------------------------------------------- camera
const tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3(), tmpT = new THREE.Vector3();
const smooth = (x) => x * x * (3 - 2 * x);

function CameraRig({ mission }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 1.5, 0));

  useFrame((state, dtRaw) => {
    const cdt = Math.min(dtRaw, 0.25); // cinematic clock follows real time even on slow frames
    const st = useGame.getState();
    const t = state.clock.elapsedTime;
    let k = 8;
    const cin = mission.cinematics;

    if (st.phase === 'loading' || st.phase === 'title') {
      tmpV.set(Math.sin(t * 0.08) * 8, 5.5, Math.cos(t * 0.08) * 6);
      tmpL.set(-2, 1.2, 0); k = 2;
    } else if (st.phase === 'intro') {
      world.cine.t += cdt;
      let acc = 0, shot = cin.intro[cin.intro.length - 1], local = 1;
      for (const s of cin.intro) { if (world.cine.t < acc + s.d) { shot = s; local = (world.cine.t - acc) / s.d; break; } acc += s.d; }
      const cut = world.cine.shot !== shot;
      world.cine.shot = shot;
      const p = smooth(Math.min(1, local));
      tmpV.fromArray(shot.from).lerp(tmpT.fromArray(shot.to), p);
      tmpL.fromArray(shot.look).lerp(tmpT.fromArray(shot.lookTo), p);
      // hard cut at shot start, smooth within a shot
      if (cut) { camera.position.copy(tmpV); look.current.copy(tmpL); }
      k = 6;
    } else if (st.phase === 'cutscene' && world.cine.mode === 'door') {
      world.cine.t += cdt;
      tmpV.fromArray(cin.door.pos); tmpL.fromArray(cin.door.look); k = 2.5;
    } else if (st.phase === 'victory' || st.phase === 'complete') {
      world.cine.t += cdt;
      const v = cin.victory, a = Math.PI + Math.sin(world.cine.t * 0.25) * 0.7;
      tmpV.set(v.center[0] + Math.sin(a) * -v.radius * 0.2, v.height + Math.sin(world.cine.t * 0.4) * 0.3, v.center[2] + v.radius * 0.85);
      tmpV.x += Math.sin(world.cine.t * 0.3) * 1.5;
      tmpL.fromArray(v.center); k = 3;
    } else {
      // third-person follow
      const c = world.chars[st.active];
      const { yaw, pitch, dist } = world.cam;
      tmpT.set(c.x, c.y + 1.55, c.z);
      const dir = tmpL.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      // walk outward until we would leave the walkable/open space (keeps camera out of walls)
      let d = 0.4;
      for (; d < dist; d += 0.1) {
        const x = tmpT.x + dir.x * d, z = tmpT.z + dir.z * d, y = tmpT.y + dir.y * d;
        const open = mission.openSpaces.some((r) => inRect(x, z, r));
        if (!open || y > 4.2 || y < 0.25) { d -= 0.15; break; }
      }
      d = Math.max(0.6, d);
      tmpV.copy(tmpT).addScaledVector(dir, d);
      tmpL.copy(tmpT);
      // backed against a wall: rise above the character's head instead of clipping into it
      if (d < 3.4) { tmpV.y = Math.min(4.1, tmpV.y + (3.4 - d) * 0.65); tmpL.y -= (3.4 - d) * 0.12; }
      k = 14;
    }
    const f = 1 - Math.exp(-k * cdt);
    camera.position.lerp(tmpV, f);
    look.current.lerp(tmpL, f);
    camera.lookAt(look.current);
  });
  return null;
}

// ---------------------------------------------------------------- mouse look
function MouseLook() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    const canLook = () => { const s = useGame.getState(); return s.phase === 'playing' && !s.paused && !s.builderOpen; };
    const rotate = (dx, dy) => {
      world.cam.yaw -= dx * 0.0028;
      world.cam.pitch = THREE.MathUtils.clamp(world.cam.pitch + dy * 0.0022, -0.2, 1.25);
    };
    const onMove = (e) => {
      if (!canLook()) return;
      if (document.pointerLockElement === el) rotate(e.movementX, e.movementY);
      else if (dragging) rotate(e.movementX, e.movementY);
    };
    const onDown = (e) => {
      if (!canLook()) return;
      dragging = true;
      if (document.pointerLockElement !== el && e.button === 0) {
        try { const p = el.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* drag fallback */ }
      }
    };
    const onUp = () => { dragging = false; };
    const onWheel = (e) => { if (canLook()) world.cam.dist = THREE.MathUtils.clamp(world.cam.dist + e.deltaY * 0.004, 2.4, 8); };
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      el.removeEventListener('mousedown', onDown); window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove); el.removeEventListener('wheel', onWheel);
    };
  }, [gl]);
  return null;
}

// Marks the scene ready once shaders are compiled and a few frames rendered.
function ReadySignal() {
  const frames = useRef(0);
  const { gl, scene, camera } = useThree();
  useEffect(() => { try { gl.compile(scene, camera); } catch { /* optional */ } }, [gl, scene, camera]);
  useFrame(() => {
    frames.current++;
    if (frames.current === 4 && useGame.getState().phase === 'loading') useGame.getState().setPhase('title');
  });
  return null;
}

export default function GameScene() {
  const missionId = useGame((s) => s.missionId);
  const mission = getMission(missionId);
  useEffect(() => {
    world.colliders = mission.colliders();
    world.interactables = mission.interactables;
    placeCharacters(mission.spawns);
  }, [mission]);
  const Level = mission.Level;
  return (
    <>
      <color attach="background" args={['#120f22']} />
      <Level />
      <Characters mission={mission} />
      <CameraRig mission={mission} />
      <MouseLook />
      <ReadySignal />
    </>
  );
}
