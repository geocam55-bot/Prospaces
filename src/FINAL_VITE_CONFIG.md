# 🎯 Final Working vite.config.ts

## Copy This Entire File

Replace your entire `vite.config.ts` in GitHub with this:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
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
          charts: ['recharts'],
          icons: ['lucide-react'],
          motion: ['motion/react'],
          utils: ['date-fns', 'clsx'],
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  css: {
    postcss: './postcss.config.cjs',
  },
})
```

## What Changed

1. ✅ Line 2: Import from `@vitejs/plugin-react` (not `-swc`)
2. ✅ Line 26-35: Added `external` array for Capacitor packages

## How to Apply

1. Go to `vite.config.ts` in your GitHub repo
2. Click the pencil icon
3. **Select all** (Ctrl+A / Cmd+A)
4. **Paste** the code above
5. Commit

That's it! This is the complete working config. 🚀
