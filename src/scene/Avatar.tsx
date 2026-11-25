import { HumanMesh } from "./HumanMesh";
import { RegionMarker } from "./RegionMarker";
import { useSelectionStore } from "../state/selectionStore";

export function Avatar() {
  const body = useSelectionStore((s) => s.body);
  return (
    <group>
      <HumanMesh key={body} body={body} />
      <RegionMarker />
    </group>
  );
}
