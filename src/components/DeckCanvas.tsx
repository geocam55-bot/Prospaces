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

    // Set canvas size
    const containerWidth = canvas.parentElement?.clientWidth || 800;
    canvas.width = containerWidth;
    canvas.height = Math.max(500, containerWidth * 0.75);

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scale to fit deck with padding
    const padding = 80;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;
    
    // Calculate total dimensions including L-shape
    let totalWidth = config.width;
    let totalLength = config.length;
    
    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      totalWidth = Math.max(config.width, config.lShapeWidth);
      totalLength = Math.max(config.length, config.lShapeLength);
    }
    
    const scaleX = availableWidth / totalWidth;
    const scaleY = availableHeight / totalLength;
    const scale = Math.min(scaleX, scaleY);

    // Center the deck
    const deckPixelWidth = config.width * scale;
    const deckPixelLength = config.length * scale;
    const offsetX = (canvas.width - totalWidth * scale) / 2;
    const offsetY = (canvas.height - totalLength * scale) / 2;

    // Draw grid background
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = scale; // 1 foot grid
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw deck outline
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    
    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      // Draw L-shaped deck
      const lShapePixelWidth = config.lShapeWidth * scale;
      const lShapePixelLength = config.lShapeLength * scale;
      
      ctx.beginPath();
      
      switch (config.lShapePosition) {
        case 'top-right':
          // Main rectangle (left side)
          ctx.rect(offsetX, offsetY, deckPixelWidth, deckPixelLength);
          // Extension (top right)
          ctx.rect(offsetX + deckPixelWidth, offsetY, lShapePixelWidth, lShapePixelLength);
          break;
        case 'bottom-right':
          // Main rectangle
          ctx.rect(offsetX, offsetY, deckPixelWidth, deckPixelLength);
          // Extension (bottom right)
          ctx.rect(offsetX + deckPixelWidth, offsetY + deckPixelLength - lShapePixelLength, lShapePixelWidth, lShapePixelLength);
          break;
        case 'bottom-left':
          // Main rectangle
          ctx.rect(offsetX, offsetY, deckPixelWidth, deckPixelLength);
          // Extension (bottom left)
          ctx.rect(offsetX - lShapePixelWidth, offsetY + deckPixelLength - lShapePixelLength, lShapePixelWidth, lShapePixelLength);
          break;
        case 'top-left':
        default:
          // Main rectangle (right side)
          ctx.rect(offsetX, offsetY, deckPixelWidth, deckPixelLength);
          // Extension (top left)
          ctx.rect(offsetX - lShapePixelWidth, offsetY, lShapePixelWidth, lShapePixelLength);
          break;
      }
      
      ctx.fill();
      ctx.stroke();
    } else {
      // Draw rectangular deck
      ctx.fillRect(offsetX, offsetY, deckPixelWidth, deckPixelLength);
      ctx.strokeRect(offsetX, offsetY, deckPixelWidth, deckPixelLength);
    }

    // Draw joists
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    const joistSpacingFeet = config.joistSpacing / 12;
    const numberOfJoists = Math.floor(config.width / joistSpacingFeet);
    
    for (let i = 0; i <= numberOfJoists; i++) {
      const x = offsetX + (i * joistSpacingFeet * scale);
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + deckPixelLength);
      ctx.stroke();
    }

    // Draw decking pattern indicator
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    if (config.deckingPattern === 'perpendicular') {
      // Draw horizontal lines
      const spacing = scale * 0.5; // 6 inch boards
      for (let y = offsetY; y < offsetY + deckPixelLength; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(offsetX + deckPixelWidth, y);
        ctx.stroke();
      }
    } else if (config.deckingPattern === 'parallel') {
      // Draw vertical lines
      const spacing = scale * 0.5;
      for (let x = offsetX; x < offsetX + deckPixelWidth; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, offsetY);
        ctx.lineTo(x, offsetY + deckPixelLength);
        ctx.stroke();
      }
    }
    
    ctx.setLineDash([]);

    // Draw stairs
    if (config.hasStairs) {
      const stairWidth = (config.stairWidth || 4) * scale;
      const stairDepth = 3 * scale; // 3 feet deep
      
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;

      let stairX = 0;
      let stairY = 0;

      switch (config.stairSide) {
        case 'front':
          stairX = offsetX + (deckPixelWidth - stairWidth) / 2;
          stairY = offsetY - stairDepth;
          ctx.fillRect(stairX, stairY, stairWidth, stairDepth);
          ctx.strokeRect(stairX, stairY, stairWidth, stairDepth);
          break;
        case 'back':
          stairX = offsetX + (deckPixelWidth - stairWidth) / 2;
          stairY = offsetY + deckPixelLength;
          ctx.fillRect(stairX, stairY, stairWidth, stairDepth);
          ctx.strokeRect(stairX, stairY, stairWidth, stairDepth);
          break;
        case 'left':
          stairX = offsetX - stairDepth;
          stairY = offsetY + (deckPixelLength - stairWidth) / 2;
          ctx.fillRect(stairX, stairY, stairDepth, stairWidth);
          ctx.strokeRect(stairX, stairY, stairDepth, stairWidth);
          break;
        case 'right':
          stairX = offsetX + deckPixelWidth;
          stairY = offsetY + (deckPixelLength - stairWidth) / 2;
          ctx.fillRect(stairX, stairY, stairDepth, stairWidth);
          ctx.strokeRect(stairX, stairY, stairDepth, stairWidth);
          break;
      }

      // Draw stair steps
      const numberOfSteps = Math.ceil(config.height / 0.58);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      
      if (config.stairSide === 'front' || config.stairSide === 'back') {
        const stepHeight = stairDepth / numberOfSteps;
        for (let i = 1; i < numberOfSteps; i++) {
          const y = config.stairSide === 'front' 
            ? stairY + (i * stepHeight)
            : stairY + (i * stepHeight);
          ctx.beginPath();
          ctx.moveTo(stairX, y);
          ctx.lineTo(stairX + stairWidth, y);
          ctx.stroke();
        }
      } else {
        const stepWidth = stairDepth / numberOfSteps;
        for (let i = 1; i < numberOfSteps; i++) {
          const x = config.stairSide === 'left'
            ? stairX + (i * stepWidth)
            : stairX + (i * stepWidth);
          ctx.beginPath();
          ctx.moveTo(x, stairY);
          ctx.lineTo(x, stairY + stairWidth);
          ctx.stroke();
        }
      }

      // Label stairs
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (config.stairSide === 'front' || config.stairSide === 'back') {
        ctx.fillText('STAIRS', stairX + stairWidth / 2, stairY + stairDepth / 2);
      } else {
        ctx.save();
        ctx.translate(stairX + stairDepth / 2, stairY + stairWidth / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('STAIRS', 0, 0);
        ctx.restore();
      }
    }

    // Draw railing indicators
    if (config.railingSides.length > 0) {
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 4;
      
      config.railingSides.forEach((side) => {
        ctx.beginPath();
        
        switch (side) {
          case 'front':
            if (config.hasStairs && config.stairSide === 'front') {
              const stairWidth = (config.stairWidth || 4) * scale;
              const leftEnd = offsetX + (deckPixelWidth - stairWidth) / 2;
              const rightStart = leftEnd + stairWidth;
              
              ctx.moveTo(offsetX, offsetY);
              ctx.lineTo(leftEnd, offsetY);
              ctx.moveTo(rightStart, offsetY);
              ctx.lineTo(offsetX + deckPixelWidth, offsetY);
            } else {
              ctx.moveTo(offsetX, offsetY);
              ctx.lineTo(offsetX + deckPixelWidth, offsetY);
            }
            break;
          case 'back':
            if (config.hasStairs && config.stairSide === 'back') {
              const stairWidth = (config.stairWidth || 4) * scale;
              const leftEnd = offsetX + (deckPixelWidth - stairWidth) / 2;
              const rightStart = leftEnd + stairWidth;
              
              ctx.moveTo(offsetX, offsetY + deckPixelLength);
              ctx.lineTo(leftEnd, offsetY + deckPixelLength);
              ctx.moveTo(rightStart, offsetY + deckPixelLength);
              ctx.lineTo(offsetX + deckPixelWidth, offsetY + deckPixelLength);
            } else {
              ctx.moveTo(offsetX, offsetY + deckPixelLength);
              ctx.lineTo(offsetX + deckPixelWidth, offsetY + deckPixelLength);
            }
            break;
          case 'left':
            if (config.hasStairs && config.stairSide === 'left') {
              const stairWidth = (config.stairWidth || 4) * scale;
              const topEnd = offsetY + (deckPixelLength - stairWidth) / 2;
              const bottomStart = topEnd + stairWidth;
              
              ctx.moveTo(offsetX, offsetY);
              ctx.lineTo(offsetX, topEnd);
              ctx.moveTo(offsetX, bottomStart);
              ctx.lineTo(offsetX, offsetY + deckPixelLength);
            } else {
              ctx.moveTo(offsetX, offsetY);
              ctx.lineTo(offsetX, offsetY + deckPixelLength);
            }
            break;
          case 'right':
            if (config.hasStairs && config.stairSide === 'right') {
              const stairWidth = (config.stairWidth || 4) * scale;
              const topEnd = offsetY + (deckPixelLength - stairWidth) / 2;
              const bottomStart = topEnd + stairWidth;
              
              ctx.moveTo(offsetX + deckPixelWidth, offsetY);
              ctx.lineTo(offsetX + deckPixelWidth, topEnd);
              ctx.moveTo(offsetX + deckPixelWidth, bottomStart);
              ctx.lineTo(offsetX + deckPixelWidth, offsetY + deckPixelLength);
            } else {
              ctx.moveTo(offsetX + deckPixelWidth, offsetY);
              ctx.lineTo(offsetX + deckPixelWidth, offsetY + deckPixelLength);
            }
            break;
        }
        
        ctx.stroke();
      });
    }

    // Draw dimension labels
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Width dimension (top)
    ctx.fillText(
      `${config.width}'`,
      offsetX + deckPixelWidth / 2,
      offsetY - 20
    );

    // Length dimension (right)
    ctx.save();
    ctx.translate(offsetX + deckPixelWidth + 30, offsetY + deckPixelLength / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${config.length}'`, 0, 0);
    ctx.restore();

    // Add compass rose
    const compassX = canvas.width - 60;
    const compassY = 60;
    const compassRadius = 30;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw N arrow
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - compassRadius);
    ctx.lineTo(compassX - 5, compassY - compassRadius + 10);
    ctx.lineTo(compassX + 5, compassY - compassRadius + 10);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('N', compassX, compassY - compassRadius - 10);

    // Add scale reference
    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`Scale: 1 sq = 1 ft`, 20, canvas.height - 20);

    // Add legend
    const legendX = 20;
    const legendY = 30;
    
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('Legend:', legendX, legendY);

    // Railing line
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 15);
    ctx.lineTo(legendX + 30, legendY + 15);
    ctx.stroke();
    
    ctx.fillStyle = '#475569';
    ctx.font = '11px system-ui';
    ctx.fillText('Railing', legendX + 35, legendY + 18);

    // Joist line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 30);
    ctx.lineTo(legendX + 30, legendY + 30);
    ctx.stroke();
    
    ctx.fillText('Joists', legendX + 35, legendY + 33);

  }, [config]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full border border-slate-300 rounded-lg bg-white"
      />
    </div>
  );
}