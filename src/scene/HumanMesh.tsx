import { useCallback, useMemo, useRef } from "react";
import { Bvh, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { REGION_ID_BY_INDEX, REGION_INDEX_BY_ID, type BodyType } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";
import { isTouchDevice } from "../hooks/useDevice";

// Built by the pipeline in scripts/ (see README): a compressed body mesh with
// a region index per vertex (_REGION) baked in. Edges that cross a region
// border are pre-refined to ~1cm so borders drawn through them look smooth.
const MODEL_URLS: Record<BodyType, string> = {
  male: "/models/body-male.glb",
  female: "/models/body-female.glb",
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
// Each vertex sends 1 (in the highlighted region) or 0 (not) to the GPU,
// which interpolates it across triangles; the border is drawn where the value
// crosses 0.5, i.e. a smooth line through the middle of border triangles.
// EDGE_SOFTNESS widens the anti-aliased transition slightly.
const EDGE_SOFTNESS = 1.5;

const TMP = new THREE.Vector3();


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

export function HumanMesh({ body }: { body: BodyType }) {
  const { nodes } = useGLTF(MODEL_URLS[body]) as unknown as GLTFResult;
  const bodyNode = nodes.Body;
  const setHovered = useSelectionStore((s) => s.setHovered);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const shaderRef = useRef<RegionShader | null>(null);

  const geometry = useMemo(() => {
    const geo = bodyNode.geometry;
    // GLTFLoader exposes custom attributes lower-cased; give them shader-safe names.
    if (!geo.getAttribute("regionId")) {
      geo.setAttribute("regionId", geo.getAttribute("_region"));
    }
    return geo;
  }, [bodyNode]);

  const material = useMemo(() => {
    const mat = (bodyNode.material as THREE.MeshStandardMaterial).clone();
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
          uniform float uHoverIndex;
          uniform float uSelectedIndex;
          varying float vInHover;
          varying float vInSelected;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vInHover = abs(regionId - uHoverIndex) < 0.5 ? 1.0 : 0.0;
          vInSelected = abs(regionId - uSelectedIndex) < 0.5 ? 1.0 : 0.0;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying float vInHover;
          varying float vInSelected;
          uniform float uHoverStrength;
          uniform vec3 uHoverColor;
          uniform float uSelectedStrength;
          uniform vec3 uSelectedColor;
          float regionMask(float v) {
            float w = max(fwidth(v) * ${EDGE_SOFTNESS.toFixed(1)}, 0.001);
            return smoothstep(0.5 - w, 0.5 + w, v);
          }`,
        )
        .replace(
          "#include <dithering_fragment>",
          `
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSelectedColor, uSelectedStrength * regionMask(vInSelected));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uHoverColor, uHoverStrength * regionMask(vInHover));
          #include <dithering_fragment>
          `,
        );

      shaderRef.current = shader as unknown as RegionShader;
    };
    return mat;
  }, [bodyNode]);

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

  // Region under a hit point = region of the nearest corner of the triangle
  // that was hit, which matches the border line the shader draws.
  const regionAt = useCallback(
    (e: ThreeEvent<PointerEvent | MouseEvent>) => {
      if (!e.face) return null;
      const local = e.object.worldToLocal(e.point.clone());
      const position = geometry.getAttribute("position");
      let best = e.face.a;
      let bestDist = Infinity;
      for (const v of [e.face.a, e.face.b, e.face.c]) {
        const d = TMP.fromBufferAttribute(position, v).distanceToSquared(local);
        if (d < bestDist) {
          bestDist = d;
          best = v;
        }
      }
      const regionIndex = Math.round(geometry.getAttribute("regionId").getX(best));
      return REGION_ID_BY_INDEX[regionIndex] ?? null;
    },
    [geometry],
  );

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      // No hover on touch screens: a moving finger is rotating the model.
      if (e.nativeEvent.pointerType === "touch") return;
      setHovered(regionAt(e));
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
      // Ignore clicks that were really the end of an orbit drag (fingers wobble more).
      if (e.delta > (isTouchDevice() ? 12 : 4)) return;
      setSelected(regionAt(e));
    },
    [regionAt, setSelected],
  );

  return (
    <group scale={SCALE}>
      {/* BVH keeps pointer hit-testing fast on the ~57k-triangle mesh. */}
      <Bvh firstHitOnly>
        <mesh
          geometry={geometry}
          material={material}
          // Quantized meshes carry a node transform that maps them back to source units.
          position={bodyNode.position}
          quaternion={bodyNode.quaternion}
          scale={bodyNode.scale}
          onPointerMove={onPointerMove}
          onPointerOut={onPointerOut}
          onClick={onClick}
        />
      </Bvh>
    </group>
  );
}

// Only the chosen body is downloaded; the other loads if the user switches.
