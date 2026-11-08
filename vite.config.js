import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes the build work from any sub-path (GitHub Pages, itch.io, S3 folders...)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: { manualChunks: { three: ['three'], r3f: ['@react-three/fiber', '@react-three/drei'] } },
    },
  },
});
