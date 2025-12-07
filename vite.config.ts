import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for Electron to load assets from file:// protocol
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Disable to avoid EBUSY errors
    rollupOptions: {
      external: ['electron', 'sql.js']
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // Prevent optimizing server-side dependencies
  optimizeDeps: {
    exclude: ['sql.js']
  }
});