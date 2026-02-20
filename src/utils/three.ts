// Centralized Three.js re-export to prevent multiple instances
// All components should import from this file instead of 'three' directly
export {
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
  MeshBasicMaterial,
  Mesh,
  GridHelper,
  DoubleSide,
  EdgesGeometry,
  BoxGeometry,
  CylinderGeometry,
  LineBasicMaterial,
  LineSegments,
  BufferGeometry,
  BufferAttribute,
  Vector3,
  CanvasTexture
} from 'three';
