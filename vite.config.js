import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'pdfjs-dist', 'epubjs', 'mammoth'],
  },
  server: {
    port: 5173,
    // In development, proxy /api calls to your local serverless function
    // (or point to your deployed Vercel URL)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
