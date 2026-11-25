// The region lists the app works with, per body: every region the precomputed
// body maps produce (scripts/build_regions.py -> regionMap.generated.ts),
// merged with its educational content (regionContent.ts).
//
// Region ids are "<base>" for midline regions and "<base>_L" / "<base>_R"
// for paired ones. Left/right are always from the avatar's own perspective
// (the medical convention: the patient's left/right, not the viewer's).

import { BODY_TYPES, REGION_ANCHORS, REGION_ORDER, type BodyType } from "./regionMap.generated";
import { REGION_CONTENT, type BodyGroup, type RegionCategory, type RegionFields } from "./regionContent";

export type { BodyGroup, BodyType, RegionCategory };
export { BODY_TYPES };

export interface RegionDef {
  id: string;
  name: string;
  /** Surface point (scene units) used for the label. */
  anchor: [number, number, number];
  category: RegionCategory;
  group: BodyGroup;
  description: string;
  possibleCauses: string[];
  redFlags?: string[];
}

function buildRegion(id: string, body: BodyType): RegionDef {
  const sideMatch = /^(.*)_(L|R)$/.exec(id);
  const base = sideMatch ? sideMatch[1] : id;
  const side = sideMatch ? sideMatch[2] : null;
  const content = REGION_CONTENT[base];
  if (!content) {
    throw new Error(`Missing content for region "${base}"`);
  }
  const { left, right, male, female, ...shared } = content;
  const bodyOverride = body === "male" ? male : female;
  const { left: bLeft, right: bRight, ...bodyShared } = bodyOverride ?? {};
  const merged: RegionFields = {
    ...shared,
    ...(side === "L" ? left : side === "R" ? right : undefined),
    ...bodyShared,
    ...(side === "L" ? bLeft : side === "R" ? bRight : undefined),
  };
  const sidePrefix = side === "L" ? "Left" : side === "R" ? "Right" : null;
  // Side-specific overrides may already spell out the side in their name.
  const name =
    sidePrefix && !/^(Left|Right|Upper Left|Upper Right|Lower Left|Lower Right)\b/.test(merged.name)
      ? `${sidePrefix} ${merged.name}`
      : merged.name;
  return {
    id,
    name,
    anchor: REGION_ANCHORS[body][id],
    category: merged.category,
    group: merged.group,
    description: merged.description,
    possibleCauses: merged.possibleCauses,
    redFlags: merged.redFlags,
  };
}

/** Region id for each value of the _REGION vertex attribute baked into the models. */
export const REGION_ID_BY_INDEX: readonly string[] = REGION_ORDER;

export const REGION_INDEX_BY_ID: Record<string, number> = Object.fromEntries(
  REGION_ORDER.map((id, i) => [id, i]),
);

/** Regions present on each body, in REGION_ORDER order. */
export const REGIONS_BY_BODY: Record<BodyType, RegionDef[]> = Object.fromEntries(
  BODY_TYPES.map((body) => [
    body,
    REGION_ORDER.filter((id) => REGION_ANCHORS[body][id]).map((id) => buildRegion(id, body)),
  ]),
) as Record<BodyType, RegionDef[]>;

const BY_ID: Record<BodyType, Record<string, RegionDef>> = Object.fromEntries(
  BODY_TYPES.map((body) => [body, Object.fromEntries(REGIONS_BY_BODY[body].map((r) => [r.id, r]))]),
) as Record<BodyType, Record<string, RegionDef>>;

export function getRegion(body: BodyType, id: string | null | undefined): RegionDef | null {
  return id ? (BY_ID[body][id] ?? null) : null;
}

/** Closest equivalent of a region on another body (e.g. breast <-> chest), or null. */
export function equivalentRegion(id: string, body: BodyType): string | null {
  if (BY_ID[body][id]) return id;
  const swapped = id.replace(/^breast_/, "chest_");
  if (BY_ID[body][swapped]) return swapped;
  return null;
}

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
