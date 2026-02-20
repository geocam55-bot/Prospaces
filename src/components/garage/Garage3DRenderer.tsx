import React, { useRef, useEffect } from 'react';
import { GarageConfig } from '../../types/garage';
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
  BufferGeometry,
  BufferAttribute,
  Vector3
} from '../../utils/three-exports';

interface Garage3DRendererProps {
  config: GarageConfig;
}

export function Garage3DRenderer({ config }: Garage3DRendererProps) {
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
    scene.background = new Color(0xd4e4f7);
    scene.fog = new Fog(0xd4e4f7, 10, 60);

    // Create camera
    const camera = new PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(12, 10, 12);
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

    const directionalLight = new DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(20, 25, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 60;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    scene.add(directionalLight);

    const fillLight = new DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-15, 15, -15);
    scene.add(fillLight);

    // Convert feet to meters
    const scale = 0.3048;
    const garageWidth = config.width * scale;
    const garageLength = config.length * scale;
    const wallHeight = config.height * scale;
    const roofPitch = config.roofPitch / 12;
    const roofRise = (garageWidth / 2) * roofPitch;

    // Create ground
    const groundGeometry = new PlaneGeometry(60, 60);
    const groundMaterial = new MeshStandardMaterial({ 
      color: 0x5a7a4a,
      roughness: 0.9,
      metalness: 0.0
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground grid
    const gridHelper = new GridHelper(40, 40, 0x6b8a5b, 0x89a87a);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Foundation/Slab
    const slabGeometry = new BoxGeometry(garageWidth + 0.3, 0.2, garageLength + 0.3);
    const slabMaterial = new MeshStandardMaterial({ 
      color: 0x9ca3af,
      roughness: 0.8
    });
    const slab = new Mesh(slabGeometry, slabMaterial);
    slab.position.set(0, 0.1, 0);
    slab.receiveShadow = true;
    scene.add(slab);

    // Wall material
    const wallMaterial = new MeshStandardMaterial({ 
      color: config.sidingType === 'vinyl' ? 0xe8e8e8 :
             config.sidingType === 'wood' ? 0xc4a57b :
             config.sidingType === 'metal' ? 0xb8c5d6 : 0xd9d9d9,
      roughness: config.sidingType === 'metal' ? 0.3 : 0.8,
      metalness: config.sidingType === 'metal' ? 0.4 : 0.0
    });

    // Front wall
    const frontWallGeometry = new BoxGeometry(garageWidth, wallHeight, 0.15);
    const frontWall = new Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, wallHeight / 2 + 0.2, garageLength / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Back wall
    const backWall = new Mesh(frontWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2 + 0.2, -garageLength / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Side walls
    const sideWallGeometry = new BoxGeometry(0.15, wallHeight, garageLength);
    const leftWall = new Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-garageWidth / 2, wallHeight / 2 + 0.2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(garageWidth / 2, wallHeight / 2 + 0.2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Roof
    const roofMaterial = new MeshStandardMaterial({ 
      color: config.roofingMaterial === 'metal' ? 0x7f8c8d :
             config.roofingMaterial === 'rubber' ? 0x2c3e50 : 0x5a4a42,
      roughness: config.roofingMaterial === 'metal' ? 0.2 : 0.9,
      metalness: config.roofingMaterial === 'metal' ? 0.6 : 0.0
    });

    if (config.roofStyle === 'gable') {
      // Left roof slope
      const roofLength = Math.sqrt(Math.pow(garageWidth / 2, 2) + Math.pow(roofRise, 2));
      const roofAngle = Math.atan2(roofRise, garageWidth / 2);
      
      const leftRoofGeometry = new BoxGeometry(roofLength + 0.3, 0.1, garageLength + 0.6);
      const leftRoof = new Mesh(leftRoofGeometry, roofMaterial);
      leftRoof.position.set(
        -garageWidth / 4,
        wallHeight + 0.2 + roofRise / 2,
        0
      );
      leftRoof.rotation.z = roofAngle;
      leftRoof.castShadow = true;
      leftRoof.receiveShadow = true;
      scene.add(leftRoof);

      // Right roof slope
      const rightRoof = new Mesh(leftRoofGeometry, roofMaterial);
      rightRoof.position.set(
        garageWidth / 4,
        wallHeight + 0.2 + roofRise / 2,
        0
      );
      rightRoof.rotation.z = -roofAngle;
      rightRoof.castShadow = true;
      rightRoof.receiveShadow = true;
      scene.add(rightRoof);

      // Gable end walls
      const gableGeometry = new BufferGeometry();
      const gableVertices = new Float32Array([
        -garageWidth/2, wallHeight + 0.2, garageLength/2,
        garageWidth/2, wallHeight + 0.2, garageLength/2,
        0, wallHeight + 0.2 + roofRise, garageLength/2,
      ]);
      gableGeometry.setAttribute('position', new BufferAttribute(gableVertices, 3));
      gableGeometry.computeVertexNormals();
      
      const gableFront = new Mesh(gableGeometry, wallMaterial);
      scene.add(gableFront);
      
      const gableBack = new Mesh(gableGeometry, wallMaterial);
      gableBack.position.z = -garageLength;
      scene.add(gableBack);
    } else if (config.roofStyle === 'flat') {
      const flatRoofGeometry = new BoxGeometry(garageWidth + 0.3, 0.15, garageLength + 0.6);
      const flatRoof = new Mesh(flatRoofGeometry, roofMaterial);
      flatRoof.position.set(0, wallHeight + 0.275, 0);
      flatRoof.castShadow = true;
      flatRoof.receiveShadow = true;
      scene.add(flatRoof);
    }

    // Garage doors
    config.doors.forEach((door) => {
      const doorWidth = door.width * scale;
      const doorHeight = door.height * scale;
      const doorGeometry = new BoxGeometry(doorWidth, doorHeight, 0.05);
      const doorMaterial = new MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.5
      });
      const doorMesh = new Mesh(doorGeometry, doorMaterial);

      let x = 0, z = 0;
      if (door.position === 'front') {
        x = -garageWidth/2 + doorWidth/2 + (door.offsetFromLeft || 0) * scale;
        z = garageLength/2 + 0.1;
      } else if (door.position === 'side') {
        x = garageWidth/2 + 0.1;
        z = -garageLength/2 + doorWidth/2 + (door.offsetFromLeft || 0) * scale;
      }

      doorMesh.position.set(x, doorHeight/2 + 0.2, z);
      doorMesh.castShadow = true;
      scene.add(doorMesh);

      // Door panels (horizontal lines)
      for (let i = 1; i < 4; i++) {
        const panelGeometry = new BoxGeometry(doorWidth * 0.95, 0.02, 0.06);
        const panelMaterial = new MeshStandardMaterial({ color: 0xcccccc });
        const panel = new Mesh(panelGeometry, panelMaterial);
        panel.position.set(x, doorHeight/4 * i + 0.2, z + 0.03);
        scene.add(panel);
      }
    });

    // Walk door
    if (config.hasWalkDoor && config.walkDoorPosition) {
      const walkDoorGeometry = new BoxGeometry(0.9, 2.0, 0.05);
      const walkDoorMaterial = new MeshStandardMaterial({ 
        color: 0x8b7355,
        roughness: 0.5
      });
      const walkDoor = new Mesh(walkDoorGeometry, walkDoorMaterial);

      let x = 0, z = 0;
      if (config.walkDoorPosition === 'front') {
        x = garageWidth/3;
        z = garageLength/2 + 0.1;
      } else if (config.walkDoorPosition === 'side') {
        x = garageWidth/2 + 0.1;
        z = 0;
      }

      walkDoor.position.set(x, 1.2, z);
      scene.add(walkDoor);
    }

    // Windows
    config.windows.forEach((window) => {
      const windowWidth = window.width * scale;
      const windowHeight = window.height * scale;
      const windowGeometry = new BoxGeometry(windowWidth, windowHeight, 0.06);
      const windowMaterial = new MeshStandardMaterial({ 
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.7,
        metalness: 0.9,
        roughness: 0.1
      });
      const windowMesh = new Mesh(windowGeometry, windowMaterial);

      let x = 0, z = 0;
      const offsetY = (window.offsetFromFloor || 5) * scale;
      
      if (window.position === 'front') {
        x = -garageWidth/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        z = garageLength/2 + 0.11;
      } else if (window.position === 'back') {
        x = -garageWidth/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        z = -garageLength/2 - 0.11;
      } else if (window.position === 'left') {
        x = -garageWidth/2 - 0.11;
        z = -garageLength/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
      } else {
        x = garageWidth/2 + 0.11;
        z = -garageLength/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
      }

      windowMesh.position.set(x, windowHeight/2 + offsetY, z);
      scene.add(windowMesh);
    });

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 5 };
    let cameraDistance = 15;

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
      cameraDistance = Math.max(6, Math.min(35, cameraDistance));
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
      camera.lookAt(0, wallHeight / 2, 0);

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
    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 rounded-lg overflow-hidden relative">
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
            <div className="text-xs text-slate-600">Bays</div>
            <div className="font-bold text-slate-900">{config.bays}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Roof</div>
            <div className="font-bold text-slate-900">{config.roofStyle}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Doors</div>
            <div className="font-bold text-slate-900">{config.doors.length}</div>
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}