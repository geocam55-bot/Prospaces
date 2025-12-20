import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: true,
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