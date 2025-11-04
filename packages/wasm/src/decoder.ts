import type { LASDecodeResult } from './types';

export interface DecoderOpts {
  enableRGB?: boolean;
}

interface WasmModule {
  _malloc: (size: number) => number;
  HEAPU8: Uint8Array;
  _decode: (
    srcPtr: number,
    n: number,
    outSizePtr: number,
    boundsPtr: number,
    rgbPtrPtr: number,
    rgbSizePtr: number,
    scalesPtr: number,
    offsetsPtr: number,
    pointCountPtr: number
  ) => number;
  HEAPU32: Uint32Array;
  _free: (ptr: number) => void;
}

export class OptimizedDecoder {
  private mod: unknown = null;
  private enableRGB: boolean;

  constructor(cfg?: DecoderOpts) {
    this.enableRGB = cfg?.enableRGB ?? false;
  }

  isRGBEnabled(): boolean {
    return this.enableRGB;
  }

  /** must be called once from index.ts after wasm is ready */
  setModule(m: unknown): void {
    this.mod = m;
  }

  /** decode one LAZ buffer */
  async decode(arrayBuf: ArrayBuffer): Promise<LASDecodeResult> {
    if (!this.mod) throw new Error('Decoder not initialised – call setModule first');

    const mod = this.mod as WasmModule;
    const buf = new Uint8Array(arrayBuf);
    const n = buf.byteLength;

    /* 1. copy source into wasm heap */
    const srcPtr = mod._malloc(n);
    mod.HEAPU8.set(buf, srcPtr);

    /* 2. allocate out-parameters */
    const outSizePtr = mod._malloc(4);
    const boundsPtr = mod._malloc(6 * 4);
    const rgbPtrPtr = this.enableRGB ? mod._malloc(4) : 0;
    const rgbSizePtr = this.enableRGB ? mod._malloc(4) : 0;
    const scalesPtr = mod._malloc(3 * 4);
    const offsetsPtr = mod._malloc(3 * 4);
    const pointCountPtr = mod._malloc(4);

    /* 3. call decoder */
    const t0 = performance.now();
    const xyzPtr = mod._decode(
      srcPtr,
      n,
      outSizePtr,
      boundsPtr,
      rgbPtrPtr,
      rgbSizePtr,
      scalesPtr,
      offsetsPtr,
      pointCountPtr
    );
    const decodeTime = performance.now() - t0;

    if (!xyzPtr) {
      freeAll();
      throw new Error('LASzip decoder returned NULL – file may be corrupt');
    }

    /* 4. read simple scalars */
    const _xyzSize = mod.HEAPU32[outSizePtr >> 2];
    const pointCount = mod.HEAPU32[pointCountPtr >> 2];
    const boundsF32 = new Float32Array(mod.HEAPU8.buffer, boundsPtr, 6);
    const scalesF32 = new Float32Array(mod.HEAPU8.buffer, scalesPtr, 3);
    const offsetsF32 = new Float32Array(mod.HEAPU8.buffer, offsetsPtr, 3);

    /* 5. copy positions */
    const positions = new Float32Array(mod.HEAPU8.buffer, xyzPtr, pointCount * 3).slice();

    let colors: Float32Array | undefined;
    if (this.enableRGB && rgbPtrPtr && rgbSizePtr) {
      const rgbPtr = mod.HEAPU32[rgbPtrPtr >> 2];
      const rgbSize = mod.HEAPU32[rgbSizePtr >> 2];
      if (rgbPtr && rgbSize) {
        // view as 16-bit without copying first
        const rgb16 = new Uint16Array(mod.HEAPU8.buffer, rgbPtr, rgbSize / 2);
        colors = new Float32Array(rgb16.length);
        for (let i = 0; i < rgb16.length; i++) {
          colors[i] = rgb16[i] / 65535.0;
        }
        mod._free(rgbPtr);
      }
    }
    /* 7. tidy up */
    freeAll();
    return {
      positions,
      bounds: [boundsF32[0], boundsF32[1], boundsF32[2], boundsF32[3], boundsF32[4], boundsF32[5]],
      pointCount,
      decodeTime,
      enableRGB: this.enableRGB,
      colors: colors as Float32Array,
      scales: { x: scalesF32[0], y: scalesF32[1], z: scalesF32[2] },
      offsets: { x: offsetsF32[0], y: offsetsF32[1], z: offsetsF32[2] },
    };

    function freeAll() {
      mod._free(srcPtr);
      mod._free(outSizePtr);
      mod._free(boundsPtr);
      if (rgbPtrPtr) mod._free(rgbPtrPtr);
      if (rgbSizePtr) mod._free(rgbSizePtr);
      mod._free(scalesPtr);
      mod._free(offsetsPtr);
      mod._free(pointCountPtr);
      mod._free(xyzPtr); // C side used malloc for XYZ
    }
  }
}
