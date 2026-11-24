// The region list the app works with: every region produced by the
// precomputed body map (scripts/build_regions.py -> regionMap.generated.ts),
// merged with its educational content (regionContent.ts).
//
// Region ids are "<base>" for midline regions and "<base>_L" / "<base>_R"
// for paired ones. Left/right are always from the avatar's own perspective
// (the medical convention: the patient's left/right, not the viewer's).

import { REGION_ANCHORS, REGION_ORDER } from "./regionMap.generated";
import {
  REGION_CONTENT,
  type BodyGroup,
  type RegionCategory,
} from "./regionContent";

export type { BodyGroup, RegionCategory };

export interface RegionDef {
  id: string;
  name: string;
  /** Surface point (scene units) used for the label and the selected marker. */
  anchor: [number, number, number];
  category: RegionCategory;
  group: BodyGroup;
  description: string;
  possibleCauses: string[];
  redFlags?: string[];
}

function buildRegion(id: string, index: number): RegionDef {
  const sideMatch = /^(.*)_(L|R)$/.exec(id);
  const base = sideMatch ? sideMatch[1] : id;
  const side = sideMatch ? sideMatch[2] : null;
  const content = REGION_CONTENT[base];
  if (!content) {
    throw new Error(`Missing content for region "${base}" (index ${index})`);
  }
  const { left, right, ...shared } = content;
  const merged = { ...shared, ...(side === "L" ? left : side === "R" ? right : undefined) };
  const sidePrefix = side === "L" ? "Left" : side === "R" ? "Right" : null;
  // Side-specific overrides may already spell out the side in their name.
  const name =
    sidePrefix && !/^(Left|Right|Upper Left|Upper Right|Lower Left|Lower Right)\b/.test(merged.name)
      ? `${sidePrefix} ${merged.name}`
      : merged.name;
  return {
    id,
    name,
    anchor: REGION_ANCHORS[id],
    category: merged.category,
    group: merged.group,
    description: merged.description,
    possibleCauses: merged.possibleCauses,
    redFlags: merged.redFlags,
  };
}

/** In the same order as the per-triangle indices in public/models/regionMap.bin. */
export const REGIONS: RegionDef[] = REGION_ORDER.map((id, i) => buildRegion(id, i));

export const REGIONS_BY_ID: Record<string, RegionDef> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
);

export const BODY_GROUPS: BodyGroup[] = [
  "Head & face",
  "Neck",
  "Shoulder & arm",
  "Wrist & hand",
  "Chest & abdomen",
  "Back",
  "Hip & pelvis",
  "Thigh & knee",
  "Lower leg, ankle & foot",
];
