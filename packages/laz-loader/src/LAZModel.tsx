import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { decodeLAZ } from '@odm-viz/wasm';
import { useEffect, useState, useCallback, useRef } from 'react';

interface LAZModelProps {
  url?: string;
  pointSize?: number;
  color?: string | number;
  decimate?: number;
  maxPoints?: number;
  colorMode?: 'solid' | 'depth' | 'rgb';
  palette?: 'blue' | 'yellow' | 'grayscale';
  additive?: boolean;
  sizeAttenuation?: boolean;
  flatten?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (loaded: number, total: number) => void;
  onStats?: (stats: { decodeMs: number; decodedPoints: number; displayedPoints: number }) => void;
  buffer?: ArrayBuffer | null;
  reloadToken?: number;
}

export function LAZModel({
  url,
  pointSize = 0.5,
  color = 0x00ff00,
  colorMode = 'solid',
  palette = 'blue',
  sizeAttenuation = false,
  additive = false,
  maxPoints = 1_000_000,
  decimate = 1,
  onLoad,
  onError,
  onStats,
  onProgress,
  buffer,
  reloadToken,
}: LAZModelProps) {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const geomRef = useRef<THREE.BufferGeometry | null>(null);
  const [version, setVersion] = useState(0); // Force re-render when geometry updates
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    if (!url && !buffer) return;

    if (!isMounted.current) return;
    setLoading(true);
    setErrorText(null);

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      let srcBuf: ArrayBuffer;
      const start = performance.now();

      if (buffer) {
        // Create a new copy of the buffer to avoid transfer issues
        srcBuf = buffer.slice(0);
      } else if (url) {
        const res = await fetch(url, { signal: abortRef.current.signal });
        if (!res.ok) {
          throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
        }

        const total = Number(res.headers.get('content-length')) || 0;
        const reader = res.body?.getReader();

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const chunks: Uint8Array[] = [];
        let received = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.byteLength;
              if (onProgress && total > 0) {
                onProgress(received, total);
              }
            }
          }

          // Concatenate chunks into a single buffer
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          srcBuf = result.buffer;
        } finally {
          reader.releaseLock();
        }
      } else {
        throw new Error('Either url or buffer must be provided');
      }

      // Ensure the buffer is valid
      if (!srcBuf || srcBuf.byteLength === 0) {
        throw new Error('Empty or invalid buffer received');
      }

      // Log buffer info for debugging
      console.log('Decoding LAZ buffer:', {
        byteLength: srcBuf.byteLength,
        firstBytes: new Uint8Array(srcBuf, 0, Math.min(16, srcBuf.byteLength)),
      });

      const decoded = await decodeLAZ(srcBuf, { enableRGB: colorMode === 'rgb' });
      console.log(':DECODE', decoded);
      console.log('Decoded data structure:', {
        ...decoded,
        hasRGB: decoded.hasRGB,
        colors: decoded.colors ? `[Uint8Array ${decoded.colors.length} bytes]` : 'none',
      });
      const decodeMs = performance.now() - start;

      let positions = decoded.positions;

      // Optional decimate
      if (decimate > 1) {
        const filtered: number[] = [];
        for (let i = 0; i < positions.length; i += 3 * decimate) {
          filtered.push(positions[i], positions[i + 1], positions[i + 2]);
        }
        positions = new Float32Array(filtered);
      }

      // Optional maxPoints
      if (positions.length / 3 > maxPoints) {
        positions = positions.subarray(0, maxPoints * 3);
      }

      // Optimized coordinate normalization
      const positionsArray = new Float32Array(positions);

      if (positionsArray.length > 0) {
        // Find min/max in a single pass
        let minX = positionsArray[0],
          minY = positionsArray[1],
          minZ = positionsArray[2];
        let maxX = minX,
          maxY = minY,
          maxZ = minZ;

        for (let i = 3; i < positionsArray.length; i += 3) {
          minX = Math.min(minX, positionsArray[i]);
          maxX = Math.max(maxX, positionsArray[i]);
          minY = Math.min(minY, positionsArray[i + 1]);
          maxY = Math.max(maxY, positionsArray[i + 1]);
          minZ = Math.min(minZ, positionsArray[i + 2]);
          maxZ = Math.max(maxZ, positionsArray[i + 2]);
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const maxSize = Math.max(sizeX, sizeY, sizeZ);
        const scale = maxSize > 0 ? 1000 / maxSize : 1;

        // Apply transformation in place
        for (let i = 0; i < positionsArray.length; i += 3) {
          positionsArray[i] = (positionsArray[i] - centerX) * scale;
          positionsArray[i + 1] = (positionsArray[i + 1] - centerY) * scale;
          positionsArray[i + 2] = (positionsArray[i + 2] - centerZ) * scale;
        }

        console.log('Normalized point cloud:', {
          originalCenter: [centerX, centerY, centerZ],
          originalSize: [sizeX, sizeY, sizeZ],
          scaleFactor: scale,
          bounds: {
            min: [(minX - centerX) * scale, (minY - centerY) * scale, (minZ - centerZ) * scale],
            max: [(maxX - centerX) * scale, (maxY - centerY) * scale, (maxZ - centerZ) * scale],
          },
        });
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positionsArray, 3));

      if (colorMode === 'rgb' && decoded.colors) {
        try {
          const colors = new Float32Array(decoded.colors); // copy
          // gamma + brighten so dark shadows become visible
          for (let i = 0; i < colors.length; i++) {
            colors[i] = Math.pow(colors[i], 1 / 2.2) * 1.8; // sRGB-ish + boost
          }
          g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          console.log(`RGB colours applied (${colors.length / 3} verts)`);
        } catch (err) {
          console.error('Error processing RGB colors:', err);
        }
      }

      g.computeBoundingSphere();

      // Dispose old geometry
      if (geomRef.current) {
        geomRef.current.dispose();
      }

      // Update the ref and force re-render
      geomRef.current = g;
      setVersion((v) => v + 1);

      if (onStats) {
        onStats({
          decodeMs,
          decodedPoints: decoded.positions.length / 3,
          displayedPoints: positions.length / 3,
        });
      }

      onLoad?.();
    } catch (error: unknown) {
      // if aborted, silently ignore
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        return;
      }

      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error loading LAZ model:', error);
      setErrorText(msg);
      if (isMounted.current && onError) {
        onError(error instanceof Error ? error : new Error(msg));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [url, buffer, decimate, maxPoints, onLoad, onError, onProgress, onStats, colorMode]);

  // Load the model when the component mounts or reloadToken changes
  useEffect(() => {
    isMounted.current = true;
    load();

    return () => {
      isMounted.current = false;
      abortRef.current?.abort();
      abortRef.current = null;

      if (geomRef.current) {
        geomRef.current.dispose();
        geomRef.current = null;
      }
    };
  }, [url, buffer?.byteLength, reloadToken, load]);

  // --- UI states ---
  if (loading && !geomRef.current) {
    return (
      <Html center>
        <div style={{ color: 'white' }}>Loading point cloud…</div>
      </Html>
    );
  }

  if (errorText) {
    return (
      <Html center>
        <div style={{ color: 'red' }}>Error: {errorText}</div>
      </Html>
    );
  }

  if (!geomRef.current) return null;

  // Choose color
  let _finalColor = typeof color === 'number' ? color : 0x00ff00;
  if (colorMode === 'solid') {
    if (palette === 'yellow') _finalColor = 0xffeb3b;
    if (palette === 'grayscale') _finalColor = 0x808080;
  }

  return (
    <points key={version} geometry={geomRef.current}>
      <pointsMaterial
        key={`material-${version}-${colorMode}`} // Force remount on color mode change
        ref={materialRef}
        size={pointSize}
        color={_finalColor}
        sizeAttenuation={sizeAttenuation}
        vertexColors={!!geomRef.current?.getAttribute('color')}
        transparent={true}
        opacity={additive ? 0.7 : 1.0}
        alphaTest={0.01}
        depthWrite={!additive}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      ></pointsMaterial>
    </points>
  );
}
