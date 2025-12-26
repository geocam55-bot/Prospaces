import React, { useEffect, useRef } from 'react';
import { DeckConfig } from '../../types/deck';

interface DeckCanvasProps {
  config: DeckConfig;
}

export function DeckCanvas({ config }: DeckCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up scaling - account for L-shape dimensions
    const padding = 60;
    const maxWidth = canvas.width - padding * 2;
    const maxHeight = canvas.height - padding * 2 - 100; // Extra space for side elevation
    
    // Calculate total dimensions for L-shape
    let totalWidth = config.width;
    let totalLength = config.length;
    
    if (config.shape === 'l-shape') {
      const lWidth = config.lShapeWidth || 8;
      const lLength = config.lShapeLength || 10;
      
      // Calculate maximum dimensions based on L-shape position
      const pos = config.lShapePosition || 'top-left';
      if (pos === 'top-left' || pos === 'bottom-left') {
        totalWidth = config.width + lWidth;
        totalLength = Math.max(config.length, lLength);
      } else if (pos === 'top-right' || pos === 'bottom-right') {
        totalWidth = config.width + lWidth;
        totalLength = Math.max(config.length, lLength);
      }
    }
    
    const scale = Math.min(
      maxWidth / totalWidth,
      (maxHeight * 0.6) / totalLength
    );

    // Draw floor plan (top view)
    drawFloorPlan(ctx, config, padding, padding, scale);
    
    // Draw side elevation below floor plan
    const elevationY = padding + totalLength * scale + 80;
    drawSideElevation(ctx, config, padding, elevationY, scale);
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
  config: DeckConfig,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const { width, length, hasStairs, stairSide, railingSides } = config;
  
  // Title
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px system-ui';
  ctx.fillText('Floor Plan (Top View)', offsetX, offsetY - 30);
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#64748b';
  
  if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
    ctx.fillText(`${width}' × ${length}' + ${config.lShapeWidth}' × ${config.lShapeLength}' L-Extension`, offsetX, offsetY - 10);
  } else {
    ctx.fillText(`${width}' × ${length}'`, offsetX, offsetY - 10);
  }

  const deckPixelWidth = width * scale;
  const deckPixelLength = length * scale;

  // Adjust offset for L-shape left positioning
  let adjustedOffsetX = offsetX;
  let adjustedOffsetY = offsetY;
  
  if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
    const lShapePixelWidth = config.lShapeWidth * scale;
    const lShapePixelLength = config.lShapeLength * scale;
    const pos = config.lShapePosition || 'top-left';
    
    // Shift main deck to the right if extension is on the left
    if (pos === 'top-left' || pos === 'bottom-left') {
      adjustedOffsetX = offsetX + lShapePixelWidth;
    }
  }

  // Draw deck surface (handle L-shape)
  ctx.fillStyle = '#e0e7ff';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  
  console.log('[DeckCanvas] Drawing deck:', {
    shape: config.shape,
    lShapeWidth: config.lShapeWidth,
    lShapeLength: config.lShapeLength,
    lShapePosition: config.lShapePosition,
    isLShape: config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength,
    adjustedOffsetX,
    offsetX
  });
  
  if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
    // Draw L-shaped deck
    const lShapePixelWidth = config.lShapeWidth * scale;
    const lShapePixelLength = config.lShapeLength * scale;
    
    ctx.beginPath();
    
    // Main rectangle (always use adjusted offset)
    ctx.rect(adjustedOffsetX, adjustedOffsetY, deckPixelWidth, deckPixelLength);
    
    // Extension rectangle based on position
    switch (config.lShapePosition || 'top-left') {
      case 'top-right':
        ctx.rect(adjustedOffsetX + deckPixelWidth, adjustedOffsetY, lShapePixelWidth, lShapePixelLength);
        break;
      case 'bottom-right':
        ctx.rect(adjustedOffsetX + deckPixelWidth, adjustedOffsetY + deckPixelLength - lShapePixelLength, lShapePixelWidth, lShapePixelLength);
        break;
      case 'bottom-left':
        ctx.rect(adjustedOffsetX - lShapePixelWidth, adjustedOffsetY + deckPixelLength - lShapePixelLength, lShapePixelWidth, lShapePixelLength);
        break;
      case 'top-left':
      default:
        ctx.rect(adjustedOffsetX - lShapePixelWidth, adjustedOffsetY, lShapePixelWidth, lShapePixelLength);
        break;
    }
    
    ctx.fill();
    ctx.stroke();
  } else {
    // Draw rectangular deck
    ctx.fillRect(adjustedOffsetX, adjustedOffsetY, deckPixelWidth, deckPixelLength);
    ctx.strokeRect(adjustedOffsetX, adjustedOffsetY, deckPixelWidth, deckPixelLength);
  }

  // Draw joists (use adjusted offset)
  ctx.strokeStyle = '#c7d2fe';
  ctx.lineWidth = 2;
  const joistSpacingFeet = config.joistSpacing / 12;
  const numberOfJoists = Math.floor(width / joistSpacingFeet);
  
  for (let i = 0; i <= numberOfJoists; i++) {
    const x = adjustedOffsetX + (i * joistSpacingFeet * scale);
    ctx.beginPath();
    ctx.moveTo(x, adjustedOffsetY);
    ctx.lineTo(x, adjustedOffsetY + deckPixelLength);
    ctx.stroke();
  }

  // Draw decking pattern (use adjusted offset)
  ctx.strokeStyle = '#a5b4fc';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  
  if (config.deckingPattern === 'perpendicular') {
    const spacing = scale * 0.5;
    for (let y = adjustedOffsetY; y < adjustedOffsetY + deckPixelLength; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(adjustedOffsetX, y);
      ctx.lineTo(adjustedOffsetX + deckPixelWidth, y);
      ctx.stroke();
    }
  } else if (config.deckingPattern === 'parallel') {
    const spacing = scale * 0.5;
    for (let x = adjustedOffsetX; x < adjustedOffsetX + deckPixelWidth; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, adjustedOffsetY);
      ctx.lineTo(x, adjustedOffsetY + deckPixelLength);
      ctx.stroke();
    }
  }
  
  ctx.setLineDash([]);

  // Draw stairs (use adjusted offset)
  if (hasStairs) {
    const stairWidth = (config.stairWidth || 4) * scale;
    const stairDepth = 3 * scale;
    
    ctx.fillStyle = '#c7d2fe';
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 2;

    let stairX = 0;
    let stairY = 0;

    switch (stairSide) {
      case 'front':
        stairX = adjustedOffsetX + (deckPixelWidth - stairWidth) / 2;
        stairY = adjustedOffsetY - stairDepth;
        ctx.fillRect(stairX, stairY, stairWidth, stairDepth);
        ctx.strokeRect(stairX, stairY, stairWidth, stairDepth);
        
        // Draw steps
        const numSteps = Math.ceil(config.height / 0.58);
        for (let i = 1; i < numSteps; i++) {
          const y = stairY + (i * stairDepth / numSteps);
          ctx.beginPath();
          ctx.moveTo(stairX, y);
          ctx.lineTo(stairX + stairWidth, y);
          ctx.stroke();
        }
        
        ctx.fillStyle = '#4c1d95';
        ctx.font = '10px system-ui';
        ctx.fillText('Stairs', stairX + stairWidth / 2 - 15, stairY + stairDepth / 2);
        break;
      case 'back':
        stairX = adjustedOffsetX + (deckPixelWidth - stairWidth) / 2;
        stairY = adjustedOffsetY + deckPixelLength;
        ctx.fillRect(stairX, stairY, stairWidth, stairDepth);
        ctx.strokeRect(stairX, stairY, stairWidth, stairDepth);
        break;
      case 'left':
        stairX = adjustedOffsetX - stairDepth;
        stairY = adjustedOffsetY + (deckPixelLength - stairWidth) / 2;
        ctx.fillRect(stairX, stairY, stairDepth, stairWidth);
        ctx.strokeRect(stairX, stairY, stairDepth, stairWidth);
        break;
      case 'right':
        stairX = adjustedOffsetX + deckPixelWidth;
        stairY = adjustedOffsetY + (deckPixelLength - stairWidth) / 2;
        ctx.fillRect(stairX, stairY, stairDepth, stairWidth);
        ctx.strokeRect(stairX, stairY, stairDepth, stairWidth);
        break;
    }
  }

  // Draw railings (use adjusted offset)
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 4;
  
  railingSides.forEach((side) => {
    ctx.beginPath();
    
    switch (side) {
      case 'front':
        if (hasStairs && stairSide === 'front') {
          const stairWidth = (config.stairWidth || 4) * scale;
          const leftEnd = adjustedOffsetX + (deckPixelWidth - stairWidth) / 2;
          const rightStart = leftEnd + stairWidth;
          
          ctx.moveTo(adjustedOffsetX, adjustedOffsetY);
          ctx.lineTo(leftEnd, adjustedOffsetY);
          ctx.moveTo(rightStart, adjustedOffsetY);
          ctx.lineTo(adjustedOffsetX + deckPixelWidth, adjustedOffsetY);
        } else {
          ctx.moveTo(adjustedOffsetX, adjustedOffsetY);
          ctx.lineTo(adjustedOffsetX + deckPixelWidth, adjustedOffsetY);
        }
        break;
      case 'back':
        ctx.moveTo(adjustedOffsetX, adjustedOffsetY + deckPixelLength);
        ctx.lineTo(adjustedOffsetX + deckPixelWidth, adjustedOffsetY + deckPixelLength);
        break;
      case 'left':
        ctx.moveTo(adjustedOffsetX, adjustedOffsetY);
        ctx.lineTo(adjustedOffsetX, adjustedOffsetY + deckPixelLength);
        break;
      case 'right':
        ctx.moveTo(adjustedOffsetX + deckPixelWidth, adjustedOffsetY);
        ctx.lineTo(adjustedOffsetX + deckPixelWidth, adjustedOffsetY + deckPixelLength);
        break;
    }
    
    ctx.stroke();
  });

  // Dimensions (use adjusted offset)
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui';
  
  // Width dimension (bottom)
  const dimY = adjustedOffsetY + deckPixelLength + 25;
  ctx.beginPath();
  ctx.moveTo(adjustedOffsetX, dimY);
  ctx.lineTo(adjustedOffsetX + deckPixelWidth, dimY);
  ctx.stroke();
  
  drawArrow(ctx, adjustedOffsetX, dimY, adjustedOffsetX + 10, dimY);
  drawArrow(ctx, adjustedOffsetX + deckPixelWidth, dimY, adjustedOffsetX + deckPixelWidth - 10, dimY);
  ctx.fillText(`${width}'`, adjustedOffsetX + deckPixelWidth / 2 - 10, dimY - 5);
  
  // Length dimension (right side)
  const dimX = adjustedOffsetX + deckPixelWidth + 25;
  ctx.beginPath();
  ctx.moveTo(dimX, adjustedOffsetY);
  ctx.lineTo(dimX, adjustedOffsetY + deckPixelLength);
  ctx.stroke();
  
  drawArrow(ctx, dimX, adjustedOffsetY, dimX, adjustedOffsetY + 10);
  drawArrow(ctx, dimX, adjustedOffsetY + deckPixelLength, dimX, adjustedOffsetY + deckPixelLength - 10);
  
  ctx.save();
  ctx.translate(dimX + 15, adjustedOffsetY + deckPixelLength / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${length}'`, -10, 0);
  ctx.restore();
}

