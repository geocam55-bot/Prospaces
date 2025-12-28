import React, { useRef, useEffect, useState } from 'react';
import { RoofConfig } from '../../types/roof';
import { formatRoofArea, getPitchDescription } from '../../utils/roofCalculations';

interface RoofCanvasProps {
  config: RoofConfig;
}

export function RoofCanvas({ config }: RoofCanvasProps) {
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

    const roofLength = config.length + (2 * config.rakeOverhang);
    const roofWidth = config.width + (2 * config.eaveOverhang);
    const maxDimension = Math.max(roofLength, roofWidth);
    const scale = Math.min((width - 2 * padding) / maxDimension, (height - 2 * padding) / maxDimension);

    const centerX = width / 2;
    const centerY = height / 2;
    const scaledLength = roofLength * scale;
    const scaledWidth = roofWidth * scale;

    // Draw building footprint (lighter)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      centerX - (config.length * scale) / 2,
      centerY - (config.width * scale) / 2,
      config.length * scale,
      config.width * scale
    );
    ctx.setLineDash([]);

    // Draw roof outline
    ctx.fillStyle = view3D ? '#94a3b8' : '#e2e8f0';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;

    const x1 = centerX - scaledLength / 2;
    const y1 = centerY - scaledWidth / 2;
    const x2 = centerX + scaledLength / 2;
    const y2 = centerY + scaledWidth / 2;

    // Draw based on roof style
    switch (config.style) {
      case 'gable':
        // Rectangle with ridge line
        ctx.fillRect(x1, y1, scaledLength, scaledWidth);
        ctx.strokeRect(x1, y1, scaledLength, scaledWidth);
        
        // Ridge line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, centerY);
        ctx.lineTo(x2, centerY);
        ctx.stroke();
        
        // Add shingle texture pattern
        drawShinglePattern(ctx, x1, y1, scaledLength, scaledWidth / 2, config.shingleType);
        drawShinglePattern(ctx, x1, centerY, scaledLength, scaledWidth / 2, config.shingleType);
        break;

      case 'hip':
        // Hip roof - octagonal shape
        const hipOffset = scaledWidth * 0.15;
        ctx.beginPath();
        ctx.moveTo(x1 + hipOffset, y1);
        ctx.lineTo(x2 - hipOffset, y1);
        ctx.lineTo(x2, y1 + hipOffset);
        ctx.lineTo(x2, y2 - hipOffset);
        ctx.lineTo(x2 - hipOffset, y2);
        ctx.lineTo(x1 + hipOffset, y2);
        ctx.lineTo(x1, y2 - hipOffset);
        ctx.lineTo(x1, y1 + hipOffset);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Hip lines
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1 + hipOffset, y1);
        ctx.lineTo(centerX, centerY);
        ctx.moveTo(x2 - hipOffset, y1);
        ctx.lineTo(centerX, centerY);
        ctx.moveTo(x1 + hipOffset, y2);
        ctx.lineTo(centerX, centerY);
        ctx.moveTo(x2 - hipOffset, y2);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();
        
        // Ridge
        ctx.beginPath();
        ctx.moveTo(x1 + hipOffset * 1.5, centerY);
        ctx.lineTo(x2 - hipOffset * 1.5, centerY);
        ctx.stroke();
        break;

      case 'gambrel':
      case 'mansard':
        // Similar to gable but with more complex ridge pattern
        ctx.fillRect(x1, y1, scaledLength, scaledWidth);
        ctx.strokeRect(x1, y1, scaledLength, scaledWidth);
        
        // Multiple ridge lines for gambrel/mansard
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        const offset = scaledWidth * 0.25;
        ctx.beginPath();
        ctx.moveTo(x1, y1 + offset);
        ctx.lineTo(x2, y1 + offset);
        ctx.moveTo(x1, centerY);
        ctx.lineTo(x2, centerY);
        ctx.moveTo(x1, y2 - offset);
        ctx.lineTo(x2, y2 - offset);
        ctx.stroke();
        break;

      case 'shed':
        // Simple rectangle
        ctx.fillRect(x1, y1, scaledLength, scaledWidth);
        ctx.strokeRect(x1, y1, scaledLength, scaledWidth);
        
        // Slope indication
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;

      case 'flat':
        ctx.fillRect(x1, y1, scaledLength, scaledWidth);
        ctx.strokeRect(x1, y1, scaledLength, scaledWidth);
        break;
    }

    // Draw valleys if present
    if (config.hasValleys && config.valleyCount) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      for (let i = 0; i < config.valleyCount; i++) {
        const valleyX = x1 + (scaledLength / (config.valleyCount + 1)) * (i + 1);
        ctx.beginPath();
        ctx.moveTo(valleyX, y1);
        ctx.lineTo(valleyX, y2);
        ctx.stroke();
      }
    }

    // Draw chimneys
    if (config.hasChimney && config.chimneyCount) {
      for (let i = 0; i < config.chimneyCount; i++) {
        const chimneyX = x1 + (scaledLength / (config.chimneyCount + 1)) * (i + 1);
        const chimneyY = centerY;
        drawChimney(ctx, chimneyX, chimneyY, scale * 2);
      }
    }

    // Draw skylights
    if (config.hasSkylight && config.skylightCount) {
      for (let i = 0; i < config.skylightCount; i++) {
        const skylightX = x1 + 30 + (i * 40);
        const skylightY = centerY - 20;
        drawSkylight(ctx, skylightX, skylightY, scale * 2);
      }
    }

    // Draw dimensions
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // Length dimension
    drawDimensionLine(ctx, x1, y2 + 30, x2, y2 + 30, `${roofLength.toFixed(1)}'`, 'horizontal');
    
    // Width dimension
    drawDimensionLine(ctx, x1 - 30, y1, x1 - 30, y2, `${roofWidth.toFixed(1)}'`, 'vertical');

    // Overhang annotations
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#059669';
    if (config.eaveOverhang > 0) {
      ctx.fillText(`${config.eaveOverhang}' overhang`, centerX, y1 - 10);
    }

    // Add compass rose
    drawCompassRose(ctx, x2 + 30, y1 + 30);

    // Legend
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    let legendY = y2 + 60;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(padding, legendY, 15, 3);
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Ridge', padding + 20, legendY + 5);
    
    if (config.hasValleys) {
      legendY += 20;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(padding, legendY, 15, 3);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Valley', padding + 20, legendY + 5);
    }
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

    const roofLength = config.length + (2 * config.rakeOverhang);
    const roofWidth = config.width + (2 * config.eaveOverhang);
    const [rise, run] = config.pitch.split('/').map(Number);
    const scale = Math.min((width - 2 * padding) / roofLength, (height - 2 * padding) / 20);

    const centerX = width / 2;
    const baseY = height - padding - 20;
    const scaledLength = roofLength * scale;
    const ridgeHeight = (roofWidth / 2) * (rise / run) * scale;

    // Draw building
    const buildingHeight = 10 * scale;
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - scaledLength / 2, baseY - buildingHeight, scaledLength, buildingHeight);
    ctx.strokeRect(centerX - scaledLength / 2, baseY - buildingHeight, scaledLength, buildingHeight);

    // Draw based on roof style
    switch (config.style) {
      case 'gable':
        // Triangle roof
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Add shingle texture
        drawShingleTextureElevation(ctx, centerX - scaledLength / 2, baseY - buildingHeight, scaledLength / 2, ridgeHeight, config.shingleType, 'left');
        drawShingleTextureElevation(ctx, centerX, baseY - buildingHeight, scaledLength / 2, ridgeHeight, config.shingleType, 'right');

        // Ridge vent
        if (config.style !== 'flat') {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(centerX - 10, baseY - buildingHeight - ridgeHeight);
          ctx.lineTo(centerX + 10, baseY - buildingHeight - ridgeHeight);
          ctx.stroke();
        }
        break;

      case 'hip':
        // Similar to gable but shorter ridge
        const hipRidge = scaledLength * 0.3;
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX - hipRidge / 2, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + hipRidge / 2, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'gambrel':
        // Barn style - two slopes
        const breakPoint = ridgeHeight * 0.6;
        const breakWidth = scaledLength * 0.3;
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX - breakWidth, baseY - buildingHeight - breakPoint);
        ctx.lineTo(centerX, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + breakWidth, baseY - buildingHeight - breakPoint);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'shed':
        // Single slope
        const shedSlope = ridgeHeight * 0.8;
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - shedSlope, shedSlope);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX - scaledLength / 2, baseY - buildingHeight - shedSlope);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'mansard':
        // French style
        const mansardLower = ridgeHeight * 0.5;
        const mansardUpper = ridgeHeight * 0.3;
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - mansardLower - mansardUpper, mansardLower);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX - scaledLength / 2 + 30, baseY - buildingHeight - mansardLower);
        ctx.lineTo(centerX - scaledLength / 4, baseY - buildingHeight - mansardLower - mansardUpper);
        ctx.lineTo(centerX + scaledLength / 4, baseY - buildingHeight - mansardLower - mansardUpper);
        ctx.lineTo(centerX + scaledLength / 2 - 30, baseY - buildingHeight - mansardLower);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'flat':
        // Flat with slight slope
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(centerX - scaledLength / 2, baseY - buildingHeight - 5, scaledLength, 5);
        ctx.strokeRect(centerX - scaledLength / 2, baseY - buildingHeight - 5, scaledLength, 5);
        break;
    }

    // Draw chimney if present
    if (config.hasChimney) {
      const chimneyX = centerX + scaledLength * 0.2;
      const chimneyTop = baseY - buildingHeight - ridgeHeight - 20;
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(chimneyX - 8, chimneyTop, 16, ridgeHeight + 40);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(chimneyX - 8, chimneyTop, 16, ridgeHeight + 40);
      
      // Chimney cap
      ctx.fillStyle = '#451a03';
      ctx.fillRect(chimneyX - 12, chimneyTop - 5, 24, 5);
      ctx.strokeRect(chimneyX - 12, chimneyTop - 5, 24, 5);
    }

    // Draw pitch angle indicator
    if (config.style !== 'flat') {
      const angle = Math.atan(rise / run) * (180 / Math.PI);
      const indicatorX = centerX + scaledLength / 4;
      const indicatorY = baseY - buildingHeight - ridgeHeight / 2;
      
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(centerX + scaledLength / 2, baseY - buildingHeight, ridgeHeight, -Math.PI, -Math.PI + Math.atan(rise / run), false);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${angle.toFixed(1)}°`, indicatorX, indicatorY);
    }

    // Dimension labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${roofLength.toFixed(1)}'`, centerX, baseY + 15);
    
    if (ridgeHeight > 0) {
      ctx.save();
      ctx.translate(centerX - scaledLength / 2 - 25, baseY - buildingHeight - ridgeHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${(ridgeHeight / scale).toFixed(1)}' rise`, 0, 0);
      ctx.restore();
    }
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

    const roofWidth = config.width + (2 * config.eaveOverhang);
    const [rise, run] = config.pitch.split('/').map(Number);
    const scale = Math.min((width - 2 * padding) / roofWidth, (height - 2 * padding) / 20);

    const centerX = width / 2;
    const baseY = height - padding - 20;
    const scaledWidth = roofWidth * scale;
    const ridgeHeight = (roofWidth / 2) * (rise / run) * scale;

    // Draw building
    const buildingHeight = 10 * scale;
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - scaledWidth / 2, baseY - buildingHeight, scaledWidth, buildingHeight);
    ctx.strokeRect(centerX - scaledWidth / 2, baseY - buildingHeight, scaledWidth, buildingHeight);

    // Draw roof based on style
    if (config.style === 'shed') {
      // Single slope
      ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight * 0.8, ridgeHeight * 0.8);
      ctx.beginPath();
      ctx.moveTo(centerX - scaledWidth / 2, baseY - buildingHeight);
      ctx.lineTo(centerX - scaledWidth / 2, baseY - buildingHeight - ridgeHeight * 0.8);
      ctx.lineTo(centerX + scaledWidth / 2, baseY - buildingHeight);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (config.style === 'flat') {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(centerX - scaledWidth / 2, baseY - buildingHeight - 5, scaledWidth, 5);
      ctx.strokeRect(centerX - scaledWidth / 2, baseY - buildingHeight - 5, scaledWidth, 5);
    } else {
      // Gable end view - triangle
      ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
      ctx.beginPath();
      ctx.moveTo(centerX - scaledWidth / 2, baseY - buildingHeight);
      ctx.lineTo(centerX, baseY - buildingHeight - ridgeHeight);
      ctx.lineTo(centerX + scaledWidth / 2, baseY - buildingHeight);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gable vent
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const ventSize = 15;
      ctx.fillRect(centerX - ventSize / 2, baseY - buildingHeight - ridgeHeight / 2 - ventSize / 2, ventSize, ventSize);
      ctx.strokeRect(centerX - ventSize / 2, baseY - buildingHeight - ridgeHeight / 2 - ventSize / 2, ventSize, ventSize);
      
      // Vent slats
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const slotY = baseY - buildingHeight - ridgeHeight / 2 - ventSize / 2 + (i * 4) + 2;
        ctx.moveTo(centerX - ventSize / 2 + 2, slotY);
        ctx.lineTo(centerX + ventSize / 2 - 2, slotY);
      }
      ctx.stroke();
    }

    // Overhang detail
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    
    // Eave overhang indicators
    const overhangScale = config.eaveOverhang * scale;
    ctx.beginPath();
    ctx.moveTo(centerX - scaledWidth / 2, baseY - buildingHeight);
    ctx.lineTo(centerX - scaledWidth / 2, baseY - buildingHeight + 15);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX - scaledWidth / 2 + overhangScale, baseY - buildingHeight);
    ctx.lineTo(centerX - scaledWidth / 2 + overhangScale, baseY - buildingHeight + 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dimension
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${roofWidth.toFixed(1)}'`, centerX, baseY + 15);
    
    if (config.eaveOverhang > 0) {
      ctx.fillStyle = '#059669';
      ctx.fillText(`${config.eaveOverhang}' overhang`, centerX - scaledWidth / 2 + overhangScale / 2, baseY - buildingHeight + 30);
    }
  };

  // Helper function to create roof gradient
  const createRoofGradient = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number) => {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    
    switch (config.shingleType) {
      case 'architectural':
        gradient.addColorStop(0, '#7f8ea3');
        gradient.addColorStop(0.2, '#64748b');
        gradient.addColorStop(0.6, '#475569');
        gradient.addColorStop(1, '#334155');
        break;
      case '3-tab':
        gradient.addColorStop(0, '#9c8d81');
        gradient.addColorStop(0.3, '#78716c');
        gradient.addColorStop(0.7, '#57534e');
        gradient.addColorStop(1, '#44403c');
        break;
      case 'designer':
        gradient.addColorStop(0, '#475569');
        gradient.addColorStop(0.3, '#334155');
        gradient.addColorStop(0.7, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        break;
      case 'metal':
        gradient.addColorStop(0, '#cbd5e1');
        gradient.addColorStop(0.25, '#94a3b8');
        gradient.addColorStop(0.5, '#cbd5e1');
        gradient.addColorStop(0.75, '#94a3b8');
        gradient.addColorStop(1, '#64748b');
        break;
      case 'cedar-shake':
        gradient.addColorStop(0, '#b45309');
        gradient.addColorStop(0.3, '#92400e');
        gradient.addColorStop(0.7, '#78350f');
        gradient.addColorStop(1, '#57270a');
        break;
      default:
        gradient.addColorStop(0, '#7f8ea3');
        gradient.addColorStop(0.3, '#64748b');
        gradient.addColorStop(0.7, '#475569');
        gradient.addColorStop(1, '#334155');
    }
    
    return gradient;
  };

  // Helper function to draw shingle pattern
  const drawShinglePattern = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: string) => {
    if (type === 'metal') {
      // Vertical metal panels with shadows
      const panelWidth = 20;
      for (let i = x; i < x + w; i += panelWidth) {
        // Panel highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(i, y);
        ctx.lineTo(i, y + h);
        ctx.stroke();
        
        // Panel shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i + panelWidth - 2, y);
        ctx.lineTo(i + panelWidth - 2, y + h);
        ctx.stroke();
      }
    } else if (type === 'cedar-shake') {
      // Cedar shake texture with variation
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      const rowHeight = 6;
      for (let row = y; row < y + h; row += rowHeight) {
        const offset = ((row - y) / rowHeight) % 2 === 0 ? 0 : rowHeight * 0.5;
        for (let i = x + offset; i < x + w; i += rowHeight * 2) {
          ctx.beginPath();
          ctx.moveTo(i, row);
          ctx.lineTo(i, row + rowHeight);
          ctx.stroke();
        }
      }
    } else {
      // Asphalt shingle rows with depth
      const rowHeight = 8;
      for (let i = y; i < y + h; i += rowHeight) {
        // Shadow line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, i);
        ctx.lineTo(x + w, i);
        ctx.stroke();
        
        // Highlight line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, i + 1);
        ctx.lineTo(x + w, i + 1);
        ctx.stroke();
      }
    }
  };

  // Helper function to draw shingle texture on elevation
  const drawShingleTextureElevation = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: string, side: 'left' | 'right') => {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    
    if (type === 'metal') {
      // Vertical ribbing
      const ribbingSpacing = 15;
      for (let i = 0; i < w; i += ribbingSpacing) {
        ctx.beginPath();
        if (side === 'left') {
          ctx.moveTo(x + i, y);
          ctx.lineTo(x + w, y - (h * i / w));
        } else {
          ctx.moveTo(x + i, y);
          ctx.lineTo(x, y - (h * i / w));
        }
        ctx.stroke();
      }
    } else {
      // Shingle courses
      const courseSpacing = 10;
      for (let i = 0; i < h; i += courseSpacing) {
        ctx.beginPath();
        if (side === 'left') {
          ctx.moveTo(x, y - i);
          ctx.lineTo(x + (w * (h - i) / h), y);
        } else {
          ctx.moveTo(x, y - i);
          ctx.lineTo(x + (w * i / h), y);
        }
        ctx.stroke();
      }
    }
  };

  // Helper function to draw chimney (top view)
  const drawChimney = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#7c2d12';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);
    
    // Add brick pattern
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.5;
    const brickHeight = size / 4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - size / 2, y - size / 2 + (i * brickHeight));
      ctx.lineTo(x + size / 2, y - size / 2 + (i * brickHeight));
      ctx.stroke();
    }
  };

  // Helper function to draw skylight (top view)
  const drawSkylight = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#bfdbfe';
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, size * 1.5, size);
    ctx.strokeRect(x, y, size * 1.5, size);
    
    // Glass reflection
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 2);
    ctx.lineTo(x + size * 0.7, y + 2);
    ctx.stroke();
  };

  // Helper function to draw dimension line
  const drawDimensionLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string, orientation: 'horizontal' | 'vertical') => {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    // Main line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // End caps
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
    
    // Text
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    if (orientation === 'horizontal') {
      ctx.fillText(text, (x1 + x2) / 2, y1 - 5);
    } else {
      ctx.save();
      ctx.translate(x1 + 15, (y1 + y2) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  };

  // Helper function to draw compass rose
  const drawCompassRose = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const size = 20;
    
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 1.5;
    
    // Circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
    
    // N arrow
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - 4, y - size + 10);
    ctx.lineTo(x + 4, y - size + 10);
    ctx.closePath();
    ctx.fill();
    
    // S, E, W
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
        <div className="flex items-center justify-between mb-4 print:mb-1">
          <h3 className="font-semibold text-slate-900 print:text-base">Top View (Plan)</h3>
          <button
            onClick={() => setView3D(!view3D)}
            className="text-sm px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 print:hidden"
          >
            {view3D ? '3D View' : '2D View'}
          </button>
        </div>
        <canvas
          ref={topViewRef}
          width={500}
          height={350}
          className="w-full bg-white rounded border border-slate-300 shadow-inner print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top"
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
        <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
          <div className="text-xs text-orange-700 font-medium">Total Roof Area</div>
          <div className="text-sm font-bold text-orange-900 mt-1">{formatRoofArea(config)}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 font-medium">Roof Pitch</div>
          <div className="text-sm font-bold text-purple-900 mt-1">{getPitchDescription(config.pitch)}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 font-medium">Roof Style</div>
          <div className="text-sm font-bold text-blue-900 mt-1 capitalize">{config.style.replace('-', ' ')}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 font-medium">Shingle Type</div>
          <div className="text-sm font-bold text-green-900 mt-1 capitalize">{config.shingleType.replace('-', ' ')}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 print:hidden">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Drawing Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-red-500"></div>
            <span className="text-slate-700">Ridge Line</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-blue-500"></div>
            <span className="text-slate-700">Valley</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-green-600 opacity-50" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-slate-700">Overhang</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-amber-500"></div>
            <span className="text-slate-700">Pitch Angle</span>
          </div>
        </div>
      </div>
    </div>
  );
}