import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import BlockyAvatar from './BlockyAvatar.jsx';
import { world } from '../game/world.js';

/**
 * Avatar = model-agnostic wrapper. Chooses procedural or GLB rendering from roster config.
 * GLB avatars only need: a humanoid facing +Z, feet at y=0, and (optionally) animation clips
 * mapped in cfg.model.clips. Missing clips are simply skipped.
 */
export default function Avatar({ index, cfg }) {
  if (cfg.model?.type === 'glb' && cfg.model.url) {
    const fallback = <BlockyAvatar index={index} cfg={cfg} />;
    return (
      <GlbErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <GlbAvatar index={index} cfg={cfg} />
        </Suspense>
      </GlbErrorBoundary>
    );
  }
  return <BlockyAvatar index={index} cfg={cfg} />;
}

function GlbAvatar({ index, cfg }) {
  const { scene, animations } = useGLTF(cfg.model.url);
  const model = useMemo(() => {
    const c = cloneSkinned(scene);
    c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return c;
  }, [scene]);
  const group = useRef();
  const { actions } = useAnimations(animations, group);
  const current = useRef(null);
  const clips = cfg.model.clips || {};

  useEffect(() => () => { current.current = null; }, []);

  useFrame(() => {
    const c = world.chars[index];
    const emote = c.emote && world.time < c.emoteUntil ? c.emote : null;
    const want = emote && clips[emote] ? clips[emote] : c.speed > 0.7 && clips.run ? clips.run : c.speed > 0.08 ? clips.walk : clips.idle;
    if (!want || want === current.current || !actions[want]) return;
    actions[current.current]?.fadeOut(0.25);
    actions[want].reset().fadeIn(0.25).play();
    current.current = want;
  });

  return (
    <group ref={group} position={[0, cfg.model.yOffset || 0, 0]} scale={cfg.model.scale || 1}>
      <primitive object={model} />
    </group>
  );
}

class GlbErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.warn('[Avatar] GLB failed to load, using procedural avatar.', e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
