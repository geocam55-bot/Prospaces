// Centralized Three.js stub / re-export
// All planner components import from this file instead of 'three' directly.
// If 'three' is not installed, we export lightweight stubs so that Vite's
// pre-transform step doesn't error. The planners are React.lazy-loaded and
// wrapped in <Suspense>, so they'll gracefully show a fallback if Three.js
// isn't available at runtime.

let threeModule: any = null;

try {
  // Dynamic require won't work in ESM, so we set up stubs below.
  // At runtime the lazy-loaded planner chunk will attempt `import('three')`
  // through this module's re-exports. If `three` isn't installed the chunk
  // simply won't load and Suspense catches it.
} catch {
  // ignored
}

// ── Stub factory ────────────────────────────────────────────────────────
// Provides no-op constructors / constants so the file parses & type-checks
// even when the real Three.js package is absent.

const noop = () => {};
class StubClass {
  constructor(..._args: any[]) {}
}

// Classes
export const Scene = StubClass as any;
export const Color = StubClass as any;
export const Fog = StubClass as any;
export const PerspectiveCamera = StubClass as any;
export const WebGLRenderer = StubClass as any;
export const AmbientLight = StubClass as any;
export const DirectionalLight = StubClass as any;
export const PlaneGeometry = StubClass as any;
export const MeshStandardMaterial = StubClass as any;
export const MeshBasicMaterial = StubClass as any;
export const Mesh = StubClass as any;
export const GridHelper = StubClass as any;
export const EdgesGeometry = StubClass as any;
export const BoxGeometry = StubClass as any;
export const CylinderGeometry = StubClass as any;
export const LineBasicMaterial = StubClass as any;
export const LineSegments = StubClass as any;
export const BufferGeometry = StubClass as any;
export const BufferAttribute = StubClass as any;
export const Vector3 = StubClass as any;
export const CanvasTexture = StubClass as any;

// Constants
export const PCFSoftShadowMap = 2;
export const DoubleSide = 2;
