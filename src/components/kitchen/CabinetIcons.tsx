import React from 'react';

// Base Cabinet - Isometric view
export function BaseCabinetIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back face */}
      <path d="M30 35 L60 20 L90 35 L60 50 Z" fill="#f8f9fa" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Left face */}
      <path d="M30 35 L30 85 L60 100 L60 50 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Right face */}
      <path d="M60 50 L60 100 L90 85 L90 35 Z" fill="#e5e7eb" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Door lines */}
      <line x1="30" y1="60" x2="60" y2="75" stroke="#1f2937" strokeWidth="1"/>
      <line x1="60" y1="75" x2="90" y2="60" stroke="#1f2937" strokeWidth="1"/>
      
      {/* Handle - left door */}
      <circle cx="40" cy="62" r="2" fill="#1f2937"/>
      <line x1="38" y1="62" x2="38" y2="68" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Handle - right door */}
      <circle cx="80" cy="62" r="2" fill="#1f2937"/>
      <line x1="82" y1="62" x2="82" y2="68" stroke="#1f2937" strokeWidth="1.5"/>
    </svg>
  );
}

// Wall Cabinet - Isometric view
export function WallCabinetIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back face */}
      <path d="M25 45 L60 30 L95 45 L60 60 Z" fill="#f8f9fa" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Left face */}
      <path d="M25 45 L25 80 L60 95 L60 60 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Right face */}
      <path d="M60 60 L60 95 L95 80 L95 45 Z" fill="#e5e7eb" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Door frame */}
      <path d="M30 52 L30 75 L55 87 L55 64 Z" stroke="#1f2937" strokeWidth="1"/>
      <path d="M65 64 L65 87 L90 75 L90 52 Z" stroke="#1f2937" strokeWidth="1"/>
      
      {/* Handles */}
      <circle cx="48" cy="67" r="1.5" fill="#1f2937"/>
      <circle cx="72" cy="67" r="1.5" fill="#1f2937"/>
    </svg>
  );
}

// Tall Cabinet - Isometric view
export function TallCabinetIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back face */}
      <path d="M35 25 L60 15 L85 25 L60 35 Z" fill="#f8f9fa" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Left face */}
      <path d="M35 25 L35 95 L60 105 L60 35 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Right face */}
      <path d="M60 35 L60 105 L85 95 L85 25 Z" fill="#e5e7eb" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Shelves/divisions */}
      <line x1="35" y1="50" x2="60" y2="60" stroke="#1f2937" strokeWidth="1"/>
      <line x1="60" y1="60" x2="85" y2="50" stroke="#1f2937" strokeWidth="1"/>
      <line x1="35" y1="70" x2="60" y2="80" stroke="#1f2937" strokeWidth="1"/>
      <line x1="60" y1="80" x2="85" y2="70" stroke="#1f2937" strokeWidth="1"/>
      
      {/* Handles */}
      <circle cx="42" cy="42" r="1.5" fill="#1f2937"/>
      <circle cx="42" cy="62" r="1.5" fill="#1f2937"/>
      <circle cx="42" cy="82" r="1.5" fill="#1f2937"/>
    </svg>
  );
}

// Corner Base Cabinet - Isometric view
export function CornerBaseCabinetIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* L-shaped corner cabinet */}
      {/* Back left */}
      <path d="M20 40 L40 30 L40 75 L20 85 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Back right */}
      <path d="M40 30 L80 45 L80 90 L40 75 Z" fill="#e5e7eb" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Front right */}
      <path d="M80 45 L100 35 L100 80 L80 90 Z" fill="#f8f9fa" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Corner detail */}
      <circle cx="40" cy="52" r="8" fill="none" stroke="#1f2937" strokeWidth="1"/>
      <circle cx="40" cy="52" r="3" fill="#1f2937"/>
    </svg>
  );
}

// Island Cabinet - Isometric view
export function IslandCabinetIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top surface */}
      <path d="M25 35 L60 20 L95 35 L60 50 Z" fill="#9ca3af" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Back face */}
      <path d="M60 50 L95 35 L95 70 L60 85 Z" fill="#e5e7eb" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Front face */}
      <path d="M25 35 L25 70 L60 85 L60 50 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Drawers */}
      <line x1="25" y1="55" x2="60" y2="70" stroke="#1f2937" strokeWidth="1"/>
      <line x1="25" y1="62" x2="60" y2="77" stroke="#1f2937" strokeWidth="1"/>
      
      {/* Handles */}
      <line x1="35" y1="57" x2="35" y2="60" stroke="#1f2937" strokeWidth="1.5"/>
      <line x1="35" y1="64" x2="35" y2="67" stroke="#1f2937" strokeWidth="1.5"/>
    </svg>
  );
}

