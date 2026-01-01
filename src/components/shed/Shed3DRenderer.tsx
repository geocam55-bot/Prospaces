import React, { useRef, useEffect } from 'react';
import { ShedConfig } from '../../types/shed';
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
  BoxGeometry
} from 'three';

interface Shed3DRendererProps {
  config: ShedConfig;
}

export function Shed3DRenderer({ config }: Shed3DRendererProps) {
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
    scene.background = new Color(0xe0f2e9);
    scene.fog = new Fog(0xe0f2e9, 10, 50);

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
    const ambientLight = new AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.85);
    directionalLight.position.set(15, 20, 10);
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
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);

    // Convert feet to meters
    const scale = 0.3048;
    const shedWidth = config.width * scale;
    const shedLength = config.length * scale;
    const wallHeight = config.wallHeight * scale;
    const roofPitch = config.roofPitch / 12;
    const roofRise = (shedWidth / 2) * roofPitch;

    // Create ground
    const groundGeometry = new PlaneGeometry(40, 40);
    const groundMaterial = new MeshStandardMaterial({ 
      color: 0x5c8a4a,
      roughness: 0.9,
      metalness: 0.0
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground grid
    const gridHelper = new GridHelper(30, 30, 0x6d9a5d, 0x8aad7a);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Foundation
    if (config.foundationType === 'concrete-slab') {
      const slabGeometry = new BoxGeometry(shedWidth + 0.2, 0.15, shedLength + 0.2);
      const slabMaterial = new MeshStandardMaterial({ 
        color: 0xa0a0a0,
        roughness: 0.8
      });
      const slab = new Mesh(slabGeometry, slabMaterial);
      slab.position.set(0, 0.075, 0);
      slab.receiveShadow = true;
      scene.add(slab);
    } else if (config.foundationType === 'skids') {
      const skidGeometry = new BoxGeometry(0.1, 0.15, shedLength);
      const skidMaterial = new MeshStandardMaterial({ 
        color: 0x6b5d4f,
        roughness: 0.8
      });
      
      const skid1 = new Mesh(skidGeometry, skidMaterial);
      skid1.position.set(-shedWidth * 0.3, 0.075, 0);
      scene.add(skid1);
      
      const skid2 = new Mesh(skidGeometry, skidMaterial);
      skid2.position.set(shedWidth * 0.3, 0.075, 0);
      scene.add(skid2);
    }

    // Floor
    if (config.hasFloor) {
      const floorGeometry = new BoxGeometry(shedWidth, 0.05, shedLength);
      const floorMaterial = new MeshStandardMaterial({ 
        color: 0xc4a57b,
        roughness: 0.8
      });
      const floor = new Mesh(floorGeometry, floorMaterial);
      floor.position.set(0, 0.175, 0);
      floor.receiveShadow = true;
      scene.add(floor);
    }

    // Wall material
    const wallMaterial = new MeshStandardMaterial({ 
      color: config.sidingType === 'vinyl' ? 0xe8e8e8 :
             config.sidingType === 'wood' ? 0xd4a574 :
             config.sidingType === 'metal' ? 0xb8c5d6 : 0xc9b08a,
      roughness: config.sidingType === 'metal' ? 0.3 : 0.8,
      metalness: config.sidingType === 'metal' ? 0.4 : 0.0
    });

    // Walls
    const wallThickness = 0.1;
    
    // Front wall
    const frontWallGeometry = new BoxGeometry(shedWidth, wallHeight, wallThickness);
    const frontWall = new Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, wallHeight / 2 + 0.2, shedLength / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Back wall
    const backWall = new Mesh(frontWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2 + 0.2, -shedLength / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Side walls
    const sideWallGeometry = new BoxGeometry(wallThickness, wallHeight, shedLength);
    const leftWall = new Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-shedWidth / 2, wallHeight / 2 + 0.2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(shedWidth / 2, wallHeight / 2 + 0.2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Roof
    const roofMaterial = new MeshStandardMaterial({ 
      color: config.roofingMaterial === 'metal' ? 0x7f8c8d :
             config.roofingMaterial === 'architectural-shingle' ? 0x4a4a4a : 0x5a4a42,
      roughness: config.roofingMaterial === 'metal' ? 0.2 : 0.9,
      metalness: config.roofingMaterial === 'metal' ? 0.6 : 0.0
    });

    if (config.style === 'gable') {
      const roofLength = Math.sqrt(Math.pow(shedWidth / 2, 2) + Math.pow(roofRise, 2));
      const roofAngle = Math.atan2(roofRise, shedWidth / 2);
      
      // Left roof slope
      const leftRoofGeometry = new BoxGeometry(roofLength + 0.15, 0.08, shedLength + 0.3);
      const leftRoof = new Mesh(leftRoofGeometry, roofMaterial);
      leftRoof.position.set(
        -shedWidth / 4,
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
        shedWidth / 4,
        wallHeight + 0.2 + roofRise / 2,
        0
      );
      rightRoof.rotation.z = -roofAngle;
      rightRoof.castShadow = true;
      rightRoof.receiveShadow = true;
      scene.add(rightRoof);
    } else if (config.style === 'lean-to') {
      const roofLength = Math.sqrt(Math.pow(shedWidth, 2) + Math.pow(roofRise, 2));
      const roofAngle = Math.atan2(roofRise, shedWidth);
      
      const leanRoofGeometry = new BoxGeometry(roofLength + 0.15, 0.08, shedLength + 0.3);
      const leanRoof = new Mesh(leanRoofGeometry, roofMaterial);
      leanRoof.position.set(0, wallHeight + 0.2 + roofRise / 2, 0);
      leanRoof.rotation.z = roofAngle;
      leanRoof.castShadow = true;
      leanRoof.receiveShadow = true;
      scene.add(leanRoof);
    } else if (config.style === 'barn') {
      // Gambrel roof (barn style)
      const lowerRise = roofRise * 0.4;
      const upperRise = roofRise * 0.6;
      const lowerRoofAngle = Math.atan2(lowerRise, shedWidth / 4);
      const upperRoofAngle = Math.atan2(upperRise, shedWidth / 4) + Math.PI / 6;
      
      // Lower left
      const lowerRoofLength = Math.sqrt(Math.pow(shedWidth / 4, 2) + Math.pow(lowerRise, 2));
      const lowerLeftRoof = new Mesh(
        new BoxGeometry(lowerRoofLength + 0.1, 0.08, shedLength + 0.3),
        roofMaterial
      );
      lowerLeftRoof.position.set(-shedWidth * 0.375, wallHeight + 0.2 + lowerRise / 2, 0);
      lowerLeftRoof.rotation.z = lowerRoofAngle;
      lowerLeftRoof.castShadow = true;
      scene.add(lowerLeftRoof);
      
      // Lower right
      const lowerRightRoof = new Mesh(
        new BoxGeometry(lowerRoofLength + 0.1, 0.08, shedLength + 0.3),
        roofMaterial
      );
      lowerRightRoof.position.set(shedWidth * 0.375, wallHeight + 0.2 + lowerRise / 2, 0);
      lowerRightRoof.rotation.z = -lowerRoofAngle;
      lowerRightRoof.castShadow = true;
      scene.add(lowerRightRoof);
    }

    // Door
    const doorWidth = config.doorWidth * scale;
    const doorHeight = config.doorHeight * scale;
    const doorGeometry = new BoxGeometry(doorWidth, doorHeight, 0.05);
    const doorMaterial = new MeshStandardMaterial({ 
      color: config.doorType === 'sliding-barn' ? 0x8b7355 : 0xffffff,
      roughness: 0.4,
      metalness: 0.2
    });
    const door = new Mesh(doorGeometry, doorMaterial);
    
    if (config.doorPosition === 'front') {
      door.position.set(0, doorHeight / 2 + 0.2, shedLength / 2 + 0.06);
    } else {
      door.position.set(0, doorHeight / 2 + 0.2, -shedLength / 2 - 0.06);
    }
    door.castShadow = true;
    scene.add(door);

    // Windows
    config.windows.forEach((window) => {
      const windowWidth = window.width * scale;
      const windowHeight = window.height * scale;
      const windowGeometry = new BoxGeometry(windowWidth, windowHeight, 0.04);
      const windowMaterial = new MeshStandardMaterial({ 
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.6,
        metalness: 0.9,
        roughness: 0.1
      });
      const windowMesh = new Mesh(windowGeometry, windowMaterial);

      let x = 0, z = 0;
      const offsetY = (window.offsetFromFloor || 4) * scale;
      
      if (window.position === 'front') {
        x = -shedWidth/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        z = shedLength/2 + 0.06;
      } else if (window.position === 'back') {
        x = -shedWidth/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
        z = -shedLength/2 - 0.06;
      } else if (window.position === 'left') {
        x = -shedWidth/2 - 0.06;
        z = -shedLength/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
      } else {
        x = shedWidth/2 + 0.06;
        z = -shedLength/2 + windowWidth/2 + (window.offsetFromLeft || 0) * scale;
      }

      windowMesh.position.set(x, windowHeight/2 + offsetY, z);
      scene.add(windowMesh);

      // Window trim
      if (config.hasShutters) {
        const shutterGeometry = new BoxGeometry(windowWidth * 0.4, windowHeight, 0.03);
        const shutterMaterial = new MeshStandardMaterial({ color: 0x2c3e50 });
        
        const leftShutter = new Mesh(shutterGeometry, shutterMaterial);
        leftShutter.position.set(x - windowWidth * 0.7, windowHeight/2 + offsetY, z);
        scene.add(leftShutter);
        
        const rightShutter = new Mesh(shutterGeometry, shutterMaterial);
        rightShutter.position.set(x + windowWidth * 0.7, windowHeight/2 + offsetY, z);
        scene.add(rightShutter);
      }
    });

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 5 };
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
      cameraRotation.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraRotation.phi));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.01;
      cameraDistance = Math.max(4, Math.min(25, cameraDistance));
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
    <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 rounded-lg overflow-hidden relative">
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
            <div className="text-xs text-slate-600">Style</div>
            <div className="font-bold text-slate-900">{config.style}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Windows</div>
            <div className="font-bold text-slate-900">{config.windows.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Door</div>
            <div className="font-bold text-slate-900">{config.doorType}</div>
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}