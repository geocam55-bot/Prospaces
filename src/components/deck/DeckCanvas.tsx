import React, { useRef, useEffect, useState } from 'react';
import { DeckConfig } from '../../types/deck';

interface DeckCanvasProps {
  config: DeckConfig;
}

export function DeckCanvas({ config }: DeckCanvasProps) {
  const topViewRef = useRef<HTMLCanvasElement>(null);
  const frontViewRef = useRef<HTMLCanvasElement>(null);
  const sideViewRef = useRef<HTMLCanvasElement>(null);
  const [view3D, setView3D] = useState(true);

  useEffect(() => {
    drawTopView();
    drawFrontElevation();
    drawSideElevation();
  }, [config, view3D]);

  const drawTopView = () => {
    const canvas = topViewRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    // Calculate total dimensions for L-shape
    let totalWidth = config.width;
    let totalLength = config.length;
    
    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      const lWidth = config.lShapeWidth;
      const lLength = config.lShapeLength;
      totalWidth = config.width + lWidth;
      totalLength = Math.max(config.length, lLength);
    }

    const scale = Math.min((width - 2 * padding) / totalWidth, (height - 2 * padding) / totalLength);

    const centerX = width / 2;
    const centerY = height / 2;
    const scaledWidth = config.width * scale;
    const scaledLength = config.length * scale;

    // Adjust offset for L-shape
    let baseX = centerX - scaledWidth / 2;
    let baseY = centerY - scaledLength / 2;

    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      const lShapePixelWidth = config.lShapeWidth * scale;
      const pos = config.lShapePosition || 'top-left';
      
      if (pos === 'top-left' || pos === 'bottom-left') {
        baseX = centerX - scaledWidth / 2;
      }
    }

    // Draw deck surface with wood grain
    ctx.fillStyle = view3D ? createWoodGradient(ctx, baseX, baseY, scaledWidth, scaledLength) : '#e0e7ff';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;

    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      const lShapePixelWidth = config.lShapeWidth * scale;
      const lShapePixelLength = config.lShapeLength * scale;
      
      ctx.beginPath();
      ctx.rect(baseX, baseY, scaledWidth, scaledLength);
      
      switch (config.lShapePosition || 'top-left') {
        case 'top-right':
          ctx.rect(baseX + scaledWidth, baseY, lShapePixelWidth, lShapePixelLength);
          break;
        case 'bottom-right':
          ctx.rect(baseX + scaledWidth, baseY + scaledLength - lShapePixelLength, lShapePixelWidth, lShapePixelLength);
          break;
        case 'bottom-left':
          ctx.rect(baseX - lShapePixelWidth, baseY + scaledLength - lShapePixelLength, lShapePixelWidth, lShapePixelLength);
          break;
        case 'top-left':
        default:
          ctx.rect(baseX - lShapePixelWidth, baseY, lShapePixelWidth, lShapePixelLength);
          break;
      }
      
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(baseX, baseY, scaledWidth, scaledLength);
      ctx.strokeRect(baseX, baseY, scaledWidth, scaledLength);
    }

    // Draw decking pattern with texture
    ctx.strokeStyle = view3D ? 'rgba(139, 92, 56, 0.4)' : '#a5b4fc';
    ctx.lineWidth = 1.5;
    
    if (config.deckingPattern === 'perpendicular') {
      const spacing = scale * 0.15; // Represent individual deck boards
      for (let y = baseY; y < baseY + scaledLength; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(baseX, y);
        ctx.lineTo(baseX + scaledWidth, y);
        ctx.stroke();
        
        // Add board gaps
        if (view3D) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(139, 92, 56, 0.4)';
          ctx.lineWidth = 1.5;
        }
      }
    } else if (config.deckingPattern === 'parallel') {
      const spacing = scale * 0.15;
      for (let x = baseX; x < baseX + scaledWidth; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, baseY + scaledLength);
        ctx.stroke();
      }
    } else if (config.deckingPattern === 'diagonal') {
      // Draw diagonal decking pattern
      const spacing = scale * 0.2;
      for (let i = -scaledLength; i < scaledWidth + scaledLength; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(baseX + i, baseY);
        ctx.lineTo(baseX + i + scaledLength, baseY + scaledLength);
        ctx.stroke();
      }
    }

    // Draw joists underneath (lighter lines)
    ctx.strokeStyle = view3D ? 'rgba(139, 92, 56, 0.2)' : '#c7d2fe';
    ctx.lineWidth = 1;
    const joistSpacingFeet = config.joistSpacing / 12;
    const numberOfJoists = Math.floor(config.width / joistSpacingFeet);
    
    for (let i = 0; i <= numberOfJoists; i++) {
      const x = baseX + (i * joistSpacingFeet * scale);
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, baseY + scaledLength);
      ctx.stroke();
    }

    // Draw railings with detailed balusters
    if (config.railingSides && config.railingSides.length > 0) {
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 4;
      
      config.railingSides.forEach((side) => {
        ctx.beginPath();
        
        switch (side) {
          case 'front':
            if (config.hasStairs && config.stairSide === 'front') {
              const stairWidth = (config.stairWidth || 4) * scale;
              const leftEnd = baseX + (scaledWidth - stairWidth) / 2;
              const rightStart = leftEnd + stairWidth;
              
              ctx.moveTo(baseX, baseY);
              ctx.lineTo(leftEnd, baseY);
              ctx.moveTo(rightStart, baseY);
              ctx.lineTo(baseX + scaledWidth, baseY);
            } else {
              ctx.moveTo(baseX, baseY);
              ctx.lineTo(baseX + scaledWidth, baseY);
            }
            break;
          case 'back':
            ctx.moveTo(baseX, baseY + scaledLength);
            ctx.lineTo(baseX + scaledWidth, baseY + scaledLength);
            break;
          case 'left':
            ctx.moveTo(baseX, baseY);
            ctx.lineTo(baseX, baseY + scaledLength);
            break;
          case 'right':
            ctx.moveTo(baseX + scaledWidth, baseY);
            ctx.lineTo(baseX + scaledWidth, baseY + scaledLength);
            break;
        }
        
        ctx.stroke();

        // Draw baluster indicators
        if (view3D) {
          ctx.fillStyle = '#a78bfa';
          const balusterSpacing = scale * 0.4;
          
          switch (side) {
            case 'front':
              for (let x = baseX; x < baseX + scaledWidth; x += balusterSpacing) {
                ctx.fillRect(x - 1, baseY - 2, 2, 4);
              }
              break;
            case 'back':
              for (let x = baseX; x < baseX + scaledWidth; x += balusterSpacing) {
                ctx.fillRect(x - 1, baseY + scaledLength - 2, 2, 4);
              }
              break;
            case 'left':
              for (let y = baseY; y < baseY + scaledLength; y += balusterSpacing) {
                ctx.fillRect(baseX - 2, y - 1, 4, 2);
              }
              break;
            case 'right':
              for (let y = baseY; y < baseY + scaledLength; y += balusterSpacing) {
                ctx.fillRect(baseX + scaledWidth - 2, y - 1, 4, 2);
              }
              break;
          }
        }
      });
    }

    // Draw stairs with detailed treads
    if (config.hasStairs) {
      const stairWidth = (config.stairWidth || 4) * scale;
      const stairDepth = 4 * scale;
      const numSteps = Math.ceil(config.height / 0.58);
      
      ctx.fillStyle = view3D ? '#a78bfa' : '#c7d2fe';
      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 2;

      let stairX = 0;
      let stairY = 0;

      switch (config.stairSide) {
        case 'front':
          stairX = baseX + (scaledWidth - stairWidth) / 2;
          stairY = baseY - stairDepth;
          
          // Draw individual steps
          for (let i = 0; i < numSteps; i++) {
            const stepY = stairY + (i * stairDepth / numSteps);
            const stepDepth = stairDepth / numSteps;
            
            ctx.fillRect(stairX, stepY, stairWidth, stepDepth);
            ctx.strokeRect(stairX, stepY, stairWidth, stepDepth);
            
            // Tread line
            if (view3D && i > 0) {
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(stairX, stepY);
              ctx.lineTo(stairX + stairWidth, stepY);
              ctx.stroke();
              ctx.strokeStyle = '#4c1d95';
              ctx.lineWidth = 2;
            }
          }
          
          // Stair label
          ctx.fillStyle = '#4c1d95';
          ctx.font = 'bold 10px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`${numSteps} Steps`, stairX + stairWidth / 2, stairY + stairDepth / 2);
          break;
          
        case 'back':
          stairX = baseX + (scaledWidth - stairWidth) / 2;
          stairY = baseY + scaledLength;
          
          // Draw individual steps
          for (let i = 0; i < numSteps; i++) {
            const stepY = stairY + (i * stairDepth / numSteps);
            const stepDepth = stairDepth / numSteps;
            
            ctx.fillRect(stairX, stepY, stairWidth, stepDepth);
            ctx.strokeRect(stairX, stepY, stairWidth, stepDepth);
            
            // Tread line
            if (view3D && i > 0) {
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(stairX, stepY);
              ctx.lineTo(stairX + stairWidth, stepY);
              ctx.stroke();
              ctx.strokeStyle = '#4c1d95';
              ctx.lineWidth = 2;
            }
          }
          
          // Stair label
          ctx.fillStyle = '#4c1d95';
          ctx.font = 'bold 10px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`${numSteps} Steps`, stairX + stairWidth / 2, stairY + stairDepth / 2);
          break;
          
        case 'left':
          stairX = baseX - stairDepth;
          stairY = baseY + (scaledLength - stairWidth) / 2;
          
          // Draw individual steps (rotated for left side)
          for (let i = 0; i < numSteps; i++) {
            const stepX = stairX + (i * stairDepth / numSteps);
            const stepDepth = stairDepth / numSteps;
            
            ctx.fillRect(stepX, stairY, stepDepth, stairWidth);
            ctx.strokeRect(stepX, stairY, stepDepth, stairWidth);
            
            // Tread line
            if (view3D && i > 0) {
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(stepX, stairY);
              ctx.lineTo(stepX, stairY + stairWidth);
              ctx.stroke();
              ctx.strokeStyle = '#4c1d95';
              ctx.lineWidth = 2;
            }
          }
          
          // Stair label
          ctx.fillStyle = '#4c1d95';
          ctx.font = 'bold 10px system-ui';
          ctx.textAlign = 'center';
          ctx.save();
          ctx.translate(stairX + stairDepth / 2, stairY + stairWidth / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(`${numSteps} Steps`, 0, 0);
          ctx.restore();
          break;
          
        case 'right':
          stairX = baseX + scaledWidth;
          stairY = baseY + (scaledLength - stairWidth) / 2;
          
          // Draw individual steps (rotated for right side)
          for (let i = 0; i < numSteps; i++) {
            const stepX = stairX + (i * stairDepth / numSteps);
            const stepDepth = stairDepth / numSteps;
            
            ctx.fillRect(stepX, stairY, stepDepth, stairWidth);
            ctx.strokeRect(stepX, stairY, stepDepth, stairWidth);
            
            // Tread line
            if (view3D && i > 0) {
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(stepX, stairY);
              ctx.lineTo(stepX, stairY + stairWidth);
              ctx.stroke();
              ctx.strokeStyle = '#4c1d95';
              ctx.lineWidth = 2;
            }
          }
          
          // Stair label
          ctx.fillStyle = '#4c1d95';
          ctx.font = 'bold 10px system-ui';
          ctx.textAlign = 'center';
          ctx.save();
          ctx.translate(stairX + stairDepth / 2, stairY + stairWidth / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(`${numSteps} Steps`, 0, 0);
          ctx.restore();
          break;
      }
    }

    // Draw dimension lines
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    // Width dimension
    drawDimensionLine(ctx, baseX, baseY + scaledLength + 30, baseX + scaledWidth, baseY + scaledLength + 30, `${config.width}'`, 'horizontal');
    
    // Length dimension
    drawDimensionLine(ctx, baseX + scaledWidth + 30, baseY, baseX + scaledWidth + 30, baseY + scaledLength, `${config.length}'`, 'vertical');

    // Compass rose
    drawCompassRose(ctx, baseX + scaledWidth + 60, baseY + 30);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Top View (Plan)', padding, padding - 20);
    
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${config.width}' × ${config.length}' ${config.shape === 'l-shape' ? 'L-Shape' : 'Deck'}`, padding, padding - 5);
  };

  const drawFrontElevation = () => {
    const canvas = frontViewRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const scale = Math.min((width - 2 * padding) / config.width, (height - 2 * padding) / 15);

    const centerX = width / 2;
    const baseY = height - padding - 10;
    const scaledWidth = config.width * scale;
    const deckHeightScaled = config.height * scale;
    const railingHeight = ((config.railingHeight || 42) / 12) * scale;

    // Ground line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX - scaledWidth / 2 - 30, baseY + 10);
    ctx.lineTo(centerX + scaledWidth / 2 + 30, baseY + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Ground Level', centerX - scaledWidth / 2 - 30, baseY + 25);

    // Draw support posts with realistic detail
    const numPosts = Math.ceil(config.width / 6) + 1;
    
    for (let i = 0; i < numPosts; i++) {
      const postX = centerX - scaledWidth / 2 + (i * (scaledWidth / (numPosts - 1)));
      const postWidth = 12;
      
      // Post gradient for 3D effect
      const postGradient = ctx.createLinearGradient(postX - postWidth / 2, 0, postX + postWidth / 2, 0);
      postGradient.addColorStop(0, '#92400e');
      postGradient.addColorStop(0.5, '#b45309');
      postGradient.addColorStop(1, '#78350f');
      
      ctx.fillStyle = postGradient;
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      ctx.fillRect(postX - postWidth / 2, baseY - deckHeightScaled, postWidth, deckHeightScaled);
      ctx.strokeRect(postX - postWidth / 2, baseY - deckHeightScaled, postWidth, deckHeightScaled);
      
      // Wood grain effect
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 0.5;
      for (let g = 0; g < 4; g++) {
        const grainY = baseY - deckHeightScaled + (g * deckHeightScaled / 4);
        ctx.beginPath();
        ctx.moveTo(postX - postWidth / 2, grainY);
        ctx.lineTo(postX + postWidth / 2, grainY);
        ctx.stroke();
      }
    }

    // Draw deck surface with thickness
    const deckThickness = 16;
    const deckGradient = ctx.createLinearGradient(0, baseY - deckHeightScaled - deckThickness, 0, baseY - deckHeightScaled);
    deckGradient.addColorStop(0, '#c4b5a0');
    deckGradient.addColorStop(0.5, '#a89a85');
    deckGradient.addColorStop(1, '#8b7d6b');
    
    ctx.fillStyle = deckGradient;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.fillRect(centerX - scaledWidth / 2, baseY - deckHeightScaled - deckThickness, scaledWidth, deckThickness);
    ctx.strokeRect(centerX - scaledWidth / 2, baseY - deckHeightScaled - deckThickness, scaledWidth, deckThickness);

    // Deck board lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    const boardSpacing = scale * 0.15;
    for (let x = centerX - scaledWidth / 2; x < centerX + scaledWidth / 2; x += boardSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, baseY - deckHeightScaled - deckThickness);
      ctx.lineTo(x, baseY - deckHeightScaled);
      ctx.stroke();
    }

    // Draw railings with balusters
    if (config.railingSides && (config.railingSides.includes('front') || config.railingSides.includes('back'))) {
      const balusterWidth = 4;
      const balusterSpacing = scale * 0.4;
      const numBalusters = Math.floor(scaledWidth / balusterSpacing);
      
      // Balusters
      for (let i = 0; i <= numBalusters; i++) {
        const balusterX = centerX - scaledWidth / 2 + (i * balusterSpacing);
        
        const balusterGradient = ctx.createLinearGradient(balusterX - balusterWidth / 2, 0, balusterX + balusterWidth / 2, 0);
        balusterGradient.addColorStop(0, '#7c3aed');
        balusterGradient.addColorStop(0.5, '#9333ea');
        balusterGradient.addColorStop(1, '#6d28d9');
        
        ctx.fillStyle = balusterGradient;
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 1;
        ctx.fillRect(
          balusterX - balusterWidth / 2,
          baseY - deckHeightScaled - deckThickness - railingHeight,
          balusterWidth,
          railingHeight
        );
        ctx.strokeRect(
          balusterX - balusterWidth / 2,
          baseY - deckHeightScaled - deckThickness - railingHeight,
          balusterWidth,
          railingHeight
        );
      }
      
      // Top rail
      ctx.fillStyle = '#6d28d9';
      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 2;
      ctx.fillRect(
        centerX - scaledWidth / 2,
        baseY - deckHeightScaled - deckThickness - railingHeight - 6,
        scaledWidth,
        6
      );
      ctx.strokeRect(
        centerX - scaledWidth / 2,
        baseY - deckHeightScaled - deckThickness - railingHeight - 6,
        scaledWidth,
        6
      );
      
      // Bottom rail
      ctx.fillRect(
        centerX - scaledWidth / 2,
        baseY - deckHeightScaled - deckThickness - railingHeight / 2,
        scaledWidth,
        4
      );
      ctx.strokeRect(
        centerX - scaledWidth / 2,
        baseY - deckHeightScaled - deckThickness - railingHeight / 2,
        scaledWidth,
        4
      );
    }

    // Height dimension
    drawDimensionLine(ctx, centerX + scaledWidth / 2 + 25, baseY, centerX + scaledWidth / 2 + 25, baseY - deckHeightScaled, `${config.height}' Height`, 'vertical');

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Front Elevation', padding, 25);
  };

  const drawSideElevation = () => {
    const canvas = sideViewRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const scale = Math.min((width - 2 * padding) / config.length, (height - 2 * padding) / 15);

    const centerX = width / 2;
    const baseY = height - padding - 10;
    const scaledLength = config.length * scale;
    const deckHeightScaled = config.height * scale;
    const railingHeight = ((config.railingHeight || 42) / 12) * scale;

    // Ground line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX - scaledLength / 2 - 30, baseY + 10);
    ctx.lineTo(centerX + scaledLength / 2 + 30, baseY + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Support posts
    const numPosts = Math.ceil(config.length / 8) + 1;
    
    for (let i = 0; i < numPosts; i++) {
      const postX = centerX - scaledLength / 2 + (i * (scaledLength / (numPosts - 1)));
      const postWidth = 12;
      
      const postGradient = ctx.createLinearGradient(postX - postWidth / 2, 0, postX + postWidth / 2, 0);
      postGradient.addColorStop(0, '#92400e');
      postGradient.addColorStop(0.5, '#b45309');
      postGradient.addColorStop(1, '#78350f');
      
      ctx.fillStyle = postGradient;
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      ctx.fillRect(postX - postWidth / 2, baseY - deckHeightScaled, postWidth, deckHeightScaled);
      ctx.strokeRect(postX - postWidth / 2, baseY - deckHeightScaled, postWidth, deckHeightScaled);
    }

    // Deck surface
    const deckThickness = 16;
    ctx.fillStyle = '#a89a85';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.fillRect(centerX - scaledLength / 2, baseY - deckHeightScaled - deckThickness, scaledLength, deckThickness);
    ctx.strokeRect(centerX - scaledLength / 2, baseY - deckHeightScaled - deckThickness, scaledLength, deckThickness);

    // Railing end view
    if (config.railingSides && (config.railingSides.includes('left') || config.railingSides.includes('right'))) {
      ctx.fillStyle = '#7c3aed';
      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 2;
      
      // Railing post
      ctx.fillRect(
        centerX - scaledLength / 2 - 8,
        baseY - deckHeightScaled - deckThickness - railingHeight,
        8,
        railingHeight
      );
      ctx.strokeRect(
        centerX - scaledLength / 2 - 8,
        baseY - deckHeightScaled - deckThickness - railingHeight,
        8,
        railingHeight
      );
    }

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Side Elevation', padding, 25);
    
    // Length dimension
    drawDimensionLine(ctx, centerX - scaledLength / 2, baseY + 30, centerX + scaledLength / 2, baseY + 30, `${config.length}'`, 'horizontal');
  };

  // Helper functions
  const createWoodGradient = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    
    switch (config.deckingType) {
      case 'Composite':
        gradient.addColorStop(0, '#7c8a9f');
        gradient.addColorStop(0.3, '#94a3b8');
        gradient.addColorStop(0.6, '#64748b');
        gradient.addColorStop(1, '#52606f');
        break;
      case 'Cedar':
        gradient.addColorStop(0, '#e0b684');
        gradient.addColorStop(0.3, '#d4a574');
        gradient.addColorStop(0.6, '#b8956a');
        gradient.addColorStop(1, '#a0855e');
        break;
      case 'Redwood':
        gradient.addColorStop(0, '#d88f6a');
        gradient.addColorStop(0.3, '#c87f5a');
        gradient.addColorStop(0.6, '#a86f4f');
        gradient.addColorStop(1, '#8f5f45');
        break;
      default: // Treated
        gradient.addColorStop(0, '#d5c5b0');
        gradient.addColorStop(0.3, '#c4b5a0');
        gradient.addColorStop(0.6, '#a89a85');
        gradient.addColorStop(1, '#938870');
    }
    
    return gradient;
  };

  const addShadow = (ctx: CanvasRenderingContext2D, intensity: number = 0.3) => {
    ctx.shadowColor = `rgba(0, 0, 0, ${intensity})`;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
  };

  const clearShadow = (ctx: CanvasRenderingContext2D) => {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  const drawDimensionLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string, orientation: 'horizontal' | 'vertical') => {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    const capSize = 5;
    if (orientation === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(x1, y1 - capSize);
      ctx.lineTo(x1, y1 + capSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2 - capSize);
      ctx.lineTo(x2, y2 + capSize);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x1 - capSize, y1);
      ctx.lineTo(x1 + capSize, y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2 - capSize, y2);
      ctx.lineTo(x2 + capSize, y2);
      ctx.stroke();
    }
    
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    if (orientation === 'horizontal') {
      ctx.fillText(text, (x1 + x2) / 2, y1 - 8);
    } else {
      ctx.save();
      ctx.translate(x1 + 15, (y1 + y2) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  };

  const drawCompassRose = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const size = 20;
    
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - 4, y - size + 10);
    ctx.lineTo(x + 4, y - size + 10);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x, y - size - 10);
    ctx.fillText('S', x, y + size + 10);
    ctx.fillText('E', x + size + 10, y);
    ctx.fillText('W', x - size - 10, y);
  };

  return (
    <div className="space-y-6 print:space-y-2 print:break-before-page">
      {/* Main Top View */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-300 print:bg-white print:border-black print:p-2 print:rounded-none print:break-inside-avoid">
        <div className="mb-4 print:mb-1">
          <h3 className="font-semibold text-slate-900 print:text-base">Top View (Floor Plan)</h3>
        </div>
        <canvas
          ref={topViewRef}
          width={500}
          height={350}
          className="w-full bg-white rounded border border-purple-300 shadow-inner print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top"
        />
      </div>

      {/* Elevation Views */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 print:grid-cols-2 print:break-inside-avoid">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-300 print:bg-white print:border-black print:p-2 print:rounded-none print:break-inside-avoid">
          <h3 className="font-semibold text-slate-900 mb-3 print:mb-1 print:text-base">Front Elevation</h3>
          <canvas
            ref={frontViewRef}
            width={350}
            height={250}
            className="w-full bg-white rounded border border-blue-300 shadow-inner print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top"
          />
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-300 print:bg-white print:border-black print:p-2 print:rounded-none print:break-inside-avoid">
          <h3 className="font-semibold text-slate-900 mb-3 print:mb-1 print:text-base">Side Elevation</h3>
          <canvas
            ref={sideViewRef}
            width={350}
            height={250}
            className="w-full bg-white rounded border border-green-300 shadow-inner print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top"
          />
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 font-medium">Deck Size</div>
          <div className="text-sm font-bold text-purple-900 mt-1">{config.width}' × {config.length}'</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 font-medium">Height</div>
          <div className="text-sm font-bold text-blue-900 mt-1">{config.height}' from ground</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 font-medium">Decking Type</div>
          <div className="text-sm font-bold text-green-900 mt-1">{config.deckingType}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
          <div className="text-xs text-amber-700 font-medium">Pattern</div>
          <div className="text-sm font-bold text-amber-900 mt-1 capitalize">{config.deckingPattern}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 print:hidden mt-6">
        <h4 className="font-semibold text-slate-900 mb-3">Drawing Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-purple-600 rounded"></div>
            <span className="text-slate-700">Railing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-amber-800 rounded"></div>
            <span className="text-slate-700">Support Posts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-purple-400 rounded"></div>
            <span className="text-slate-700">Stairs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-slate-600"></div>
            <span className="text-slate-700">Dimension Lines</span>
          </div>
        </div>
      </div>
    </div>
  );
}