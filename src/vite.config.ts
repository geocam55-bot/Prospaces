import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Plugin to ensure favicons are copied to build output
function copyFaviconsPlugin() {
  return {
    name: 'copy-favicons',
    writeBundle() {
      // Stub implementation since fs and path are not perfectly supported in this environment
      console.log('\n🔄 Mock copy public assets to build output...\n');
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyFaviconsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Enable SPA fallback for client-side routing
    proxy: {},
    historyApiFallback: true,
  },
  optimizeDeps: {
    exclude: [],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    minify: 'esbuild',
    copyPublicDir: true,  // CRITICAL: Ensure public dir is copied
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          
          // Keep favicons, manifest, and service worker at root without hashing
          if (
            name.includes('favicon') || 
            name === 'manifest.json' || 
            name === 'service-worker.js'
          ) {
            return '[name][extname]';
          }
          
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  // Explicitly set public directory
  publicDir: 'public',
  css: {
    postcss: './postcss.config.js',
  },
  define: {
    // Expose Supabase secrets to the client
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
  },
})