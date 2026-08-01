import type * as THREE from "three";
import { REGIONS, type RegionDef } from "../data/regions";

/**
 * Beyond this distance (world units, ~meters) a hit is treated as no match.
 * Exported so the hover-highlight shader (scene/HumanMesh.tsx) enforces the
 * exact same cutoff — otherwise a sparsely-anchored region (e.g. the center
 * of the chest) could visually/functionally claim a disproportionately large
 * area just because it's the "closest of a bad set of options" for a point
 * that's actually far away, on a different body part.
 */
export const MAX_MATCH_DISTANCE = 0.14;

/** Find the region whose anchor is closest to `worldPoint`, among all regions. */
export function findNearestRegion(worldPoint: THREE.Vector3): RegionDef | null {
  let best: RegionDef | null = null;
  let bestDistSq = Infinity;
  for (const region of REGIONS) {
    const [ax, ay, az] = region.anchor;
    const dx = worldPoint.x - ax;
    const dy = worldPoint.y - ay;
    const dz = worldPoint.z - az;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = region;
    }
  }
  if (best && bestDistSq > MAX_MATCH_DISTANCE * MAX_MATCH_DISTANCE) return null;
  return best;
}
