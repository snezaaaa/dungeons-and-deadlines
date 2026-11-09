import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import GameScene from './scene/GameScene.jsx';
import UI from './ui/UI.jsx';
import KeyboardController from './ui/KeyboardController.jsx';

export default function App() {
  return (
    <div className="app">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 55, near: 0.1, far: 120, position: [8, 5.5, 6] }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onCreated={({ camera }) => { window.__camera = camera; /* used by tools/record (e.g. wider FOV for vertical video) */ }}
      >
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
      <KeyboardController />
      <UI />
    </div>
  );
}
