// Type definitions for @odm-viz/wasm

declare type EmscriptenModule = unknown;

declare class WASMError extends Error {
  code?: number;
  constructor(message: string, code?: number);
}

declare interface LASDecodeResult {
  positions: Float32Array;
  bounds: [number, number, number, number, number, number];
  pointCount: number;
  hasRGB: boolean;
  hasNIR: boolean;
  components: number;
  pointFormat: number;
  scale: [number, number, number];
  offset: [number, number, number];
}

declare interface LASDecodeOptions {
  skip?: number;
  maxPoints?: number;
  withRGB?: boolean;
  withNIR?: boolean;
  offset?: number;
  length?: number;
  isLastChunk?: boolean;
}

declare interface LAZModule extends EmscriptenModule {
  // Direct mapping to the C++ decode function
  decode: (input: ArrayBuffer, size: number, bounds: Float32Array) => number; // Returns pointer to the decoded points

  // Memory management
  HEAPU8: Uint8Array;
  _free: (ptr: number) => void;

  [key: string]: unknown;

  getInstance: () => unknown;
  isInitialized: () => boolean;
  setErrorHandler: (handler: ((message: string) => void) | null) => void;
  setDebugHandler: (handler: ((message: string) => void) | null) => void;
}

declare const wasmModule: LAZModule;

declare function decodeLAZ(
  buffer: ArrayBuffer,
  options?: LASDecodeOptions
): Promise<LASDecodeResult>;
declare function setWasmConfig(config: {
  memoryInitialSize?: number;
  memoryMaximumSize?: number;
  debug?: boolean;
}): void;
declare function getInstance(): unknown;
declare function isInitialized(): boolean;
declare function setErrorHandler(handler: ((message: string) => void) | null): void;
declare function setDebugHandler(handler: ((message: string) => void) | null): void;

export {
  WASMError,
  LASDecodeResult,
  LASDecodeOptions,
  LAZModule,
  wasmModule,
  decodeLAZ,
  setWasmConfig,
  getInstance,
  isInitialized,
  setErrorHandler,
  setDebugHandler,
};

export default wasmModule;
