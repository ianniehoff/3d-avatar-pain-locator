import { Html } from "@react-three/drei";
import { REGIONS_BY_ID } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";

/** Persistent small dot on the selected landmark, plus a floating name label
 *  while actively hovering. The hovered zone itself is highlighted directly
 *  on the mesh surface (see scene/HumanMesh.tsx), so this component only
 *  needs to carry the text label and the "you picked this" marker. */
export function RegionMarker() {
  const hoveredRegionId = useSelectionStore((s) => s.hoveredRegionId);
  const selectedRegionId = useSelectionStore((s) => s.selectedRegionId);

  const hoveredRegion = hoveredRegionId ? REGIONS_BY_ID[hoveredRegionId] : null;
  const selectedRegion = selectedRegionId ? REGIONS_BY_ID[selectedRegionId] : null;

  return (
    <group>
      {selectedRegion && (
        <mesh position={selectedRegion.anchor}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshBasicMaterial color="#ff3b30" />
        </mesh>
      )}
      {hoveredRegion && (
        <group position={hoveredRegion.anchor}>
          <Html occlude={false} style={{ pointerEvents: "none" }}>
            <div className="region-hover-label">{hoveredRegion.name}</div>
          </Html>
        </group>
      )}
    </group>
  );
}
