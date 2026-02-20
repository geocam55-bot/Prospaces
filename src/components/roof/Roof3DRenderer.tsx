import React, { useRef, useEffect } from 'react';
import { RoofConfig } from '../../types/roof';
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
  BoxGeometry,
  CylinderGeometry
} from 'three';

interface Roof3DRendererProps {
  config: RoofConfig;
}

export function Roof3DRenderer({ config }: Roof3DRendererProps) {
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
    scene.background = new Color(0xe8f1f8);
    scene.fog = new Fog(0xe8f1f8, 10, 60);

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
    const ambientLight = new AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.85);
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

    const fillLight = new DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-15, 15, -15);
    scene.add(fillLight);

    // Convert feet to meters
    const scale = 0.3048;
    const buildingWidth = config.width * scale;
    const buildingLength = config.length * scale;
    const wallHeight = 2.5; // Typical wall height for visualization
    
    // Parse pitch (e.g., "6/12")
    const pitchParts = config.pitch.split('/');
    const pitchRise = parseInt(pitchParts[0]);
    const pitchRun = parseInt(pitchParts[1]);
    const roofPitch = pitchRise / pitchRun;
    const roofRise = (buildingWidth / 2) * roofPitch;

    const eaveOverhang = config.eaveOverhang * scale;
    const rakeOverhang = config.rakeOverhang * scale;

    // Create ground
    const groundGeometry = new PlaneGeometry(60, 60);
    const groundMaterial = new MeshStandardMaterial({ 
      color: 0x6a8a5a,
      roughness: 0.9,
      metalness: 0.0
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground grid
    const gridHelper = new GridHelper(40, 40, 0x7b9a6b, 0x9aad8a);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Building walls (simplified)
    const wallMaterial = new MeshStandardMaterial({ 
      color: 0xf0ead6,
      roughness: 0.8
    });

    // Front wall
    const frontWallGeometry = new BoxGeometry(buildingWidth, wallHeight, 0.2);
    const frontWall = new Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, wallHeight / 2, buildingLength / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Back wall
    const backWall = new Mesh(frontWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2, -buildingLength / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Side walls
    const sideWallGeometry = new BoxGeometry(0.2, wallHeight, buildingLength);
    const leftWall = new Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-buildingWidth / 2, wallHeight / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(buildingWidth / 2, wallHeight / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Roof material
    const roofColor = 
      config.shingleType === 'metal' ? 0x7f8c8d :
      config.shingleType === 'cedar-shake' ? 0x8b6f47 :
      config.shingleType === 'designer' ? 0x3a3a3a : 0x4a3f35;

    const roofMaterial = new MeshStandardMaterial({ 
      color: roofColor,
      roughness: config.shingleType === 'metal' ? 0.2 : 0.95,
      metalness: config.shingleType === 'metal' ? 0.7 : 0.0
    });

    // Create roof based on style
    if (config.style === 'gable') {
      const roofLength = Math.sqrt(Math.pow(buildingWidth / 2, 2) + Math.pow(roofRise, 2));
      const roofAngle = Math.atan2(roofRise, buildingWidth / 2);
      
      // Left roof slope
      const leftRoofGeometry = new BoxGeometry(
        roofLength + rakeOverhang, 
        0.1, 
        buildingLength + eaveOverhang * 2
      );
      const leftRoof = new Mesh(leftRoofGeometry, roofMaterial);
      leftRoof.position.set(
        -buildingWidth / 4,
        wallHeight + roofRise / 2,
        0
      );
      leftRoof.rotation.z = roofAngle;
      leftRoof.castShadow = true;
      leftRoof.receiveShadow = true;
      scene.add(leftRoof);

      // Right roof slope
      const rightRoof = new Mesh(leftRoofGeometry, roofMaterial);
      rightRoof.position.set(
        buildingWidth / 4,
        wallHeight + roofRise / 2,
        0
      );
      rightRoof.rotation.z = -roofAngle;
      rightRoof.castShadow = true;
      rightRoof.receiveShadow = true;
      scene.add(rightRoof);

      // Ridge cap
      const ridgeGeometry = new BoxGeometry(
        0.15,
        0.12,
        buildingLength + eaveOverhang * 2
      );
      const ridgeMaterial = new MeshStandardMaterial({ 
        color: roofColor,
        roughness: config.shingleType === 'metal' ? 0.2 : 0.9
      });
      const ridge = new Mesh(ridgeGeometry, ridgeMaterial);
      ridge.position.set(0, wallHeight + roofRise + 0.06, 0);
      ridge.castShadow = true;
      scene.add(ridge);

    } else if (config.style === 'hip') {
      // Main roof slopes
      const roofLength = Math.sqrt(Math.pow(buildingWidth / 2, 2) + Math.pow(roofRise, 2));
      const roofAngle = Math.atan2(roofRise, buildingWidth / 2);
      
      // Adjusted length for hip
      const hipRoofLength = buildingLength * 0.7;
      
      // Left slope
      const leftRoofGeometry = new BoxGeometry(roofLength + rakeOverhang, 0.1, hipRoofLength);
      const leftRoof = new Mesh(leftRoofGeometry, roofMaterial);
      leftRoof.position.set(-buildingWidth / 4, wallHeight + roofRise / 2, 0);
      leftRoof.rotation.z = roofAngle;
      leftRoof.castShadow = true;
      scene.add(leftRoof);

      // Right slope
      const rightRoof = new Mesh(leftRoofGeometry, roofMaterial);
      rightRoof.position.set(buildingWidth / 4, wallHeight + roofRise / 2, 0);
      rightRoof.rotation.z = -roofAngle;
      rightRoof.castShadow = true;
      scene.add(rightRoof);

      // Hip ends (simplified)
      const hipEndGeometry = new BoxGeometry(buildingWidth + rakeOverhang * 2, 0.1, roofLength * 0.6);
      const frontHip = new Mesh(hipEndGeometry, roofMaterial);
      frontHip.position.set(0, wallHeight + roofRise / 2, buildingLength * 0.4);
      frontHip.rotation.x = roofAngle;
      frontHip.castShadow = true;
      scene.add(frontHip);

      const backHip = new Mesh(hipEndGeometry, roofMaterial);
      backHip.position.set(0, wallHeight + roofRise / 2, -buildingLength * 0.4);
      backHip.rotation.x = -roofAngle;
      backHip.castShadow = true;
      scene.add(backHip);

    } else if (config.style === 'flat') {
      const flatRoofGeometry = new BoxGeometry(
        buildingWidth + rakeOverhang * 2,
        0.15,
        buildingLength + eaveOverhang * 2
      );
      const flatRoof = new Mesh(flatRoofGeometry, roofMaterial);
      flatRoof.position.set(0, wallHeight + 0.075, 0);
      flatRoof.castShadow = true;
      flatRoof.receiveShadow = true;
      scene.add(flatRoof);

    } else if (config.style === 'shed') {
      const shedRise = buildingWidth * roofPitch;
      const shedRoofLength = Math.sqrt(Math.pow(buildingWidth, 2) + Math.pow(shedRise, 2));
      const shedAngle = Math.atan2(shedRise, buildingWidth);
      
      const shedRoofGeometry = new BoxGeometry(
        shedRoofLength + rakeOverhang,
        0.1,
        buildingLength + eaveOverhang * 2
      );
      const shedRoof = new Mesh(shedRoofGeometry, roofMaterial);
      shedRoof.position.set(0, wallHeight + shedRise / 2, 0);
      shedRoof.rotation.z = shedAngle;
      shedRoof.castShadow = true;
      shedRoof.receiveShadow = true;
      scene.add(shedRoof);
    }

    // Chimney (if configured)
    if (config.hasChimney && config.chimneyCount && config.chimneyCount > 0) {
      const chimneyGeometry = new BoxGeometry(0.6, 2.5, 0.6);
      const chimneyMaterial = new MeshStandardMaterial({ 
        color: 0x8b4513,
        roughness: 0.9
      });
      const chimney = new Mesh(chimneyGeometry, chimneyMaterial);
      chimney.position.set(buildingWidth * 0.2, wallHeight + roofRise / 2 + 1.25, buildingLength * 0.2);
      chimney.castShadow = true;
      scene.add(chimney);
    }

    // Skylights (if configured)
    if (config.hasSkylight && config.skylightCount && config.skylightCount > 0) {
      for (let i = 0; i < config.skylightCount; i++) {
        const skylightGeometry = new BoxGeometry(0.8, 0.08, 1.2);
        const skylightMaterial = new MeshStandardMaterial({ 
          color: 0x87ceeb,
          transparent: true,
          opacity: 0.6,
          metalness: 0.9,
          roughness: 0.1
        });
        const skylight = new Mesh(skylightGeometry, skylightMaterial);
        
        const xPos = -buildingWidth * 0.3 + i * 1.5;
        const roofAngle = Math.atan2(roofRise, buildingWidth / 2);
        
        skylight.position.set(xPos, wallHeight + roofRise * 0.6, -buildingLength * 0.2);
        skylight.rotation.z = roofAngle;
        scene.add(skylight);
      }
    }

    // Ridge vent (if applicable)
    if (config.style === 'gable' && config.ridgeVentLength) {
      const ventGeometry = new CylinderGeometry(0.08, 0.08, buildingLength * 0.8, 16);
      const ventMaterial = new MeshStandardMaterial({ 
        color: 0x2c3e50,
        roughness: 0.6
      });
      const vent = new Mesh(ventGeometry, ventMaterial);
      vent.rotation.x = Math.PI / 2;
      vent.position.set(0, wallHeight + roofRise + 0.12, 0);
      scene.add(vent);
    }

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
    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-cyan-200 rounded-lg overflow-hidden relative">
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
            <div className="text-xs text-slate-600">Building</div>
            <div className="font-bold text-slate-900">{config.width}' × {config.length}'</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Pitch</div>
            <div className="font-bold text-slate-900">{config.pitch}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Style</div>
            <div className="font-bold text-slate-900">{config.style}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Material</div>
            <div className="font-bold text-slate-900">{config.shingleType}</div>
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}