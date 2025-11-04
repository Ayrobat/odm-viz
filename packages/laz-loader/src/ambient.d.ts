declare module '@odm-viz/wasm' {
  export interface LASDecodeResult {
    /** Interleaved position and attribute data (XYZ + optional RGB + optional NIR) */
    positions: Float32Array;
    /** Bounding box: [minX, minY, minZ, maxX, maxY, maxZ] */
    bounds: [number, number, number, number, number, number];
    /** Total number of points in the original file */
    pointCount: number;
    /** Whether the file contains RGB color data */
    hasRGB: boolean;
    /** Whether the file contains Near-Infrared (NIR) data */
    hasNIR: boolean;
    /** Number of components per point (3 for XYZ, 6 for XYZRGB, 7 for XYZRGBN, etc.) */
    components: number;
    /** LAS/LAZ point format (0-10) */
    pointFormat: number;
    /** Scale factors used for coordinates [x, y, z] */
    scale: [number, number, number];
    /** Offsets used for coordinates [x, y, z] */
    offset: [number, number, number];
    /** Optional color data (RGB) */
    colors?: Float32Array;
  }

  export interface LASDecodeOptions {
    /** Skip this many points between reads (for faster loading) */
    skip?: number;
    /** Maximum number of points to load (0 for unlimited) */
    maxPoints?: number;
    /** Whether to include RGB data (if available) */
    enableRGB?: boolean;
    /** Whether to include NIR data (if available) */
    withNIR?: boolean;
  }

  /**
   * Decode a LAZ file buffer into a point cloud
   * @param buffer The LAZ file data
   * @param options Decoding options
   */
  export function decodeLAZ(
    buffer: ArrayBuffer,
    options?: LASDecodeOptions
  ): Promise<LASDecodeResult>;
}
