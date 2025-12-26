import React, { useEffect, useRef } from 'react';
import { ShedConfig } from '../../types/shed';

interface ShedCanvasProps {
  config: ShedConfig;
}

export function ShedCanvas({ config }: ShedCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up scaling
    const padding = 60;
    const maxWidth = canvas.width - padding * 2;
    const maxHeight = canvas.height - padding * 2 - 100;
    
    const scale = Math.min(
      maxWidth / config.width,
      (maxHeight * 0.6) / config.length
    );

    // Draw floor plan
    drawFloorPlan(ctx, config, padding, padding, scale);
    
    // Draw front elevation
    const elevationY = padding + config.length * scale + 80;
    drawFrontElevation(ctx, config, padding, elevationY, scale);
  }, [config]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={900}
        className="w-full border border-slate-200 rounded-lg bg-white"
      />
    </div>
  );
}

function drawFloorPlan(
  ctx: CanvasRenderingContext2D,
  config: ShedConfig,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const { width, length, doorType, doorWidth, windows } = config;
  
  // Title
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px system-ui';
  ctx.fillText('Floor Plan (Top View)', offsetX, offsetY - 30);
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`${width}' × ${length}'`, offsetX, offsetY - 10);

  // Wall outline
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.strokeRect(offsetX, offsetY, width * scale, length * scale);

  // Draw door
  ctx.fillStyle = '#10b981';
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 2;
  
  const doorWidthScaled = doorWidth * scale;
  const doorX = offsetX + (width * scale - doorWidthScaled) / 2;
  const doorThickness = 6;
  
  if (doorType === 'single') {
    // Single door with swing arc
    ctx.fillRect(doorX, offsetY - doorThickness / 2, doorWidthScaled, doorThickness);
    ctx.strokeRect(doorX, offsetY - doorThickness / 2, doorWidthScaled, doorThickness);
    
    ctx.beginPath();
    ctx.arc(doorX, offsetY, doorWidthScaled, -Math.PI / 2, 0);
    ctx.stroke();
  } else if (doorType === 'double') {
    // Double doors
    ctx.fillRect(doorX, offsetY - doorThickness / 2, doorWidthScaled, doorThickness);
    ctx.strokeRect(doorX, offsetY - doorThickness / 2, doorWidthScaled, doorThickness);
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(doorX + doorWidthScaled / 2, offsetY - doorThickness / 2);
    ctx.lineTo(doorX + doorWidthScaled / 2, offsetY + doorThickness / 2);
    ctx.stroke();
    
    // Swing arcs
    ctx.beginPath();
    ctx.arc(doorX, offsetY, doorWidthScaled / 2, -Math.PI / 2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(doorX + doorWidthScaled, offsetY, doorWidthScaled / 2, Math.PI, -Math.PI / 2);
    ctx.stroke();
  } else {
    // Sliding barn door
    ctx.fillRect(doorX, offsetY - doorThickness / 2, doorWidthScaled, doorThickness);
    ctx.strokeRect(doorX, offsetY - doorThickness / 2, doorWidthScaled, doorThickness);
    
    // Track indication
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(doorX - 10, offsetY - 15);
    ctx.lineTo(doorX + doorWidthScaled + 10, offsetY - 15);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // Door label
  ctx.fillStyle = '#059669';
  ctx.font = '11px system-ui';
  const doorLabel = doorType === 'sliding-barn' ? 'Barn Door' : doorType === 'double' ? 'Double Door' : 'Door';
  ctx.fillText(doorLabel, doorX + doorWidthScaled / 2 - 20, offsetY - 18);

  // Draw windows
  ctx.strokeStyle = '#06b6d4';
  ctx.fillStyle = '#e0f2fe';
  ctx.lineWidth = 2;
  
  windows.forEach((window, index) => {
    const windowWidth = window.width * scale;
    const windowHeight = window.height * scale;
    
    let windowX = 0;
    let windowY = 0;
    
    switch (window.position) {
      case 'left':
        windowX = offsetX - 3;
        windowY = offsetY + (window.offsetFromLeft || length / 2) * scale;
        ctx.fillRect(windowX, windowY, 6, windowHeight);
        ctx.strokeRect(windowX, windowY, 6, windowHeight);
        break;
      case 'right':
        windowX = offsetX + width * scale - 3;
        windowY = offsetY + (window.offsetFromLeft || length / 2) * scale;
        ctx.fillRect(windowX, windowY, 6, windowHeight);
        ctx.strokeRect(windowX, windowY, 6, windowHeight);
        break;
      case 'back':
        windowX = offsetX + (window.offsetFromLeft || width / 2) * scale;
        windowY = offsetY + length * scale - 3;
        ctx.fillRect(windowX, windowY, windowWidth, 6);
        ctx.strokeRect(windowX, windowY, windowWidth, 6);
        break;
    }
  });

  // Loft indication
  if (config.hasLoft) {
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    const loftDepth = length * 0.4;
    ctx.strokeRect(offsetX + 10, offsetY + 10, width * scale - 20, loftDepth * scale);
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.fillText('Loft Storage', offsetX + width * scale / 2 - 30, offsetY + 30);
  }

  // Dimensions
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui';
  
  // Width dimension
  const dimY = offsetY + length * scale + 25;
  ctx.beginPath();
  ctx.moveTo(offsetX, dimY);
  ctx.lineTo(offsetX + width * scale, dimY);
  ctx.stroke();
  
  drawArrow(ctx, offsetX, dimY, offsetX + 10, dimY);
  drawArrow(ctx, offsetX + width * scale, dimY, offsetX + width * scale - 10, dimY);
  ctx.fillText(`${width}'`, offsetX + width * scale / 2 - 10, dimY - 5);
  
  // Length dimension
  const dimX = offsetX + width * scale + 25;
  ctx.beginPath();
  ctx.moveTo(dimX, offsetY);
  ctx.lineTo(dimX, offsetY + length * scale);
  ctx.stroke();
  
  drawArrow(ctx, dimX, offsetY, dimX, offsetY + 10);
  drawArrow(ctx, dimX, offsetY + length * scale, dimX, offsetY + length * scale - 10);
  
  ctx.save();
  ctx.translate(dimX + 15, offsetY + length * scale / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${length}'`, -10, 0);
  ctx.restore();
}

function drawFrontElevation(
  ctx: CanvasRenderingContext2D,
  config: ShedConfig,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const { width, wallHeight, style, roofPitch, doorWidth, doorHeight, doorType, windows } = config;
  
  // Title
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px system-ui';
  ctx.fillText('Front Elevation', offsetX, offsetY - 15);

  // Calculate roof dimensions
  const wallHeightScaled = wallHeight * scale;
  const roofRun = (width / 2) * scale;
  const roofRise = (roofPitch / 12) * roofRun;
  const overhang = 12;

  // Draw walls
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.fillRect(offsetX, offsetY, width * scale, wallHeightScaled);
  ctx.strokeRect(offsetX, offsetY, width * scale, wallHeightScaled);

  // Draw roof based on style
  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#1e293b';
  
  switch (style) {
    case 'gable':
      ctx.beginPath();
      ctx.moveTo(offsetX - overhang, offsetY);
      ctx.lineTo(offsetX + width * scale / 2, offsetY - roofRise);
      ctx.lineTo(offsetX + width * scale + overhang, offsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
      
    case 'barn':
      // Gambrel roof
      const lowerPitch = roofRise * 0.4;
      const upperPitch = roofRise * 0.6;
      ctx.beginPath();
      ctx.moveTo(offsetX - overhang, offsetY);
      ctx.lineTo(offsetX + roofRun * 0.3, offsetY - lowerPitch);
      ctx.lineTo(offsetX + width * scale / 2, offsetY - roofRise);
      ctx.lineTo(offsetX + width * scale - roofRun * 0.3, offsetY - lowerPitch);
      ctx.lineTo(offsetX + width * scale + overhang, offsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
      
    case 'quaker':
      // Gable with overhang on front
      const quakerOverhang = 30;
      ctx.beginPath();
      ctx.moveTo(offsetX - overhang, offsetY);
      ctx.lineTo(offsetX + width * scale / 2, offsetY - roofRise);
      ctx.lineTo(offsetX + width * scale + overhang, offsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Front overhang
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(offsetX, offsetY - quakerOverhang);
      ctx.lineTo(offsetX + width * scale, offsetY - quakerOverhang);
      ctx.lineTo(offsetX + width * scale, offsetY);
      ctx.stroke();
      break;
      
    case 'lean-to':
      ctx.beginPath();
      ctx.moveTo(offsetX - overhang, offsetY);
      ctx.lineTo(offsetX + width * scale + overhang, offsetY - roofRise * 0.7);
      ctx.lineTo(offsetX + width * scale + overhang, offsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
      
    case 'saltbox':
      // Asymmetric roof
      ctx.beginPath();
      ctx.moveTo(offsetX - overhang, offsetY);
      ctx.lineTo(offsetX + width * scale * 0.4, offsetY - roofRise);
      ctx.lineTo(offsetX + width * scale + overhang, offsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
  }

  // Draw door
  ctx.fillStyle = '#d1fae5';
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 2;
  
  const doorWidthScaled = doorWidth * scale;
  const doorHeightScaled = doorHeight * scale;
  const doorX = offsetX + (width * scale - doorWidthScaled) / 2;
  const doorY = offsetY + wallHeightScaled - doorHeightScaled;
  
  ctx.fillRect(doorX, doorY, doorWidthScaled, doorHeightScaled);
  ctx.strokeRect(doorX, doorY, doorWidthScaled, doorHeightScaled);
  
  // Door details
  if (doorType === 'double') {
    ctx.beginPath();
    ctx.moveTo(doorX + doorWidthScaled / 2, doorY);
    ctx.lineTo(doorX + doorWidthScaled / 2, doorY + doorHeightScaled);
    ctx.stroke();
  }
  
  // Door panels
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const panelY = doorY + (doorHeightScaled / 3) * i;
    ctx.beginPath();
    ctx.moveTo(doorX, panelY);
    ctx.lineTo(doorX + doorWidthScaled, panelY);
    ctx.stroke();
  }

  // Draw windows
  ctx.fillStyle = '#e0f2fe';
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  
  windows.forEach((window) => {
    if (window.position === 'front') {
      const windowWidth = window.width * scale;
      const windowHeight = window.height * scale;
      const windowX = offsetX + (window.offsetFromLeft || width * 0.25) * scale;
      const windowY = offsetY + (window.offsetFromFloor || wallHeight * 0.4) * scale;
      
      ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
      ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
      
      // Window panes
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(windowX + windowWidth / 2, windowY);
      ctx.lineTo(windowX + windowWidth / 2, windowY + windowHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(windowX, windowY + windowHeight / 2);
      ctx.lineTo(windowX + windowWidth, windowY + windowHeight / 2);
      ctx.stroke();
      
      // Shutters
      if (config.hasShutters) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(windowX - 8, windowY, 6, windowHeight);
        ctx.fillRect(windowX + windowWidth + 2, windowY, 6, windowHeight);
      }
      
      // Flower box
      if (config.hasFlowerBox) {
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(windowX - 4, windowY + windowHeight, windowWidth + 8, 8);
      }
    }
  });

  // Trim details
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  
  // Corner trim
  ctx.beginPath();
  ctx.moveTo(offsetX, offsetY);
  ctx.lineTo(offsetX, offsetY + wallHeightScaled);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(offsetX + width * scale, offsetY);
  ctx.lineTo(offsetX + width * scale, offsetY + wallHeightScaled);
  ctx.stroke();

  // Wall height dimension
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui';
  
  const dimX = offsetX + width * scale + 25;
  ctx.beginPath();
  ctx.moveTo(dimX, offsetY + wallHeightScaled);
  ctx.lineTo(dimX, offsetY);
  ctx.stroke();
  
  drawArrow(ctx, dimX, offsetY + wallHeightScaled, dimX, offsetY + wallHeightScaled - 10);
  drawArrow(ctx, dimX, offsetY, dimX, offsetY + 10);
  
  ctx.save();
  ctx.translate(dimX + 15, offsetY + wallHeightScaled / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${wallHeight}' Wall`, -20, 0);
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  toX: number,
  toY: number
) {
  const headlen = 6;
  const angle = Math.atan2(toY - y, toX - x);
  
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}
