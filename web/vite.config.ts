import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Firebase is most of the bundle and changes rarely; cache it separately.
        manualChunks: (id) => (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase') ? 'firebase' : id.includes('node_modules') ? 'vendor' : undefined),
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