function drawSideElevation(
  ctx: CanvasRenderingContext2D,
  config: DeckConfig,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const { width, length, height, railingSides, hasStairs } = config;
  const railingHeight = (config.railingHeight || 42) / 12; // Convert to feet
  
  // Title
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px system-ui';
  ctx.fillText('Side Elevation', offsetX, offsetY - 15);

  const deckWidthScaled = width * scale;
  const deckHeightScaled = height * scale;
  const railingHeightScaled = railingHeight * scale;

  // Draw support posts
  ctx.fillStyle = '#8b5cf6';
  ctx.strokeStyle = '#4c1d95';
  ctx.lineWidth = 2;
  
  const numPosts = Math.ceil(width / 6) + 1; // Post every 6 feet
  for (let i = 0; i < numPosts; i++) {
    const postX = offsetX + (i * (deckWidthScaled / (numPosts - 1)));
    const postWidth = 8;
    ctx.fillRect(postX - postWidth / 2, offsetY, postWidth, deckHeightScaled);
    ctx.strokeRect(postX - postWidth / 2, offsetY, postWidth, deckHeightScaled);
  }

  // Draw deck surface
  ctx.fillStyle = '#e0e7ff';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  const deckThickness = 12;
  ctx.fillRect(offsetX, offsetY - deckThickness, deckWidthScaled, deckThickness);
  ctx.strokeRect(offsetX, offsetY - deckThickness, deckWidthScaled, deckThickness);

  // Draw railing posts
  if (railingSides.includes('front') || railingSides.includes('back')) {
    ctx.fillStyle = '#7c3aed';
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 2;
    
    const railingPostWidth = 6;
    const numRailingPosts = Math.ceil(width / 4) + 1; // Every 4 feet
    
    for (let i = 0; i < numRailingPosts; i++) {
      const postX = offsetX + (i * (deckWidthScaled / (numRailingPosts - 1)));
      ctx.fillRect(
        postX - railingPostWidth / 2,
        offsetY - deckThickness - railingHeightScaled,
        railingPostWidth,
        railingHeightScaled
      );
      ctx.strokeRect(
        postX - railingPostWidth / 2,
        offsetY - deckThickness - railingHeightScaled,
        railingPostWidth,
        railingHeightScaled
      );
    }
    
    // Top and bottom rails
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    
    // Top rail
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY - deckThickness - railingHeightScaled);
    ctx.lineTo(offsetX + deckWidthScaled, offsetY - deckThickness - railingHeightScaled);
    ctx.stroke();
    
    // Bottom rail
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY - deckThickness - railingHeightScaled / 2);
    ctx.lineTo(offsetX + deckWidthScaled, offsetY - deckThickness - railingHeightScaled / 2);
    ctx.stroke();
  }

  // Draw stairs if visible from side
  if (hasStairs && (config.stairSide === 'left' || config.stairSide === 'right')) {
    const stairWidth = (config.stairWidth || 4) * scale;
    const numSteps = Math.ceil(height / 0.58);
    const stepHeight = deckHeightScaled / numSteps;
    const stepDepth = 10;
    
    ctx.fillStyle = '#c7d2fe';
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 2;
    
    const stairStartX = config.stairSide === 'left' ? offsetX - 40 : offsetX + deckWidthScaled + 40;
    
    for (let i = 0; i < numSteps; i++) {
      const stepY = offsetY - (i + 1) * stepHeight;
      const stepX = config.stairSide === 'left' ? stairStartX - i * stepDepth : stairStartX + i * stepDepth;
      
      ctx.fillRect(stepX - 15, stepY, 30, stepHeight);
      ctx.strokeRect(stepX - 15, stepY, 30, stepHeight);
    }
  }

  // Ground line
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(offsetX - 30, offsetY + 10);
  ctx.lineTo(offsetX + deckWidthScaled + 30, offsetY + 10);
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.fillStyle = '#64748b';
  ctx.font = '10px system-ui';
  ctx.fillText('Ground Level', offsetX - 30, offsetY + 25);

  // Height dimension
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui';
  
  const dimX = offsetX + deckWidthScaled + 25;
  ctx.beginPath();
  ctx.moveTo(dimX, offsetY);
  ctx.lineTo(dimX, offsetY - deckHeightScaled);
  ctx.stroke();
  
  drawArrow(ctx, dimX, offsetY, dimX, offsetY - 10);
  drawArrow(ctx, dimX, offsetY - deckHeightScaled, dimX, offsetY - deckHeightScaled + 10);
  
  ctx.save();
  ctx.translate(dimX + 15, offsetY - deckHeightScaled / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${height}' Height`, -20, 0);
  ctx.restore();
  
  // Railing height dimension (if present)
  if (railingSides.includes('front') || railingSides.includes('back')) {
    const railDimX = offsetX - 25;
    ctx.beginPath();
    ctx.moveTo(railDimX, offsetY - deckThickness);
    ctx.lineTo(railDimX, offsetY - deckThickness - railingHeightScaled);
    ctx.stroke();
    
    drawArrow(ctx, railDimX, offsetY - deckThickness, railDimX, offsetY - deckThickness + 10);
    drawArrow(ctx, railDimX, offsetY - deckThickness - railingHeightScaled, railDimX, offsetY - deckThickness - railingHeightScaled - 10);
    
    ctx.fillStyle = '#7c3aed';
    ctx.save();
    ctx.translate(railDimX - 15, offsetY - deckThickness - railingHeightScaled / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${config.railingHeight || 42}" Rail`, -25, 0);
    ctx.restore();
  }
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