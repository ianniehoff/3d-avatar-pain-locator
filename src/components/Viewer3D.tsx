import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Html, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { Avatar } from "../scene/Avatar";
import { useSelectionStore } from "../state/selectionStore";

function LoadingIndicator() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="viewer3d__loading" role="status">
        Loading body model… {Math.round(progress)}%
      </div>
    </Html>
  );
}

const TARGET = new THREE.Vector3(0, 0.85, 0);
const MIN_TARGET_Y = 0.0;
const MAX_TARGET_Y = 1.65;
const PAN_STEP = 0.22;

export function Viewer3D() {
  const controlsRef = useRef<any>(null);
  const meshVariant = useSelectionStore((s) => s.meshVariant);
  const setMeshVariant = useSelectionStore((s) => s.setMeshVariant);

  const flip180 = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object as THREE.PerspectiveCamera;
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += Math.PI;
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  };

  const panY = (delta: number) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object as THREE.PerspectiveCamera;
    const nextY = THREE.MathUtils.clamp(controls.target.y + delta, MIN_TARGET_Y, MAX_TARGET_Y);
    const actualDelta = nextY - controls.target.y;
    controls.target.y = nextY;
    // Shift the camera by the same amount so the view pans rather than tilts.
    camera.position.y += actualDelta;
    controls.update();
  };

  return (
    <div className="viewer3d">
      <Canvas camera={{ position: [0, 1.0, 3.4], fov: 32 }} shadows={false}>
        <ambientLight intensity={1.6} />
        <hemisphereLight args={["#ffffff", "#a06a3c", 1.0]} />
        <directionalLight position={[2, 3, 2]} intensity={0.45} />
        <directionalLight position={[-2, 1.5, -1]} intensity={0.25} />
        <Suspense fallback={<LoadingIndicator />}>
          <Avatar />
        </Suspense>
        <Grid
          position={[0, 0, 0]}
          args={[4, 4]}
          cellColor="#d8d8dc"
          sectionColor="#b8b8bf"
          fadeDistance={6}
          infiniteGrid
        />
        <OrbitControls
          ref={controlsRef}
          target={TARGET}
          enablePan
          minDistance={0.35}
          maxDistance={4.5}
          maxPolarAngle={Math.PI * 0.85}
          enableDamping
        />
      </Canvas>
      <div className="viewer3d__variant" role="group" aria-label="Body model">
        {(["standard", "smooth"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={meshVariant === v}
            className={meshVariant === v ? "is-active" : undefined}
            onClick={() => setMeshVariant(v)}
          >
            {v === "standard" ? "Standard" : "Smooth"}
          </button>
        ))}
      </div>
      <div className="viewer3d__controls">
        <button type="button" onClick={flip180}>
          Flip front / back
        </button>
        <div className="viewer3d__pan">
          <button type="button" onClick={() => panY(PAN_STEP)} title="Focus higher" aria-label="Focus higher">
            ▲
          </button>
          <button type="button" onClick={() => panY(-PAN_STEP)} title="Focus lower" aria-label="Focus lower">
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}
