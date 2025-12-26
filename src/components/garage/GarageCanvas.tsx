import React, { useEffect, useRef } from 'react';
import { GarageConfig } from '../../types/garage';

interface GarageCanvasProps {
  config: GarageConfig;
}

export function GarageCanvas({ config }: GarageCanvasProps) {
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
    const maxHeight = canvas.height - padding * 2 - 100; // Extra space for front elevation
    
    const scale = Math.min(
      maxWidth / config.width,
      (maxHeight * 0.6) / config.length
    );

    // Draw floor plan
    drawFloorPlan(ctx, config, padding, padding, scale);
    
    // Draw front elevation below floor plan
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
  config: GarageConfig,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const { width, length, doors, windows, hasWalkDoor } = config;
  
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

  // Draw overhead doors (front wall)
  ctx.fillStyle = '#3b82f6';
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  
  doors.forEach((door, index) => {
    if (door.type === 'overhead' && door.position === 'front') {
      const doorX = offsetX + (door.offsetFromLeft || (index * width / doors.length)) * scale;
      const doorWidth = door.width * scale;
      const doorThickness = 6;
      
      // Door rectangle
      ctx.fillRect(doorX, offsetY - doorThickness / 2, doorWidth, doorThickness);
      ctx.strokeRect(doorX, offsetY - doorThickness / 2, doorWidth, doorThickness);
      
      // Door panel lines
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const lineX = doorX + (doorWidth / 4) * i;
        ctx.beginPath();
        ctx.moveTo(lineX, offsetY - doorThickness / 2);
        ctx.lineTo(lineX, offsetY + doorThickness / 2);
        ctx.stroke();
      }
      
      // Label
      ctx.fillStyle = '#1e40af';
      ctx.font = '11px system-ui';
      ctx.fillText(`${door.width}' × ${door.height}' OH`, doorX + 5, offsetY - 12);
    }
  });

  // Draw walk door
  if (hasWalkDoor) {
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = '#d1fae5';
    ctx.lineWidth = 2;
    
    const walkDoorX = offsetX + width * scale - 40;
    const walkDoorY = offsetY;
    const walkDoorWidth = 30;
    const walkDoorHeight = 6;
    
    ctx.fillRect(walkDoorX, walkDoorY - walkDoorHeight / 2, walkDoorWidth, walkDoorHeight);
    ctx.strokeRect(walkDoorX, walkDoorY - walkDoorHeight / 2, walkDoorWidth, walkDoorHeight);
    
    // Door swing arc
    ctx.beginPath();
    ctx.arc(walkDoorX, walkDoorY, walkDoorWidth, -Math.PI / 2, 0);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#059669';
    ctx.font = '10px system-ui';
    ctx.fillText(`3' Walk`, walkDoorX, walkDoorY - 10);
  }

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
        windowY = offsetY + (window.offsetFromLeft || 50) * scale;
        ctx.fillRect(windowX, windowY, 6, windowHeight);
        ctx.strokeRect(windowX, windowY, 6, windowHeight);
        break;
      case 'right':
        windowX = offsetX + width * scale - 3;
        windowY = offsetY + (window.offsetFromLeft || 50) * scale;
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

  // Dimensions
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui';
  
  // Width dimension (bottom)
  const dimY = offsetY + length * scale + 25;
  ctx.beginPath();
  ctx.moveTo(offsetX, dimY);
  ctx.lineTo(offsetX + width * scale, dimY);
  ctx.stroke();
  
  // Arrows
  drawArrow(ctx, offsetX, dimY, offsetX + 10, dimY);
  drawArrow(ctx, offsetX + width * scale, dimY, offsetX + width * scale - 10, dimY);
  
  ctx.fillText(`${width}'`, offsetX + width * scale / 2 - 10, dimY - 5);
  
  // Length dimension (right side)
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

  // Bay markers
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  
  for (let i = 1; i < config.bays; i++) {
    const bayX = offsetX + (width / config.bays) * i * scale;
    ctx.beginPath();
    ctx.moveTo(bayX, offsetY);
    ctx.lineTo(bayX, offsetY + length * scale);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawFrontElevation(
  ctx: CanvasRenderingContext2D,
  config: GarageConfig,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const { width, height, roofStyle, roofPitch, doors, windows } = config;
  
  // Title
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px system-ui';
  ctx.fillText('Front Elevation', offsetX, offsetY - 15);

  // Calculate roof dimensions
  const wallHeight = height * scale;
  const roofRun = (width / 2) * scale;
  const roofRise = (roofPitch / 12) * roofRun;
  const roofOverhang = 12; // pixels

  // Draw walls
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.fillRect(offsetX, offsetY, width * scale, wallHeight);
  ctx.strokeRect(offsetX, offsetY, width * scale, wallHeight);

  // Draw roof
  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#1e293b';
  
  switch (roofStyle) {
    case 'gable':
      ctx.beginPath();
      ctx.moveTo(offsetX - roofOverhang, offsetY);
      ctx.lineTo(offsetX + width * scale / 2, offsetY - roofRise);
      ctx.lineTo(offsetX + width * scale + roofOverhang, offsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
      
    case 'hip':
      ctx.beginPath();
      ctx.moveTo(offsetX - roofOverhang, offsetY);
      ctx.lineTo(offsetX + roofOverhang, offsetY - roofRise * 0.8);
      ctx.lineTo(offsetX + width * scale - roofOverhang, offsetY - roofRise * 0.8);
      ctx.lineTo(offsetX + width * scale + roofOverhang, offsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
      
    case 'gambrel':
      ctx.beginPath();
      ctx.moveTo(offsetX - roofOverhang, offsetY);
      ctx.lineTo(offsetX + roofRun * 0.3, offsetY - roofRise * 0.4);
      ctx.lineTo(offsetX + width * scale / 2 - roofRun * 0.2, offsetY - roofRise);
      ctx.lineTo(offsetX + width * scale / 2 + roofRun * 0.2, offsetY - roofRise);
      ctx.lineTo(offsetX + width * scale - roofRun * 0.3, offsetY - roofRise * 0.4);
      ctx.lineTo(offsetX + width * scale + roofOverhang, offsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
      
    case 'flat':
      ctx.fillRect(offsetX - roofOverhang, offsetY - 20, width * scale + roofOverhang * 2, 20);
      ctx.strokeRect(offsetX - roofOverhang, offsetY - 20, width * scale + roofOverhang * 2, 20);
      break;
  }

  // Draw overhead doors
  ctx.fillStyle = '#dbeafe';
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  
  doors.forEach((door, index) => {
    if (door.type === 'overhead' && door.position === 'front') {
      const doorX = offsetX + (door.offsetFromLeft || (index * width / doors.length)) * scale;
      const doorWidth = door.width * scale;
      const doorHeight = door.height * scale;
      const doorY = offsetY + wallHeight - doorHeight;
      
      // Door
      ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
      ctx.strokeRect(doorX, doorY, doorWidth, doorHeight);
      
      // Panels
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1;
      const numPanels = 4;
      for (let i = 1; i < numPanels; i++) {
        const panelY = doorY + (doorHeight / numPanels) * i;
        ctx.beginPath();
        ctx.moveTo(doorX, panelY);
        ctx.lineTo(doorX + doorWidth, panelY);
        ctx.stroke();
      }
      
      // Windows in door
      ctx.fillStyle = '#bfdbfe';
      const windowRowY = doorY + 15;
      for (let i = 0; i < 3; i++) {
        const windowX = doorX + (doorWidth / 4) * (i + 0.5) - 8;
        ctx.fillRect(windowX, windowRowY, 16, 12);
        ctx.strokeRect(windowX, windowRowY, 16, 12);
      }
    }
  });

  // Draw windows on walls
  ctx.fillStyle = '#e0f2fe';
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  
  windows.forEach((window) => {
    if (window.position === 'front') {
      const windowX = offsetX + (window.offsetFromLeft || width / 2) * scale;
      const windowWidth = window.width * scale;
      const windowHeight = window.height * scale;
      const windowY = offsetY + (window.offsetFromFloor || height - 6) * scale;
      
      ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
      ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
      
      // Cross panes
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
    }
  });

  // Height dimension
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui';
  
  const dimX = offsetX + width * scale + 25;
  ctx.beginPath();
  ctx.moveTo(dimX, offsetY + wallHeight);
  ctx.lineTo(dimX, offsetY);
  ctx.stroke();
  
  drawArrow(ctx, dimX, offsetY + wallHeight, dimX, offsetY + wallHeight - 10);
  drawArrow(ctx, dimX, offsetY, dimX, offsetY + 10);
  
  ctx.save();
  ctx.translate(dimX + 15, offsetY + wallHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${height}' Wall`, -20, 0);
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
