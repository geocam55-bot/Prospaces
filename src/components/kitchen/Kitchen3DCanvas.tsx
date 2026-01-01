import React, { useRef, useEffect } from 'react';
import { KitchenConfig } from '../../types/kitchen';

interface Kitchen3DCanvasProps {
  config: KitchenConfig;
}

export function Kitchen3DCanvas({ config }: Kitchen3DCanvasProps) {
  const topViewRef = useRef<HTMLCanvasElement>(null);
  const frontViewRef = useRef<HTMLCanvasElement>(null);
  const sideViewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawTopView();
    drawFrontView();
    drawSideView();
  }, [config]);

  const drawTopView = () => {
    const canvas = topViewRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const roomWidth = config.roomWidth * 12; // inches
    const roomLength = config.roomLength * 12; // inches

    // Calculate scale to fit canvas
    const scale = Math.min(
      (canvas.width - 2 * padding) / roomWidth,
      (canvas.height - 2 * padding) / roomLength
    );

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scaledWidth = roomWidth * scale;
    const scaledLength = roomLength * scale;
    const baseX = centerX - scaledWidth / 2;
    const baseY = centerY - scaledLength / 2;

    // Draw room outline
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(baseX, baseY, scaledWidth, scaledLength);

    // Fill with light floor color
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(baseX, baseY, scaledWidth, scaledLength);

    // Draw floor pattern
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const tileSize = 12 * scale; // 1 foot tiles
    for (let x = baseX; x <= baseX + scaledWidth; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, baseY + scaledLength);
      ctx.stroke();
    }
    for (let y = baseY; y <= baseY + scaledLength; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(baseX, y);
      ctx.lineTo(baseX + scaledWidth, y);
      ctx.stroke();
    }

    // Draw cabinets
    config.cabinets.forEach(cabinet => {
      const cabX = baseX + (cabinet.x / 100) * scaledWidth;
      const cabY = baseY + (cabinet.y / 100) * scaledLength;
      const cabWidth = cabinet.width * scale;
      const cabDepth = cabinet.depth * scale;

      // Apply rotation
      ctx.save();
      ctx.translate(cabX, cabY);
      ctx.rotate((cabinet.rotation * Math.PI) / 180);

      // Cabinet body with gradient
      const gradient = ctx.createLinearGradient(-cabWidth / 2, 0, cabWidth / 2, 0);
      gradient.addColorStop(0, '#e5e7eb');
      gradient.addColorStop(0.5, '#f9fafb');
      gradient.addColorStop(1, '#d1d5db');

      ctx.fillStyle = gradient;
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.fillRect(-cabWidth / 2, -cabDepth / 2, cabWidth, cabDepth);
      ctx.strokeRect(-cabWidth / 2, -cabDepth / 2, cabWidth, cabDepth);

      // Draw cabinet doors/drawers
      if (cabinet.hasDoors) {
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        const doorWidth = cabWidth / (cabinet.numberOfDoors || 1);
        for (let i = 0; i < (cabinet.numberOfDoors || 1); i++) {
          const doorX = -cabWidth / 2 + i * doorWidth;
          ctx.strokeRect(doorX + 2, -cabDepth / 2 + 2, doorWidth - 4, cabDepth - 4);
          
          // Handle
          ctx.fillStyle = '#374151';
          ctx.beginPath();
          ctx.arc(doorX + doorWidth / 2, 0, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (cabinet.hasDrawers) {
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        const drawerHeight = cabDepth / (cabinet.numberOfDrawers || 1);
        for (let i = 0; i < (cabinet.numberOfDrawers || 1); i++) {
          const drawerY = -cabDepth / 2 + i * drawerHeight;
          ctx.strokeRect(-cabWidth / 2 + 2, drawerY + 2, cabWidth - 4, drawerHeight - 4);
          
          // Handle
          ctx.fillStyle = '#374151';
          ctx.fillRect(-4, drawerY + drawerHeight / 2 - 1, 8, 2);
        }
      }

      ctx.restore();

      // Label
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cabinet.name.split(' ')[0], cabX, cabY - cabDepth / 2 - 8);
    });

    // Draw appliances
    config.appliances.forEach(appliance => {
      const appX = baseX + (appliance.x / 100) * scaledWidth;
      const appY = baseY + (appliance.y / 100) * scaledLength;
      const appWidth = appliance.width * scale;
      const appDepth = appliance.depth * scale;

      ctx.save();
      ctx.translate(appX, appY);
      ctx.rotate((appliance.rotation * Math.PI) / 180);

      // Different colors for different appliances
      let color = '#94a3b8';
      if (appliance.type === 'refrigerator') color = '#cbd5e1';
      if (appliance.type === 'stove') color = '#1f2937';
      if (appliance.type === 'dishwasher') color = '#e2e8f0';
      if (appliance.type === 'sink') color = '#dbeafe';

      ctx.fillStyle = color;
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.fillRect(-appWidth / 2, -appDepth / 2, appWidth, appDepth);
      ctx.strokeRect(-appWidth / 2, -appDepth / 2, appWidth, appDepth);

      ctx.restore();

      // Label
      ctx.fillStyle = '#1e293b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(appliance.type, appX, appY - appDepth / 2 - 8);
    });

    // Draw dimensions
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    // Width dimension
    drawDimensionLine(ctx, baseX, baseY + scaledLength + 25, baseX + scaledWidth, baseY + scaledLength + 25, `${config.roomWidth}'`, 'horizontal');

    // Length dimension
    drawDimensionLine(ctx, baseX + scaledWidth + 25, baseY, baseX + scaledWidth + 25, baseY + scaledLength, `${config.roomLength}'`, 'vertical');

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Top View (Floor Plan)', padding, 25);

    // Compass
    drawCompassRose(ctx, baseX + scaledWidth + 60, baseY + 30);
  };

  const drawFrontView = () => {
    const canvas = frontViewRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const roomWidth = config.roomWidth * 12;
    const roomHeight = config.roomHeight * 12;

    const scale = Math.min(
      (canvas.width - 2 * padding) / roomWidth,
      (canvas.height - 2 * padding) / roomHeight
    );

    const centerX = canvas.width / 2;
    const baseY = canvas.height - padding;
    const scaledWidth = roomWidth * scale;
    const scaledHeight = roomHeight * scale;

    // Floor line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX - scaledWidth / 2 - 20, baseY);
    ctx.lineTo(centerX + scaledWidth / 2 + 20, baseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw wall cabinets
    config.cabinets
      .filter(cab => cab.type === 'wall')
      .forEach(cabinet => {
        const cabX = centerX - scaledWidth / 2 + (cabinet.x / 100) * scaledWidth;
        const cabWidth = cabinet.width * scale;
        const cabHeight = cabinet.height * scale;
        const wallCabY = baseY - scaledHeight + scaledHeight * 0.3;

        // Cabinet with gradient
        const gradient = ctx.createLinearGradient(cabX, wallCabY, cabX + cabWidth, wallCabY);
        gradient.addColorStop(0, '#f3f4f6');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, '#e5e7eb');

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.fillRect(cabX, wallCabY, cabWidth, cabHeight);
        ctx.strokeRect(cabX, wallCabY, cabWidth, cabHeight);

        // Door lines
        if (cabinet.hasDoors) {
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1;
          const doorWidth = cabWidth / (cabinet.numberOfDoors || 1);
          for (let i = 1; i < (cabinet.numberOfDoors || 1); i++) {
            ctx.beginPath();
            ctx.moveTo(cabX + i * doorWidth, wallCabY);
            ctx.lineTo(cabX + i * doorWidth, wallCabY + cabHeight);
            ctx.stroke();
          }
        }
      });

    // Draw base cabinets
    config.cabinets
      .filter(cab => cab.type === 'base' || cab.type === 'island' || cab.type === 'peninsula')
      .forEach(cabinet => {
        const cabX = centerX - scaledWidth / 2 + (cabinet.x / 100) * scaledWidth;
        const cabWidth = cabinet.width * scale;
        const cabHeight = (cabinet.height || 34) * scale;

        const gradient = ctx.createLinearGradient(cabX, baseY - cabHeight, cabX + cabWidth, baseY);
        gradient.addColorStop(0, '#e5e7eb');
        gradient.addColorStop(0.5, '#f9fafb');
        gradient.addColorStop(1, '#d1d5db');

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.fillRect(cabX, baseY - cabHeight, cabWidth, cabHeight);
        ctx.strokeRect(cabX, baseY - cabHeight, cabWidth, cabHeight);

        // Countertop
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cabX - 2, baseY - cabHeight - 3, cabWidth + 4, 3);
      });

    // Draw appliances
    config.appliances.forEach(appliance => {
      const appX = centerX - scaledWidth / 2 + (appliance.x / 100) * scaledWidth;
      const appWidth = appliance.width * scale;
      const appHeight = appliance.height * scale;

      let color = '#94a3b8';
      if (appliance.type === 'refrigerator') {
        color = '#e2e8f0';
        ctx.fillStyle = color;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.fillRect(appX, baseY - appHeight, appWidth, appHeight);
        ctx.strokeRect(appX, baseY - appHeight, appWidth, appHeight);
        
        // Freezer door
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.strokeRect(appX + 2, baseY - appHeight + 2, appWidth - 4, appHeight * 0.3);
      } else if (appliance.type === 'stove') {
        // Stove with oven
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(appX, baseY - 36 * scale, appWidth, 36 * scale);
        ctx.strokeStyle = '#64748b';
        ctx.strokeRect(appX, baseY - 36 * scale, appWidth, 36 * scale);
        
        // Burners representation
        ctx.fillStyle = '#374151';
        ctx.fillRect(appX + 2, baseY - 36 * scale + 2, appWidth - 4, 4);
      } else {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.fillRect(appX, baseY - 34 * scale, appWidth, 34 * scale);
        ctx.strokeRect(appX, baseY - 34 * scale, appWidth, 34 * scale);
      }
    });

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Front Elevation', padding, 25);

    // Height dimension
    drawDimensionLine(ctx, centerX + scaledWidth / 2 + 20, baseY, centerX + scaledWidth / 2 + 20, baseY - scaledHeight, `${config.roomHeight}'`, 'vertical');
  };

  const drawSideView = () => {
    const canvas = sideViewRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const roomLength = config.roomLength * 12;
    const roomHeight = config.roomHeight * 12;

    const scale = Math.min(
      (canvas.width - 2 * padding) / roomLength,
      (canvas.height - 2 * padding) / roomHeight
    );

    const centerX = canvas.width / 2;
    const baseY = canvas.height - padding;
    const scaledLength = roomLength * scale;
    const scaledHeight = roomHeight * scale;

    // Floor line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX - scaledLength / 2 - 20, baseY);
    ctx.lineTo(centerX + scaledLength / 2 + 20, baseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Generic side view representation
    const avgCabDepth = 24 * scale; // Average cabinet depth

    // Base cabinets (side view)
    ctx.fillStyle = '#d1d5db';
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - scaledLength / 4, baseY - 36 * scale, avgCabDepth, 36 * scale);
    ctx.strokeRect(centerX - scaledLength / 4, baseY - 36 * scale, avgCabDepth, 36 * scale);

    // Countertop
    ctx.fillStyle = '#64748b';
    ctx.fillRect(centerX - scaledLength / 4 - 2, baseY - 36 * scale - 3, avgCabDepth + 4, 3);

    // Wall cabinet (side view)
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(centerX - scaledLength / 4, baseY - scaledHeight + scaledHeight * 0.3, 12 * scale, 30 * scale);
    ctx.strokeRect(centerX - scaledLength / 4, baseY - scaledHeight + scaledHeight * 0.3, 12 * scale, 30 * scale);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Side Elevation', padding, 25);

    // Length dimension
    drawDimensionLine(ctx, centerX - scaledLength / 2, baseY + 25, centerX + scaledLength / 2, baseY + 25, `${config.roomLength}'`, 'horizontal');
  };

  const drawDimensionLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    text: string,
    orientation: 'horizontal' | 'vertical'
  ) => {
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
    <div className="space-y-4">
      {/* Main Top View */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-300">
        <h3 className="font-semibold text-slate-900 mb-4">Top View (Floor Plan)</h3>
        <canvas
          ref={topViewRef}
          width={600}
          height={450}
          className="w-full bg-white rounded border border-blue-300 shadow-inner"
        />
      </div>

      {/* Elevation Views */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-300">
          <h3 className="font-semibold text-slate-900 mb-3">Front Elevation</h3>
          <canvas
            ref={frontViewRef}
            width={400}
            height={300}
            className="w-full bg-white rounded border border-purple-300 shadow-inner"
          />
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-300">
          <h3 className="font-semibold text-slate-900 mb-3">Side Elevation</h3>
          <canvas
            ref={sideViewRef}
            width={400}
            height={300}
            className="w-full bg-white rounded border border-green-300 shadow-inner"
          />
        </div>
      </div>

      {/* Specifications */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 font-medium">Room Size</div>
          <div className="text-sm font-bold text-blue-900 mt-1">
            {config.roomWidth}' × {config.roomLength}'
          </div>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 font-medium">Ceiling Height</div>
          <div className="text-sm font-bold text-purple-900 mt-1">{config.roomHeight}'</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 font-medium">Cabinets</div>
          <div className="text-sm font-bold text-green-900 mt-1">{config.cabinets.length} units</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
          <div className="text-xs text-amber-700 font-medium">Appliances</div>
          <div className="text-sm font-bold text-amber-900 mt-1">{config.appliances.length} units</div>
        </div>
      </div>
    </div>
  );
}
