import { Html } from "@react-three/drei";
import { getRegion } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";
import { useIsTouch } from "../hooks/useDevice";

/** Floating name label on the model: the region under the mouse, or on touch
 *  screens (which have no hover) the region that was tapped. The regions
 *  themselves are tinted on the mesh surface (see scene/HumanMesh.tsx). */
export function RegionMarker() {
  const hoveredRegionId = useSelectionStore((s) => s.hoveredRegionId);
  const selectedRegionId = useSelectionStore((s) => s.selectedRegionId);
  const isTouch = useIsTouch();
  const id = hoveredRegionId ?? (isTouch ? selectedRegionId : null);
  const body = useSelectionStore((s) => s.body);
  const region = getRegion(body, id);
  if (!region) return null;
  return (
    <group position={region.anchor}>
      <Html occlude={false} style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
        <div className="region-hover-label">{region.name}</div>
      </Html>
    </group>
  );
}
