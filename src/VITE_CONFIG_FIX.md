# 🔧 Vite Config Import Fix

## The Issue

The error message shows:
```
Cannot find package '@vitejs/plugin-react-swc' imported from /vercel/path0/vite.config.ts
```

This means your `vite.config.ts` file **in GitHub** has the wrong plugin import.

---

## The Fix

Edit `vite.config.ts` in GitHub:

### Find Line 2:
```typescript
import react from '@vitejs/plugin-react-swc'
```

### Change it to:
```typescript
import react from '@vitejs/plugin-react'
```

---

## How to Apply (GitHub Web)

1. Go to your repository on github.com
2. Click on `vite.config.ts`
3. Click the pencil icon (✏️) to edit
4. Find line 2: `import react from '@vitejs/plugin-react-swc'`
5. Change `-swc` to just `@vitejs/plugin-react`
6. Commit the change

---

## Why This Works

- Your `package.json` has `@vitejs/plugin-react` (the standard plugin)
- NOT `@vitejs/plugin-react-swc` (the SWC variant)
- The config file must match what's installed in package.json
- This is just a one-word change: remove `-swc`

---

## Alternative: Full Correct vite.config.ts

If you want to be sure, here's the complete correct file:

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

## Summary

**Single change needed**: Line 2 of `vite.config.ts`
- Remove `-swc` from the import
- That's it!

After this fix, the build will succeed! 🚀
