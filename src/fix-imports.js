const fs = require('fs');
const path = require('path');

// Function to remove version numbers from imports
function fixImports(content) {
  // Pattern to match versioned imports
  const patterns = [
    { regex: /@radix-ui\/react-([a-z-]+)@[\d.]+/g, replacement: '@radix-ui/react-$1' },
    { regex: /lucide-react@[\d.]+/g, replacement: 'lucide-react' },
    { regex: /class-variance-authority@[\d.]+/g, replacement: 'class-variance-authority' },
    { regex: /react-day-picker@[\d.]+/g, replacement: 'react-day-picker' },
    { regex: /embla-carousel-react@[\d.]+/g, replacement: 'embla-carousel-react' },
    { regex: /recharts@[\d.]+/g, replacement: 'recharts' },
    { regex: /cmdk@[\d.]+/g, replacement: 'cmdk' },
    { regex: /vaul@[\d.]+/g, replacement: 'vaul' },
    { regex: /input-otp@[\d.]+/g, replacement: 'input-otp' },
    { regex: /react-resizable-panels@[\d.]+/g, replacement: 'react-resizable-panels' },
    { regex: /react-hook-form@[\d.]+/g, replacement: 'react-hook-form@7.55.0' }, // Keep this one versioned as per library requirements
  ];

  let result = content;
  for (const { regex, replacement } of patterns) {
    result = result.replace(regex, replacement);
  }
  
  return result;
}

// Function to process a directory recursively
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fixed = fixImports(content);
        
        if (content !== fixed) {
          fs.writeFileSync(filePath, fixed, 'utf8');
          console.log(`Fixed: ${filePath}`);
        }
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
      }
    }
  }
}

// Process the components directory
console.log('Fixing versioned imports...');
processDirectory('./components');
console.log('Done!');
