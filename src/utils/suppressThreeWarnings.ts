/**
 * Suppress Three.js "Multiple instances" warnings
 * This file should be imported FIRST before any other Three.js imports
 */

// Store original console methods
const originalWarn = console.warn;
const originalError = console.error;

// Override console.warn to filter out Three.js multiple instance warnings
console.warn = function(...args: any[]) {
  const message = String(args[0] || '');
  
  // Filter out Three.js multiple instance warnings
  if (
    message.toLowerCase().includes('multiple instances of three') ||
    message.includes('THREE.WebGLRenderer')
  ) {
    return; // Suppress
  }
  
  // Pass through all other warnings
  return originalWarn.apply(console, args);
};

// Override console.error to filter out Three.js multiple instance errors
console.error = function(...args: any[]) {
  const message = String(args[0] || '');
  
  // Filter out Three.js multiple instance errors
  if (
    message.toLowerCase().includes('multiple instances of three') ||
    message.includes('THREE.WebGLRenderer')
  ) {
    return; // Suppress
  }
  
  // Pass through all other errors
  return originalError.apply(console, args);
};

// Also patch window.console in case it's used directly
if (typeof window !== 'undefined') {
  const windowWarn = window.console.warn;
  const windowError = window.console.error;
  
  window.console.warn = function(...args: any[]) {
    const message = String(args[0] || '');
    if (
      message.toLowerCase().includes('multiple instances of three') ||
      message.includes('THREE.WebGLRenderer')
    ) {
      return;
    }
    return windowWarn.apply(window.console, args);
  };
  
  window.console.error = function(...args: any[]) {
    const message = String(args[0] || '');
    if (
      message.toLowerCase().includes('multiple instances of three') ||
      message.includes('THREE.WebGLRenderer')
    ) {
      return;
    }
    return windowError.apply(window.console, args);
  };
}

export {}; // Make this a module
