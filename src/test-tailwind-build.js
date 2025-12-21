// Quick test to see what Tailwind is seeing
import tailwindConfig from './tailwind.config.js'

console.log('Tailwind config loaded:', JSON.stringify(tailwindConfig, null, 2))
console.log('Content paths:', tailwindConfig.content)
