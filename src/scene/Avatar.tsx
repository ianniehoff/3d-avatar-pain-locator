import { HumanMesh } from "./HumanMesh";
import { RegionMarker } from "./RegionMarker";

export function Avatar() {
  return (
    <group>
      <HumanMesh />
      <RegionMarker />
    </group>
  );
}
