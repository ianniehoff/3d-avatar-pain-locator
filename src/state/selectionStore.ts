import { create } from "zustand";

interface SelectionState {
  /** Region under the pointer right now (live preview while moving over the body). */
  hoveredRegionId: string | null;
  /** Region the user committed to by clicking/tapping (drives the info panel). */
  selectedRegionId: string | null;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  hoveredRegionId: null,
  selectedRegionId: null,
  setHovered: (id) => set({ hoveredRegionId: id }),
  setSelected: (id) => set({ selectedRegionId: id }),
}));
