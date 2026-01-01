import React, { useRef, useEffect } from 'react';
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
} from '../../utils/three';

interface Deck3DRendererProps {
  config: DeckConfig;
}

export function Deck3DRenderer({ config }: Deck3DRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
  } | null>(null);

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
    const renderer = new WebGLRenderer({ antialias: true });
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

    // Create ground
    const groundGeometry = new PlaneGeometry(50, 50);
    const groundMaterial = new MeshStandardMaterial({ 
      color: 0x4a7c59,
      roughness: 0.9,
      metalness: 0.0
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -deckHeight;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground grid
    const gridHelper = new GridHelper(30, 30, 0x6b8f72, 0x85a887);
    gridHelper.position.y = -deckHeight + 0.01;
    scene.add(gridHelper);

    // Deck surface
    const deckGeometry = new BoxGeometry(deckWidth, 0.15, deckLength);
    const deckMaterial = new MeshStandardMaterial({ 
      color: 0x8b6f47,
      roughness: 0.8,
      metalness: 0.1
    });
    const deck = new Mesh(deckGeometry, deckMaterial);
    deck.position.set(0, 0.075, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);

    // Deck boards (visual detail)
    const boardWidth = 0.14; // ~5.5 inches
    const numBoards = Math.floor(deckLength / boardWidth);
    for (let i = 0; i < numBoards; i++) {
      const boardGeometry = new BoxGeometry(deckWidth * 0.98, 0.03, 0.12);
      const boardMaterial = new MeshStandardMaterial({ 
        color: 0x9d7f54,
        roughness: 0.9
      });
      const board = new Mesh(boardGeometry, boardMaterial);
      board.position.set(
        0, 
        0.165,
        -deckLength/2 + i * boardWidth + boardWidth/2
      );
      scene.add(board);
    }

    // Support posts
    const postHeight = deckHeight;
    const postGeometry = new BoxGeometry(0.1, postHeight, 0.1);
    const postMaterial = new MeshStandardMaterial({ 
      color: 0x6b5d4f,
      roughness: 0.7
    });

    const postPositions = [
      [-deckWidth/2 + 0.3, 0, -deckLength/2 + 0.3],
      [deckWidth/2 - 0.3, 0, -deckLength/2 + 0.3],
      [-deckWidth/2 + 0.3, 0, deckLength/2 - 0.3],
      [deckWidth/2 - 0.3, 0, deckLength/2 - 0.3],
    ];

    postPositions.forEach(([x, _, z]) => {
      const post = new Mesh(postGeometry, postMaterial);
      post.position.set(x, -postHeight/2, z);
      post.castShadow = true;
      scene.add(post);
    });

    // Railings
    config.railingSides.forEach((side) => {
      const railingHeight = (config.railingHeight || 42) / 12 * scale;
      const railingY = railingHeight / 2 + 0.15;
      
      let railingGeometry: BoxGeometry;
      let x = 0, z = 0;
      
      if (side === 'front') {
        railingGeometry = new BoxGeometry(deckWidth, 0.05, 0.05);
        z = deckLength / 2;
      } else if (side === 'back') {
        railingGeometry = new BoxGeometry(deckWidth, 0.05, 0.05);
        z = -deckLength / 2;
      } else if (side === 'left') {
        railingGeometry = new BoxGeometry(0.05, 0.05, deckLength);
        x = -deckWidth / 2;
      } else {
        railingGeometry = new BoxGeometry(0.05, 0.05, deckLength);
        x = deckWidth / 2;
      }

      const railingMaterial = new MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.2
      });
      
      // Top rail
      const topRail = new Mesh(railingGeometry, railingMaterial);
      topRail.position.set(x, railingY, z);
      topRail.castShadow = true;
      scene.add(topRail);
      
      // Bottom rail
      const bottomRail = new Mesh(railingGeometry, railingMaterial);
      bottomRail.position.set(x, railingY - railingHeight + 0.2, z);
      scene.add(bottomRail);

      // Balusters
      const balusterSpacing = 0.15;
      const balusterGeometry = new BoxGeometry(0.04, railingHeight - 0.2, 0.04);
      const numBalusters = side === 'left' || side === 'right' ? 
        Math.floor(deckLength / balusterSpacing) : 
        Math.floor(deckWidth / balusterSpacing);

      for (let i = 0; i < numBalusters; i++) {
        const baluster = new Mesh(balusterGeometry, railingMaterial);
        if (side === 'left' || side === 'right') {
          baluster.position.set(x, railingY - railingHeight/2 + 0.1, -deckLength/2 + i * balusterSpacing);
        } else {
          baluster.position.set(-deckWidth/2 + i * balusterSpacing, railingY - railingHeight/2 + 0.1, z);
        }
        scene.add(baluster);
      }
    });

    // Stairs (if configured)
    if (config.hasStairs && config.stairSide) {
      const stairWidth = (config.stairWidth || 4) * scale;
      const numSteps = Math.ceil(deckHeight / 0.18);
      const stepHeight = deckHeight / numSteps;
      const stepDepth = 0.28;

      for (let i = 0; i < numSteps; i++) {
        const stepGeometry = new BoxGeometry(stairWidth, 0.05, stepDepth);
        const step = new Mesh(stepGeometry, deckMaterial);
        
        let x = 0, z = 0;
        if (config.stairSide === 'front') {
          z = deckLength/2 + stepDepth * (i + 0.5);
        } else if (config.stairSide === 'back') {
          z = -deckLength/2 - stepDepth * (i + 0.5);
        } else if (config.stairSide === 'left') {
          x = -deckWidth/2 - stepDepth * (i + 0.5);
        } else {
          x = deckWidth/2 + stepDepth * (i + 0.5);
        }
        
        step.position.set(x, 0.15 - stepHeight * (i + 1), z);
        step.castShadow = true;
        step.receiveShadow = true;
        scene.add(step);
      }
    }

    // Add edges to deck
    const deckEdges = new EdgesGeometry(deckGeometry);
    const edgesMaterial = new LineBasicMaterial({ color: 0x5a4a3a, linewidth: 2 });
    const deckLines = new LineSegments(deckEdges, edgesMaterial);
    deckLines.position.copy(deck.position);
    scene.add(deckLines);

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 5 };
    let cameraDistance = 12;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cameraRotation.theta -= deltaX * 0.01;
      cameraRotation.phi -= deltaY * 0.01;
      cameraRotation.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraRotation.phi));

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

      camera.position.x = cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
      camera.position.y = cameraDistance * Math.cos(cameraRotation.phi);
      camera.position.z = cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { scene, camera, renderer };

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
  }, [config]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-200 rounded-lg overflow-hidden relative">
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold text-slate-900 mb-1">🎮 3D Controls:</div>
        <div className="space-y-0.5 text-slate-700">
          <div>🖱️ <strong>Rotate:</strong> Click + drag</div>
          <div>🔍 <strong>Zoom:</strong> Scroll wheel</div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
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
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}