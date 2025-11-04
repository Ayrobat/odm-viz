/**
 * Result of decoding a LAZ/LAS file
 */
export interface LASDecodeResult {
  /** Array of vertex positions (x1,y1,z1, x2,y2,z2, ...) */
  positions: Float32Array;

  /** Bounding box [minX, minY, minZ, maxX, maxY, maxZ] */
  bounds: [number, number, number, number, number, number];

  /** Total number of points */
  pointCount: number;

  /** Time taken to decode in milliseconds */
  decodeTime: number;

  /** Whether the point cloud contains RGB color data */
  enableRGB: boolean;

  /** Optional RGB color data (r1,g1,b1, r2,g2,b2, ...) as 8-bit values */
  colors?: Float32Array;

  /** Scale factors for coordinates */
  scales: { x: number; y: number; z: number };

  /** Offset values for coordinates */
  offsets: { x: number; y: number; z: number };
}

/**
 * Configuration for decoding
 */
export interface DecodeConfig {
  /** Enable RGB color extraction (default: true) */
  enableRGB?: boolean;

  /** Maximum memory to allocate (bytes) */
  maxMemory?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * WASM module configuration
 */
export interface WasmConfig {
  /** Initial memory size in bytes (default: 64MB) */
  memoryInitialSize?: number;

  /** Maximum memory size in bytes (default: 1GB) */
  memoryMaximumSize?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Public API module interface
 */
export interface LAZModule {
  /** Decode a LAZ/LAS file from ArrayBuffer */
  decodeLAZ: (buffer: ArrayBuffer, config?: DecodeConfig) => Promise<LASDecodeResult>;

  /** Configure WASM module settings */
  setWasmConfig: (config: WasmConfig) => void;

  /** Get internal WASM module instance */
  getInstance: () => unknown | null;

  /** Check if WASM module is initialized */
  isInitialized: () => boolean;

  /** Set custom error handler */
  setErrorHandler: (handler: ((message: string) => void) | null) => void;

  /** Set custom debug handler */
  setDebugHandler: (handler: ((message: string) => void) | null) => void;
}

/**
 * Statistics from point cloud loading
 */
export interface PointCloudStats {
  /** Time taken to decode (milliseconds) */
  decodeMs: number;

  /** Total points in file */
  decodedPoints: number;

  /** Points actually displayed (after decimation) */
  displayedPoints: number;

  /** Whether RGB data is available */
  hasRGB: boolean;
}
