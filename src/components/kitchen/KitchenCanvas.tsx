import React, { useRef, useEffect, useState, useCallback } from 'react';
import { KitchenConfig, PlacedCabinet, CabinetItem } from '../../types/kitchen';
import { Button } from '../ui/button';
import { ZoomIn, ZoomOut, Grid3x3, Eye, EyeOff, Trash2, Move, RotateCw, RotateCcw, Box } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface KitchenCanvasProps {
  config: KitchenConfig;
  selectedCabinet: PlacedCabinet | null;
  onSelectCabinet: (cabinet: PlacedCabinet | null) => void;
  onUpdateCabinet: (id: string, updates: Partial<PlacedCabinet>) => void;
  onUpdateAppliance?: (id: string, updates: Partial<any>) => void;
  onDeleteCabinet: (id: string) => void;
  onAddCabinet: (cabinet: PlacedCabinet) => void;
  onAddAppliance?: (appliance: any, x: number, y: number) => void;
  onUpdateConfig?: (updates: Partial<KitchenConfig>) => void;
}

export function KitchenCanvas({
  config,
  selectedCabinet,
  onSelectCabinet,
  onUpdateCabinet,
  onUpdateAppliance,
  onDeleteCabinet,
  onAddCabinet,
  onAddAppliance,
  onUpdateConfig,
}: KitchenCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCabinet, setHoveredCabinet] = useState<PlacedCabinet | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: 'cabinet' | 'appliance'; id: string } | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingItem, setRotatingItem] = useState<{ type: 'cabinet' | 'appliance'; id: string } | null>(null);
  const [selectedAppliance, setSelectedAppliance] = useState<any | null>(null);
  const [rotationStartAngle, setRotationStartAngle] = useState<number>(0);
  const [initialRotation, setInitialRotation] = useState<number>(0);

  const PIXELS_PER_INCH = 4; // Scale factor

  // Snap to grid helper function with boundary awareness
  const snapToGrid = (value: number, isXCoord: boolean = true, itemWidth: number = 0, itemDepth: number = 0) => {
    if (!config.snapToGrid) return value;
    const gridSize = config.gridSize || 6; // Default 6 inches
    const snappedValue = Math.round(value / gridSize) * gridSize;
    
    // Ensure the item stays within room boundaries
    const maxX = config.roomWidth * 12 - itemWidth; // Room width in inches minus item width
    const maxY = config.roomLength * 12 - itemDepth; // Room length in inches minus item depth
    
    if (isXCoord) {
      return Math.max(0, Math.min(snappedValue, maxX));
    } else {
      return Math.max(0, Math.min(snappedValue, maxY));
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [config, zoom, selectedCabinet, hoveredCabinet, selectedAppliance]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply zoom
    ctx.scale(zoom, zoom);

    // Draw room outline
    drawRoom(ctx);

    // Draw grid if enabled
    if (config.showGrid) {
      drawGridLines(ctx);
    }

    // Draw cabinets
    config.cabinets.forEach(cabinet => {
      const isSelected = selectedCabinet?.id === cabinet.id;
      const isHovered = hoveredCabinet?.id === cabinet.id;
      drawCabinet(ctx, cabinet, isSelected, isHovered);
      
      // Draw rotation handle if selected
      if (isSelected) {
        drawRotationHandle(ctx, cabinet);
      }
    });

    // Draw appliances
    config.appliances.forEach(appliance => {
      const isSelected = selectedAppliance?.id === appliance.id;
      drawAppliance(ctx, appliance, isSelected);
      
      // Draw rotation handle if selected
      if (isSelected) {
        drawApplianceRotationHandle(ctx, appliance);
      }
    });

    ctx.restore();
  };

  const drawRoom = (ctx: CanvasRenderingContext2D) => {
    const roomWidth = config.roomWidth * 12 * PIXELS_PER_INCH; // Convert feet to pixels
    const roomLength = config.roomLength * 12 * PIXELS_PER_INCH;
    const padding = 20;

    // Room floor
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(padding, padding, roomWidth, roomLength);

    // Room walls
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.strokeRect(padding, padding, roomWidth, roomLength);

    // Wall labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    // North wall
    ctx.fillText('North Wall', padding + roomWidth / 2, padding - 5);
    // South wall
    ctx.fillText('South Wall', padding + roomWidth / 2, padding + roomLength + 15);
    
    ctx.save();
    ctx.translate(padding - 5, padding + roomLength / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('West Wall', 0, 0);
    ctx.restore();
    
    ctx.save();
    ctx.translate(padding + roomWidth + 15, padding + roomLength / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('East Wall', 0, 0);
    ctx.restore();
  };

  const drawGridLines = (ctx: CanvasRenderingContext2D) => {
    const roomWidth = config.roomWidth * 12 * PIXELS_PER_INCH;
    const roomLength = config.roomLength * 12 * PIXELS_PER_INCH;
    const padding = 20;
    const gridSize = config.gridSize * PIXELS_PER_INCH; // Grid in inches

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = padding; x <= padding + roomWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + roomLength);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = padding; y <= padding + roomLength; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + roomWidth, y);
      ctx.stroke();
    }
  };

  const drawCabinet = (
    ctx: CanvasRenderingContext2D,
    cabinet: PlacedCabinet,
    isSelected: boolean,
    isHovered: boolean
  ) => {
    const padding = 20;
    const x = padding + cabinet.x * PIXELS_PER_INCH;
    const y = padding + cabinet.y * PIXELS_PER_INCH;
    const width = cabinet.width * PIXELS_PER_INCH;
    const depth = cabinet.depth * PIXELS_PER_INCH;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((cabinet.rotation * Math.PI) / 180);

    // Cabinet body
    let fillColor = '#d1d5db'; // Default gray
    if (cabinet.finish === 'White') fillColor = '#f3f4f6';
    if (cabinet.finish === 'Oak') fillColor = '#deb887';
    if (cabinet.finish === 'Walnut') fillColor = '#8b4513';
    if (cabinet.finish === 'Gray') fillColor = '#9ca3af';
    if (cabinet.finish === 'Black') fillColor = '#374151';
    if (cabinet.finish === 'Cherry') fillColor = '#a0522d';
    if (cabinet.finish === 'Maple') fillColor = '#f5deb3';

    // Check if this is a corner cabinet
    const isCornerCabinet = cabinet.type === 'corner-base' || cabinet.type === 'corner-wall';

    if (isCornerCabinet) {
      // Draw L-shaped corner cabinet
      const cornerSize = Math.min(width, depth);
      
      // Fill the L-shape (two rectangles forming an L)
      ctx.fillStyle = fillColor;
      
      // Vertical part of L
      ctx.fillRect(0, 0, cornerSize * 0.4, depth);
      // Horizontal part of L
      ctx.fillRect(0, depth - cornerSize * 0.4, width, cornerSize * 0.4);
      
      // Outline the L-shape
      ctx.strokeStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#6b7280';
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
      
      ctx.strokeRect(0, 0, cornerSize * 0.4, depth);
      ctx.strokeRect(0, depth - cornerSize * 0.4, width, cornerSize * 0.4);
      
      // Draw corner diagonal line to show the L-shape connection
      ctx.beginPath();
      ctx.moveTo(cornerSize * 0.4, depth - cornerSize * 0.4);
      ctx.lineTo(cornerSize * 0.4, depth);
      ctx.stroke();
      
      // Draw angled doors for corner cabinet
      const doorWidth = cornerSize * 0.35;
      const doorHeight = depth * 0.6;
      const doorOffset = cornerSize * 0.025;
      
      // Left door (on vertical part)
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(doorOffset, depth * 0.2, doorWidth, doorHeight);
      
      // Right door (angled, on horizontal part)
      const rightDoorY = depth - cornerSize * 0.35;
      const rightDoorWidth = width * 0.45;
      ctx.strokeRect(cornerSize * 0.45, rightDoorY + doorOffset, rightDoorWidth, cornerSize * 0.3);
      
      // Door handles
      ctx.fillStyle = '#374151';
      // Left door handle
      ctx.fillRect(doorWidth - 8, depth * 0.5 - 8, 3, 16);
      // Right door handle  
      ctx.fillRect(cornerSize * 0.5, rightDoorY + cornerSize * 0.15 - 2, 16, 3);
      
      // Label
      ctx.fillStyle = '#1f2937';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Corner', width / 2, depth - 10);
      
    } else {
      // Draw regular cabinet (existing code)
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, width, depth);

      // Cabinet outline
      ctx.strokeStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#6b7280';
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
      ctx.strokeRect(0, 0, width, depth);

      // Draw doors/drawers
      if (cabinet.hasDoors && cabinet.numberOfDoors) {
        const doorWidth = width / cabinet.numberOfDoors;
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        for (let i = 1; i < cabinet.numberOfDoors; i++) {
          ctx.beginPath();
          ctx.moveTo(i * doorWidth, 0);
          ctx.lineTo(i * doorWidth, depth);
          ctx.stroke();
        }
        // Door handles
        ctx.fillStyle = '#9ca3af';
        for (let i = 0; i < cabinet.numberOfDoors; i++) {
          const handleX = (i + 0.5) * doorWidth;
          ctx.fillRect(handleX - 2, depth / 2 - 6, 4, 12);
        }
      }

      if (cabinet.hasDrawers && cabinet.numberOfDrawers) {
        const drawerHeight = depth / cabinet.numberOfDrawers;
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        for (let i = 1; i < cabinet.numberOfDrawers; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * drawerHeight);
          ctx.lineTo(width, i * drawerHeight);
          ctx.stroke();
        }
        // Drawer pulls
        ctx.fillStyle = '#9ca3af';
        for (let i = 0; i < cabinet.numberOfDrawers; i++) {
          const handleY = (i + 0.5) * drawerHeight;
          ctx.fillRect(width / 2 - 6, handleY - 2, 12, 4);
        }
      }

      // Label
      ctx.fillStyle = '#1f2937';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cabinet.name.split(' ').slice(0, 2).join(' '), width / 2, depth / 2);
    }

    // Dimensions
    ctx.fillStyle = '#6b7280';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${cabinet.width}\"`, width / 2, -5);

    ctx.restore();
  };

  const drawAppliance = (ctx: CanvasRenderingContext2D, appliance: any, isSelected: boolean) => {
    const padding = 20;
    const x = padding + appliance.x * PIXELS_PER_INCH;
    const y = padding + appliance.y * PIXELS_PER_INCH;
    const width = appliance.width * PIXELS_PER_INCH;
    const depth = appliance.depth * PIXELS_PER_INCH;

    ctx.save();
    ctx.translate(x, y);

    // Appliance body
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, width, depth);

    ctx.strokeStyle = isSelected ? '#3b82f6' : '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, depth);

    // Label
    ctx.fillStyle = '#1f2937';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(appliance.name, width / 2, depth / 2);

    ctx.restore();
  };

  const drawRotationHandle = (ctx: CanvasRenderingContext2D, cabinet: PlacedCabinet) => {
    const padding = 20;
    const x = padding + cabinet.x * PIXELS_PER_INCH;
    const y = padding + cabinet.y * PIXELS_PER_INCH;
    const width = cabinet.width * PIXELS_PER_INCH;
    const depth = cabinet.depth * PIXELS_PER_INCH;

    // Calculate rotated corner position
    const angle = (cabinet.rotation * Math.PI) / 180;
    const handleX = x + width * Math.cos(angle) - depth * Math.sin(angle);
    const handleY = y + width * Math.sin(angle) + depth * Math.cos(angle);

    // Rotation handle with outline
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw rotation icon (circular arrow)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 5, 0.2, Math.PI * 1.8);
    ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(handleX - 4, handleY - 3);
    ctx.lineTo(handleX - 2, handleY - 5);
    ctx.lineTo(handleX - 5, handleY - 5);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  const drawApplianceRotationHandle = (ctx: CanvasRenderingContext2D, appliance: any) => {
    const padding = 20;
    const x = padding + appliance.x * PIXELS_PER_INCH;
    const y = padding + appliance.y * PIXELS_PER_INCH;
    const width = appliance.width * PIXELS_PER_INCH;
    const depth = appliance.depth * PIXELS_PER_INCH;

    // Calculate handle position considering rotation
    const angle = (appliance.rotation * Math.PI) / 180;
    const handleX = x + width * Math.cos(angle) - depth * Math.sin(angle);
    const handleY = y + width * Math.sin(angle) + depth * Math.cos(angle);

    // Rotation handle with outline
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw rotation icon (circular arrow)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 5, 0.2, Math.PI * 1.8);
    ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(handleX - 4, handleY - 3);
    ctx.lineTo(handleX - 2, handleY - 5);
    ctx.lineTo(handleX - 5, handleY - 5);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Check if clicked on a cabinet
    const clickedCabinet = findCabinetAtPoint(x, y);
    onSelectCabinet(clickedCabinet);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Handle rotation
    if (isRotating && rotatingItem) {
      if (rotatingItem.type === 'cabinet') {
        const cabinet = config.cabinets.find(c => c.id === rotatingItem.id);
        if (cabinet) {
          const padding = 20;
          const centerX = padding + cabinet.x * PIXELS_PER_INCH + (cabinet.width * PIXELS_PER_INCH) / 2;
          const centerY = padding + cabinet.y * PIXELS_PER_INCH + (cabinet.depth * PIXELS_PER_INCH) / 2;
          
          // Calculate current angle from center to mouse
          const currentAngle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
          
          // Calculate relative rotation from start
          const angleDelta = currentAngle - rotationStartAngle;
          const newRotation = (initialRotation + angleDelta) % 360;
          
          // Snap to 15 degree increments
          const snappedAngle = Math.round(newRotation / 15) * 15;
          
          onUpdateCabinet(rotatingItem.id, { rotation: snappedAngle });
        }
      } else if (rotatingItem.type === 'appliance') {
        const appliance = config.appliances.find(a => a.id === rotatingItem.id);
        if (appliance && onUpdateAppliance) {
          const padding = 20;
          const centerX = padding + appliance.x * PIXELS_PER_INCH + (appliance.width * PIXELS_PER_INCH) / 2;
          const centerY = padding + appliance.y * PIXELS_PER_INCH + (appliance.depth * PIXELS_PER_INCH) / 2;
          
          // Calculate current angle from center to mouse
          const currentAngle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
          
          // Calculate relative rotation from start
          const angleDelta = currentAngle - rotationStartAngle;
          const newRotation = (initialRotation + angleDelta) % 360;
          
          // Snap to 15 degree increments
          const snappedAngle = Math.round(newRotation / 15) * 15;
          
          onUpdateAppliance(rotatingItem.id, { rotation: snappedAngle });
        }
      }
      return;
    }

    // Handle dragging with boundary checking
    if (isDragging && draggedItem && dragStart) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      if (draggedItem.type === 'cabinet') {
        const cabinet = config.cabinets.find(c => c.id === draggedItem.id);
        if (cabinet) {
          // Calculate new position
          let newX = cabinet.x + dx / PIXELS_PER_INCH;
          let newY = cabinet.y + dy / PIXELS_PER_INCH;
          
          // Apply boundary constraints
          const maxX = config.roomWidth * 12 - cabinet.width;
          const maxY = config.roomLength * 12 - cabinet.depth;
          
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          
          onUpdateCabinet(draggedItem.id, { x: newX, y: newY });
          setDragStart({ x, y });
        }
      } else if (draggedItem.type === 'appliance') {
        const appliance = config.appliances.find(a => a.id === draggedItem.id);
        if (appliance && onUpdateAppliance) {
          // Calculate new position
          let newX = appliance.x + dx / PIXELS_PER_INCH;
          let newY = appliance.y + dy / PIXELS_PER_INCH;
          
          // Apply boundary constraints
          const maxX = config.roomWidth * 12 - appliance.width;
          const maxY = config.roomLength * 12 - appliance.depth;
          
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          
          onUpdateAppliance(draggedItem.id, { x: newX, y: newY });
          setDragStart({ x, y });
        }
      }
    } else {
      // Update hovered cabinet and cursor
      const hoveredCab = findCabinetAtPoint(x, y);
      const hoveredApp = findApplianceAtPoint(x, y);
      
      // Check if hovering over rotation handle
      let onRotHandle = false;
      if (selectedCabinet) {
        const handlePos = getRotationHandlePos(selectedCabinet);
        const dist = Math.sqrt(Math.pow(x - handlePos.x, 2) + Math.pow(y - handlePos.y, 2));
        if (dist <= 10) onRotHandle = true;
      }
      if (selectedAppliance) {
        const handlePos = getApplianceRotationHandlePos(selectedAppliance);
        const dist = Math.sqrt(Math.pow(x - handlePos.x, 2) + Math.pow(y - handlePos.y, 2));
        if (dist <= 10) onRotHandle = true;
      }
      
      setHoveredCabinet(hoveredCab);
      canvas.style.cursor = onRotHandle ? 'grab' : (hoveredCab || hoveredApp) ? 'move' : 'default';
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Check if clicked on rotation handle first
    if (selectedCabinet) {
      const handlePos = getRotationHandlePos(selectedCabinet);
      const dist = Math.sqrt(Math.pow(x - handlePos.x, 2) + Math.pow(y - handlePos.y, 2));
      if (dist <= 10) {
        setIsRotating(true);
        setRotatingItem({ type: 'cabinet', id: selectedCabinet.id });
        setRotationStartAngle(Math.atan2(y - handlePos.y, x - handlePos.x) * (180 / Math.PI));
        setInitialRotation(selectedCabinet.rotation);
        return;
      }
    }

    if (selectedAppliance) {
      const handlePos = getApplianceRotationHandlePos(selectedAppliance);
      const dist = Math.sqrt(Math.pow(x - handlePos.x, 2) + Math.pow(y - handlePos.y, 2));
      if (dist <= 10) {
        setIsRotating(true);
        setRotatingItem({ type: 'appliance', id: selectedAppliance.id });
        setRotationStartAngle(Math.atan2(y - handlePos.y, x - handlePos.x) * (180 / Math.PI));
        setInitialRotation(selectedAppliance.rotation);
        return;
      }
    }

    // Check if we clicked on an item
    const clickedCabinet = findCabinetAtPoint(x, y);
    const clickedAppliance = findApplianceAtPoint(x, y);

    if (clickedCabinet) {
      onSelectCabinet(clickedCabinet);
      setSelectedAppliance(null);
      setIsDragging(true);
      setDragStart({ x, y });
      setDraggedItem({ type: 'cabinet', id: clickedCabinet.id });
    } else if (clickedAppliance) {
      setSelectedAppliance(clickedAppliance);
      onSelectCabinet(null);
      setIsDragging(true);
      setDragStart({ x, y });
      setDraggedItem({ type: 'appliance', id: clickedAppliance.id });
    } else {
      // Clicked on empty space
      onSelectCabinet(null);
      setSelectedAppliance(null);
    }
  };

  const getRotationHandlePos = (cabinet: PlacedCabinet) => {
    const padding = 20;
    const x = padding + cabinet.x * PIXELS_PER_INCH;
    const y = padding + cabinet.y * PIXELS_PER_INCH;
    const width = cabinet.width * PIXELS_PER_INCH;
    const depth = cabinet.depth * PIXELS_PER_INCH;

    // Calculate handle position considering rotation
    const angle = (cabinet.rotation * Math.PI) / 180;
    const handleX = x + width * Math.cos(angle) - depth * Math.sin(angle);
    const handleY = y + width * Math.sin(angle) + depth * Math.cos(angle);

    return { x: handleX, y: handleY };
  };

  const getApplianceRotationHandlePos = (appliance: any) => {
    const padding = 20;
    const x = padding + appliance.x * PIXELS_PER_INCH;
    const y = padding + appliance.y * PIXELS_PER_INCH;
    const width = appliance.width * PIXELS_PER_INCH;
    const depth = appliance.depth * PIXELS_PER_INCH;

    // Calculate handle position considering rotation
    const angle = (appliance.rotation * Math.PI) / 180;
    const handleX = x + width * Math.cos(angle) - depth * Math.sin(angle);
    const handleY = y + width * Math.sin(angle) + depth * Math.cos(angle);

    return { x: handleX, y: handleY };
  };

  const handleCanvasMouseUp = () => {
    // Apply snap to grid when releasing after dragging
    if (isDragging && draggedItem) {
      if (draggedItem.type === 'cabinet') {
        const cabinet = config.cabinets.find(c => c.id === draggedItem.id);
        if (cabinet) {
          const snappedX = snapToGrid(cabinet.x, true, cabinet.width, cabinet.depth);
          const snappedY = snapToGrid(cabinet.y, false, cabinet.width, cabinet.depth);
          onUpdateCabinet(draggedItem.id, { x: snappedX, y: snappedY });
        }
      } else if (draggedItem.type === 'appliance') {
        const appliance = config.appliances.find(a => a.id === draggedItem.id);
        if (appliance && onUpdateAppliance) {
          const snappedX = snapToGrid(appliance.x, true, appliance.width, appliance.depth);
          const snappedY = snapToGrid(appliance.y, false, appliance.width, appliance.depth);
          onUpdateAppliance(draggedItem.id, { x: snappedX, y: snappedY });
        }
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDraggedItem(null);
    setIsRotating(false);
    setRotatingItem(null);
  };

  const findCabinetAtPoint = (x: number, y: number): PlacedCabinet | null => {
    const padding = 20;
    
    for (let i = config.cabinets.length - 1; i >= 0; i--) {
      const cabinet = config.cabinets[i];
      const cabX = padding + cabinet.x * PIXELS_PER_INCH;
      const cabY = padding + cabinet.y * PIXELS_PER_INCH;
      const cabWidth = cabinet.width * PIXELS_PER_INCH;
      const cabDepth = cabinet.depth * PIXELS_PER_INCH;

      // Transform click point to local coordinates (accounting for rotation)
      const angle = (-cabinet.rotation * Math.PI) / 180; // Negative for inverse transform
      const dx = x - cabX;
      const dy = y - cabY;
      
      // Rotate point back to local space
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

      // Check if point is within the unrotated bounds
      if (
        localX >= 0 &&
        localX <= cabWidth &&
        localY >= 0 &&
        localY <= cabDepth
      ) {
        return cabinet;
      }
    }
    return null;
  };

  const findApplianceAtPoint = (x: number, y: number): any | null => {
    const padding = 20;
    
    for (let i = config.appliances.length - 1; i >= 0; i--) {
      const appliance = config.appliances[i];
      const appX = padding + appliance.x * PIXELS_PER_INCH;
      const appY = padding + appliance.y * PIXELS_PER_INCH;
      const appWidth = appliance.width * PIXELS_PER_INCH;
      const appDepth = appliance.depth * PIXELS_PER_INCH;

      // Transform click point to local coordinates (accounting for rotation)
      const angle = (-appliance.rotation * Math.PI) / 180; // Negative for inverse transform
      const dx = x - appX;
      const dy = y - appY;
      
      // Rotate point back to local space
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

      // Check if point is within the unrotated bounds
      if (
        localX >= 0 &&
        localX <= appWidth &&
        localY >= 0 &&
        localY <= appDepth
      ) {
        return appliance;
      }
    }
    return null;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  const handleRotateClockwise = () => {
    if (selectedCabinet) {
      const newRotation = (selectedCabinet.rotation + 90) % 360;
      onUpdateCabinet(selectedCabinet.id, { rotation: newRotation });
    } else if (selectedAppliance && onUpdateAppliance) {
      const newRotation = (selectedAppliance.rotation + 90) % 360;
      onUpdateAppliance(selectedAppliance.id, { rotation: newRotation });
    }
  };

  const handleRotateCounterClockwise = () => {
    if (selectedCabinet) {
      const newRotation = (selectedCabinet.rotation - 90 + 360) % 360;
      onUpdateCabinet(selectedCabinet.id, { rotation: newRotation });
    } else if (selectedAppliance && onUpdateAppliance) {
      const newRotation = (selectedAppliance.rotation - 90 + 360) % 360;
      onUpdateAppliance(selectedAppliance.id, { rotation: newRotation });
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      
      const item = JSON.parse(data);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      // Convert to inches and account for padding
      const padding = 20;
      const canvasX = Math.max(0, (x - padding) / PIXELS_PER_INCH);
      const canvasY = Math.max(0, (y - padding) / PIXELS_PER_INCH);

      // Check if it's an appliance or cabinet
      if (item.itemType === 'appliance' && onAddAppliance) {
        // Snap appliance position to grid
        const snappedX = snapToGrid(canvasX, true, item.width, item.depth);
        const snappedY = snapToGrid(canvasY, false, item.width, item.depth);
        onAddAppliance(item, snappedX, snappedY);
        toast.success(`${item.name} added to canvas`);
      } else {
        // It's a cabinet - snap position to grid
        const snappedX = snapToGrid(canvasX, true, item.width, item.depth);
        const snappedY = snapToGrid(canvasY, false, item.width, item.depth);
        
        const newCabinet: PlacedCabinet = {
          ...item,
          id: `cabinet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          finish: config.cabinetFinish,
          x: snappedX,
          y: snappedY,
          rotation: 0,
          wall: 'north',
        };

        onAddCabinet(newCabinet);
        toast.success(`${item.name} added to canvas`);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 ml-2">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={config.showGrid ? 'default' : 'outline'}
            onClick={() => {
              if (onUpdateConfig) {
                onUpdateConfig({ showGrid: !config.showGrid });
              }
            }}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={config.snapToGrid || false}
              onChange={(e) => {
                if (onUpdateConfig) {
                  onUpdateConfig({ snapToGrid: e.target.checked });
                }
              }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            Snap to Grid
          </label>
          {(selectedCabinet || selectedAppliance) && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRotateCounterClockwise}
                title="Rotate 90° counter-clockwise"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRotateClockwise}
                title="Rotate 90° clockwise"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </>
          )}
          {selectedCabinet && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateCabinet(selectedCabinet.id, { x: 0, y: 0 })}
                title="Move cabinet to corner (0,0)"
              >
                Move to Corner
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDeleteCabinet(selectedCabinet.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-50 rounded-lg border"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ backgroundColor: isDragOver ? '#f0f9ff' : '#f5f5f5' }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={1200}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className="mx-auto"
          style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        />
      </div>
    </div>
  );
}