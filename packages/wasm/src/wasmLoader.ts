/**
 * Emscripten module type definition (Internal)
 */
export interface EmscriptenModule {
  wasmBinary?: ArrayBuffer;
  wasmMemory?: WebAssembly.Memory;
  onRuntimeInitialized?: () => void;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  onError?: (message: string) => void;
  onDebug?: (message: string) => void;
  [key: string]: unknown;
}

/**
 * WASM module interface with our specific methods (Internal)
 */
export interface WasmModule extends EmscriptenModule {
  _decodeLAZ: (bufferPtr: number, bufferSize: number, optionsPtr: number) => number;
  _free: (ptr: number) => void;
  _malloc: (size: number) => number;
  HEAPU8: Uint8Array;
  _set_error_handler: (handler: (message: string) => void) => void;
  _set_debug_handler: (handler: (message: string) => void) => void;
  _free_result: (resultPtr: number) => void;
  _get_error: (resultPtr: number) => string;
  _get_debug: (resultPtr: number) => string;
  HEAP32: Int32Array;
  HEAPF32: Float32Array;
  UTF8ToString: (ptr: number) => string;
}

/**
 * Configuration for the WASM module (Internal)
 */
export interface WasmConfig {
  memoryInitialSize?: number;
  memoryMaximumSize?: number;
  debug?: boolean;
}

const DEFAULT_CONFIG: WasmConfig = {
  memoryInitialSize: 16 * 1024 * 1024,
  memoryMaximumSize: 512 * 1024 * 1024,
  debug: (() => {
    try {
      return process.env.NODE_ENV !== 'production';
    } catch {
      return true;
    }
  })(),
};

let wasmConfig: WasmConfig = { ...DEFAULT_CONFIG };
let wasmModule: WasmModule | null = null;
let initializationPromise: Promise<WasmModule> | null = null;

// Apply WASM memory configuration from window object if available
if (
  typeof window !== 'undefined' &&
  (window as Window & typeof globalThis & { WASM_MEMORY_CONFIG: unknown }).WASM_MEMORY_CONFIG
) {
  const memConfig = (window as Window & typeof globalThis & { WASM_MEMORY_CONFIG: unknown })
    .WASM_MEMORY_CONFIG as { initial?: number; maximum?: number };

  // Convert from MB to bytes
  if (memConfig.initial) {
    wasmConfig.memoryInitialSize = memConfig.initial * 1024 * 1024; // MB to bytes
  }
  if (memConfig.maximum) {
    wasmConfig.memoryMaximumSize = memConfig.maximum * 1024 * 1024; // MB to bytes
  }

  if (wasmConfig.debug) {
    console.log('Applied WASM Memory Configuration:', {
      initial: formatMemory(wasmConfig.memoryInitialSize!),
      maximum: formatMemory(wasmConfig.memoryMaximumSize!),
    });
  }
}

function formatMemory(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Initialize the WASM module
 */
export async function initWasm(config: WasmConfig = {}): Promise<WasmModule> {
  // Merge configs with priority: config parameter > wasmConfig > DEFAULT_CONFIG
  wasmConfig = {
    ...DEFAULT_CONFIG,
    ...wasmConfig,
    ...Object.fromEntries(Object.entries(config).filter(([_, v]) => v !== undefined)),
  };

  // Return existing instance or promise
  if (wasmModule) {
    if (wasmConfig.debug) {
      console.log('Returning existing WASM module instance');
    }
    return wasmModule;
  }
  if (initializationPromise) {
    if (wasmConfig.debug) {
      console.log('WASM initialization already in progress, waiting...');
    }
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      if (wasmConfig.debug) {
        console.log('Starting WASM initialization...');
      }

      // Dynamically import the Emscripten-generated WASM module
      const wasmImport = await import('../dist/laszip.js');
      const createModule = wasmImport.default;

      if (typeof createModule !== 'function') {
        throw new Error('WASM module export is not a function');
      }

      const moduleOverrides: Partial<EmscriptenModule> = {
        print: wasmConfig.debug ? console.log : () => {},
        printErr: wasmConfig.debug ? console.error : () => {},
        onAbort: (msg: string) => {
          console.error('WASM aborted:', msg);
        },
      };

      if (wasmConfig.debug) {
        console.log('Calling Emscripten factory...');
      }

      wasmModule = (await createModule(moduleOverrides)) as WasmModule;

      if (!wasmModule) {
        throw new Error('WASM module initialization returned null');
      }

      if (wasmConfig.debug) {
        console.log('WASM module initialized successfully!');
      }

      return wasmModule;
    } catch (error) {
      console.error('Failed to initialize WASM module:', error);
      wasmModule = null;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Set the configuration for the WASM module (Internal)
 * Must be called before initWasm/decodeLAZ is first called.
 */
export function setWasmConfig(config: Partial<WasmConfig>): void {
  wasmConfig = { ...wasmConfig, ...config };

  if (wasmModule) {
    console.warn('WASM module already initialized. Memory config changes will not take effect.');
  }
}

function getWasmModule(): WasmModule | null {
  return wasmModule;
}

function isInitialized(): boolean {
  return wasmModule !== null;
}

export default initWasm;
export { getWasmModule, isInitialized };
