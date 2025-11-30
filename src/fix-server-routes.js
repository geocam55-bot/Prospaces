/**
 * Script to fix Supabase Edge Function routes
 * 
 * This script removes the `/make-server-8405be07` prefix from all routes
 * in the server function so it can be properly deployed.
 * 
 * Usage: Run this in Node.js environment
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'supabase', 'functions', 'server', 'index.tsx');

// Read the file
let content = fs.readFileSync(serverPath, 'utf8');

// Count occurrences before replacement
const beforeCount = (content.match(/app\.(get|post|put|delete)\('\/make-server-8405be07\//g) || []).length;

console.log(`Found ${beforeCount} routes with '/make-server-8405be07/' prefix`);

// Replace all occurrences of '/make-server-8405be07/' with '/' in route definitions
content = content.replace(/app\.(get|post|put|delete)\('\/make-server-8405be07\//g, (match, method) => {
  return `app.${method}('/`;
});

// Count occurrences after replacement
const afterCount = (content.match(/app\.(get|post|put|delete)\('\/make-server-8405be07\//g) || []).length;

console.log(`Routes remaining with prefix: ${afterCount}`);
console.log(`Fixed ${beforeCount - afterCount} routes`);

// Write the file back
fs.writeFileSync(serverPath, content, 'utf8');

console.log('\n✅ Server routes fixed successfully!');
console.log('\nNext steps:');
console.log('1. Deploy the function: supabase functions deploy make-server-8405be07');
console.log('2. Or rename and deploy: supabase functions deploy server');
console.log('   (If using "server", update API_URL in /utils/api.ts)');
