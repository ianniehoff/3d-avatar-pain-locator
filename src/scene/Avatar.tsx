import { HumanMesh } from "./HumanMesh";
import { RegionMarker } from "./RegionMarker";
import { useSelectionStore } from "../state/selectionStore";

export function Avatar() {
  const variant = useSelectionStore((s) => s.meshVariant);
  return (
    <group>
      <HumanMesh key={variant} variant={variant} />
      <RegionMarker />
    </group>
  );
}
