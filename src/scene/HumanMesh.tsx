import { useCallback, useMemo, useRef } from "react";
import { Bvh, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { REGIONS } from "../data/regions";
import { useSelectionStore, type MeshVariant } from "../state/selectionStore";

// Built by the pipeline in scripts/ (see README): one compressed mesh per
// variant with a per-triangle region index (_REGION) and each vertex's
// distance to the edge of its region (_BORDER) baked in.
export const MODEL_URLS: Record<MeshVariant, string> = {
  standard: "/models/body-standard.glb",
  smooth: "/models/body-smooth.glb",
};
// Source mesh units -> our scene's ~1.75m convention.
const SOURCE_HEIGHT = 3.495;
const TARGET_HEIGHT = 1.75;
const SCALE = TARGET_HEIGHT / SOURCE_HEIGHT;

const HOVER_COLOR = new THREE.Color("#ffb347");
const SELECTED_COLOR = new THREE.Color("#e0463f");
const HOVER_MAX_STRENGTH = 0.65;
const SELECTED_STRENGTH = 0.5;
const LERP_SPEED = 12;
// Highlights fade in over this distance (mesh units, ~1cm) from a region's
// edge, and never drop below EDGE_FLOOR so thin regions (fingers) stay visible.
const FEATHER = 0.02;
const EDGE_FLOOR = 0.3;

const REGION_INDEX_BY_ID: Record<string, number> = Object.fromEntries(
  REGIONS.map((r, i) => [r.id, i]),
);

interface GLTFResult {
  nodes: { Body: THREE.Mesh };
}

interface RegionShader {
  uniforms: {
    uHoverIndex: { value: number };
    uHoverStrength: { value: number };
    uSelectedIndex: { value: number };
    uSelectedStrength: { value: number };
  };
}

export function HumanMesh({ variant }: { variant: MeshVariant }) {
  const { nodes } = useGLTF(MODEL_URLS[variant]) as unknown as GLTFResult;
  const body = nodes.Body;
  const setHovered = useSelectionStore((s) => s.setHovered);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const shaderRef = useRef<RegionShader | null>(null);

  const geometry = useMemo(() => {
    const geo = body.geometry;
    // GLTFLoader exposes custom attributes lower-cased; give them shader-safe names.
    if (!geo.getAttribute("regionId")) {
      geo.setAttribute("regionId", geo.getAttribute("_region"));
      geo.setAttribute("borderDist", geo.getAttribute("_border"));
    }
    return geo;
  }, [body]);

  const material = useMemo(() => {
    const mat = (body.material as THREE.MeshStandardMaterial).clone();
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uHoverIndex = { value: -1 };
      shader.uniforms.uHoverStrength = { value: 0 };
      shader.uniforms.uHoverColor = { value: HOVER_COLOR };
      shader.uniforms.uSelectedIndex = { value: -1 };
      shader.uniforms.uSelectedStrength = { value: 0 };
      shader.uniforms.uSelectedColor = { value: SELECTED_COLOR };

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute float regionId;
          attribute float borderDist;
          varying float vRegionId;
          varying float vBorderDist;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vRegionId = regionId;
          vBorderDist = borderDist;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying float vRegionId;
          varying float vBorderDist;
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
          float edge = mix(${EDGE_FLOOR.toFixed(2)}, 1.0, smoothstep(0.0, ${FEATHER.toFixed(3)}, vBorderDist));
          if (abs(vRegionId - uSelectedIndex) < 0.5) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uSelectedColor, uSelectedStrength * edge);
          }
          if (abs(vRegionId - uHoverIndex) < 0.5) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uHoverColor, uHoverStrength * edge);
          }
          #include <dithering_fragment>
          `,
        );

      shaderRef.current = shader as unknown as RegionShader;
    };
    return mat;
  }, [body]);

  useFrame((_, delta) => {
    const shader = shaderRef.current;
    if (!shader) return;
    const { hoveredRegionId, selectedRegionId } = useSelectionStore.getState();
    const k = Math.min(1, delta * LERP_SPEED);
    const u = shader.uniforms;

    const hoverIndex = hoveredRegionId ? (REGION_INDEX_BY_ID[hoveredRegionId] ?? -1) : -1;
    // Keep the last hovered index while fading out so the glow doesn't pop off.
    if (hoverIndex >= 0) u.uHoverIndex.value = hoverIndex;
    u.uHoverStrength.value += ((hoverIndex >= 0 ? HOVER_MAX_STRENGTH : 0) - u.uHoverStrength.value) * k;

    const selectedIndex = selectedRegionId ? (REGION_INDEX_BY_ID[selectedRegionId] ?? -1) : -1;
    if (selectedIndex >= 0) u.uSelectedIndex.value = selectedIndex;
    u.uSelectedStrength.value += ((selectedIndex >= 0 ? SELECTED_STRENGTH : 0) - u.uSelectedStrength.value) * k;
  });

  const regionAt = useCallback(
    (faceIndex: number | undefined | null) => {
      if (faceIndex == null) return null;
      const index = geometry.getIndex();
      const vertex = index ? index.getX(faceIndex * 3) : faceIndex * 3;
      const regionIndex = Math.round(geometry.getAttribute("regionId").getX(vertex));
      return REGIONS[regionIndex]?.id ?? null;
    },
    [geometry],
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
    <group scale={SCALE}>
      {/* BVH keeps pointer hit-testing fast on the 220k-triangle smooth mesh. */}
      <Bvh firstHitOnly>
        <mesh
          geometry={geometry}
          material={material}
          // Quantized meshes carry a node transform that maps them back to source units.
          position={body.position}
          quaternion={body.quaternion}
          scale={body.scale}
          onPointerMove={onPointerMove}
          onPointerOut={onPointerOut}
          onClick={onClick}
        />
      </Bvh>
    </group>
  );
}

useGLTF.preload(MODEL_URLS.smooth);
