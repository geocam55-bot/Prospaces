import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  css: {
    postcss: './postcss.config.cjs',
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      // Exclude Capacitor mobile packages from web build
      external: [
        '@capacitor/core',
        '@capacitor/app',
        '@capacitor/browser',
        '@capacitor/keyboard',
        '@capacitor/preferences',
        '@capacitor/share',
        '@capacitor/splash-screen',
        '@capacitor/status-bar'
      ],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})