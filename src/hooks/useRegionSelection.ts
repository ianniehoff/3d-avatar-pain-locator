import { useCallback, useMemo } from "react";
import type * as THREE from "three";
import { findNearestRegion } from "../lib/regionMatch";
import { useSelectionStore } from "../state/selectionStore";

interface PointerLikeEvent {
  stopPropagation: () => void;
  point: THREE.Vector3;
}

/** Pointer handlers for the body mesh: hover previews the nearest region, click commits it. */
export function useRegionSelection() {
  const setHovered = useSelectionStore((s) => s.setHovered);
  const setSelected = useSelectionStore((s) => s.setSelected);

  const onPointerMove = useCallback(
    (e: PointerLikeEvent) => {
      e.stopPropagation();
      const region = findNearestRegion(e.point);
      setHovered(region ? region.id : null);
    },
    [setHovered],
  );

  const onPointerOut = useCallback(
    (e: PointerLikeEvent) => {
      e.stopPropagation();
      setHovered(null);
    },
    [setHovered],
  );

  const onClick = useCallback(
    (e: PointerLikeEvent) => {
      e.stopPropagation();
      const region = findNearestRegion(e.point);
      setSelected(region ? region.id : null);
    },
    [setSelected],
  );

  return useMemo(() => ({ onPointerMove, onPointerOut, onClick }), [onPointerMove, onPointerOut, onClick]);
}
