import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Plugin to ensure favicons are copied to build output
function copyFaviconsPlugin() {
  return {
    name: 'copy-favicons',
    closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const outDir = path.resolve(__dirname, 'build');
      
      // List of favicon files to copy
      const faviconFiles = [
        'favicon.ico',
        'favicon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'favicon-192x192.png',
        'favicon-512x512.png',
        'apple-touch-icon.png'
      ];
      
      console.log('🔄 Copying favicon files to build output...');
      
      faviconFiles.forEach(file => {
        const src = path.join(publicDir, file);
        const dest = path.join(outDir, file);
        
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`✅ Copied: ${file}`);
        } else {
          console.warn(`⚠️  Missing: ${file}`);
        }
      });
      
      console.log('✅ Favicon copy complete!');
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
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Don't hash service worker or manifest
          if (assetInfo.name === 'service-worker.js' || assetInfo.name === 'manifest.json') {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  // Explicitly include public assets
  publicDir: 'public',
  css: {
    postcss: './postcss.config.js',
  },
})