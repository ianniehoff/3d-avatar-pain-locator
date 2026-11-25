import { create } from "zustand";

export type MeshVariant = "standard" | "smooth";

function initialVariant(): MeshVariant {
  if (typeof window === "undefined") return "smooth";
  const v = new URLSearchParams(window.location.search).get("mesh");
  return v === "standard" ? "standard" : "smooth";
}

interface SelectionState {
  /** Region under the pointer right now (live preview while moving over the body). */
  hoveredRegionId: string | null;
  /** Region the user committed to by clicking/tapping (drives the info panel). */
  selectedRegionId: string | null;
  /** Which body mesh to show (standard = welded original, smooth = subdivided). */
  meshVariant: MeshVariant;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setMeshVariant: (v: MeshVariant) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  hoveredRegionId: null,
  selectedRegionId: null,
  meshVariant: initialVariant(),
  setHovered: (id) => set({ hoveredRegionId: id }),
  setSelected: (id) => set({ selectedRegionId: id }),
  setMeshVariant: (v) => {
    const url = new URL(window.location.href);
    url.searchParams.set("mesh", v);
    window.history.replaceState(null, "", url);
    set({ meshVariant: v, hoveredRegionId: null });
  },
}));
