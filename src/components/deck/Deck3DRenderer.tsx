import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { DeckConfig } from '../../types/deck';
import { 
  Scene, 
  Color, 
  Fog, 
  PerspectiveCamera, 
  WebGLRenderer, 
  PCFSoftShadowMap,
  AmbientLight,
  DirectionalLight,
  PlaneGeometry,
  MeshStandardMaterial,
  Mesh,
  GridHelper,
  DoubleSide,
  EdgesGeometry,
  BoxGeometry,
  LineBasicMaterial,
  LineSegments
} from '../../utils/three-exports';

interface Deck3DRendererProps {
  config: DeckConfig;
  onRenderComplete?: () => void;
}

export interface Deck3DRendererRef {
  captureSnapshot: () => void;
  getSnapshotUrl: () => string | null;
}

export const Deck3DRenderer = forwardRef<Deck3DRendererRef, Deck3DRendererProps>(({ config, onRenderComplete }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
  } | null>(null);
  const snapshotImgRef = useRef<HTMLImageElement | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // Expose the captureSnapshot method and snapshotUrl to parent components
  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      updateSnapshot();
    },
    getSnapshotUrl: () => snapshotUrl
  }));

  // Function to update the snapshot image
  const updateSnapshot = () => {
    if (sceneRef.current && containerRef.current) {
      try {
        const dataUrl = sceneRef.current.renderer.domElement.toDataURL('image/png');
        setSnapshotUrl(dataUrl);
        
        // Create snapshot image if it doesn't exist
        if (!snapshotImgRef.current) {
          const img = document.createElement('img');
          img.alt = '3D Deck Render';
          img.className = 'print-snapshot hidden print:block absolute inset-0 w-full h-full object-contain';
          img.style.position = 'absolute';
          img.style.top = '0';
          img.style.left = '0';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain';
          img.style.zIndex = '9999';
          containerRef.current.appendChild(img);
          snapshotImgRef.current = img;
        }
        
        // Update the image source
        snapshotImgRef.current.src = dataUrl;
      } catch (error) {
        console.error('Failed to capture 3D canvas:', error);
      }
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Create scene
    const scene = new Scene();
    scene.background = new Color(0xe8f4f8);
    scene.fog = new Fog(0xe8f4f8, 10, 50);

    // Create camera
    const camera = new PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);

    // Create renderer
    const renderer = new WebGLRenderer({ 
      antialias: true,
      preserveDrawingBuffer: true // Required for printing/screenshots
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(15, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    const fillLight = new DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);

    // Convert feet to meters
    const scale = 0.3048;
    const deckWidth = config.width * scale;
    const deckLength = config.length * scale;
    const deckHeight = (config.height || 2) * scale;

    // BC Building Code specifications
    const foundationAboveGrade = 0.152; // 152mm (6") above grade per code
    const postStandoff = 0.025; // 25mm (1") standoff above foundation
    const postSize = deckHeight <= 2.0 * scale ? 0.089 : 0.140; // 89mm for low decks, 140mm for higher
    const deckingSpacing = 0.006; // 6mm minimum spacing between boards
    const deckBoardWidth = 0.140; // ~5.5 inches actual board width
    
    // L-shape dimensions
    const isLShape = config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength;
    const lShapeWidth = isLShape ? config.lShapeWidth * scale : 0;
    const lShapeLength = isLShape ? config.lShapeLength * scale : 0;
    const lShapePosition = config.lShapePosition || 'top-left';
    
    // Create ground
    const groundGeometry = new PlaneGeometry(50, 50);
    const groundMaterial = new MeshStandardMaterial({ 
      color: 0x4a7c59,
      roughness: 0.9,
      metalness: 0.0
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -deckHeight - foundationAboveGrade;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground grid
    const gridHelper = new GridHelper(30, 30, 0x6b8f72, 0x85a887);
    gridHelper.position.y = -deckHeight - foundationAboveGrade + 0.01;
    scene.add(gridHelper);

    // House wall on back side (permanent structure)
    const wallHeight = 3.0; // 3 meters tall wall
    const wallThickness = 0.2; // 200mm thick wall
    const wallWidth = isLShape ? Math.max(deckWidth, deckWidth + lShapeWidth) : deckWidth;
    
    const wallGeometry = new BoxGeometry(wallWidth * 1.5, wallHeight, wallThickness);
    const wallMaterial = new MeshStandardMaterial({ 
      color: 0xd4c5b0, // Beige/tan house color
      roughness: 0.85,
      metalness: 0.0
    });
    const wall = new Mesh(wallGeometry, wallMaterial);
    wall.position.set(0, -deckHeight + wallHeight/2, -deckLength/2 - wallThickness/2);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    // Wall trim/siding detail lines
    const trimMaterial = new MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.0
    });
    
    // Horizontal trim board at deck level
    const trimGeometry = new BoxGeometry(wallWidth * 1.5, 0.15, 0.05);
    const deckLevelTrim = new Mesh(trimGeometry, trimMaterial);
    deckLevelTrim.position.set(0, 0, -deckLength/2 - wallThickness - 0.025);
    deckLevelTrim.castShadow = true;
    scene.add(deckLevelTrim);

    // Deck material
    const deckMaterial = new MeshStandardMaterial({ 
      color: 0x8b6f47,
      roughness: 0.8,
      metalness: 0.1
    });

    // Create deck surfaces (main + L-shape extension if applicable)
    if (isLShape) {
      // Main deck section
      const mainDeckGeometry = new BoxGeometry(deckWidth, 0.15, deckLength);
      const mainDeck = new Mesh(mainDeckGeometry, deckMaterial);
      mainDeck.position.set(0, 0.075, 0);
      mainDeck.castShadow = true;
      mainDeck.receiveShadow = true;
      scene.add(mainDeck);

      // L-shape extension
      const lDeckGeometry = new BoxGeometry(lShapeWidth, 0.15, lShapeLength);
      const lDeck = new Mesh(lDeckGeometry, deckMaterial);
      
      // Position based on lShapePosition
      switch (lShapePosition) {
        case 'top-right':
          lDeck.position.set(deckWidth/2 + lShapeWidth/2, 0.075, -deckLength/2 + lShapeLength/2);
          break;
        case 'bottom-right':
          lDeck.position.set(deckWidth/2 + lShapeWidth/2, 0.075, deckLength/2 - lShapeLength/2);
          break;
        case 'bottom-left':
          lDeck.position.set(-deckWidth/2 - lShapeWidth/2, 0.075, deckLength/2 - lShapeLength/2);
          break;
        case 'top-left':
        default:
          lDeck.position.set(-deckWidth/2 - lShapeWidth/2, 0.075, -deckLength/2 + lShapeLength/2);
          break;
      }
      lDeck.castShadow = true;
      lDeck.receiveShadow = true;
      scene.add(lDeck);

      // Add edges to L-shape decks
      const mainDeckEdges = new EdgesGeometry(mainDeckGeometry);
      const edgesMaterial = new LineBasicMaterial({ color: 0x5a4a3a, linewidth: 2 });
      const mainDeckLines = new LineSegments(mainDeckEdges, edgesMaterial);
      mainDeckLines.position.copy(mainDeck.position);
      scene.add(mainDeckLines);

      const lDeckEdges = new EdgesGeometry(lDeckGeometry);
      const lDeckLines = new LineSegments(lDeckEdges, edgesMaterial);
      lDeckLines.position.copy(lDeck.position);
      scene.add(lDeckLines);
    } else {
      // Regular rectangular deck
      const deckGeometry = new BoxGeometry(deckWidth, 0.15, deckLength);
      const deck = new Mesh(deckGeometry, deckMaterial);
      deck.position.set(0, 0.075, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      scene.add(deck);

      // Add edges to deck
      const deckEdges = new EdgesGeometry(deckGeometry);
      const edgesMaterial = new LineBasicMaterial({ color: 0x5a4a3a, linewidth: 2 });
      const deckLines = new LineSegments(deckEdges, edgesMaterial);
      deckLines.position.copy(deck.position);
      scene.add(deckLines);
    }

    // Deck boards (visual detail with proper spacing)
    const boardMaterial = new MeshStandardMaterial({ 
      color: 0x9d7f54,
      roughness: 0.9
    });

    // Main deck boards
    const numBoards = Math.floor(deckLength / (deckBoardWidth + deckingSpacing));
    for (let i = 0; i < numBoards; i++) {
      const boardGeometry = new BoxGeometry(deckWidth * 0.98, 0.03, deckBoardWidth - deckingSpacing);
      const board = new Mesh(boardGeometry, boardMaterial);
      board.position.set(
        0, 
        0.165,
        -deckLength/2 + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2
      );
      scene.add(board);
    }

    // L-shape extension boards
    if (isLShape) {
      const numLBoards = Math.floor(lShapeLength / (deckBoardWidth + deckingSpacing));
      for (let i = 0; i < numLBoards; i++) {
        const boardGeometry = new BoxGeometry(lShapeWidth * 0.98, 0.03, deckBoardWidth - deckingSpacing);
        const board = new Mesh(boardGeometry, boardMaterial);
        
        let boardX = 0, boardZ = 0;
        switch (lShapePosition) {
          case 'top-right':
            boardX = deckWidth/2 + lShapeWidth/2;
            boardZ = -deckLength/2 + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2;
            break;
          case 'bottom-right':
            boardX = deckWidth/2 + lShapeWidth/2;
            boardZ = deckLength/2 - lShapeLength + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2;
            break;
          case 'bottom-left':
            boardX = -deckWidth/2 - lShapeWidth/2;
            boardZ = deckLength/2 - lShapeLength + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2;
            break;
          case 'top-left':
          default:
            boardX = -deckWidth/2 - lShapeWidth/2;
            boardZ = -deckLength/2 + i * (deckBoardWidth + deckingSpacing) + deckBoardWidth/2;
            break;
        }
        
        board.position.set(boardX, 0.165, boardZ);
        scene.add(board);
      }
    }

    // Concrete foundations (piers) - 152mm (6") above grade per BC Building Code
    const foundationGeometry = new BoxGeometry(0.3, foundationAboveGrade, 0.3);
    const foundationMaterial = new MeshStandardMaterial({ 
      color: 0x888888,
      roughness: 0.9,
      metalness: 0.0
    });

    // Support posts with proper standoff and sizing per BC Building Code
    const supportPostHeight = deckHeight - postStandoff;
    const supportPostGeometry = new BoxGeometry(postSize, supportPostHeight, postSize);
    const supportPostMaterial = new MeshStandardMaterial({ 
      color: 0x6b5d4f,
      roughness: 0.7
    });

    // Post base/saddle anchor (simulated as standoff)
    const standoffGeometry = new BoxGeometry(postSize + 0.02, postStandoff, postSize + 0.02);
    const standoffMaterial = new MeshStandardMaterial({ 
      color: 0x999999,
      roughness: 0.4,
      metalness: 0.6
    });

    // Calculate post positions based on shape
    let postPositions: number[][] = [];
    
    if (isLShape) {
      // For L-shape, we need posts at corners of both rectangles
      // Main deck corners
      postPositions.push(
        [-deckWidth/2 + 0.3, 0, -deckLength/2 + 0.3],
        [deckWidth/2 - 0.3, 0, -deckLength/2 + 0.3],
        [-deckWidth/2 + 0.3, 0, deckLength/2 - 0.3],
        [deckWidth/2 - 0.3, 0, deckLength/2 - 0.3]
      );
      
      // L-shape extension corners (varies by position)
      switch (lShapePosition) {
        case 'top-right':
          postPositions.push(
            [deckWidth/2 + lShapeWidth - 0.3, 0, -deckLength/2 + 0.3],
            [deckWidth/2 + lShapeWidth - 0.3, 0, -deckLength/2 + lShapeLength - 0.3]
          );
          break;
        case 'bottom-right':
          postPositions.push(
            [deckWidth/2 + lShapeWidth - 0.3, 0, deckLength/2 - lShapeLength + 0.3],
            [deckWidth/2 + lShapeWidth - 0.3, 0, deckLength/2 - 0.3]
          );
          break;
        case 'bottom-left':
          postPositions.push(
            [-deckWidth/2 - lShapeWidth + 0.3, 0, deckLength/2 - lShapeLength + 0.3],
            [-deckWidth/2 - lShapeWidth + 0.3, 0, deckLength/2 - 0.3]
          );
          break;
        case 'top-left':
        default:
          postPositions.push(
            [-deckWidth/2 - lShapeWidth + 0.3, 0, -deckLength/2 + 0.3],
            [-deckWidth/2 - lShapeWidth + 0.3, 0, -deckLength/2 + lShapeLength - 0.3]
          );
          break;
      }
    } else {
      // Regular rectangular deck
      postPositions = [
        [-deckWidth/2 + 0.3, 0, -deckLength/2 + 0.3],
        [deckWidth/2 - 0.3, 0, -deckLength/2 + 0.3],
        [-deckWidth/2 + 0.3, 0, deckLength/2 - 0.3],
        [deckWidth/2 - 0.3, 0, deckLength/2 - 0.3],
      ];
    }

    postPositions.forEach(([x, _, z]) => {
      // Concrete foundation pier
      const foundation = new Mesh(foundationGeometry, foundationMaterial);
      foundation.position.set(x, -deckHeight - foundationAboveGrade/2, z);
      foundation.castShadow = true;
      foundation.receiveShadow = true;
      scene.add(foundation);

      // Metal post base/standoff (25mm standoff per code)
      const standoff = new Mesh(standoffGeometry, standoffMaterial);
      standoff.position.set(x, -deckHeight + postStandoff/2, z);
      standoff.castShadow = true;
      scene.add(standoff);

      // Support post (elevated above foundation)
      const post = new Mesh(supportPostGeometry, supportPostMaterial);
      post.position.set(x, -supportPostHeight/2 - postStandoff, z);
      post.castShadow = true;
      scene.add(post);
    });

    // Railings - Complete perimeter excluding house side (back) and stairs
    if (isLShape) {
      // For L-shaped decks, calculate complete outer perimeter
      const railingHeight = (config.railingHeight || 42) / 12 * scale;
      
      const deckSurfaceY = 0.15;
      const bottomGap = (2 / 12) * scale;
      const railThickness = 0.05;
      
      const topRailY = deckSurfaceY + railingHeight - railThickness/2;
      const bottomRailY = deckSurfaceY + bottomGap + railThickness/2;
      
      const balusterTopY = topRailY - railThickness/2;
      const balusterBottomY = bottomRailY + railThickness/2;
      const balusterLength = balusterTopY - balusterBottomY;
      const balusterCenterY = (balusterTopY + balusterBottomY) / 2;
      
      const postExtraHeight = (2 / 12) * scale;
      const postHeight = railingHeight + postExtraHeight;
      const postY = postHeight / 2 + deckSurfaceY;
      
      const railingMaterial = new MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.2
      });

      const postGeometry = new BoxGeometry(postSize, postHeight, postSize);
      const postMaterial = new MeshStandardMaterial({ 
        color: 0xe8e8e8,
        roughness: 0.4,
        metalness: 0.1
      });

      // Define complete outer perimeter segments (clockwise from top-right)
      // Exclude segments on the back/house side (z = -deckLength/2)
      const railingSegments: Array<{x1: number, z1: number, x2: number, z2: number, side?: string, isConnection?: boolean, isLShape?: boolean}> = [];
      
      switch (lShapePosition) {
        case 'top-right':
          // Complete outer perimeter for top-right L-shape
          // 1. L-shape right outer edge (from back corner down to where it meets main deck)
          railingSegments.push({ 
            x1: deckWidth/2 + lShapeWidth, z1: -deckLength/2, 
            x2: deckWidth/2 + lShapeWidth, z2: -deckLength/2 + lShapeLength, 
            side: 'right',
            isLShape: true 
          });
          // 2. L-shape bottom edge (connecting L to main deck) - INTERIOR CONNECTION
          railingSegments.push({ 
            x1: deckWidth/2 + lShapeWidth, z1: -deckLength/2 + lShapeLength, 
            x2: deckWidth/2, z2: -deckLength/2 + lShapeLength, 
            side: 'right',
            isConnection: true 
          });
          // 3. Main right edge (from L connection down to bottom)
          railingSegments.push({ 
            x1: deckWidth/2, z1: -deckLength/2 + lShapeLength, 
            x2: deckWidth/2, z2: deckLength/2, 
            side: 'right' 
          });
          // 4. Main front edge
          railingSegments.push({ 
            x1: deckWidth/2, z1: deckLength/2, 
            x2: -deckWidth/2, z2: deckLength/2, 
            side: 'front' 
          });
          // 5. Main left edge (full height)
          railingSegments.push({ 
            x1: -deckWidth/2, z1: deckLength/2, 
            x2: -deckWidth/2, z2: -deckLength/2, 
            side: 'left' 
          });
          break;
          
        case 'bottom-right':
          // Complete outer perimeter for bottom-right L-shape
          // 1. Main right edge (from back down to where L starts)
          railingSegments.push({ 
            x1: deckWidth/2, z1: -deckLength/2, 
            x2: deckWidth/2, z2: deckLength/2 - lShapeLength, 
            side: 'right' 
          });
          // 2. Connection from main to L - INTERIOR CONNECTION
          railingSegments.push({ 
            x1: deckWidth/2, z1: deckLength/2 - lShapeLength, 
            x2: deckWidth/2 + lShapeWidth, z2: deckLength/2 - lShapeLength, 
            side: 'right',
            isConnection: true 
          });
          // 3. L right outer edge (from connection down to bottom)
          railingSegments.push({ 
            x1: deckWidth/2 + lShapeWidth, z1: deckLength/2 - lShapeLength, 
            x2: deckWidth/2 + lShapeWidth, z2: deckLength/2, 
            side: 'right',
            isLShape: true 
          });
          // 4. L bottom edge
          railingSegments.push({ 
            x1: deckWidth/2 + lShapeWidth, z1: deckLength/2, 
            x2: deckWidth/2, z2: deckLength/2, 
            side: 'front',
            isLShape: true 
          });
          // 5. Main front edge
          railingSegments.push({ 
            x1: deckWidth/2, z1: deckLength/2, 
            x2: -deckWidth/2, z2: deckLength/2, 
            side: 'front' 
          });
          // 6. Main left edge
          railingSegments.push({ 
            x1: -deckWidth/2, z1: deckLength/2, 
            x2: -deckWidth/2, z2: -deckLength/2, 
            side: 'left' 
          });
          break;
          
        case 'bottom-left':
          // Complete outer perimeter for bottom-left L-shape
          // 1. Main right edge
          railingSegments.push({ 
            x1: deckWidth/2, z1: -deckLength/2, 
            x2: deckWidth/2, z2: deckLength/2, 
            side: 'right' 
          });
          // 2. Main front edge
          railingSegments.push({ 
            x1: deckWidth/2, z1: deckLength/2, 
            x2: -deckWidth/2, z2: deckLength/2, 
            side: 'front' 
          });
          // 3. L bottom edge
          railingSegments.push({ 
            x1: -deckWidth/2, z1: deckLength/2, 
            x2: -deckWidth/2 - lShapeWidth, z2: deckLength/2, 
            side: 'front',
            isLShape: true 
          });
          // 4. L left outer edge (from bottom up)
          railingSegments.push({ 
            x1: -deckWidth/2 - lShapeWidth, z1: deckLength/2, 
            x2: -deckWidth/2 - lShapeWidth, z2: deckLength/2 - lShapeLength, 
            side: 'left',
            isLShape: true 
          });
          // 5. Connection from L to main - INTERIOR CONNECTION
          railingSegments.push({ 
            x1: -deckWidth/2 - lShapeWidth, z1: deckLength/2 - lShapeLength, 
            x2: -deckWidth/2, z2: deckLength/2 - lShapeLength, 
            side: 'left',
            isConnection: true 
          });
          // 6. Main left edge (partial, from L connection to back)
          railingSegments.push({ 
            x1: -deckWidth/2, z1: deckLength/2 - lShapeLength, 
            x2: -deckWidth/2, z2: -deckLength/2, 
            side: 'left' 
          });
          break;
          
        case 'top-left':
        default:
          // Complete outer perimeter for top-left L-shape
          // 1. Main right edge (full height)
          railingSegments.push({ 
            x1: deckWidth/2, z1: -deckLength/2, 
            x2: deckWidth/2, z2: deckLength/2, 
            side: 'right' 
          });
          // 2. Main front edge
          railingSegments.push({ 
            x1: deckWidth/2, z1: deckLength/2, 
            x2: -deckWidth/2, z2: deckLength/2, 
            side: 'front' 
          });
          // 3. Main left edge (from bottom up to where L starts)
          railingSegments.push({ 
            x1: -deckWidth/2, z1: deckLength/2, 
            x2: -deckWidth/2, z2: -deckLength/2 + lShapeLength, 
            side: 'left' 
          });
          // 4. Connection from main to L (horizontal) - INTERIOR CONNECTION
          railingSegments.push({ 
            x1: -deckWidth/2, z1: -deckLength/2 + lShapeLength, 
            x2: -deckWidth/2 - lShapeWidth, z2: -deckLength/2 + lShapeLength, 
            side: 'left',
            isConnection: true 
          });
          // 5. L left outer edge (from connection up to back/house wall)
          railingSegments.push({ 
            x1: -deckWidth/2 - lShapeWidth, z1: -deckLength/2 + lShapeLength, 
            x2: -deckWidth/2 - lShapeWidth, z2: -deckLength/2, 
            side: 'left',
            isLShape: true 
          });
          // Back edge excluded (house side)
          break;
      }

      // Draw railings for each segment
      railingSegments.forEach(seg => {
        const segLength = Math.sqrt((seg.x2 - seg.x1) ** 2 + (seg.z2 - seg.z1) ** 2);
        const centerX = (seg.x1 + seg.x2) / 2;
        const centerZ = (seg.z1 + seg.z2) / 2;
        const angle = Math.atan2(seg.z2 - seg.z1, seg.x2 - seg.x1);
        
        const stairWidth = (config.stairWidth || 4) * scale;
        // Only apply stair gaps to main deck outer perimeter edges, not interior connections or L-shape segments
        const hasStairsOnSegment = !seg.isConnection && !seg.isLShape && config.hasStairs && config.stairSide === seg.side;
        
        if (segLength > 0.1) {
          if (hasStairsOnSegment) {
            // Split railing into two sections around stairs
            const gapHalfWidth = stairWidth / 2;
            const segmentVector = { x: seg.x2 - seg.x1, z: seg.z2 - seg.z1 };
            const segmentLength = Math.sqrt(segmentVector.x ** 2 + segmentVector.z ** 2);
            const unitVector = { x: segmentVector.x / segmentLength, z: segmentVector.z / segmentLength };
            
            // Calculate center of segment for stair placement
            const centerPt = { x: (seg.x1 + seg.x2) / 2, z: (seg.z1 + seg.z2) / 2 };
            
            // Left section (from seg.x1,z1 to center - gap)
            const leftEndPt = { 
              x: centerPt.x - unitVector.x * gapHalfWidth, 
              z: centerPt.z - unitVector.z * gapHalfWidth 
            };
            const leftLength = Math.sqrt((leftEndPt.x - seg.x1) ** 2 + (leftEndPt.z - seg.z1) ** 2);
            
            // Right section (from center + gap to seg.x2,z2)
            const rightStartPt = { 
              x: centerPt.x + unitVector.x * gapHalfWidth, 
              z: centerPt.z + unitVector.z * gapHalfWidth 
            };
            const rightLength = Math.sqrt((seg.x2 - rightStartPt.x) ** 2 + (seg.z2 - rightStartPt.z) ** 2);
            
            // Draw left section
            if (leftLength > 0.2) {
              const leftCenterX = (seg.x1 + leftEndPt.x) / 2;
              const leftCenterZ = (seg.z1 + leftEndPt.z) / 2;
              
              const topRailGeometry = new BoxGeometry(leftLength, 0.05, 0.05);
              const topRail = new Mesh(topRailGeometry, railingMaterial);
              topRail.position.set(leftCenterX, topRailY, leftCenterZ);
              topRail.rotation.y = angle;
              topRail.castShadow = true;
              scene.add(topRail);
              
              const bottomRail = new Mesh(topRailGeometry.clone(), railingMaterial);
              bottomRail.position.set(leftCenterX, bottomRailY, leftCenterZ);
              bottomRail.rotation.y = angle;
              scene.add(bottomRail);

              // Balusters for left section
              const balusterSpacing = 0.15;
              const balusterGeometry = new BoxGeometry(0.04, balusterLength, 0.04);
              const numBalusters = Math.floor(leftLength / balusterSpacing);

              for (let i = 0; i < numBalusters; i++) {
                const t = i / (numBalusters - 1 || 1);
                const balX = seg.x1 + (leftEndPt.x - seg.x1) * t;
                const balZ = seg.z1 + (leftEndPt.z - seg.z1) * t;
                const baluster = new Mesh(balusterGeometry, railingMaterial);
                baluster.position.set(balX, balusterCenterY, balZ);
                scene.add(baluster);
              }

              // Posts for left section (including end post at gap)
              const maxPostSpacing = 8 * scale;
              const numSpaces = Math.ceil(leftLength / maxPostSpacing);
              const numPosts = numSpaces + 1;

              for (let i = 0; i < numPosts; i++) {
                const t = i / numSpaces;
                const postX = seg.x1 + (leftEndPt.x - seg.x1) * t;
                const postZ = seg.z1 + (leftEndPt.z - seg.z1) * t;
                const post = new Mesh(postGeometry, postMaterial);
                post.position.set(postX, postY, postZ);
                post.castShadow = true;
                scene.add(post);
              }
            }
            
            // Draw right section
            if (rightLength > 0.2) {
              const rightCenterX = (rightStartPt.x + seg.x2) / 2;
              const rightCenterZ = (rightStartPt.z + seg.z2) / 2;
              
              const topRailGeometry = new BoxGeometry(rightLength, 0.05, 0.05);
              const topRail = new Mesh(topRailGeometry, railingMaterial);
              topRail.position.set(rightCenterX, topRailY, rightCenterZ);
              topRail.rotation.y = angle;
              topRail.castShadow = true;
              scene.add(topRail);
              
              const bottomRail = new Mesh(topRailGeometry.clone(), railingMaterial);
              bottomRail.position.set(rightCenterX, bottomRailY, rightCenterZ);
              bottomRail.rotation.y = angle;
              scene.add(bottomRail);

              // Balusters for right section
              const balusterSpacing = 0.15;
              const balusterGeometry = new BoxGeometry(0.04, balusterLength, 0.04);
              const numBalusters = Math.floor(rightLength / balusterSpacing);

              for (let i = 0; i < numBalusters; i++) {
                const t = i / (numBalusters - 1 || 1);
                const balX = rightStartPt.x + (seg.x2 - rightStartPt.x) * t;
                const balZ = rightStartPt.z + (seg.z2 - rightStartPt.z) * t;
                const baluster = new Mesh(balusterGeometry, railingMaterial);
                baluster.position.set(balX, balusterCenterY, balZ);
                scene.add(baluster);
              }

              // Posts for right section (including start post at gap)
              const maxPostSpacing = 8 * scale;
              const numSpaces = Math.ceil(rightLength / maxPostSpacing);
              const numPosts = numSpaces + 1;

              for (let i = 0; i < numPosts; i++) {
                const t = i / numSpaces;
                const postX = rightStartPt.x + (seg.x2 - rightStartPt.x) * t;
                const postZ = rightStartPt.z + (seg.z2 - rightStartPt.z) * t;
                const post = new Mesh(postGeometry, postMaterial);
                post.position.set(postX, postY, postZ);
                post.castShadow = true;
                scene.add(post);
              }
            }
          } else {
            // No stairs on this segment - full length railing
            // Top rail
            const topRailGeometry = new BoxGeometry(segLength, 0.05, 0.05);
            const topRail = new Mesh(topRailGeometry, railingMaterial);
            topRail.position.set(centerX, topRailY, centerZ);
            topRail.rotation.y = angle;
            topRail.castShadow = true;
            scene.add(topRail);
            
            // Bottom rail
            const bottomRail = new Mesh(topRailGeometry.clone(), railingMaterial);
            bottomRail.position.set(centerX, bottomRailY, centerZ);
            bottomRail.rotation.y = angle;
            scene.add(bottomRail);

            // Balusters
            const balusterSpacing = 0.15;
            const balusterGeometry = new BoxGeometry(0.04, balusterLength, 0.04);
            const numBalusters = Math.floor(segLength / balusterSpacing);

            for (let i = 0; i < numBalusters; i++) {
              const t = i / (numBalusters - 1 || 1);
              const balX = seg.x1 + (seg.x2 - seg.x1) * t;
              const balZ = seg.z1 + (seg.z2 - seg.z1) * t;
              const baluster = new Mesh(balusterGeometry, railingMaterial);
              baluster.position.set(balX, balusterCenterY, balZ);
              scene.add(baluster);
            }

            // Posts along segment
            const maxPostSpacing = 8 * scale;
            const numSpaces = Math.ceil(segLength / maxPostSpacing);
            const numPosts = numSpaces + 1;

            for (let i = 0; i < numPosts; i++) {
              const t = i / numSpaces;
              const postX = seg.x1 + (seg.x2 - seg.x1) * t;
              const postZ = seg.z1 + (seg.z2 - seg.z1) * t;
              const post = new Mesh(postGeometry, postMaterial);
              post.position.set(postX, postY, postZ);
              post.castShadow = true;
              scene.add(post);
            }
          }
        }
      });
    } else {
      // Rectangular deck - Complete perimeter excluding house side (back) and stairs
      const railingHeight = (config.railingHeight || 42) / 12 * scale;
      
      const deckSurfaceY = 0.15;
      const bottomGap = (2 / 12) * scale;
      const railThickness = 0.05;
      
      const topRailY = deckSurfaceY + railingHeight - railThickness/2;
      const bottomRailY = deckSurfaceY + bottomGap + railThickness/2;
      
      const balusterTopY = topRailY - railThickness/2;
      const balusterBottomY = bottomRailY + railThickness/2;
      const balusterLength = balusterTopY - balusterBottomY;
      const balusterCenterY = (balusterTopY + balusterBottomY) / 2;
      
      const postExtraHeight = (2 / 12) * scale;
      const postHeight = railingHeight + postExtraHeight;
      const postY = postHeight / 2 + deckSurfaceY;

      const railingMaterial = new MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.2
      });

      const postGeometry = new BoxGeometry(postSize, postHeight, postSize);
      const postMaterial = new MeshStandardMaterial({ 
        color: 0xe8e8e8,
        roughness: 0.4,
        metalness: 0.1
      });

      // Define perimeter segments excluding back (house side)
      const sides = [
        { name: 'right', x1: deckWidth/2, z1: -deckLength/2, x2: deckWidth/2, z2: deckLength/2 },
        { name: 'front', x1: deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: deckLength/2 },
        { name: 'left', x1: -deckWidth/2, z1: deckLength/2, x2: -deckWidth/2, z2: -deckLength/2 }
        // 'back' excluded (house side)
      ];

      sides.forEach(side => {
        const segLength = Math.sqrt((side.x2 - side.x1) ** 2 + (side.z2 - side.z1) ** 2);
        const centerX = (side.x1 + side.x2) / 2;
        const centerZ = (side.z1 + side.z2) / 2;
        const angle = Math.atan2(side.z2 - side.z1, side.x2 - side.x1);
        
        const stairWidth = (config.stairWidth || 4) * scale;
        const hasStairsOnThisSide = config.hasStairs && config.stairSide === side.name;
        
        if (segLength > 0.1) {
          if (hasStairsOnThisSide) {
            // Split railing into two sections around stairs
            const gapHalfWidth = stairWidth / 2;
            const segmentVector = { x: side.x2 - side.x1, z: side.z2 - side.z1 };
            const segmentLength = Math.sqrt(segmentVector.x ** 2 + segmentVector.z ** 2);
            const unitVector = { x: segmentVector.x / segmentLength, z: segmentVector.z / segmentLength };
            
            // Calculate center of segment for stair placement
            const centerPt = { x: (side.x1 + side.x2) / 2, z: (side.z1 + side.z2) / 2 };
            
            // Left section (from side.x1,z1 to center - gap)
            const leftEndPt = { 
              x: centerPt.x - unitVector.x * gapHalfWidth, 
              z: centerPt.z - unitVector.z * gapHalfWidth 
            };
            const leftLength = Math.sqrt((leftEndPt.x - side.x1) ** 2 + (leftEndPt.z - side.z1) ** 2);
            
            // Right section (from center + gap to side.x2,z2)
            const rightStartPt = { 
              x: centerPt.x + unitVector.x * gapHalfWidth, 
              z: centerPt.z + unitVector.z * gapHalfWidth 
            };
            const rightLength = Math.sqrt((side.x2 - rightStartPt.x) ** 2 + (side.z2 - rightStartPt.z) ** 2);
            
            // Draw left section
            if (leftLength > 0.2) {
              const leftCenterX = (side.x1 + leftEndPt.x) / 2;
              const leftCenterZ = (side.z1 + leftEndPt.z) / 2;
              
              const topRailGeometry = new BoxGeometry(leftLength, 0.05, 0.05);
              const topRail = new Mesh(topRailGeometry, railingMaterial);
              topRail.position.set(leftCenterX, topRailY, leftCenterZ);
              topRail.rotation.y = angle;
              topRail.castShadow = true;
              scene.add(topRail);
              
              const bottomRail = new Mesh(topRailGeometry.clone(), railingMaterial);
              bottomRail.position.set(leftCenterX, bottomRailY, leftCenterZ);
              bottomRail.rotation.y = angle;
              scene.add(bottomRail);

              // Balusters for left section
              const balusterSpacing = 0.15;
              const balusterGeometry = new BoxGeometry(0.04, balusterLength, 0.04);
              const numBalusters = Math.floor(leftLength / balusterSpacing);

              for (let i = 0; i < numBalusters; i++) {
                const t = i / (numBalusters - 1 || 1);
                const balX = side.x1 + (leftEndPt.x - side.x1) * t;
                const balZ = side.z1 + (leftEndPt.z - side.z1) * t;
                const baluster = new Mesh(balusterGeometry, railingMaterial);
                baluster.position.set(balX, balusterCenterY, balZ);
                scene.add(baluster);
              }

              // Posts for left section (including end post at gap)
              const maxPostSpacing = 8 * scale;
              const numSpaces = Math.ceil(leftLength / maxPostSpacing);
              const numPosts = numSpaces + 1;

              for (let i = 0; i < numPosts; i++) {
                const t = i / numSpaces;
                const postX = side.x1 + (leftEndPt.x - side.x1) * t;
                const postZ = side.z1 + (leftEndPt.z - side.z1) * t;
                const post = new Mesh(postGeometry, postMaterial);
                post.position.set(postX, postY, postZ);
                post.castShadow = true;
                scene.add(post);
              }
            }
            
            // Draw right section
            if (rightLength > 0.2) {
              const rightCenterX = (rightStartPt.x + side.x2) / 2;
              const rightCenterZ = (rightStartPt.z + side.z2) / 2;
              
              const topRailGeometry = new BoxGeometry(rightLength, 0.05, 0.05);
              const topRail = new Mesh(topRailGeometry, railingMaterial);
              topRail.position.set(rightCenterX, topRailY, rightCenterZ);
              topRail.rotation.y = angle;
              topRail.castShadow = true;
              scene.add(topRail);
              
              const bottomRail = new Mesh(topRailGeometry.clone(), railingMaterial);
              bottomRail.position.set(rightCenterX, bottomRailY, rightCenterZ);
              bottomRail.rotation.y = angle;
              scene.add(bottomRail);

              // Balusters for right section
              const balusterSpacing = 0.15;
              const balusterGeometry = new BoxGeometry(0.04, balusterLength, 0.04);
              const numBalusters = Math.floor(rightLength / balusterSpacing);

              for (let i = 0; i < numBalusters; i++) {
                const t = i / (numBalusters - 1 || 1);
                const balX = rightStartPt.x + (side.x2 - rightStartPt.x) * t;
                const balZ = rightStartPt.z + (side.z2 - rightStartPt.z) * t;
                const baluster = new Mesh(balusterGeometry, railingMaterial);
                baluster.position.set(balX, balusterCenterY, balZ);
                scene.add(baluster);
              }

              // Posts for right section (including start post at gap)
              const maxPostSpacing = 8 * scale;
              const numSpaces = Math.ceil(rightLength / maxPostSpacing);
              const numPosts = numSpaces + 1;

              for (let i = 0; i < numPosts; i++) {
                const t = i / numSpaces;
                const postX = rightStartPt.x + (side.x2 - rightStartPt.x) * t;
                const postZ = rightStartPt.z + (side.z2 - rightStartPt.z) * t;
                const post = new Mesh(postGeometry, postMaterial);
                post.position.set(postX, postY, postZ);
                post.castShadow = true;
                scene.add(post);
              }
            }
          } else {
            // No stairs on this side - full length railing
            // Top rail
            const topRailGeometry = new BoxGeometry(segLength, 0.05, 0.05);
            const topRail = new Mesh(topRailGeometry, railingMaterial);
            topRail.position.set(centerX, topRailY, centerZ);
            topRail.rotation.y = angle;
            topRail.castShadow = true;
            scene.add(topRail);
            
            // Bottom rail
            const bottomRail = new Mesh(topRailGeometry.clone(), railingMaterial);
            bottomRail.position.set(centerX, bottomRailY, centerZ);
            bottomRail.rotation.y = angle;
            scene.add(bottomRail);

            // Balusters
            const balusterSpacing = 0.15;
            const balusterGeometry = new BoxGeometry(0.04, balusterLength, 0.04);
            const numBalusters = Math.floor(segLength / balusterSpacing);

            for (let i = 0; i < numBalusters; i++) {
              const t = i / (numBalusters - 1 || 1);
              const balX = side.x1 + (side.x2 - side.x1) * t;
              const balZ = side.z1 + (side.z2 - side.z1) * t;
              const baluster = new Mesh(balusterGeometry, railingMaterial);
              baluster.position.set(balX, balusterCenterY, balZ);
              scene.add(baluster);
            }

            // Posts along segment
            const maxPostSpacing = 8 * scale;
            const numSpaces = Math.ceil(segLength / maxPostSpacing);
            const numPosts = numSpaces + 1;

            for (let i = 0; i < numPosts; i++) {
              const t = i / numSpaces;
              const postX = side.x1 + (side.x2 - side.x1) * t;
              const postZ = side.z1 + (side.z2 - side.z1) * t;
              const post = new Mesh(postGeometry, postMaterial);
              post.position.set(postX, postY, postZ);
              post.castShadow = true;
              scene.add(post);
            }
          }
        }
      });
    }

    // Stairs (if configured)
    if (config.hasStairs && config.stairSide) {
      const stairWidth = (config.stairWidth || 4) * scale;
      const numSteps = Math.ceil(deckHeight / 0.18);
      const stepHeight = deckHeight / numSteps;
      const stepDepth = 0.28;
      const totalRun = numSteps * stepDepth;

      for (let i = 0; i < numSteps; i++) {
        const stepGeometry = new BoxGeometry(stairWidth, 0.05, stepDepth);
        const step = new Mesh(stepGeometry, deckMaterial);
        
        let x = 0, z = 0, rotation = 0;
        
        // Position stairs based on stair side
        if (config.stairSide === 'front') {
          x = 0;
          z = deckLength/2 + stepDepth * (i + 0.5);
          rotation = 0;
        } else if (config.stairSide === 'back') {
          x = 0;
          z = -deckLength/2 - stepDepth * (i + 0.5);
          rotation = 0;
        } else if (config.stairSide === 'left') {
          x = -deckWidth/2 - stepDepth * (i + 0.5);
          z = 0;
          rotation = Math.PI / 2;
        } else if (config.stairSide === 'right') {
          x = deckWidth/2 + stepDepth * (i + 0.5);
          z = 0;
          rotation = Math.PI / 2;
        }
        
        step.position.set(x, 0.15 - stepHeight * (i + 1), z);
        step.rotation.y = rotation;
        step.castShadow = true;
        step.receiveShadow = true;
        scene.add(step);
      }

      // STAIR RAILING
      if (config.stairRailing !== false) {
         const railingHeight = (config.railingHeight || 42) / 12 * scale;
         const railingOffset = 0.05; // inset from edge
         const w = stairWidth/2 - railingOffset;
         
         const railingMaterial = new MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.2
         });
         const postMaterial = new MeshStandardMaterial({ 
            color: 0xe8e8e8,
            roughness: 0.4,
            metalness: 0.1
         });
         const postSize = 0.089;

         // New height params
         const bottomGap = (2 / 12) * scale;
         const railThickness = 0.05;

         // Define rail paths
         const railPaths: {x1: number, z1: number, x2: number, z2: number}[] = [];
          
         if (config.stairSide === 'front') {
            railPaths.push({ x1: -w, z1: deckLength/2, x2: -w, z2: deckLength/2 + totalRun });
            railPaths.push({ x1: w, z1: deckLength/2, x2: w, z2: deckLength/2 + totalRun });
         } else if (config.stairSide === 'back') {
            railPaths.push({ x1: -w, z1: -deckLength/2, x2: -w, z2: -deckLength/2 - totalRun });
            railPaths.push({ x1: w, z1: -deckLength/2, x2: w, z2: -deckLength/2 - totalRun });
         } else if (config.stairSide === 'left') {
            railPaths.push({ x1: -deckWidth/2, z1: -w, x2: -deckWidth/2 - totalRun, z2: -w });
            railPaths.push({ x1: -deckWidth/2, z1: w, x2: -deckWidth/2 - totalRun, z2: w });
         } else if (config.stairSide === 'right') {
            railPaths.push({ x1: deckWidth/2, z1: -w, x2: deckWidth/2 + totalRun, z2: -w });
            railPaths.push({ x1: deckWidth/2, z1: w, x2: deckWidth/2 + totalRun, z2: w });
         }
         
         railPaths.forEach(path => {
            const dx = path.x2 - path.x1;
            const dz = path.z2 - path.z1;
            const run = Math.sqrt(dx*dx + dz*dz);
            const rise = -deckHeight; // Going down
            const length = Math.sqrt(run*run + rise*rise);
            
            const midX = (path.x1 + path.x2) / 2;
            const midZ = (path.z1 + path.z2) / 2;

            // Updated Height Calculations
            const midYTop = 0.15 + rise/2 + railingHeight - railThickness/2;
            const midYBottom = 0.15 + rise/2 + bottomGap + railThickness/2;
            
            const yaw = Math.atan2(dz, dx);
            const pitch = -Math.atan2(Math.abs(rise), run);
            
            // Top Rail
            const railGeo = new BoxGeometry(length, 0.05, 0.05);
            const topRail = new Mesh(railGeo, railingMaterial);
            topRail.position.set(midX, midYTop, midZ);
            topRail.rotation.order = 'YXZ';
            topRail.rotation.y = -yaw;
            topRail.rotation.z = pitch; 
            topRail.castShadow = true;
            scene.add(topRail);
            
            // Bottom Rail
            const bottomRail = new Mesh(railGeo, railingMaterial);
            bottomRail.position.set(midX, midYBottom, midZ);
            bottomRail.rotation.order = 'YXZ';
            bottomRail.rotation.y = -yaw;
            bottomRail.rotation.z = pitch;
            bottomRail.castShadow = true;
            scene.add(bottomRail);
            
            // Posts (Top and Bottom)
            const postGeo = new BoxGeometry(postSize, railingHeight + 0.1, postSize);
            
            const topPostX = path.x1;
            const topPostZ = path.z1;
            const topPostY = 0.15 + railingHeight/2;
            const topPost = new Mesh(postGeo, postMaterial);
            topPost.position.set(topPostX, topPostY, topPostZ);
            topPost.castShadow = true;
            scene.add(topPost);

            const bottomPostX = path.x2;
            const bottomPostZ = path.z2;
            const bottomPostY = -deckHeight + 0.15 + railingHeight/2; 
            const bottomPost = new Mesh(postGeo, postMaterial);
            bottomPost.position.set(bottomPostX, bottomPostY, bottomPostZ);
            bottomPost.castShadow = true;
            scene.add(bottomPost);
            
            // Balusters
            const balusterLength = railingHeight - bottomGap - railThickness;
            const balGeo = new BoxGeometry(0.04, balusterLength, 0.04);
            const numBalusters = Math.floor(length / 0.15);
            
            const balusterMidOffset = (railingHeight - railThickness/2 + bottomGap + railThickness/2) / 2;

            for(let k=0; k<numBalusters; k++) {
                const t = k / numBalusters;
                const bx = path.x1 + dx * t;
                const bz = path.z1 + dz * t;
                const by = 0.15 + rise * t + balusterMidOffset;
                
                const bal = new Mesh(balGeo, railingMaterial);
                bal.position.set(bx, by, bz);
                scene.add(bal);
            }
         });
      }
    }

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraRotation = { azimuth: Math.PI / 4, elevation: Math.PI / 5 };
    let cameraDistance = 12;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cameraRotation.azimuth -= deltaX * 0.01;
      cameraRotation.elevation -= deltaY * 0.01;
      cameraRotation.elevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraRotation.elevation));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.01;
      cameraDistance = Math.max(5, Math.min(30, cameraDistance));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update camera position based on mouse
      if (isDragging) {
        camera.position.x = cameraDistance * Math.sin(cameraRotation.azimuth) * Math.cos(cameraRotation.elevation);
        camera.position.y = cameraDistance * Math.sin(cameraRotation.elevation);
        camera.position.z = cameraDistance * Math.cos(cameraRotation.azimuth) * Math.cos(cameraRotation.elevation);
        camera.lookAt(0, 0, 0);
      }
      
      renderer.render(scene, camera);
    };

    animate();

    // Notify that initial render is complete
    setTimeout(() => {
      if (onRenderComplete) {
        onRenderComplete();
      }
    }, 500);

    sceneRef.current = { scene, camera, renderer };

    // Auto-update snapshot using requestAnimationFrame for smoother updates
    // This prevents "callback is no longer runnable" errors during print
    let frameCount = 0;
    let snapshotAnimationId: number;
    const animateSnapshot = () => {
      frameCount++;
      // Update snapshot every ~60 frames (roughly once per second at 60fps)
      if (frameCount >= 60) {
        updateSnapshot();
        frameCount = 0;
      }
      snapshotAnimationId = requestAnimationFrame(animateSnapshot);
    };
    snapshotAnimationId = requestAnimationFrame(animateSnapshot);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      sceneRef.current.camera.aspect = width / height;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(snapshotAnimationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (containerRef.current && renderer.domElement.parentElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [
    config.width,
    config.length,
    config.height,
    config.shape,
    config.lShapeWidth,
    config.lShapeLength,
    config.lShapePosition,
    config.hasStairs,
    config.stairSide,
    config.stairWidth,
    config.stairRailing,
    config.railingSides,
    config.railingHeight,
    config.joistSpacing,
    config.deckingType
  ]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-200 rounded-lg overflow-hidden relative print:h-[600px] print:bg-white print:border-2 print:border-black print:rounded-none">
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm print:hidden">
        <div className="font-semibold text-slate-900 mb-1">🎮 3D Controls:</div>
        <div className="space-y-0.5 text-slate-700">
          <div>🖱️ <strong>Rotate:</strong> Click + drag</div>
          <div>🔍 <strong>Zoom:</strong> Scroll wheel</div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 print:hidden">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-600">Size</div>
            <div className="font-bold text-slate-900">{config.width}' × {config.length}'</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Height</div>
            <div className="font-bold text-slate-900">{config.height || 2}'</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Railings</div>
            <div className="font-bold text-slate-900">{config.railingSides.length} sides</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Stairs</div>
            <div className="font-bold text-slate-900">{config.hasStairs ? 'Yes' : 'No'}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-600 mb-1">Post Size</div>
          <div className="text-xs font-medium text-slate-900">
            {config.height && config.height > 2 ? '5.5" × 5.5"' : '3.5" × 3.5"'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Per BCBC 9.17.4.1
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full print:h-[600px]" />
    </div>
  );
});