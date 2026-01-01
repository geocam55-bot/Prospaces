/**
 * Centralized Three.js exports
 * All 3D renderers MUST import Three.js classes from this file
 * to ensure a single instance is used across the application.
 * 
 * This file imports Three.js ONCE and re-exports all needed items.
 * DO NOT import 'three' directly in any other file.
 */

// Single import of Three.js - this is the ONLY place where 'three' should be imported
import * as THREE from 'three';

// Re-export all needed classes directly
export const {
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
  BufferGeometry,
  Vector3,
  Group,
  SpotLight,
  PointLight,
  HemisphereLight,
  SphereGeometry,
  TorusGeometry,
  ConeGeometry,
  RingGeometry,
  ShapeGeometry,
  TextureLoader,
  MeshPhongMaterial,
  MeshLambertMaterial,
  LinearFilter,
  NearestFilter,
  RepeatWrapping,
  ClampToEdgeWrapping,
  MirroredRepeatWrapping,
  BackSide,
  FrontSide,
  MathUtils,
  Quaternion,
  Euler,
  Matrix4,
  Raycaster,
  Vector2
} = THREE;

// Export the entire THREE namespace as well for any edge cases
export default THREE;
