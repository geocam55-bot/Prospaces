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
  BoxGeometry,
  DoubleSide,
  BufferGeometry,
  BufferAttribute
} from '../../utils/three';

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
      metalness: config.sidingType === 'metal' ? 0.4 : 0.0,
      side: DoubleSide
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

      // Gable end walls (triangular fills)
      const gableGeometry = new BufferGeometry();
      const gableVertices = new Float32Array([
        -shedWidth/2, wallHeight + 0.2, shedLength/2,
        shedWidth/2, wallHeight + 0.2, shedLength/2,
        0, wallHeight + 0.2 + roofRise, shedLength/2,
      ]);
      gableGeometry.setAttribute('position', new BufferAttribute(gableVertices, 3));
      gableGeometry.computeVertexNormals();
      
      const gableFront = new Mesh(gableGeometry, wallMaterial);
      gableFront.castShadow = true;
      scene.add(gableFront);
      
      const gableBackGeometry = new BufferGeometry();
      const gableBackVertices = new Float32Array([
        -shedWidth/2, wallHeight + 0.2, -shedLength/2,
        shedWidth/2, wallHeight + 0.2, -shedLength/2,
        0, wallHeight + 0.2 + roofRise, -shedLength/2,
      ]);
      gableBackGeometry.setAttribute('position', new BufferAttribute(gableBackVertices, 3));
      gableBackGeometry.computeVertexNormals();
      
      const gableBack = new Mesh(gableBackGeometry, wallMaterial);
      gableBack.castShadow = true;
      scene.add(gableBack);
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

      // Lean-to gable end walls (triangular fills - right triangle shape)
      const leanGableFrontGeometry = new BufferGeometry();
      const leanGableFrontVertices = new Float32Array([
        -shedWidth/2, wallHeight + 0.2, shedLength/2,
        shedWidth/2, wallHeight + 0.2, shedLength/2,
        -shedWidth/2, wallHeight + 0.2 + roofRise, shedLength/2,
      ]);
      leanGableFrontGeometry.setAttribute('position', new BufferAttribute(leanGableFrontVertices, 3));
      leanGableFrontGeometry.computeVertexNormals();
      
      const leanGableFront = new Mesh(leanGableFrontGeometry, wallMaterial);
      leanGableFront.castShadow = true;
      scene.add(leanGableFront);
      
      const leanGableBackGeometry = new BufferGeometry();
      const leanGableBackVertices = new Float32Array([
        -shedWidth/2, wallHeight + 0.2, -shedLength/2,
        shedWidth/2, wallHeight + 0.2, -shedLength/2,
        -shedWidth/2, wallHeight + 0.2 + roofRise, -shedLength/2,
      ]);
      leanGableBackGeometry.setAttribute('position', new BufferAttribute(leanGableBackVertices, 3));
      leanGableBackGeometry.computeVertexNormals();
      
      const leanGableBack = new Mesh(leanGableBackGeometry, wallMaterial);
      leanGableBack.castShadow = true;
      scene.add(leanGableBack);
    } else if (config.style === 'barn') {
      // Gambrel roof (barn style) - simplified and corrected
      const lowerRise = roofRise * 0.5; // Lower section rises 50% of total
      const upperRise = roofRise * 0.5; // Upper section rises the remaining 50%
      
      // Lower sections (steeper angle from wall to mid-point)
      const lowerWidth = shedWidth / 4; // Quarter of the width for lower section
      const lowerRoofLength = Math.sqrt(Math.pow(lowerWidth, 2) + Math.pow(lowerRise, 2));
      const lowerRoofAngle = Math.atan2(lowerRise, lowerWidth);
      
      // Lower left roof panel
      const lowerLeftRoof = new Mesh(
        new BoxGeometry(lowerRoofLength + 0.1, 0.08, shedLength + 0.3),
        roofMaterial
      );
      // Position at 3/8 from left (-3/8 of width), halfway up the lower rise
      lowerLeftRoof.position.set(
        -(shedWidth / 2 - lowerWidth / 2),
        wallHeight + 0.2 + lowerRise / 2,
        0
      );
      lowerLeftRoof.rotation.z = lowerRoofAngle;
      lowerLeftRoof.castShadow = true;
      lowerLeftRoof.receiveShadow = true;
      scene.add(lowerLeftRoof);
      
      // Lower right roof panel
      const lowerRightRoof = new Mesh(
        new BoxGeometry(lowerRoofLength + 0.1, 0.08, shedLength + 0.3),
        roofMaterial
      );
      lowerRightRoof.position.set(
        (shedWidth / 2 - lowerWidth / 2),
        wallHeight + 0.2 + lowerRise / 2,
        0
      );
      lowerRightRoof.rotation.z = -lowerRoofAngle;
      lowerRightRoof.castShadow = true;
      lowerRightRoof.receiveShadow = true;
      scene.add(lowerRightRoof);
      
      // Upper sections (gentler angle from mid-point to peak)
      const upperWidth = shedWidth / 4; // Quarter of the width for upper section
      const upperRoofLength = Math.sqrt(Math.pow(upperWidth, 2) + Math.pow(upperRise, 2));
      const upperRoofAngle = Math.atan2(upperRise, upperWidth);
      
      // Upper left roof panel
      const upperLeftRoof = new Mesh(
        new BoxGeometry(upperRoofLength + 0.1, 0.08, shedLength + 0.3),
        roofMaterial
      );
      upperLeftRoof.position.set(
        -upperWidth / 2,
        wallHeight + 0.2 + lowerRise + upperRise / 2,
        0
      );
      upperLeftRoof.rotation.z = upperRoofAngle;
      upperLeftRoof.castShadow = true;
      upperLeftRoof.receiveShadow = true;
      scene.add(upperLeftRoof);
      
      // Upper right roof panel
      const upperRightRoof = new Mesh(
        new BoxGeometry(upperRoofLength + 0.1, 0.08, shedLength + 0.3),
        roofMaterial
      );
      upperRightRoof.position.set(
        upperWidth / 2,
        wallHeight + 0.2 + lowerRise + upperRise / 2,
        0
      );
      upperRightRoof.rotation.z = -upperRoofAngle;
      upperRightRoof.castShadow = true;
      upperRightRoof.receiveShadow = true;
      scene.add(upperRightRoof);

      // Barn/gambrel gable end walls (pentagonal shape: two triangles per side)
      const barnWallTop = wallHeight + 0.2;
      const barnLowerY = barnWallTop + lowerRise;
      const barnPeakY = barnWallTop + lowerRise + upperRise;
      const barnLowerX = shedWidth / 4; // Inner edge of lower panels

      // Front gable - lower left triangle
      const barnFrontLLGeom = new BufferGeometry();
      barnFrontLLGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, barnWallTop, shedLength/2,
        -barnLowerX, barnLowerY, shedLength/2,
        -barnLowerX, barnWallTop, shedLength/2,
      ]), 3));
      barnFrontLLGeom.computeVertexNormals();
      scene.add(new Mesh(barnFrontLLGeom, wallMaterial));

      // Front gable - lower right triangle
      const barnFrontLRGeom = new BufferGeometry();
      barnFrontLRGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        shedWidth/2, barnWallTop, shedLength/2,
        barnLowerX, barnWallTop, shedLength/2,
        barnLowerX, barnLowerY, shedLength/2,
      ]), 3));
      barnFrontLRGeom.computeVertexNormals();
      scene.add(new Mesh(barnFrontLRGeom, wallMaterial));

      // Front gable - upper triangle (from lower break points to peak)
      const barnFrontUpperGeom = new BufferGeometry();
      barnFrontUpperGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -barnLowerX, barnLowerY, shedLength/2,
        barnLowerX, barnLowerY, shedLength/2,
        0, barnPeakY, shedLength/2,
      ]), 3));
      barnFrontUpperGeom.computeVertexNormals();
      scene.add(new Mesh(barnFrontUpperGeom, wallMaterial));

      // Front gable - fill rectangle between lower triangles
      const barnFrontRectGeom = new BufferGeometry();
      barnFrontRectGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -barnLowerX, barnWallTop, shedLength/2,
        barnLowerX, barnWallTop, shedLength/2,
        barnLowerX, barnLowerY, shedLength/2,
        -barnLowerX, barnWallTop, shedLength/2,
        barnLowerX, barnLowerY, shedLength/2,
        -barnLowerX, barnLowerY, shedLength/2,
      ]), 3));
      barnFrontRectGeom.computeVertexNormals();
      scene.add(new Mesh(barnFrontRectGeom, wallMaterial));

      // Back gable - lower left triangle
      const barnBackLLGeom = new BufferGeometry();
      barnBackLLGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, barnWallTop, -shedLength/2,
        -barnLowerX, barnWallTop, -shedLength/2,
        -barnLowerX, barnLowerY, -shedLength/2,
      ]), 3));
      barnBackLLGeom.computeVertexNormals();
      scene.add(new Mesh(barnBackLLGeom, wallMaterial));

      // Back gable - lower right triangle
      const barnBackLRGeom = new BufferGeometry();
      barnBackLRGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        shedWidth/2, barnWallTop, -shedLength/2,
        barnLowerX, barnLowerY, -shedLength/2,
        barnLowerX, barnWallTop, -shedLength/2,
      ]), 3));
      barnBackLRGeom.computeVertexNormals();
      scene.add(new Mesh(barnBackLRGeom, wallMaterial));

      // Back gable - upper triangle
      const barnBackUpperGeom = new BufferGeometry();
      barnBackUpperGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -barnLowerX, barnLowerY, -shedLength/2,
        0, barnPeakY, -shedLength/2,
        barnLowerX, barnLowerY, -shedLength/2,
      ]), 3));
      barnBackUpperGeom.computeVertexNormals();
      scene.add(new Mesh(barnBackUpperGeom, wallMaterial));

      // Back gable - fill rectangle between lower triangles
      const barnBackRectGeom = new BufferGeometry();
      barnBackRectGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -barnLowerX, barnWallTop, -shedLength/2,
        barnLowerX, barnLowerY, -shedLength/2,
        barnLowerX, barnWallTop, -shedLength/2,
        -barnLowerX, barnWallTop, -shedLength/2,
        -barnLowerX, barnLowerY, -shedLength/2,
        barnLowerX, barnLowerY, -shedLength/2,
      ]), 3));
      barnBackRectGeom.computeVertexNormals();
      scene.add(new Mesh(barnBackRectGeom, wallMaterial));
    } else if (config.style === 'quaker') {
      // Quaker: gable roof with extended front overhang
      const roofSlopeLength = Math.sqrt(Math.pow(shedWidth / 2, 2) + Math.pow(roofRise, 2));
      const roofAngle = Math.atan2(roofRise, shedWidth / 2);
      const overhangDepth = shedLength * 0.15; // Front porch overhang

      // Left roof slope (extends forward with overhang)
      const leftRoofGeometry = new BoxGeometry(roofSlopeLength + 0.15, 0.08, shedLength + 0.3 + overhangDepth);
      const leftRoof = new Mesh(leftRoofGeometry, roofMaterial);
      leftRoof.position.set(
        -shedWidth / 4,
        wallHeight + 0.2 + roofRise / 2,
        overhangDepth / 2
      );
      leftRoof.rotation.z = roofAngle;
      leftRoof.castShadow = true;
      leftRoof.receiveShadow = true;
      scene.add(leftRoof);

      // Right roof slope (extends forward with overhang)
      const rightRoof = new Mesh(leftRoofGeometry, roofMaterial);
      rightRoof.position.set(
        shedWidth / 4,
        wallHeight + 0.2 + roofRise / 2,
        overhangDepth / 2
      );
      rightRoof.rotation.z = -roofAngle;
      rightRoof.castShadow = true;
      rightRoof.receiveShadow = true;
      scene.add(rightRoof);

      // Overhang support posts
      const postGeometry = new BoxGeometry(0.08, wallHeight, 0.08);
      const postMaterial = new MeshStandardMaterial({ color: 0x6b5d4f, roughness: 0.8 });

      const leftPost = new Mesh(postGeometry, postMaterial);
      leftPost.position.set(-shedWidth / 2 + 0.15, wallHeight / 2 + 0.2, shedLength / 2 + overhangDepth);
      leftPost.castShadow = true;
      scene.add(leftPost);

      const rightPost = new Mesh(postGeometry, postMaterial);
      rightPost.position.set(shedWidth / 2 - 0.15, wallHeight / 2 + 0.2, shedLength / 2 + overhangDepth);
      rightPost.castShadow = true;
      scene.add(rightPost);

      // Front gable end wall (on the main wall, not the overhang)
      const qFrontGableGeom = new BufferGeometry();
      qFrontGableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, wallHeight + 0.2, shedLength/2,
        shedWidth/2, wallHeight + 0.2, shedLength/2,
        0, wallHeight + 0.2 + roofRise, shedLength/2,
      ]), 3));
      qFrontGableGeom.computeVertexNormals();
      const qFrontGable = new Mesh(qFrontGableGeom, wallMaterial);
      qFrontGable.castShadow = true;
      scene.add(qFrontGable);

      // Back gable end wall
      const qBackGableGeom = new BufferGeometry();
      qBackGableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, wallHeight + 0.2, -shedLength/2,
        shedWidth/2, wallHeight + 0.2, -shedLength/2,
        0, wallHeight + 0.2 + roofRise, -shedLength/2,
      ]), 3));
      qBackGableGeom.computeVertexNormals();
      const qBackGable = new Mesh(qBackGableGeom, wallMaterial);
      qBackGable.castShadow = true;
      scene.add(qBackGable);

    } else if (config.style === 'saltbox') {
      // Saltbox: asymmetric gable — peak is offset toward the front
      // Front slope is shorter/steeper, back slope is longer/shallower
      const peakOffsetX = -shedWidth * 0.1; // Peak shifted toward front (left in our coord system matches 2D canvas)
      const frontHalfW = shedWidth / 2 + peakOffsetX; // shorter front side
      const backHalfW = shedWidth / 2 - peakOffsetX;  // longer back side

      // Front (left) roof slope
      const frontSlopeLen = Math.sqrt(frontHalfW * frontHalfW + roofRise * roofRise);
      const frontSlopeAngle = Math.atan2(roofRise, frontHalfW);
      const frontRoofGeom = new BoxGeometry(frontSlopeLen + 0.15, 0.08, shedLength + 0.3);
      const frontRoof = new Mesh(frontRoofGeom, roofMaterial);
      frontRoof.position.set(
        (-shedWidth / 2 + peakOffsetX) / 2,
        wallHeight + 0.2 + roofRise / 2,
        0
      );
      frontRoof.rotation.z = frontSlopeAngle;
      frontRoof.castShadow = true;
      frontRoof.receiveShadow = true;
      scene.add(frontRoof);

      // Back (right) roof slope
      const backSlopeLen = Math.sqrt(backHalfW * backHalfW + roofRise * roofRise);
      const backSlopeAngle = Math.atan2(roofRise, backHalfW);
      const backRoofGeom = new BoxGeometry(backSlopeLen + 0.15, 0.08, shedLength + 0.3);
      const backRoof = new Mesh(backRoofGeom, roofMaterial);
      backRoof.position.set(
        (shedWidth / 2 + peakOffsetX) / 2,
        wallHeight + 0.2 + roofRise / 2,
        0
      );
      backRoof.rotation.z = -backSlopeAngle;
      backRoof.castShadow = true;
      backRoof.receiveShadow = true;
      scene.add(backRoof);

      // Front gable end wall
      const sFrontGableGeom = new BufferGeometry();
      sFrontGableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, wallHeight + 0.2, shedLength/2,
        shedWidth/2, wallHeight + 0.2, shedLength/2,
        peakOffsetX, wallHeight + 0.2 + roofRise, shedLength/2,
      ]), 3));
      sFrontGableGeom.computeVertexNormals();
      const sFrontGable = new Mesh(sFrontGableGeom, wallMaterial);
      sFrontGable.castShadow = true;
      scene.add(sFrontGable);

      // Back gable end wall
      const sBackGableGeom = new BufferGeometry();
      sBackGableGeom.setAttribute('position', new BufferAttribute(new Float32Array([
        -shedWidth/2, wallHeight + 0.2, -shedLength/2,
        shedWidth/2, wallHeight + 0.2, -shedLength/2,
        peakOffsetX, wallHeight + 0.2 + roofRise, -shedLength/2,
      ]), 3));
      sBackGableGeom.computeVertexNormals();
      const sBackGable = new Mesh(sBackGableGeom, wallMaterial);
      sBackGable.castShadow = true;
      scene.add(sBackGable);
    }

    // Door
    const doorWidth = config.doorWidth * scale;
    const doorHeight = config.doorHeight * scale;
    const doorGeometry = new BoxGeometry(doorWidth, doorHeight, 0.05);
    const doorMaterial = new MeshStandardMaterial({ 
      color: config.doorType === 'sliding-barn' ? 0x8b7355 :
             config.doorType === 'double' ? 0xd4d4d4 :
             config.doorType === 'roll-up' ? 0x9ca3af : 0xf5f0eb,
      roughness: config.doorType === 'roll-up' ? 0.3 : 0.5,
      metalness: config.doorType === 'roll-up' ? 0.5 : 0.1
    });
    const door = new Mesh(doorGeometry, doorMaterial);
    
    if (config.doorPosition === 'front') {
      door.position.set(0, doorHeight / 2 + 0.2, shedLength / 2 + 0.08);
    } else {
      door.position.set(0, doorHeight / 2 + 0.2, -shedLength / 2 - 0.08);
    }
    door.castShadow = true;
    scene.add(door);

    // Door frame/trim
    const trimColor = 0x4a5568;
    const trimMaterial = new MeshStandardMaterial({ color: trimColor, roughness: 0.6 });
    const trimThickness = 0.04;
    const trimDepth = 0.06;
    
    // Top trim
    const topTrimGeom = new BoxGeometry(doorWidth + trimThickness * 2, trimThickness, trimDepth);
    const topTrim = new Mesh(topTrimGeom, trimMaterial);
    topTrim.position.set(
      door.position.x,
      doorHeight + 0.2 + trimThickness / 2,
      door.position.z
    );
    scene.add(topTrim);

    // Left trim
    const sideTrimGeom = new BoxGeometry(trimThickness, doorHeight, trimDepth);
    const leftTrim = new Mesh(sideTrimGeom, trimMaterial);
    leftTrim.position.set(
      door.position.x - doorWidth / 2 - trimThickness / 2,
      doorHeight / 2 + 0.2,
      door.position.z
    );
    scene.add(leftTrim);

    // Right trim
    const rightTrim = new Mesh(sideTrimGeom, trimMaterial);
    rightTrim.position.set(
      door.position.x + doorWidth / 2 + trimThickness / 2,
      doorHeight / 2 + 0.2,
      door.position.z
    );
    scene.add(rightTrim);

    // Door handle
    const handleGeom = new BoxGeometry(0.03, 0.12, 0.04);
    const handleMaterial = new MeshStandardMaterial({ color: 0x2d2d2d, metalness: 0.8, roughness: 0.2 });
    const handle = new Mesh(handleGeom, handleMaterial);
    handle.position.set(
      door.position.x + doorWidth * 0.15,
      doorHeight * 0.45 + 0.2,
      door.position.z + 0.04
    );
    scene.add(handle);

    // For double doors, add a center line and second handle
    if (config.doorType === 'double') {
      const centerLineGeom = new BoxGeometry(0.02, doorHeight, trimDepth);
      const centerLine = new Mesh(centerLineGeom, trimMaterial);
      centerLine.position.set(door.position.x, doorHeight / 2 + 0.2, door.position.z + 0.01);
      scene.add(centerLine);

      const handle2 = new Mesh(handleGeom, handleMaterial);
      handle2.position.set(
        door.position.x - doorWidth * 0.15,
        doorHeight * 0.45 + 0.2,
        door.position.z + 0.04
      );
      scene.add(handle2);
    }

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