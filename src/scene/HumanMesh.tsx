import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRegionSelection } from "../hooks/useRegionSelection";
import { REGIONS } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";
import { MAX_MATCH_DISTANCE } from "../lib/regionMatch";

const MODEL_URL = "/models/HumanModels.glb";
// Raw bounding-box height of the "Man (HighPoly)" node in the source file
// (see scratchpad inspection) — the source isn't authored in real-world
// meters, so we rescale it to match our scene's ~1.75m convention.
const SOURCE_HEIGHT = 3.495;
const TARGET_HEIGHT = 1.75;
const SCALE = TARGET_HEIGHT / SOURCE_HEIGHT;

interface GLTFResult {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.Material>;
}

// Precomputed once: every region's anchor, in REGIONS order, plus a lookup
// from region id back to that index — both are fed into the hover shader so
// it can compute, per-fragment, "which region anchor is nearest to me" using
// the exact same nearest-neighbor rule as the click handler (regionMatch.ts).
// That keeps the highlighted patch on the mesh in sync with what would
// actually get selected, rather than an arbitrary fixed-size glow.
const REGION_ANCHORS = REGIONS.map((r) => new THREE.Vector3(...r.anchor));
const REGION_COUNT = REGIONS.length;
const REGION_INDEX_BY_ID: Record<string, number> = Object.fromEntries(
  REGIONS.map((r, i) => [r.id, i]),
);
const HOVER_COLOR = new THREE.Color("#ffb347");
const HOVER_MAX_STRENGTH = 0.6;
const HOVER_LERP_SPEED = 10;

interface HoverShader {
  uniforms: {
    uActiveIndex: { value: number };
    uHoverStrength: { value: number };
  };
}

export function HumanMesh() {
  const { nodes, materials } = useGLTF(MODEL_URL) as unknown as GLTFResult;
  const geometry = nodes["Man_(HighPoly)"].geometry;
  // The source mesh's baked normals produce dark shading patches under our
  // lighting — recompute smooth normals from the actual triangle winding instead.
  useMemo(() => geometry.computeVertexNormals(), [geometry]);

  const { onPointerMove, onPointerOut, onClick } = useRegionSelection();
  const shaderRef = useRef<HoverShader | null>(null);

  const material = useMemo(() => {
    const base = materials.Skin as THREE.MeshStandardMaterial;
    const mat = base.clone();
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uAnchors = { value: REGION_ANCHORS };
      shader.uniforms.uActiveIndex = { value: -1 };
      shader.uniforms.uHoverStrength = { value: 0 };
      shader.uniforms.uHoverColor = { value: HOVER_COLOR };
      shader.uniforms.uMaxHighlightDist = { value: MAX_MATCH_DISTANCE };

      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;")
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vWorldPos;
          uniform vec3 uAnchors[${REGION_COUNT}];
          uniform int uActiveIndex;
          uniform float uHoverStrength;
          uniform vec3 uHoverColor;
          uniform float uMaxHighlightDist;`,
        )
        .replace(
          "#include <dithering_fragment>",
          `
          {
            float nearestDist = 1e9;
            int nearestIdx = -1;
            for (int i = 0; i < ${REGION_COUNT}; i++) {
              float d = distance(vWorldPos, uAnchors[i]);
              if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
            }
            // Require BOTH "this anchor is nearest" AND "close enough to it" —
            // otherwise a sparsely-anchored region could visually claim a
            // fragment that's technically nearest to it but anatomically far
            // away (e.g. a distant chest fragment being nearer to a shoulder
            // joint than to the chest's own, farther-away anchor).
            if (uActiveIndex >= 0 && nearestIdx == uActiveIndex && nearestDist < uMaxHighlightDist) {
              gl_FragColor.rgb = mix(gl_FragColor.rgb, uHoverColor, uHoverStrength);
            }
          }
          #include <dithering_fragment>
          `,
        );

      shaderRef.current = shader as unknown as HoverShader;
    };
    return mat;
  }, [materials]);

  useFrame((_, delta) => {
    const shader = shaderRef.current;
    if (!shader) return;
    const hoveredId = useSelectionStore.getState().hoveredRegionId;
    const activeIndex = hoveredId ? (REGION_INDEX_BY_ID[hoveredId] ?? -1) : -1;
    shader.uniforms.uActiveIndex.value = activeIndex;
    const target = activeIndex >= 0 ? HOVER_MAX_STRENGTH : 0;
    const current = shader.uniforms.uHoverStrength.value;
    shader.uniforms.uHoverStrength.value = current + (target - current) * Math.min(1, delta * HOVER_LERP_SPEED);
  });

  return (
    <mesh
      geometry={geometry}
      material={material}
      scale={SCALE}
      position={[0, 0, 0]}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      onClick={onClick}
    />
  );
}

useGLTF.preload(MODEL_URL);
