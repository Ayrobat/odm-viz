// packages/wasm/src/laszip.d.ts

// This file is the type declaration for the adjacent './laszip.js' import.
// We remove the declare module block entirely to stop Tsup from choking.

import { WasmModule, EmscriptenModule } from './wasmLoader';

// Define the exact signature of the factory function.
// Note: This must be defined globally or imported correctly.
type EmscriptenModuleFactory = (moduleOverrides?: Partial<EmscriptenModule>) => Promise<WasmModule>;

// Define the file's exports directly.
// The default export of 'laszip.js' is the factory function.
declare const _default: EmscriptenModuleFactory;
export default _default;
