import { REGIONS_BY_ID } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";
import { useIsTouch } from "../hooks/useDevice";
import { RegionDetails } from "./RegionDetails";

/** Side panel used on tablets and desktops. */
export function InfoPanel() {
  const selectedRegionId = useSelectionStore((s) => s.selectedRegionId);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const isTouch = useIsTouch();
  const region = selectedRegionId ? REGIONS_BY_ID[selectedRegionId] : null;

  if (!region) {
    return (
      <div className="info-panel info-panel--empty">
        <p>
          {isTouch
            ? "Rotate and zoom the model, then tap the spot where you feel pain or discomfort to see what it's called."
            : "Rotate and zoom the model, then click the spot where you feel pain or discomfort to see what it's called. Hover to preview an area first."}
        </p>
        <p className="info-panel__hint">Prefer not to use the 3D model? Use the searchable list below instead.</p>
      </div>
    );
  }

  return (
    <div className="info-panel">
      <RegionDetails region={region} onClear={() => setSelected(null)} />
    </div>
  );
}
