// apps/demo/src/DemoScene.tsx
import React, { Suspense, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Stats, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LAZModel } from '@odm-viz/laz-loader';
import { useControls } from 'leva';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

const MemoizedGrid = () => {
  const config = useMemo(
    () => ({
      args: [1000, 100] as [number, number],
      cellSize: 10,
      cellThickness: 1,
      cellColor: '#6f6f6f',
      sectionSize: 50,
      sectionThickness: 1.5,
      sectionColor: '#9d4b4b',
      fadeDistance: 2000,
    }),
    []
  );

  return <Grid {...config} />;
};

function Scene({ onCameraReady }: { onCameraReady: (camera: THREE.Camera) => void }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsType>(null);

  useEffect(() => {
    onCameraReady(camera);
  }, [camera, onCameraReady]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <MemoizedGrid />
      <OrbitControls
        ref={controlsRef}
        args={[camera, gl.domElement]}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={1500}
      />
      <Stats />
    </>
  );
}

export default function DemoScene() {
  const [srcUrl, setSrcUrl] = useState(
    '/odm_export/odm_georeferencing/odm_georeferenced_model.laz'
  );
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    decodeMs: number;
    decodedPoints: number;
    displayedPoints: number;
  } | null>(null);
  const [events, setEvents] = useState<
    Array<{ t: number; type: string; payload?: string | Record<string, unknown> }>
  >([]);

  const controls = useControls('Point Cloud', {
    pointSize: { value: 1.5, min: 0.5, max: 5, step: 0.1 },
    decimate: { value: 10, min: 1, max: 50, step: 1 },
    maxPoints: { value: 500_000, min: 100_000, max: 5_000_000, step: 100_000 },
    additive: false,
    sizeAttenuation: false,
    flatten: false,
    colorMode: { options: { Solid: 'solid', Depth: 'depth', RGB: 'rgb' }, value: 'solid' },
    palette: { options: { Blue: 'blue', Yellow: 'yellow', Grayscale: 'grayscale' }, value: 'blue' },
    autoDensity: true,
  });

  const {
    pointSize: dPointSize,
    decimate: dDecimate,
    maxPoints: dMaxPoints,
    additive: dAdditive,
    sizeAttenuation: dSizeAtt,
    colorMode: dColorMode,
    flatten: dFlatten,
    palette: dPalette,
  } = controls;

  // --- File handling ---
  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.laz') && !f.name.toLowerCase().endsWith('.las')) {
      setEvents((ev) =>
        [{ t: Date.now(), type: 'error', payload: 'Select a .laz or .las file' }, ...ev].slice(
          0,
          200
        )
      );
      return;
    }

    try {
      setProgress(0);
      const buffer = await f.arrayBuffer();
      setFileBuffer(buffer);
      setSrcUrl(''); // clear srcUrl so LAZModel uses buffer
      setEvents((ev) =>
        [
          {
            t: Date.now(),
            type: 'file:loaded',
            payload: { name: f.name, size: buffer.byteLength },
          },
          ...ev,
        ].slice(0, 200)
      );
    } catch (err) {
      console.error(err);
      setEvents((ev) =>
        [{ t: Date.now(), type: 'error', payload: String(err) }, ...ev].slice(0, 200)
      );
    }
  }, []);

  const reloadModel = useCallback(() => setReloadToken((r) => r + 1), []);
  const loadSample = useCallback(() => {
    setFileBuffer(null);
    setSrcUrl('/odm_export/odm_georeferencing/odm_georeferenced_model.laz');
    setReloadToken((r) => r + 1);
  }, []);

  const fitView = useCallback(() => {
    if (!camera || !stats) return;
    const boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      stats.decodedPoints > 0 ? Math.cbrt(stats.decodedPoints) * 0.1 : 100
    );
    const distance = boundingSphere.radius * 2;
    const direction = new THREE.Vector3(1, 1, 1).normalize();
    const startPos = camera.position.clone();
    const targetPos = new THREE.Vector3()
      .copy(boundingSphere.center)
      .add(direction.multiplyScalar(distance));

    let startTime: number | null = null;
    const duration = 1000;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const t = Math.min((ts - startTime) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(startPos, targetPos, ease);
      camera.lookAt(boundingSphere.center);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).far = distance * 5;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }

    setEvents((ev) =>
      [
        { t: Date.now(), type: 'view:fit', payload: { position: camera.position.toArray() } },
        ...ev,
      ].slice(0, 200)
    );
  }, [camera, stats]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      {/* Controls UI */}
      <div className="overlay-ui">
        <h3>Point Cloud Controls</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button onClick={reloadModel} style={{ background: '#2196F3' }}>
            Reload
          </button>
          <button onClick={fitView} style={{ background: '#FF9800' }}>
            Fit View
          </button>
          <button onClick={loadSample} style={{ background: '#9C27B0' }}>
            Load Sample
          </button>
        </div>
        <label>
          Load File: <input type="file" accept=".laz,.las" onChange={onFileChange} />
        </label>
        {progress !== null && <div>Loading: {progress.toFixed(0)}%</div>}
        {stats && (
          <div>
            Points: {stats.displayedPoints.toLocaleString()} /{' '}
            {stats.decodedPoints.toLocaleString()} Decode: {stats.decodeMs.toFixed(1)}ms
          </div>
        )}
      </div>

      {/* Event log */}
      <div className="overlay-ui overlay-top-right">
        <h4>Events</h4>
        {events.slice(0, 10).map((e, i) => (
          <div key={`${e.t}-${i}`} style={{ marginBottom: '4px' }}>
            <span style={{ color: '#aaa' }}>{new Date(e.t).toLocaleTimeString()}</span>
            <span style={{ marginLeft: '4px', color: e.type === 'error' ? '#ff6b6b' : '#4fc3f7' }}>
              {e.type}
            </span>
            {e.payload && (
              <span style={{ marginLeft: '4px' }}>
                {typeof e.payload === 'object' ? JSON.stringify(e.payload) : String(e.payload)}
              </span>
            )}
          </div>
        ))}
      </div>

      <Canvas
        camera={{ position: [0, 0, 100], fov: 50, near: 0.1, far: 10000 }}
        dpr={[1, Math.min(2, window.devicePixelRatio || 1)]}
      >
        <Suspense
          fallback={
            <Html center>
              <div style={{ color: 'white' }}>Loading scene…</div>
            </Html>
          }
        >
          <Scene onCameraReady={setCamera} />
          <LAZModel
            url={srcUrl || undefined}
            buffer={fileBuffer || undefined}
            reloadToken={reloadToken}
            onProgress={(loaded, total) => {
              if (total > 0) setProgress(Math.min(100, Math.floor((loaded / total) * 100)));
            }}
            onStats={setStats}
            pointSize={dPointSize}
            decimate={dDecimate}
            maxPoints={dMaxPoints}
            additive={dAdditive}
            sizeAttenuation={dSizeAtt}
            colorMode={dColorMode as 'solid' | 'depth' | 'rgb'}
            palette={dPalette as 'blue' | 'yellow' | 'grayscale'}
            flatten={dFlatten}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
