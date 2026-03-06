import React, { useState, useEffect, useRef } from 'react';
import { Ruler, Package, Brush, Trash2, UploadCloud, Undo, Maximize2, Square, Minus, DoorOpen, LayoutGrid, AlertCircle, MousePointer2, ZoomIn, ZoomOut, Save, FolderOpen, RotateCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner@2.0.3';
import type { User } from '../../App';
import { PermissionGate } from '../PermissionGate';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { searchInventoryClient } from '../../utils/inventory-client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface InteriorFinishingPlannerProps {
  user: User;
}

type Point = { x: number; y: number };
type Wall = { p1: Point; p2: Point };
type PlacedItem = { p: Point; id: string; doorType?: string; doorSize?: string; doorHanding?: string };

const DB_NAME = 'InteriorFinishingDB';
const STORE_NAME = 'drafts';

const saveToIndexedDB = async (data: any) => {
  return new Promise<void>((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(data, 'current_draft');
          
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        } catch (err) {
          req.result.close();
          reject(err);
        }
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
};

const loadFromIndexedDB = async () => {
  return new Promise<any>((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.close();
            return resolve(null);
          }
          const tx = db.transaction(STORE_NAME, 'readonly');
          const storeReq = tx.objectStore(STORE_NAME).get('current_draft');
          
          storeReq.onsuccess = () => {
            db.close();
            resolve(storeReq.result);
          };
          storeReq.onerror = () => {
            db.close();
            reject(storeReq.error);
          };
        } catch (err) {
          req.result.close();
          resolve(null); // Return null if store doesn't exist yet or other error
        }
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
};

export function InteriorFinishingPlanner({ user }: InteriorFinishingPlannerProps) {
  // Restrict access to admin while in development
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <Brush className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">Under Construction</h2>
        <p className="text-slate-500 mt-2 text-center max-w-md">
          The Interior Finishing Planner is currently being developed and is only visible to administrators.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'digitizer' | 'materials'>('digitizer');
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // --- Digitizer State ---
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [mode, setMode] = useState<'idle' | 'calibrate' | 'perimeter' | 'wall' | 'door' | 'window'>('idle');
  
  const [scaleData, setScaleData] = useState<{ p1: Point | null; p2: Point | null; distance: number }>({ p1: null, p2: null, distance: 0 });
  const [perimeter, setPerimeter] = useState<Point[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [doors, setDoors] = useState<PlacedItem[]>([]);
  const [windows, setWindows] = useState<PlacedItem[]>([]);

  // Door placement settings
  const [currentDoorType, setCurrentDoorType] = useState('Prehung');
  const [currentDoorSize, setCurrentDoorSize] = useState('30"');
  const [currentDoorHanding, setCurrentDoorHanding] = useState('Left');

  // Interactive tracking
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [currentWallPoint, setCurrentWallPoint] = useState<Point | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);

  type HistoryState = {
    scaleData: { p1: Point | null; p2: Point | null; distance: number };
    perimeter: Point[];
    walls: Wall[];
    doors: PlacedItem[];
    windows: PlacedItem[];
    currentWallPoint: Point | null;
  };
  const historyRef = useRef<HistoryState[]>([]);

  // Since handleUndoAction requires access to the latest state, we should use a generic state approach,
  // but let's actually just use refs for the latest state inside the event listener to avoid stale closures,
  // or simply rely on React state since handleUndoAction updates state. 
  // Actually, to push the *current* state to history, we need access to the current state variables.
  const stateRef = useRef({ scaleData, perimeter, walls, doors, windows, currentWallPoint });
  useEffect(() => {
    stateRef.current = { scaleData, perimeter, walls, doors, windows, currentWallPoint };
  }, [scaleData, perimeter, walls, doors, windows, currentWallPoint]);

  const saveHistory = () => {
    historyRef.current.push({
      scaleData: { ...stateRef.current.scaleData },
      perimeter: [...stateRef.current.perimeter],
      walls: [...stateRef.current.walls],
      doors: [...stateRef.current.doors],
      windows: [...stateRef.current.windows],
      currentWallPoint: stateRef.current.currentWallPoint
    });
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
  };

  const handleUndoAction = () => {
    if (historyRef.current.length === 0) {
      toast.info('Nothing to undo.');
      return;
    }
    const lastState = historyRef.current.pop()!;
    setScaleData(lastState.scaleData);
    setPerimeter(lastState.perimeter);
    setWalls(lastState.walls);
    setDoors(lastState.doors);
    setWindows(lastState.windows);
    setCurrentWallPoint(lastState.currentWallPoint);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleUndoAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Material preferences
  const [baseboardId, setBaseboardId] = useState('modern-5');
  const [casingId, setCasingId] = useState('colonial-2');
  const [crownId, setCrownId] = useState('none');
  const [wainscottingId, setWainscottingId] = useState('none');
  
  // Additional door material preferences
  const [jambStockSize, setJambStockSize] = useState('5"');
  const [bipassTrackSize, setBipassTrackSize] = useState('48"');
  const [hingeSize, setHingeSize] = useState('3"');
  const [doorKnobType, setDoorKnobType] = useState('Passage');

  useEffect(() => {
    async function loadInventory() {
      if (!user.organizationId) return;
      setLoading(true);
      try {
        const result = await searchInventoryClient({ organizationId: user.organizationId });
        if (result && result.items) {
          setInventoryItems(result.items);
        }
      } catch (err) {
        console.error("Failed to load inventory", err);
      } finally {
        setLoading(false);
      }
    }
    loadInventory();
  }, [user.organizationId]);

  const handleSaveDraft = async () => {
    if (!bgImage) {
      toast.error('Nothing to save. Please upload a floorplan first.');
      return;
    }
    setLoading(true);
    try {
      const draft = {
        bgImage,
        imageDims,
        scaleData,
        perimeter,
        walls,
        doors,
        windows,
        baseboardId,
        casingId,
        crownId,
        wainscottingId,
        jambStockSize,
        bipassTrackSize,
        hingeSize,
        doorKnobType,
      };

      // Try saving to cloud first for persistence across devices/sessions
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token || publicAnonKey;
        
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/api/projects/interior-planner/draft`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(draft)
        });
      } catch (cloudErr) {
        console.warn('Could not save draft to cloud, falling back to local only:', cloudErr);
      }

      await saveToIndexedDB(draft);
      toast.success('Draft saved successfully!');
    } catch (err) {
      console.error('Save failed', err);
      toast.error('Failed to save draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDraft = async () => {
    setLoading(true);
    try {
      let draft: any = null;
      
      // Try loading from cloud first
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token || publicAnonKey;

        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/api/projects/interior-planner/draft`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.draft) {
            draft = typeof data.draft === 'string' ? JSON.parse(data.draft) : data.draft;
          }
        }
      } catch (cloudErr) {
        console.warn('Could not load draft from cloud:', cloudErr);
      }

      // Fallback to IndexedDB if cloud is empty or failed
      if (!draft) {
        draft = await loadFromIndexedDB();
      }

      if (draft && draft.bgImage) {
        setBgImage(draft.bgImage);
        setImageDims(draft.imageDims || null);
        setScaleData(draft.scaleData || { p1: null, p2: null, distance: 0 });
        setPerimeter(draft.perimeter || []);
        setWalls(draft.walls || []);
        setDoors(draft.doors || []);
        setWindows(draft.windows || []);
        setBaseboardId(draft.baseboardId || 'modern-5');
        setCasingId(draft.casingId || 'colonial-2');
        setCrownId(draft.crownId || 'none');
        setWainscottingId(draft.wainscottingId || 'none');
        
        setJambStockSize(draft.jambStockSize || '5"');
        setBipassTrackSize(draft.bipassTrackSize || '48"');
        setHingeSize(draft.hingeSize || '3"');
        setDoorKnobType(draft.doorKnobType || 'Passage');
        
        setMode('idle');
        
        // Ensure zoom is recalculated in case image onLoad doesn't fire for base64
        setTimeout(() => {
          if (containerRef.current && draft.imageDims) {
            const cw = containerRef.current.clientWidth - 40;
            const ch = containerRef.current.clientHeight - 40;
            const scale = Math.min(cw / draft.imageDims.w, ch / draft.imageDims.h);
            setZoom(scale > 0 ? scale : 1);
          }
        }, 100);

        toast.success('Draft loaded successfully!');
      } else {
        toast.info('No saved draft found.');
      }
    } catch (err) {
      console.error('Load failed', err);
      toast.error('Failed to load draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateImage = () => {
    if (!bgImage || !imageDims) return;
    setLoading(true);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setLoading(false);
        return;
      }
      
      // Rotate 90 degrees clockwise
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      const newBgImage = canvas.toDataURL('image/png', 1.0);
      const newDims = { w: imageDims.h, h: imageDims.w };
      
      const rotatePoint = (p: Point | null): Point | null => {
        if (!p) return null;
        return { x: newDims.w - p.y, y: p.x };
      };

      setBgImage(newBgImage);
      setImageDims(newDims);
      
      setScaleData(prev => ({
        ...prev,
        p1: rotatePoint(prev.p1),
        p2: rotatePoint(prev.p2),
      }));
      setPerimeter(prev => prev.map(p => ({ x: newDims.w - p.y, y: p.x })));
      setWalls(prev => prev.map(w => ({ p1: { x: newDims.w - w.p1.y, y: w.p1.x }, p2: { x: newDims.w - w.p2.y, y: w.p2.x } })));
      setDoors(prev => prev.map(d => ({ ...d, p: { x: newDims.w - d.p.y, y: d.p.x } })));
      setWindows(prev => prev.map(w => ({ ...w, p: { x: newDims.w - w.p.y, y: w.p.x } })));
      
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth - 40;
        const ch = containerRef.current.clientHeight - 40;
        const scale = Math.min(cw / newDims.w, ch / newDims.h);
        setZoom(scale > 0 ? scale : 1);
      }
      
      setLoading(false);
    };
    img.onerror = () => {
      toast.error('Failed to rotate image.');
      setLoading(false);
    };
    img.src = bgImage;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      try {
        setLoading(true);
        toast.info('Converting PDF to image...', { duration: 3000 });
        
        // Load PDF.js via script tag to avoid bundler configuration issues
        const pdfjsLib: any = await new Promise((resolve, reject) => {
          if ((window as any).pdfjsLib) {
            resolve((window as any).pdfjsLib);
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve((window as any).pdfjsLib);
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        // Render at 2x scale for better clarity
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) throw new Error('Could not create canvas context');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        const dataUrl = canvas.toDataURL('image/png');
        
        setBgImage(dataUrl);
        setScaleData({ p1: null, p2: null, distance: 0 });
        setPerimeter([]);
        setWalls([]);
        setDoors([]);
        setWindows([]);
        setMode('calibrate');
        toast.success('PDF loaded! Please set the scale first.');
      } catch (error) {
        console.error("PDF processing error:", error);
        toast.error("Failed to process the PDF. Please try a different file.");
      } finally {
        setLoading(false);
        e.target.value = ''; // Reset input
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBgImage(event.target?.result as string);
      setScaleData({ p1: null, p2: null, distance: 0 });
      setPerimeter([]);
      setWalls([]);
      setDoors([]);
      setWindows([]);
      setMode('calibrate');
      toast.success('Floorplan loaded. Please set the scale first.');
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement> | Event) => {
    const target = e.target as HTMLImageElement;
    const w = target.naturalWidth;
    const h = target.naturalHeight;
    setImageDims({ w, h });
    
    if (containerRef.current) {
      // Auto-fit image to container with slight padding
      const cw = containerRef.current.clientWidth - 40;
      const ch = containerRef.current.clientHeight - 40;
      const scale = Math.min(cw / w, ch / h);
      setZoom(scale > 0 ? scale : 1);
    }
  };

  useEffect(() => {
    if (bgImage && imgRef.current && imgRef.current.complete) {
      // Trigger image load manually if it completed instantly
      if (imgRef.current.naturalWidth > 0 && !imageDims) {
        handleImageLoad({ target: imgRef.current } as any);
      }
    }
  }, [bgImage, imageDims]);

  // Canvas Interactions
  const getNaturalCoords = (e: React.MouseEvent | React.PointerEvent) => {
    if (!imageDims || !svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = imageDims.w / rect.width;
    const scaleY = imageDims.h / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getNaturalCoords(e);
    if (coords) setMousePos(coords);
  };

  const handleClick = (e: React.MouseEvent) => {
    const pt = getNaturalCoords(e);
    if (!pt) return;

    if (mode !== 'idle') {
      saveHistory();
    }

    if (mode === 'calibrate') {
      if (!scaleData.p1) {
        setScaleData({ ...scaleData, p1: pt });
      } else if (!scaleData.p2) {
        setScaleData({ ...scaleData, p2: pt });
        const distStr = prompt('Enter the distance between these two points in FEET (e.g. 10.5):');
        const dist = parseFloat(distStr || '');
        if (!isNaN(dist) && dist > 0) {
          setScaleData(prev => ({ ...prev, distance: dist }));
          setMode('perimeter');
          toast.success(`Scale calibrated! Now trace the exterior perimeter.`);
        } else {
          toast.error('Invalid distance. Calibration reset.');
          setScaleData({ p1: null, p2: null, distance: 0 });
        }
      }
    } else if (mode === 'perimeter') {
      setPerimeter([...perimeter, pt]);
    } else if (mode === 'wall') {
      if (!currentWallPoint) {
        setCurrentWallPoint(pt);
      } else {
        setWalls([...walls, { p1: currentWallPoint, p2: pt }]);
        setCurrentWallPoint(null);
      }
    } else if (mode === 'door') {
      setDoors([...doors, { p: pt, id: Date.now().toString(), doorType: currentDoorType, doorSize: currentDoorSize, doorHanding: currentDoorHanding }]);
    } else if (mode === 'window') {
      setWindows([...windows, { p: pt, id: Date.now().toString() }]);
    }
  };

  // Math Helpers
  const getDistance = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

  const pixelsPerFoot = scaleData.distance > 0 && scaleData.p1 && scaleData.p2 
    ? getDistance(scaleData.p1, scaleData.p2) / scaleData.distance 
    : 0;

  const calculateArea = () => {
    if (perimeter.length < 3 || pixelsPerFoot === 0) return 0;
    let area = 0;
    for (let i = 0; i < perimeter.length; i++) {
      const j = (i + 1) % perimeter.length;
      area += perimeter[i].x * perimeter[j].y - perimeter[j].x * perimeter[i].y;
    }
    const sqPixels = Math.abs(area / 2);
    return sqPixels / (pixelsPerFoot * pixelsPerFoot);
  };

  const calculatePerimeterLF = () => {
    if (perimeter.length < 2 || pixelsPerFoot === 0) return 0;
    let len = 0;
    for (let i = 0; i < perimeter.length; i++) {
      const j = (i + 1) % perimeter.length;
      len += getDistance(perimeter[i], perimeter[j]);
    }
    return len / pixelsPerFoot;
  };

  const calculateWallsLF = () => {
    if (pixelsPerFoot === 0) return 0;
    const len = walls.reduce((sum, w) => sum + getDistance(w.p1, w.p2), 0);
    return len / pixelsPerFoot;
  };

  const sqFt = calculateArea();
  const exteriorLF = calculatePerimeterLF();
  const interiorLF = calculateWallsLF();
  
  // Assume a door removes ~3 feet of baseboard and a window doesn't affect baseboard.
  // Interior walls have baseboard on both sides (x2), exterior perimeter has 1 side.
  const rawBaseboardLF = (exteriorLF + (interiorLF * 2)) - (doors.length * 3);
  const totalBaseboardLF = Math.max(0, rawBaseboardLF);
  const doorCasingLF = doors.length * 17; // rough estimate per door
  const windowCasingLF = windows.length * 12; // rough estimate per window
  const totalCasingLF = doorCasingLF + windowCasingLF;
  const totalCrownLF = exteriorLF + (interiorLF * 2);

  // Generate Materials Array
  const getMaterialDetails = (id: string, fallbackDesc: string, fallbackPrice: number) => {
    if (!id || id === 'none') return null;
    const item = inventoryItems.find(i => i.id === id || i.sku === id);
    if (item) {
      return { description: item.name, price: item.unit_price || fallbackPrice };
    }
    return { description: fallbackDesc, price: fallbackPrice };
  };

  const materials: any[] = [];
  
  const baseboardDetails = getMaterialDetails(baseboardId, "Standard Baseboard", 2.50);
  if (baseboardDetails && totalBaseboardLF > 0) {
    materials.push({ description: baseboardDetails.description, quantity: Math.ceil(totalBaseboardLF * 1.1), unit: 'LF', price: baseboardDetails.price });
  }

  const casingDetails = getMaterialDetails(casingId, "Standard Casing", 1.75);
  if (casingDetails) {
    if (doorCasingLF > 0) {
      materials.push({ description: `${casingDetails.description} (Doors)`, quantity: Math.ceil(doorCasingLF * 1.1), unit: 'LF', price: casingDetails.price });
    }
    if (windowCasingLF > 0) {
      materials.push({ description: `${casingDetails.description} (Windows)`, quantity: Math.ceil(windowCasingLF * 1.1), unit: 'LF', price: casingDetails.price });
    }
  }

  const crownDetails = getMaterialDetails(crownId, "Crown Molding", 3.00);
  if (crownDetails && totalCrownLF > 0 && crownId !== 'none') {
    materials.push({ description: crownDetails.description, quantity: Math.ceil(totalCrownLF * 1.1), unit: 'LF', price: crownDetails.price });
  }

  const wainscottingDetails = getMaterialDetails(wainscottingId, "Wainscotting Panels", 12.00);
  if (wainscottingDetails && totalBaseboardLF > 0 && wainscottingId !== 'none') {
    materials.push({ description: wainscottingDetails.description, quantity: Math.ceil(totalBaseboardLF * 1.1), unit: 'LF', price: wainscottingDetails.price });
  }

  if (doors.length > 0) {
    const doorGroups = doors.reduce((acc, door) => {
      const type = door.doorType || 'Prehung';
      const size = door.doorSize || '30"';
      let handingStr = '';
      if (type === 'Prehung') {
        const hand = door.doorHanding || 'Left';
        handingStr = ` - ${hand} Hand`;
      }
      
      const desc = `${type} Interior Door (${size})${handingStr}`;
      acc[desc] = (acc[desc] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(doorGroups).forEach(([desc, qty]) => {
      // Basic estimated prices based on type
      let price = 150.00;
      if (desc.includes('BiFolding')) price = 120.00;
      if (desc.includes('Slab')) price = 80.00;
      
      materials.push({ description: desc, quantity: qty, unit: 'EA', price });
    });

    // Hardware based on door count
    let standardDoorCount = doors.filter(d => d.doorType !== 'BiFolding' && d.doorType !== 'BiPassing').length;
    let bifoldPassCount = doors.filter(d => d.doorType === 'BiFolding' || d.doorType === 'BiPassing').length;
    
    // Fallback if types aren't matching perfectly
    if (standardDoorCount === 0 && bifoldPassCount === 0 && doors.length > 0) {
      standardDoorCount = doors.length;
    }

    if (standardDoorCount > 0) {
      materials.push({ description: `Jamb Stock (${jambStockSize})`, quantity: standardDoorCount, unit: 'EA', price: 25.00 });
      materials.push({ description: `Door Hinges (${hingeSize})`, quantity: standardDoorCount * 3, unit: 'EA', price: 4.50 });
      materials.push({ description: `Door Knob Set (${doorKnobType})`, quantity: standardDoorCount, unit: 'EA', price: 35.00 });
    }

    if (bifoldPassCount > 0) {
      materials.push({ description: `BiPassing/BiFold Track (${bipassTrackSize})`, quantity: bifoldPassCount, unit: 'EA', price: 45.00 });
    }
  }

  const totalCost = materials.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  // Filter inventory items for dropdowns
  const baseboardItems = inventoryItems.filter(i => i.name?.toLowerCase().includes('base') || i.category?.toLowerCase() === 'trim');
  const casingItems = inventoryItems.filter(i => i.name?.toLowerCase().includes('casing') || i.category?.toLowerCase() === 'trim');
  const crownItems = inventoryItems.filter(i => i.name?.toLowerCase().includes('crown') || i.category?.toLowerCase() === 'trim');
  const wainscottingItems = inventoryItems.filter(i => i.name?.toLowerCase().includes('wainscot') || i.category?.toLowerCase() === 'panel');

  return (
    <PermissionGate user={user} module="project-wizards" action="view">
      <div className="bg-slate-50 min-h-screen pb-12">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <LayoutGrid className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Floorplan Digitizer & Takeoff</h3>
                <p className="text-sm text-blue-700">Upload a floorplan, trace walls, and instantly generate material takeoffs.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-slate-200 print:hidden sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('digitizer')}
                className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'digitizer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Ruler className="w-4 h-4" /> Trace Floorplan
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'materials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Package className="w-4 h-4" /> Takeoff & Materials
              </button>
            </nav>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'digitizer' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Sidebar Tools */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base">1. Upload Image</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-slate-500">Supported: PDF, JPG, PNG</Label>
                      <Button asChild variant="outline" className="w-full relative overflow-hidden" disabled={loading}>
                        <label className={`cursor-pointer ${loading ? 'opacity-50' : ''}`}>
                          <UploadCloud className="w-4 h-4 mr-2" />
                          {loading ? 'Processing...' : (bgImage ? 'Replace Floorplan' : 'Upload Floorplan')}
                          <input type="file" accept="application/pdf, image/jpeg, image/png" className="hidden" disabled={loading} onChange={handleFileUpload} />
                        </label>
                      </Button>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        PDFs will automatically extract the first page.
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 mt-2">
                      <Button variant="secondary" size="sm" className="w-full" onClick={handleSaveDraft} disabled={loading || !bgImage}>
                        <Save className="w-4 h-4 mr-2" /> Save Draft
                      </Button>
                      <Button variant="secondary" size="sm" className="w-full" onClick={handleLoadDraft} disabled={loading}>
                        <FolderOpen className="w-4 h-4 mr-2" /> Load Draft
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base">2. Digitizing Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant={mode === 'calibrate' ? 'default' : 'outline'} 
                        className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${mode === 'calibrate' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                        onClick={() => setMode('calibrate')}
                      >
                        <Maximize2 className="w-5 h-5 mb-1" />
                        <span className="text-xs">Set Scale</span>
                      </Button>
                      <Button 
                        variant={mode === 'perimeter' ? 'default' : 'outline'} 
                        className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${mode === 'perimeter' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        onClick={() => setMode('perimeter')}
                      >
                        <Square className="w-5 h-5 mb-1" />
                        <span className="text-xs">Perimeter</span>
                      </Button>
                      <Button 
                        variant={mode === 'wall' ? 'default' : 'outline'} 
                        className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${mode === 'wall' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        onClick={() => { setMode('wall'); setCurrentWallPoint(null); }}
                      >
                        <Minus className="w-5 h-5 mb-1" />
                        <span className="text-xs">Int. Walls</span>
                      </Button>
                      <Button 
                        variant={mode === 'door' ? 'default' : 'outline'} 
                        className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${mode === 'door' ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' : ''}`}
                        onClick={() => setMode('door')}
                      >
                        <DoorOpen className="w-5 h-5 mb-1" />
                        <span className="text-xs">Add Doors</span>
                      </Button>
                      <Button 
                        variant={mode === 'window' ? 'default' : 'outline'} 
                        className={`h-auto py-3 px-2 flex flex-col items-center gap-1 ${mode === 'window' ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500' : ''}`}
                        onClick={() => setMode('window')}
                      >
                        <LayoutGrid className="w-5 h-5 mb-1" />
                        <span className="text-xs">Add Windows</span>
                      </Button>
                      <Button 
                        variant={mode === 'idle' ? 'default' : 'outline'} 
                        className="h-auto py-3 px-2 flex flex-col items-center gap-1"
                        onClick={() => setMode('idle')}
                      >
                        <MousePointer2 className="w-5 h-5 mb-1" />
                        <span className="text-xs">Select / Pan</span>
                      </Button>
                    </div>

                    {mode === 'door' && (
                      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                        <Label className="text-xs font-semibold text-slate-700">Door Settings</Label>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase text-slate-500 font-bold">Type</Label>
                          <Select value={currentDoorType} onValueChange={setCurrentDoorType}>
                            <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Prehung">Prehung</SelectItem>
                              <SelectItem value="BiFolding">BiFolding</SelectItem>
                              <SelectItem value="BiPassing">BiPassing</SelectItem>
                              <SelectItem value="Slab">Slab</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase text-slate-500 font-bold">Size</Label>
                          <Select value={currentDoorSize} onValueChange={setCurrentDoorSize}>
                            <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value='18"'>18"</SelectItem>
                              <SelectItem value='24"'>24"</SelectItem>
                              <SelectItem value='28"'>28"</SelectItem>
                              <SelectItem value='30"'>30"</SelectItem>
                              <SelectItem value='32"'>32"</SelectItem>
                              <SelectItem value='34"'>34"</SelectItem>
                              <SelectItem value='38"'>38"</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {currentDoorType === 'Prehung' && (
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-slate-500 font-bold">Handing</Label>
                            <Select value={currentDoorHanding} onValueChange={setCurrentDoorHanding}>
                              <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Left">Left Hand</SelectItem>
                                <SelectItem value="Right">Right Hand</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-4 text-sm text-slate-600 min-h-[80px]">
                      {mode === 'idle' && "Select a tool above to begin tracing."}
                      {mode === 'calibrate' && (!scaleData.p1 ? "Click to set the FIRST point of a known measurement." : "Click to set the SECOND point of the measurement.")}
                      {mode === 'perimeter' && "Click corners to trace the exterior perimeter. It will automatically connect."}
                      {mode === 'wall' && (!currentWallPoint ? "Click to START an interior wall segment." : "Click to END the interior wall segment.")}
                      {mode === 'door' && "Click on walls to place doors."}
                      {mode === 'window' && "Click on walls to place windows."}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <Button variant="ghost" size="sm" className="flex-1" onClick={handleUndoAction}>
                        <Undo className="w-4 h-4 mr-2" /> Undo
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => {
                        if (confirm("Clear all tracing data?")) {
                          saveHistory();
                          setPerimeter([]); setWalls([]); setDoors([]); setWindows([]);
                        }
                      }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Clear
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base">Real-time Takeoff</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Floor Area</span>
                      <span className="font-semibold text-slate-900">{sqFt > 0 ? sqFt.toFixed(1) : '--'} SqFt</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Est. Baseboard</span>
                      <span className="font-semibold text-slate-900">{totalBaseboardLF > 0 ? totalBaseboardLF.toFixed(1) : '--'} LF</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Doors Placed</span>
                      <span className="font-semibold text-slate-900">{doors.length || '--'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Windows Placed</span>
                      <span className="font-semibold text-slate-900">{windows.length || '--'}</span>
                    </div>
                    {pixelsPerFoot === 0 && (
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 flex items-start gap-1 mt-2">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        Please set scale to calculate real-world measurements.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Canvas Area */}
              <div className="lg:col-span-3 flex flex-col h-full">
                <div className="relative border-2 border-slate-300 rounded-lg shadow-inner bg-slate-200">
                  {bgImage && imageDims && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-md border border-slate-200 flex items-center p-1 z-10">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-medium w-12 text-center text-slate-600">{Math.round(zoom * 100)}%</span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900" onClick={() => setZoom(z => z + 0.1)}>
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-4 bg-slate-200 mx-1" />
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-medium text-slate-600 hover:text-slate-900" onClick={() => {
                        if (imageDims && containerRef.current) {
                          const cw = containerRef.current.clientWidth - 40;
                          const ch = containerRef.current.clientHeight - 40;
                          setZoom(Math.min(cw / imageDims.w, ch / imageDims.h));
                        }
                      }}>
                        Fit
                      </Button>
                      <div className="w-px h-4 bg-slate-200 mx-1" />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900" onClick={handleRotateImage} title="Rotate 90°">
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div 
                    ref={containerRef}
                    className="overflow-auto h-[700px] w-full"
                  >
                    {!bgImage ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                        <UploadCloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium text-slate-500">No Floorplan Uploaded</p>
                        <p className="text-sm">Upload an image file using the sidebar to begin tracing.</p>
                      </div>
                    ) : (
                      <div className="min-w-full min-h-full flex items-center justify-center p-4">
                        <div 
                          className={`relative inline-block bg-white shadow-sm transition-transform duration-75 ${mode !== 'idle' ? 'cursor-crosshair' : 'cursor-default'}`}
                          style={{ 
                            width: imageDims ? imageDims.w * zoom : 'auto', 
                            height: imageDims ? imageDims.h * zoom : 'auto' 
                          }}
                        >
                          <img 
                            ref={imgRef}
                            src={bgImage} 
                            alt="Floorplan" 
                            onLoad={handleImageLoad}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            draggable={false}
                          />
                          
                          {imageDims && (
                            <svg
                              ref={svgRef}
                          viewBox={`0 0 ${imageDims.w} ${imageDims.h}`}
                          className="absolute inset-0 w-full h-full pointer-events-auto"
                          onMouseMove={handleMouseMove}
                          onClick={handleClick}
                        >
                          {/* Scale Calibration Line */}
                          {scaleData.p1 && (
                            <line 
                              x1={scaleData.p1.x} y1={scaleData.p1.y} 
                              x2={scaleData.p2 ? scaleData.p2.x : mousePos.x} y2={scaleData.p2 ? scaleData.p2.y : mousePos.y}
                              stroke="#4f46e5" strokeWidth={Math.max(2, imageDims.w / 500)} strokeDasharray="5,5"
                            />
                          )}
                          {scaleData.p1 && <circle cx={scaleData.p1.x} cy={scaleData.p1.y} r={Math.max(4, imageDims.w / 300)} fill="#4f46e5" />}
                          {scaleData.p2 && <circle cx={scaleData.p2.x} cy={scaleData.p2.y} r={Math.max(4, imageDims.w / 300)} fill="#4f46e5" />}

                          {/* Perimeter Polygon */}
                          {perimeter.length > 0 && (
                            <>
                              <polygon 
                                points={perimeter.map(p => `${p.x},${p.y}`).join(' ')} 
                                fill="rgba(59, 130, 246, 0.15)" 
                                stroke="#2563eb" 
                                strokeWidth={Math.max(2, imageDims.w / 400)} 
                              />
                              {/* Line to mouse if actively tracing perimeter */}
                              {mode === 'perimeter' && (
                                <line 
                                  x1={perimeter[perimeter.length - 1].x} y1={perimeter[perimeter.length - 1].y}
                                  x2={mousePos.x} y2={mousePos.y}
                                  stroke="#3b82f6" strokeWidth={Math.max(2, imageDims.w / 400)} strokeDasharray="5,5"
                                />
                              )}
                              {perimeter.map((p, i) => (
                                <circle key={`perim-${i}`} cx={p.x} cy={p.y} r={Math.max(3, imageDims.w / 400)} fill="#1d4ed8" />
                              ))}
                            </>
                          )}

                          {/* Interior Walls */}
                          {walls.map((w, i) => (
                            <line 
                              key={`wall-${i}`}
                              x1={w.p1.x} y1={w.p1.y} x2={w.p2.x} y2={w.p2.y}
                              stroke="#475569" strokeWidth={Math.max(3, imageDims.w / 200)} strokeLinecap="round"
                            />
                          ))}
                          
                          {/* Active Wall Line */}
                          {mode === 'wall' && currentWallPoint && (
                            <line 
                              x1={currentWallPoint.x} y1={currentWallPoint.y}
                              x2={mousePos.x} y2={mousePos.y}
                              stroke="#64748b" strokeWidth={Math.max(3, imageDims.w / 200)} strokeDasharray="5,5" strokeLinecap="round"
                            />
                          )}

                          {/* Doors */}
                          {doors.map((d) => {
                            const dType = d.doorType || 'Prehung';
                            const dSize = d.doorSize || '30"';
                            const dHand = d.doorHanding || 'Left';
                            const dTitle = `${dType} (${dSize})${dType === 'Prehung' ? ` - ${dHand}` : ''}`;
                            return (
                              <g key={d.id} transform={`translate(${d.p.x}, ${d.p.y})`} className="cursor-pointer">
                                <title>{dTitle}</title>
                                <circle cx={0} cy={0} r={Math.max(6, imageDims.w / 150)} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                                <text x={0} y={Math.max(16, imageDims.w / 80)} fontSize={Math.max(12, imageDims.w / 100)} textAnchor="middle" fill="#b45309" fontWeight="bold">D</text>
                              </g>
                            );
                          })}

                          {/* Windows */}
                          {windows.map((w) => (
                            <g key={w.id} transform={`translate(${w.p.x}, ${w.p.y})`}>
                              <rect 
                                x={-Math.max(6, imageDims.w / 150)} y={-Math.max(6, imageDims.w / 150)} 
                                width={Math.max(12, imageDims.w / 75)} height={Math.max(12, imageDims.w / 75)} 
                                fill="#06b6d4" stroke="#fff" strokeWidth={2} 
                              />
                              <text x={0} y={Math.max(18, imageDims.w / 80)} fontSize={Math.max(12, imageDims.w / 100)} textAnchor="middle" fill="#0891b2" fontWeight="bold">W</text>
                            </g>
                          ))}
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

          {activeTab === 'materials' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Material Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Baseboard Profile</Label>
                      <Select value={baseboardId} onValueChange={setBaseboardId}>
                        <SelectTrigger><SelectValue placeholder="Select Baseboard..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern-5">5" Modern Flat (Default)</SelectItem>
                          <SelectItem value="colonial-3">3" Colonial (Default)</SelectItem>
                          {baseboardItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Door & Window Casing</Label>
                      <Select value={casingId} onValueChange={setCasingId}>
                        <SelectTrigger><SelectValue placeholder="Select Casing..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="colonial-2">2-1/4" Colonial (Default)</SelectItem>
                          <SelectItem value="modern-2">2-1/2" Modern (Default)</SelectItem>
                          {casingItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Crown Molding</Label>
                      <Select value={crownId} onValueChange={setCrownId}>
                        <SelectTrigger><SelectValue placeholder="Select Crown..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="standard-crown">Standard Crown Molding</SelectItem>
                          {crownItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Wainscotting</Label>
                      <Select value={wainscottingId} onValueChange={setWainscottingId}>
                        <SelectTrigger><SelectValue placeholder="Select Wainscotting..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="shaker-panel">Shaker Panel</SelectItem>
                          {wainscottingItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-semibold mb-4 text-slate-800">Door Hardware & Framing</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Jamb Stock</Label>
                          <Select value={jambStockSize} onValueChange={setJambStockSize}>
                            <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value='5"'>5"</SelectItem>
                              <SelectItem value='6"'>6"</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>BiPassing Track Size</Label>
                          <Select value={bipassTrackSize} onValueChange={setBipassTrackSize}>
                            <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value='48"'>48"</SelectItem>
                              <SelectItem value='72"'>72"</SelectItem>
                              <SelectItem value='96"'>96"</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Hinges Size</Label>
                          <Select value={hingeSize} onValueChange={setHingeSize}>
                            <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value='3"'>3"</SelectItem>
                              <SelectItem value='3-1/2"'>3-1/2"</SelectItem>
                              <SelectItem value='4"'>4"</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Door Knob Set</Label>
                          <Select value={doorKnobType} onValueChange={setDoorKnobType}>
                            <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Passage">Passage</SelectItem>
                              <SelectItem value="Bed and Bath">Bed and Bath</SelectItem>
                              <SelectItem value="Entrance">Entrance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex-1 w-full sm:w-auto">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700">Estimated Finishing Cost</p>
                          <p className="text-xs text-blue-600 mt-1">Based on linked inventory pricing</p>
                        </div>
                        <p className="text-2xl font-semibold text-blue-900">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    
                    <ProjectQuoteGenerator 
                      user={user}
                      projectType="interior"
                      materials={materials}
                      totalCost={totalCost}
                      projectData={{ sqFt, exteriorLF, interiorLF, doors: doors.length, windows: windows.length, baseboardId, casingId, crownId, wainscottingId }}
                    />
                  </div>

                  {materials.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <Package className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">No materials calculated</p>
                      <p className="text-sm text-slate-500 mt-1">Upload a floorplan and set the scale to generate a takeoff.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                          <tr>
                            <th className="px-4 py-3">Item Description</th>
                            <th className="px-4 py-3 text-right">Quantity (+10% Waste)</th>
                            <th className="px-4 py-3">Unit</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3 text-right">Ext. Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {materials.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                              <td className="px-4 py-3 text-right">{item.quantity}</td>
                              <td className="px-4 py-3">{item.unit}</td>
                              <td className="px-4 py-3 text-right">${item.price.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-medium text-slate-700">${(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}

