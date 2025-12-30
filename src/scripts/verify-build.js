#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.resolve(__dirname, '../build');

console.log('\n🔍 Verifying build output...\n');
console.log(`Build directory: ${buildDir}\n`);

const requiredFiles = [
  'index.html',
  'favicon.ico',
  'favicon.svg',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'favicon-192x192.png',
  'favicon-512x512.png',
  'apple-touch-icon.png',
  'manifest.json',
  'service-worker.js'
];

let allFilesPresent = true;

requiredFiles.forEach(file => {
  const filePath = path.join(buildDir, file);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file.padEnd(30)} (${stats.size.toLocaleString()} bytes)`);
  } else {
    console.log(`❌ ${file.padEnd(30)} MISSING!`);
    allFilesPresent = false;
  }
});

console.log('\n');

if (!allFilesPresent) {
  console.error('❌ Build verification FAILED! Some required files are missing.\n');
  process.exit(1);
} else {
  console.log('✅ Build verification PASSED! All required files are present.\n');
  
  // Also list all files in build directory for debugging
  console.log('📂 Complete build directory contents:\n');
  const allFiles = fs.readdirSync(buildDir);
  allFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      console.log(`   📄 ${file}`);
    } else if (stats.isDirectory()) {
      console.log(`   📁 ${file}/`);
    }
  });
  console.log('\n');
}
