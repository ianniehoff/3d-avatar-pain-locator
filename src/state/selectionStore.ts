import { create } from "zustand";
import { BODY_TYPES, equivalentRegion, type BodyType } from "../data/regions";

const BODY_KEY = "pain-locator:body";

function initialBody(): BodyType {
  if (typeof window === "undefined") return "male";
  const fromUrl = new URLSearchParams(window.location.search).get("body");
  if (fromUrl && (BODY_TYPES as readonly string[]).includes(fromUrl)) return fromUrl as BodyType;
  try {
    const saved = window.localStorage.getItem(BODY_KEY);
    if (saved && (BODY_TYPES as readonly string[]).includes(saved)) return saved as BodyType;
  } catch {
    // storage unavailable: fall back to the default
  }
  return "male";
}

interface SelectionState {
  /** Which body is shown. */
  body: BodyType;
  /** Region under the pointer right now (live preview while moving over the body). */
  hoveredRegionId: string | null;
  /** Region the user committed to by clicking/tapping (drives the info panel). */
  selectedRegionId: string | null;
  setBody: (body: BodyType) => void;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  body: initialBody(),
  hoveredRegionId: null,
  selectedRegionId: null,
  setBody: (body) => {
    if (body === get().body) return;
    try {
      window.localStorage.setItem(BODY_KEY, body);
    } catch {
      // ignore
    }
    const url = new URL(window.location.href);
    url.searchParams.set("body", body);
    window.history.replaceState(null, "", url);
    const selected = get().selectedRegionId;
    // Keep the selection when the other body has the same (or an equivalent) area.
    set({ body, hoveredRegionId: null, selectedRegionId: selected ? equivalentRegion(selected, body) : null });
  },
  setHovered: (id) => set({ hoveredRegionId: id }),
  setSelected: (id) => set({ selectedRegionId: id }),
}));
