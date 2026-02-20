/**
 * Centralized Three.js re-exports.
 * All 3D renderer components should import from this file instead of
 * directly from 'three' to avoid the "Multiple instances of Three.js"
 * bundler warning.
 */
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
  CanvasTexture,
} from 'three';
