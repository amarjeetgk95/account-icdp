import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Build stamp: lets us prove which bundle a browser is actually running
  // (stale-chunk debugging) without guessing from chunk hashes.
  define: {
    __BUILD_ID__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        // Keep manual splitting minimal: only shell vendors. Heavy feature
        // libs (jspdf, exceljs, xlsx, unpdf, jszip, html2canvas) stay in their
        // lazy route chunks via dynamic import()/React.lazy so they are never
        // statically imported or modulepreloaded by the entry.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'zustand', '@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