// Refrigerator - Isometric view
export function RefrigeratorIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back face */}
      <path d="M35 20 L60 10 L85 20 L60 30 Z" fill="#f1f5f9" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Left face */}
      <path d="M35 20 L35 100 L60 110 L60 30 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Right face */}
      <path d="M60 30 L60 110 L85 100 L85 20 Z" fill="#e2e8f0" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Door split (freezer on top) */}
      <line x1="35" y1="45" x2="60" y2="55" stroke="#1f2937" strokeWidth="1.5"/>
      <line x1="60" y1="55" x2="85" y2="45" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Handles */}
      <rect x="38" y="35" width="2" height="8" fill="#64748b"/>
      <rect x="38" y="60" width="2" height="12" fill="#64748b"/>
    </svg>
  );
}

// Stove/Range - Isometric view
export function StoveIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top surface */}
      <path d="M30 40 L60 25 L90 40 L60 55 Z" fill="#1f2937" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Burners */}
      <circle cx="45" cy="35" r="4" fill="none" stroke="#64748b" strokeWidth="1"/>
      <circle cx="75" cy="35" r="4" fill="none" stroke="#64748b" strokeWidth="1"/>
      <circle cx="45" cy="45" r="4" fill="none" stroke="#64748b" strokeWidth="1"/>
      <circle cx="75" cy="45" r="4" fill="none" stroke="#64748b" strokeWidth="1"/>
      
      {/* Left face (oven) */}
      <path d="M30 40 L30 90 L60 105 L60 55 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Right face */}
      <path d="M60 55 L60 105 L90 90 L90 40 Z" fill="#e5e7eb" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Oven door window */}
      <rect x="35" y="65" width="20" height="15" fill="#94a3b8" stroke="#1f2937" strokeWidth="1"/>
      
      {/* Handle */}
      <line x1="35" y1="85" x2="55" y2="95" stroke="#64748b" strokeWidth="2"/>
    </svg>
  );
}

// Dishwasher - Isometric view
export function DishwasherIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back face */}
      <path d="M35 35 L60 25 L85 35 L60 45 Z" fill="#f1f5f9" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Left face */}
      <path d="M35 35 L35 90 L60 100 L60 45 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Right face */}
      <path d="M60 45 L60 100 L85 90 L85 35 Z" fill="#e2e8f0" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Control panel */}
      <rect x="38" y="48" width="18" height="3" fill="#64748b" stroke="#1f2937" strokeWidth="0.5"/>
      
      {/* Door handle */}
      <line x1="38" y1="85" x2="56" y2="95" stroke="#64748b" strokeWidth="2"/>
      
      {/* Button indicators */}
      <circle cx="42" cy="50" r="0.8" fill="#3b82f6"/>
      <circle cx="47" cy="50" r="0.8" fill="#10b981"/>
      <circle cx="52" cy="50" r="0.8" fill="#f59e0b"/>
    </svg>
  );
}

// Microwave - Isometric view
export function MicrowaveIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back face */}
      <path d="M25 45 L60 30 L95 45 L60 60 Z" fill="#f1f5f9" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Left face */}
      <path d="M25 45 L25 75 L60 90 L60 60 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Right face */}
      <path d="M60 60 L60 90 L95 75 L95 45 Z" fill="#e2e8f0" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Window */}
      <rect x="30" y="52" width="22" height="15" fill="#94a3b8" stroke="#1f2937" strokeWidth="1"/>
      <circle cx="41" cy="59" r="6" fill="none" stroke="#64748b" strokeWidth="0.5"/>
      
      {/* Control panel */}
      <rect x="54" y="52" width="4" height="15" fill="#64748b" stroke="#1f2937" strokeWidth="0.5"/>
      
      {/* Buttons */}
      <circle cx="56" cy="57" r="1" fill="#1f2937"/>
      <circle cx="56" cy="62" r="1" fill="#1f2937"/>
      
      {/* Handle */}
      <line x1="30" y1="68" x2="30" y2="72" stroke="#64748b" strokeWidth="1.5"/>
    </svg>
  );
}

// Sink - Isometric view
export function SinkIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Counter top */}
      <path d="M20 40 L60 25 L100 40 L60 55 Z" fill="#9ca3af" stroke="#1f2937" strokeWidth="1.5"/>
      
      {/* Sink basin */}
      <ellipse cx="60" cy="45" rx="18" ry="8" fill="#cbd5e1" stroke="#1f2937" strokeWidth="1.5"/>
      <path d="M42 45 L42 52 Q60 60 78 52 L78 45" fill="#e2e8f0" stroke="#1f2937" strokeWidth="1"/>
      
      {/* Faucet base */}
      <ellipse cx="60" cy="40" rx="3" ry="1.5" fill="#64748b" stroke="#1f2937" strokeWidth="0.5"/>
      
      {/* Faucet */}
      <path d="M60 40 L60 30 Q70 30 70 35" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Drain */}
      <circle cx="60" cy="50" r="2" fill="#94a3b8" stroke="#1f2937" strokeWidth="0.5"/>
    </svg>
  );
}
