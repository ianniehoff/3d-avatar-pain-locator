import { Html } from "@react-three/drei";
import { REGIONS_BY_ID } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";

/** Floating name label for the region under the pointer. The hovered and
 *  selected regions themselves are tinted directly on the mesh surface
 *  (see scene/HumanMesh.tsx), so this only needs to carry the text. */
export function RegionMarker() {
  const hoveredRegionId = useSelectionStore((s) => s.hoveredRegionId);
  const hoveredRegion = hoveredRegionId ? REGIONS_BY_ID[hoveredRegionId] : null;
  if (!hoveredRegion) return null;
  return (
    <group position={hoveredRegion.anchor}>
      <Html occlude={false} style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
        <div className="region-hover-label">{hoveredRegion.name}</div>
      </Html>
    </group>
  );
}
