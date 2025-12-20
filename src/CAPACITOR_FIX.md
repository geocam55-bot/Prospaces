# 🔧 Capacitor Mobile Packages Fix

## The Issue

Vite build failed with:
```
Rollup failed to resolve import "@capacitor/core" from "/vercel/path0/src/mobile-utils.ts"
```

Your codebase has mobile app support via Capacitor, but these packages aren't needed for the web build.

---

## The Fix

Add Capacitor packages to the `external` array in `vite.config.ts` so Rollup doesn't try to bundle them.

### Edit `vite.config.ts`

Find the `rollupOptions` section (around line 25) and add the `external` array:

```typescript
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
    // ... rest of config
  }
}
```

---

## Complete Updated vite.config.ts

Here's the full corrected file you can copy/paste:

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

---

## Why This Works

- Your app has `mobile-utils.ts` for iOS/Android support
- The web build doesn't need Capacitor packages
- Marking them as `external` tells Rollup to skip bundling them
- The mobile checks in your code (`isMobileApp()`) will return `false` on web
- Mobile features simply won't run in the browser (which is correct behavior)

---

## How to Apply (GitHub Web)

1. Go to your repository on github.com
2. Click on `vite.config.ts`
3. Click the pencil icon (✏️) to edit
4. **Replace the entire file** with the complete config above
5. Commit the change

---

## Summary

**Single file edit**: `vite.config.ts`
- Add `external` array to `rollupOptions`
- Lists all 8 Capacitor packages to exclude

After this fix, the build will skip mobile packages and complete successfully! 🚀
