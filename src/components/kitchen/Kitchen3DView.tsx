import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Box as ThreeBox } from '@react-three/drei';
import { KitchenConfig } from '../../types/kitchen';
import * as THREE from 'three';

interface Kitchen3DViewProps {
  config: KitchenConfig;
}

function Cabinet3D({ 
  position, 
  width, 
  height, 
  depth, 
  type,
  hasDoors,
  numberOfDoors
}: { 
  position: [number, number, number]; 
  width: number; 
  height: number; 
  depth: number;
  type: string;
  hasDoors?: boolean;
  numberOfDoors?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Convert inches to meters for Three.js (1 inch = 0.0254 meters)
  const scale = 0.0254;
  const w = width * scale;
  const h = height * scale;
  const d = depth * scale;

  // Color based on type
  const color = type === 'wall' ? '#f3f4f6' : type === 'tall' ? '#e5e7eb' : '#d1d5db';
  
  return (
    <group position={position}>
      {/* Main cabinet body */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Cabinet frame outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#1f2937" linewidth={2} />
      </lineSegments>

      {/* Door details */}
      {hasDoors && numberOfDoors && (
        <>
          {Array.from({ length: numberOfDoors }).map((_, i) => {
            const doorWidth = w / numberOfDoors;
            const doorX = -w / 2 + doorWidth / 2 + i * doorWidth;
            return (
              <group key={i}>
                {/* Door panel */}
                <mesh position={[doorX, 0, d / 2 + 0.001]} castShadow>
                  <boxGeometry args={[doorWidth * 0.95, h * 0.95, 0.005]} />
                  <meshStandardMaterial 
                    color="#ffffff"
                    roughness={0.2}
                    metalness={0.3}
                  />
                </mesh>
                {/* Handle */}
                <mesh position={[doorX + doorWidth * 0.3, 0, d / 2 + 0.015]}>
                  <cylinderGeometry args={[0.008, 0.008, h * 0.4, 8]} />
                  <meshStandardMaterial 
                    color="#374151"
                    roughness={0.1}
                    metalness={0.8}
                  />
                </mesh>
              </group>
            );
          })}
        </>
      )}

      {/* Countertop for base cabinets */}
      {(type === 'base' || type === 'island') && (
        <mesh position={[0, h / 2 + 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[w + 0.05, 0.04, d + 0.05]} />
          <meshStandardMaterial 
            color="#64748b"
            roughness={0.1}
            metalness={0.5}
          />
        </mesh>
      )}
    </group>
  );
}

function Appliance3D({ 
  position, 
  width, 
  height, 
  depth, 
  type 
}: { 
  position: [number, number, number]; 
  width: number; 
  height: number; 
  depth: number;
  type: string;
}) {
  const scale = 0.0254;
  const w = width * scale;
  const h = height * scale;
  const d = depth * scale;

  // Color and material based on type
  let color = '#cbd5e1';
  let metalness = 0.6;
  let roughness = 0.2;

  if (type === 'refrigerator') {
    color = '#e2e8f0';
    metalness = 0.7;
  } else if (type === 'stove') {
    color = '#1f2937';
    metalness = 0.8;
    roughness = 0.1;
  } else if (type === 'dishwasher') {
    color = '#cbd5e1';
    metalness = 0.7;
  } else if (type === 'sink') {
    color = '#94a3b8';
    metalness = 0.9;
    roughness = 0.05;
  }

  return (
    <group position={position}>
      {/* Main appliance body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial 
          color={color}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>

      {/* Edge highlights */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#475569" linewidth={1} />
      </lineSegments>

      {/* Type-specific details */}
      {type === 'refrigerator' && (
        <>
          {/* Freezer door line */}
          <mesh position={[0, h * 0.25, d / 2 + 0.001]}>
            <planeGeometry args={[w * 0.9, 0.01]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
          {/* Door handles */}
          <mesh position={[w * 0.4, h * 0.15, d / 2 + 0.02]}>
            <boxGeometry args={[0.02, h * 0.2, 0.03]} />
            <meshStandardMaterial color="#374151" metalness={0.9} />
          </mesh>
          <mesh position={[w * 0.4, -h * 0.2, d / 2 + 0.02]}>
            <boxGeometry args={[0.02, h * 0.4, 0.03]} />
            <meshStandardMaterial color="#374151" metalness={0.9} />
          </mesh>
        </>
      )}

      {type === 'stove' && (
        <>
          {/* Burner grates on top */}
          {[[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]].map(([x, z], i) => (
            <mesh key={i} position={[x, h / 2 + 0.01, z]}>
              <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
              <meshStandardMaterial color="#1f2937" metalness={0.3} />
            </mesh>
          ))}
          {/* Oven door window */}
          <mesh position={[0, -h * 0.1, d / 2 + 0.001]}>
            <planeGeometry args={[w * 0.7, h * 0.4]} />
            <meshStandardMaterial 
              color="#000000"
              transparent
              opacity={0.8}
              metalness={1}
              roughness={0}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

function Room3D({ config }: { config: KitchenConfig }) {
  const scale = 0.0254; // inches to meters
  const roomWidth = config.roomWidth * 12 * scale;
  const roomLength = config.roomLength * 12 * scale;
  const roomHeight = config.roomHeight * 12 * scale;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomLength]} />
        <meshStandardMaterial 
          color="#f8fafc"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Floor tile pattern */}
      <Grid 
        args={[roomWidth, roomLength, 20, 20]}
        position={[0, 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        cellColor="#cbd5e1"
        sectionColor="#94a3b8"
        fadeDistance={30}
        fadeStrength={1}
      />

      {/* Walls */}
      {/* Back wall (North) */}
      <mesh position={[0, roomHeight / 2, -roomLength / 2]} receiveShadow>
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial 
          color="#fefce8"
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>

      {/* Left wall (West) */}
      <mesh 
        position={[-roomWidth / 2, roomHeight / 2, 0]} 
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[roomLength, roomHeight]} />
        <meshStandardMaterial 
          color="#fefce8"
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>

      {/* Right wall (East) */}
      <mesh 
        position={[roomWidth / 2, roomHeight / 2, 0]} 
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[roomLength, roomHeight]} />
        <meshStandardMaterial 
          color="#fefce8"
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>

      {/* Wall outlines for clarity */}
      <lineSegments>
        <edgesGeometry 
          args={[new THREE.BoxGeometry(roomWidth, roomHeight, roomLength)]} 
        />
        <lineBasicMaterial color="#64748b" linewidth={2} />
      </lineSegments>
    </group>
  );
}

function KitchenScene({ config }: { config: KitchenConfig }) {
  const scale = 0.0254;
  const roomWidth = config.roomWidth * 12 * scale;
  const roomLength = config.roomLength * 12 * scale;

  return (
    <>
      {/* Room structure */}
      <Room3D config={config} />

      {/* Cabinets */}
      {config.cabinets.map((cabinet) => {
        // Convert percentage position to actual position
        const x = (cabinet.x / 100 - 0.5) * roomWidth;
        const z = (cabinet.y / 100 - 0.5) * roomLength;
        
        // Y position based on cabinet type
        let y = 0;
        if (cabinet.type === 'wall') {
          y = (cabinet.height || 30) * scale / 2 + 1.2; // Wall cabinets higher up
        } else if (cabinet.type === 'tall') {
          y = (cabinet.height || 84) * scale / 2;
        } else {
          y = (cabinet.height || 34) * scale / 2; // Base cabinets
        }

        return (
          <Cabinet3D
            key={cabinet.id}
            position={[x, y, z]}
            width={cabinet.width}
            height={cabinet.height || 34}
            depth={cabinet.depth}
            type={cabinet.type}
            hasDoors={cabinet.hasDoors}
            numberOfDoors={cabinet.numberOfDoors}
          />
        );
      })}

      {/* Appliances */}
      {config.appliances.map((appliance) => {
        const x = (appliance.x / 100 - 0.5) * roomWidth;
        const z = (appliance.y / 100 - 0.5) * roomLength;
        const y = appliance.height * scale / 2;

        return (
          <Appliance3D
            key={appliance.id}
            position={[x, y, z]}
            width={appliance.width}
            height={appliance.height}
            depth={appliance.depth}
            type={appliance.type}
          />
        );
      })}

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      
      {/* Soft fill light from above */}
      <pointLight position={[0, 5, 0]} intensity={0.5} distance={20} />

      {/* Camera and controls */}
      <PerspectiveCamera makeDefault position={[6, 4, 6]} fov={60} />
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minDistance={2}
        maxDistance={20}
      />
    </>
  );
}

export function Kitchen3DView({ config }: Kitchen3DViewProps) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden relative">
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold text-slate-900 mb-1">3D Controls:</div>
        <div className="space-y-0.5 text-slate-700">
          <div>🖱️ <strong>Rotate:</strong> Left click + drag</div>
          <div>📐 <strong>Pan:</strong> Right click + drag</div>
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

      {/* 3D Canvas */}
      <Canvas shadows dpr={[1, 2]} className="w-full h-full">
        <Suspense fallback={null}>
          <KitchenScene config={config} />
        </Suspense>
      </Canvas>
    </div>
  );
}
