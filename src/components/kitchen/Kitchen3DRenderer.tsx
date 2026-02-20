import React, { useRef, useEffect } from 'react';
import { KitchenConfig } from '../../types/kitchen';
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
  LineSegments,
  MeshBasicMaterial,
  CylinderGeometry,
  CanvasTexture
} from 'three';

interface Kitchen3DRendererProps {
  config: KitchenConfig;
}

export function Kitchen3DRenderer({ config }: Kitchen3DRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
    controls: any;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Create scene
    const scene = new Scene();
    scene.background = new Color(0xf1f5f9);
    scene.fog = new Fog(0xf1f5f9, 10, 50);

    // Create camera
    const camera = new PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(8, 6, 8);
    camera.lookAt(0, 0, 0);

    // Create renderer
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);

    const fillLight = new DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Convert inches to meters (1 inch = 0.0254 meters)
    const scale = 0.0254;
    const roomWidth = config.roomWidth * 12 * scale;
    const roomLength = config.roomLength * 12 * scale;
    const roomHeight = config.roomHeight * 12 * scale;

    // Create room
    // Floor
    const floorGeometry = new PlaneGeometry(roomWidth, roomLength);
    const floorMaterial = new MeshStandardMaterial({ 
      color: 0xf8fafc,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor grid
    const gridHelper = new GridHelper(
      Math.max(roomWidth, roomLength),
      20,
      0x94a3b8,
      0xcbd5e1
    );
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);

    // Walls
    const wallMaterial = new MeshStandardMaterial({ 
      color: 0xfefce8,
      side: DoubleSide,
      roughness: 0.9
    });

    // Back wall
    const backWallGeometry = new PlaneGeometry(roomWidth, roomHeight);
    const backWall = new Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, roomHeight / 2, -roomLength / 2);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left wall
    const leftWallGeometry = new PlaneGeometry(roomLength, roomHeight);
    const leftWall = new Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWall = new Mesh(leftWallGeometry, wallMaterial);
    rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    
    // Add wall label markers to help debug coordinate system
    const createWallLabel = (text: string, x: number, y: number, z: number, rotY: number = 0) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;
      
      canvas.width = 512;
      canvas.height = 128;
      context.fillStyle = '#ef4444';
      context.font = 'bold 80px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 256, 64);
      
      const texture = new CanvasTexture(canvas);
      const material = new MeshBasicMaterial({ map: texture, transparent: true });
      const geometry = new PlaneGeometry(1, 0.25);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      return mesh;
    };
    
    // Add labels (import THREE at the top if not already)
    const northLabel = createWallLabel('NORTH', 0, roomHeight - 0.3, -roomLength / 2 + 0.01, 0);
    const westLabel = createWallLabel('WEST', -roomWidth / 2 + 0.01, roomHeight - 0.3, 0, Math.PI / 2);
    const eastLabel = createWallLabel('EAST', roomWidth / 2 - 0.01, roomHeight - 0.3, 0, -Math.PI / 2);
    const southLabel = createWallLabel('SOUTH', 0, roomHeight - 0.3, roomLength / 2 - 0.01, Math.PI);
    
    if (northLabel) scene.add(northLabel);
    if (westLabel) scene.add(westLabel);
    if (eastLabel) scene.add(eastLabel);
    if (southLabel) scene.add(southLabel);

    // Wall edges
    const edgesGeometry = new EdgesGeometry(
      new BoxGeometry(roomWidth, roomHeight, roomLength)
    );
    const edgesMaterial = new LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
    const edges = new LineSegments(edgesGeometry, edgesMaterial);
    edges.position.y = roomHeight / 2;
    scene.add(edges);

    // Add cabinets
    config.cabinets.forEach((cabinet) => {
      // Convert from inches to meters
      const w = cabinet.width * scale;
      const h = (cabinet.height || 34) * scale;
      const d = cabinet.depth * scale;

      // DEBUG: Log the first cabinet's position
      if (config.cabinets.indexOf(cabinet) === 0) {
        console.log('First cabinet 2D position:', { x: cabinet.x, y: cabinet.y, width: cabinet.width, depth: cabinet.depth });
        console.log('Room dimensions (feet):', { width: config.roomWidth, length: config.roomLength });
        console.log('Calculated 3D position will be:', {
          x: -roomWidth / 2 + (cabinet.x * scale) + (w / 2),
          z: -roomLength / 2 + (cabinet.y * scale) + (d / 2)
        });
      }

      // Map 2D position to 3D:
      // In 2D: cabinet.x, cabinet.y represent the top-left corner position
      // In 3D: We want the back edge at North wall (-roomLength/2) when cabinet.y = 0
      //        We want the left edge at West wall (-roomWidth/2) when cabinet.x = 0
      
      // Convert 2D corner position to 3D center position:
      // Add half the cabinet dimensions to get the center position in 3D
      const x = -roomWidth / 2 + (cabinet.x * scale) + (w / 2);
      const z = -roomLength / 2 + (cabinet.y * scale) + (d / 2);  // Adding back depth offset
      
      let y = 0;
      if (cabinet.type === 'wall' || cabinet.type === 'corner-wall') {
        y = (cabinet.height || 30) * scale / 2 + 1.2;
      } else if (cabinet.type === 'tall') {
        y = (cabinet.height || 84) * scale / 2;
      } else {
        y = (cabinet.height || 34) * scale / 2;
      }

      // Cabinet body
      const cabinetGeometry = new BoxGeometry(w, h, d);
      let color = 0xd1d5db;
      if (cabinet.type === 'wall') color = 0xf3f4f6;
      if (cabinet.type === 'tall') color = 0xe5e7eb;
      
      const cabinetMaterial = new MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.1
      });
      const cabinetMesh = new Mesh(cabinetGeometry, cabinetMaterial);
      cabinetMesh.position.set(x, y, z);
      cabinetMesh.castShadow = true;
      cabinetMesh.receiveShadow = true;
      scene.add(cabinetMesh);

      // Cabinet edges
      const cabinetEdges = new EdgesGeometry(cabinetGeometry);
      const cabinetEdgesMaterial = new LineBasicMaterial({ color: 0x1f2937 });
      const cabinetLines = new LineSegments(cabinetEdges, cabinetEdgesMaterial);
      cabinetLines.position.copy(cabinetMesh.position);
      scene.add(cabinetLines);

      // Add doors if applicable
      if (cabinet.hasDoors && cabinet.numberOfDoors) {
        const doorMaterial = new MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.2,
          metalness: 0.3
        });

        for (let i = 0; i < cabinet.numberOfDoors; i++) {
          const doorWidth = w / cabinet.numberOfDoors;
          const doorX = x - w / 2 + doorWidth / 2 + i * doorWidth;
          
          const doorGeometry = new BoxGeometry(doorWidth * 0.95, h * 0.95, 0.005);
          const door = new Mesh(doorGeometry, doorMaterial);
          door.position.set(doorX, y, z + d / 2 + 0.003);
          door.castShadow = true;
          scene.add(door);

          // Door handle
          const handleGeometry = new CylinderGeometry(0.008, 0.008, h * 0.4, 8);
          const handleMaterial = new MeshStandardMaterial({
            color: 0x374151,
            roughness: 0.1,
            metalness: 0.8
          });
          const handle = new Mesh(handleGeometry, handleMaterial);
          handle.position.set(doorX + doorWidth * 0.3, y, z + d / 2 + 0.015);
          scene.add(handle);
        }
      }

      // Add countertop for base cabinets
      if (cabinet.type === 'base' || cabinet.type === 'island' || cabinet.type === 'corner-base') {
        const countertopGeometry = new BoxGeometry(w + 0.05, 0.04, d + 0.05);
        const countertopMaterial = new MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.1,
          metalness: 0.5
        });
        const countertop = new Mesh(countertopGeometry, countertopMaterial);
        countertop.position.set(x, y + h / 2 + 0.02, z);
        countertop.castShadow = true;
        countertop.receiveShadow = true;
        scene.add(countertop);
      }
    });

    // Add appliances
    config.appliances.forEach((appliance) => {
      // Convert from inches to meters
      const w = appliance.width * scale;
      const h = appliance.height * scale;
      const d = appliance.depth * scale;

      // Same mapping as cabinets
      const x = -roomWidth / 2 + (appliance.x * scale) + (w / 2);
      const z = -roomLength / 2 + (appliance.y * scale) + (d / 2);
      const y = h / 2;

      let color = 0xcbd5e1;
      let metalness = 0.6;
      let roughness = 0.2;

      if (appliance.type === 'refrigerator') {
        color = 0xe2e8f0;
        metalness = 0.7;
      } else if (appliance.type === 'stove') {
        color = 0x1f2937;
        metalness = 0.8;
        roughness = 0.1;
      } else if (appliance.type === 'sink') {
        color = 0x94a3b8;
        metalness = 0.9;
        roughness = 0.05;
      }

      const applianceGeometry = new BoxGeometry(w, h, d);
      const applianceMaterial = new MeshStandardMaterial({
        color: color,
        roughness: roughness,
        metalness: metalness
      });
      const applianceMesh = new Mesh(applianceGeometry, applianceMaterial);
      applianceMesh.position.set(x, y, z);
      applianceMesh.castShadow = true;
      applianceMesh.receiveShadow = true;
      scene.add(applianceMesh);

      // Appliance edges
      const applianceEdges = new EdgesGeometry(applianceGeometry);
      const applianceEdgesMaterial = new LineBasicMaterial({ color: 0x475569 });
      const applianceLines = new LineSegments(applianceEdges, applianceEdgesMaterial);
      applianceLines.position.copy(applianceMesh.position);
      scene.add(applianceLines);

      // Type-specific details
      if (appliance.type === 'refrigerator') {
        // Freezer door line
        const lineGeometry = new PlaneGeometry(w * 0.9, 0.01);
        const lineMaterial = new MeshBasicMaterial({ color: 0x94a3b8 });
        const line = new Mesh(lineGeometry, lineMaterial);
        line.position.set(x, y + h * 0.25, z + d / 2 + 0.001);
        scene.add(line);

        // Door handles
        const handleGeometry = new BoxGeometry(0.02, h * 0.2, 0.03);
        const handleMaterial = new MeshStandardMaterial({ 
          color: 0x374151, 
          metalness: 0.9 
        });
        const handle1 = new Mesh(handleGeometry, handleMaterial);
        handle1.position.set(x + w * 0.4, y + h * 0.15, z + d / 2 + 0.02);
        scene.add(handle1);

        const handle2Geometry = new BoxGeometry(0.02, h * 0.4, 0.03);
        const handle2 = new Mesh(handle2Geometry, handleMaterial);
        handle2.position.set(x + w * 0.4, y - h * 0.2, z + d / 2 + 0.02);
        scene.add(handle2);
      } else if (appliance.type === 'stove') {
        // Burner grates
        const burnerPositions = [
          [-0.2, 0.2], [0.2, 0.2], 
          [-0.2, -0.2], [0.2, -0.2]
        ];
        const burnerGeometry = new CylinderGeometry(0.08, 0.08, 0.02, 16);
        const burnerMaterial = new MeshStandardMaterial({ 
          color: 0x1f2937, 
          metalness: 0.3 
        });
        
        burnerPositions.forEach(([bx, bz]) => {
          const burner = new Mesh(burnerGeometry, burnerMaterial);
          burner.position.set(x + bx, y + h / 2 + 0.01, z + bz);
          scene.add(burner);
        });

        // Oven window
        const windowGeometry = new PlaneGeometry(w * 0.7, h * 0.4);
        const windowMaterial = new MeshStandardMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.8,
          metalness: 1,
          roughness: 0
        });
        const window = new Mesh(windowGeometry, windowMaterial);
        window.position.set(x, y - h * 0.1, z + d / 2 + 0.001);
        scene.add(window);
      }
    });

    // Simple orbit controls using mouse
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 6 };
    let cameraDistance = 10;

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

      // Limit phi to prevent camera flip
      cameraRotation.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraRotation.phi));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.01;
      cameraDistance = Math.max(3, Math.min(25, cameraDistance));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Update camera position based on rotation
      camera.position.x = cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
      camera.position.y = cameraDistance * Math.cos(cameraRotation.phi);
      camera.position.z = cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
      camera.lookAt(0, 1, 0);

      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { scene, camera, renderer, controls: null };

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
    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden relative">
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
            <div className="text-xs text-slate-600">Cabinets</div>
            <div className="font-bold text-slate-900">{config.cabinets.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Appliances</div>
            <div className="font-bold text-slate-900">{config.appliances.length}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-slate-600">Room Size</div>
            <div className="font-bold text-slate-900">
              {config.roomWidth}' × {config.roomLength}' × {config.roomHeight}'
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}