import { use, useCallback, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { REGIONS } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";

const MODEL_URL = "/models/HumanModels.glb";
const REGION_MAP_URL = "/models/regionMap.bin";
// Raw bounding-box height of the "Man (HighPoly)" node in the source file —
// the source isn't authored in real-world meters, so we rescale it to match
// our scene's ~1.75m convention.
const SOURCE_HEIGHT = 3.495;
const TARGET_HEIGHT = 1.75;
const SCALE = TARGET_HEIGHT / SOURCE_HEIGHT;

const HOVER_COLOR = new THREE.Color("#ffb347");
const SELECTED_COLOR = new THREE.Color("#e0463f");
const HOVER_MAX_STRENGTH = 0.65;
const SELECTED_STRENGTH = 0.5;
const LERP_SPEED = 12;

// One Uint16 per triangle of the mesh: an index into REGIONS. Generated
// offline by scripts/build_regions.py so every triangle belongs to exactly one
// anatomical region, which gives crisp, stable highlight boundaries.
const regionMapPromise: Promise<Uint16Array> = fetch(REGION_MAP_URL)
  .then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${REGION_MAP_URL}: ${r.status}`);
    return r.arrayBuffer();
  })
  .then((buf) => new Uint16Array(buf));

const REGION_INDEX_BY_ID: Record<string, number> = Object.fromEntries(
  REGIONS.map((r, i) => [r.id, i]),
);

interface GLTFResult {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.Material>;
}

interface RegionShader {
  uniforms: {
    uHoverIndex: { value: number };
    uHoverStrength: { value: number };
    uSelectedIndex: { value: number };
    uSelectedStrength: { value: number };
  };
}

export function HumanMesh() {
  const { nodes, materials } = useGLTF(MODEL_URL) as unknown as GLTFResult;
  const regionMap = use(regionMapPromise);
  const setHovered = useSelectionStore((s) => s.setHovered);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const shaderRef = useRef<RegionShader | null>(null);

  const geometry = useMemo(() => {
    const source = nodes["Man_(HighPoly)"].geometry.clone();
    // The source mesh's baked normals produce dark shading patches under our
    // lighting, so recompute smooth normals while it is still indexed...
    source.computeVertexNormals();
    // ...then un-index it so each triangle owns its three vertices and can
    // carry its own region id without bleeding into its neighbours.
    const geo = source.toNonIndexed();
    const triCount = geo.attributes.position.count / 3;
    if (triCount !== regionMap.length) {
      console.warn(`Region map has ${regionMap.length} entries but mesh has ${triCount} triangles`);
    }
    const ids = new Float32Array(triCount * 3);
    for (let t = 0; t < triCount; t++) {
      const id = regionMap[t] ?? 0;
      ids[t * 3] = id;
      ids[t * 3 + 1] = id;
      ids[t * 3 + 2] = id;
    }
    geo.setAttribute("regionId", new THREE.BufferAttribute(ids, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [nodes, regionMap]);

  const material = useMemo(() => {
    const base = materials.Skin as THREE.MeshStandardMaterial;
    const mat = base.clone();
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uHoverIndex = { value: -1 };
      shader.uniforms.uHoverStrength = { value: 0 };
      shader.uniforms.uHoverColor = { value: HOVER_COLOR };
      shader.uniforms.uSelectedIndex = { value: -1 };
      shader.uniforms.uSelectedStrength = { value: 0 };
      shader.uniforms.uSelectedColor = { value: SELECTED_COLOR };

      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float regionId;\nvarying float vRegionId;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRegionId = regionId;");

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying float vRegionId;
          uniform float uHoverIndex;
          uniform float uHoverStrength;
          uniform vec3 uHoverColor;
          uniform float uSelectedIndex;
          uniform float uSelectedStrength;
          uniform vec3 uSelectedColor;`,
        )
        .replace(
          "#include <dithering_fragment>",
          `
          if (abs(vRegionId - uSelectedIndex) < 0.5) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uSelectedColor, uSelectedStrength);
          }
          if (abs(vRegionId - uHoverIndex) < 0.5) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uHoverColor, uHoverStrength);
          }
          #include <dithering_fragment>
          `,
        );

      shaderRef.current = shader as unknown as RegionShader;
    };
    return mat;
  }, [materials]);

  useFrame((_, delta) => {
    const shader = shaderRef.current;
    if (!shader) return;
    const { hoveredRegionId, selectedRegionId } = useSelectionStore.getState();
    const k = Math.min(1, delta * LERP_SPEED);

    const hoverIndex = hoveredRegionId ? (REGION_INDEX_BY_ID[hoveredRegionId] ?? -1) : -1;
    const u = shader.uniforms;
    // Keep the last hovered index while fading out so the glow doesn't pop off.
    if (hoverIndex >= 0) u.uHoverIndex.value = hoverIndex;
    const hoverTarget = hoverIndex >= 0 ? HOVER_MAX_STRENGTH : 0;
    u.uHoverStrength.value += (hoverTarget - u.uHoverStrength.value) * k;

    const selectedIndex = selectedRegionId ? (REGION_INDEX_BY_ID[selectedRegionId] ?? -1) : -1;
    if (selectedIndex >= 0) u.uSelectedIndex.value = selectedIndex;
    const selTarget = selectedIndex >= 0 ? SELECTED_STRENGTH : 0;
    u.uSelectedStrength.value += (selTarget - u.uSelectedStrength.value) * k;
  });

  const regionAt = useCallback(
    (faceIndex: number | undefined | null) => {
      if (faceIndex == null) return null;
      const idx = regionMap[faceIndex];
      return idx == null ? null : (REGIONS[idx]?.id ?? null);
    },
    [regionMap],
  );

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(regionAt(e.faceIndex));
    },
    [regionAt, setHovered],
  );

  const onPointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(null);
    },
    [setHovered],
  );

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      // Ignore clicks that were really the end of an orbit drag.
      if (e.delta > 4) return;
      setSelected(regionAt(e.faceIndex));
    },
    [regionAt, setSelected],
  );

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
