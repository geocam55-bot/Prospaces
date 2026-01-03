import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Plugin to ensure favicons are copied to build output
function copyFaviconsPlugin() {
  return {
    name: 'copy-favicons',
    writeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const outDir = path.resolve(__dirname, 'dist');
      
      // List of favicon files to copy
      const faviconFiles = [
        'favicon.ico',
        'favicon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'favicon-64x64.png',
        'favicon-128x128.png',
        'favicon-192x192.png',
        'favicon-512x512.png',
        'apple-touch-icon.png',
        'manifest.json',
        'service-worker.js',
        'favicon-debug.html',
        'test.html'
      ];
      
      console.log('\n🔄 Copying public assets to build output...\n');
      
      faviconFiles.forEach(file => {
        const src = path.join(publicDir, file);
        const dest = path.join(outDir, file);
        
        try {
          if (fs.existsSync(src)) {
            // Ensure we're copying a file, not a directory
            const stats = fs.statSync(src);
            if (stats.isFile()) {
              fs.copyFileSync(src, dest);
              console.log(`✅ Copied: ${file} (${stats.size} bytes)`);
            } else {
              console.warn(`⚠️  Skipping (not a file): ${file}`);
            }
          } else {
            console.warn(`⚠️  Missing: ${file}`);
          }
        } catch (error) {
          console.error(`❌ Error copying ${file}:`, error);
        }
      });
      
      console.log('\n✅ Public assets copy complete!\n');
      
      // Create _redirects file for Vercel SPA routing
      const redirectsContent = `/*    /index.html   200`;
      fs.writeFileSync(path.join(outDir, '_redirects'), redirectsContent);
      console.log(`✅ Created: _redirects`);
      
      // List final build directory contents
      console.log('📂 Build directory contents:');
      try {
        const buildFiles = fs.readdirSync(outDir);
        buildFiles.forEach(file => {
          if (file.includes('favicon') || file === 'manifest.json' || file === 'service-worker.js') {
            const filePath = path.join(outDir, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
              console.log(`   📄 ${file} (${stats.size} bytes)`);
            }
          }
        });
      } catch (error) {
        console.error('Error listing build directory:', error);
      }
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
    dedupe: ['three'], // Ensure only one instance of Three.js
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['three'], // Pre-bundle Three.js for better performance
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
        manualChunks: {
          // Force Three.js into its own chunk
          'three': ['three'],
        }
      },
    },
  },
  // Explicitly set public directory
  publicDir: 'public',
  css: {
    postcss: './postcss.config.js',
  },
})