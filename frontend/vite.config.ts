import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/pages/admin/')) {
            return 'admin-pages';
          }

          if (id.includes('/src/pages/dashboard/')) {
            return 'dashboard-pages';
          }

          if (id.includes('node_modules')) {
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react-router/') ||
              id.includes('/node_modules/react-router-dom/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }

            if (
              id.includes('/node_modules/@tanstack/') ||
              id.includes('/node_modules/axios/') ||
              id.includes('/node_modules/zod/')
            ) {
              return 'vendor-data';
            }

            if (
              id.includes('/node_modules/framer-motion/') ||
              id.includes('/node_modules/@heroicons/')
            ) {
              return 'vendor-ui';
            }

            return 'vendor-misc';
          }

          return undefined;
        },
      },
    },
  },
});
