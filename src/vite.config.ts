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
      const outDir = path.resolve(__dirname, 'build');
      
      // List of favicon files to copy
      const faviconFiles = [
        'favicon.ico',
        'favicon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'manifest.json',
        'service-worker.js',
        'favicon-debug.html',
        '_headers'
      ];
      
      console.log('\n🔄 Copying public assets to build output...\n');
      
      faviconFiles.forEach(file => {
        const src = path.join(publicDir, file);
        const dest = path.join(outDir, file);
        
        try {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`✅ Copied: ${file}`);
          } else {
            console.warn(`⚠️  Missing: ${file}`);
          }
        } catch (error) {
          console.error(`❌ Error copying ${file}:`, error);
        }
      });
      
      console.log('\n✅ Public assets copy complete!\n');
      
      // List final build directory contents
      console.log('📂 Build directory contents:');
      try {
        const buildFiles = fs.readdirSync(outDir);
        buildFiles.forEach(file => {
          if (file.includes('favicon') || file === 'manifest.json' || file === 'service-worker.js') {
            const stats = fs.statSync(path.join(outDir, file));
            console.log(`   📄 ${file} (${stats.size} bytes)`);
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
})