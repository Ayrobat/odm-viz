import { initWasm, setWasmConfig as setInternalConfig, type WasmModule } from './wasmLoader';
import { OptimizedDecoder } from './decoder';
import type { LASDecodeResult, DecodeConfig, WasmConfig, LAZModule } from './types';

// Module state
let wasmInstance: WasmModule | null = null;
let decoder: OptimizedDecoder | null = null;
let errorHandler: ((message: string) => void) | null = null;
let debugHandler: ((message: string) => void) | null = null;

export class WASMError extends Error {
  constructor(
    message: string,
    public code?: number
  ) {
    super(message);
    this.name = 'WASMError';
  }
}

async function initializeWASM(config: WasmConfig = {}): Promise<WasmModule> {
  if (wasmInstance) return wasmInstance;

  wasmInstance = await initWasm(config);

  if (!decoder) {
    decoder = new OptimizedDecoder();
    decoder.setModule(wasmInstance);
  }

  if (errorHandler && wasmInstance._set_error_handler)
    wasmInstance._set_error_handler(errorHandler);
  if (debugHandler && wasmInstance._set_debug_handler)
    wasmInstance._set_debug_handler(debugHandler);

  return wasmInstance;
}

/**
 * Decode a LAZ/LAS file (guarantees WASM is ready)
 */
async function decodeLAZ(buffer: ArrayBuffer, config?: DecodeConfig): Promise<LASDecodeResult> {
  if (!(buffer instanceof ArrayBuffer)) throw new TypeError('Input must be an ArrayBuffer');
  if (buffer.byteLength === 0) throw new Error('Input buffer is empty');

  /*  ensure WASM + decoder are initialised  */
  await initializeWASM();

  const enableRGB = config?.enableRGB ?? true;
  if (decoder!.isRGBEnabled() !== enableRGB) {
    /*  rebuild decoder if RGB flag changed  */
    decoder = new OptimizedDecoder({ enableRGB });
    decoder.setModule(wasmInstance!);
  }

  return decoder.decode(buffer);
}
/**
 * Configure WASM module memory and settings
 * Must be called before first decode operation
 *
 * @example
 * ```typescript
 * setWasmConfig({
 *   memoryInitialSize: 128 * 1024 * 1024, // 128MB
 *   memoryMaximumSize: 2048 * 1024 * 1024, // 2GB
 *   debug: true
 * });
 * ```
 */
function setWasmConfig(config: WasmConfig): void {
  setInternalConfig(config);
}

/**
 * Get the internal WASM module instance (advanced use)
 */
function getInstance(): WasmModule | null {
  return wasmInstance;
}

/**
 * Check if WASM module is initialized
 */
function isInitialized(): boolean {
  return wasmInstance !== null;
}

/**
 * Set custom error handler for WASM errors
 *
 * @example
 * ```typescript
 * setErrorHandler((message) => {
 *   console.error('WASM Error:', message);
 *   // Send to error tracking service
 * });
 * ```
 */
function setErrorHandler(handler: ((message: string) => void) | null): void {
  errorHandler = handler;
  if (wasmInstance?._set_error_handler) {
    wasmInstance._set_error_handler(handler || (() => {}));
  }
}

/**
 * Set custom debug handler for WASM debug messages
 *
 * @example
 * ```typescript
 * setDebugHandler((message) => {
 *   console.log('WASM Debug:', message);
 * });
 * ```
 */
function setDebugHandler(handler: ((message: string) => void) | null): void {
  debugHandler = handler;
  if (wasmInstance?._set_debug_handler) {
    wasmInstance._set_debug_handler(handler || (() => {}));
  }
}

// Public API
const wasmModule: LAZModule = {
  decodeLAZ,
  setWasmConfig,
  getInstance,
  isInitialized,
  setErrorHandler,
  setDebugHandler,
};

export default wasmModule;

// Named exports
export {
  decodeLAZ,
  setWasmConfig,
  getInstance,
  isInitialized,
  setErrorHandler,
  setDebugHandler,
  initializeWASM,
};

// Type exports
export type { LASDecodeResult, DecodeConfig, WasmConfig, LAZModule };
