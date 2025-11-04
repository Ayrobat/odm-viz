import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Convert __dirname to work with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.DEV': mode === 'development' ? 'true' : 'false',
    global: 'globalThis',
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      three: path.resolve(__dirname, '../../node_modules/three'),
      '@odm-viz/laz-loader': path.resolve(__dirname, '../../packages/laz-loader/src'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      target: 'es2020',
      supported: {
        bigint: true,
      },
    },
    exclude: ['@odm-viz/wasm', '@odm-viz/laz-loader'],
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    fs: {
      allow: ['..'],
    },
    cors: true,
  },
  esbuild: {
    target: 'es2020',
    supported: {
      bigint: true,
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      external: ['fs', 'path', 'crypto', 'buffer', 'stream'],
      output: {
        manualChunks: {
          three: ['three'],
          'react-three': ['@react-three/fiber', '@react-three/drei'],
          wasm: ['@odm-viz/wasm'],
        },
      },
    },
    tsconfig: path.resolve(__dirname, 'tsconfig.json'),
  },
  assetsInclude: ['**/*.wasm'],
}));
