import { REGIONS_BY_ID, type RegionCategory } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";

const CATEGORY_LABEL: Record<RegionCategory, string> = {
  bone: "Bone",
  joint: "Joint",
  tendon: "Tendon",
  ligament: "Ligament",
  muscle: "Muscle",
  nerve: "Nerve",
  region: "General region",
};

export function InfoPanel() {
  const selectedRegionId = useSelectionStore((s) => s.selectedRegionId);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const region = selectedRegionId ? REGIONS_BY_ID[selectedRegionId] : null;

  if (!region) {
    return (
      <div className="info-panel info-panel--empty">
        <p>
          Rotate and zoom the model, then click on the spot where you feel pain
          or discomfort to see what it's called.
        </p>
        <p className="info-panel__hint">
          Prefer not to use the 3D model? Use the searchable list below instead.
        </p>
      </div>
    );
  }

  return (
    <div className="info-panel">
      <div className="info-panel__header">
        <span className="info-panel__category">{CATEGORY_LABEL[region.category]}</span>
        <h2>{region.name}</h2>
        <button
          type="button"
          className="info-panel__close"
          onClick={() => setSelected(null)}
          aria-label="Clear selection"
        >
          Clear
        </button>
      </div>

      <p className="info-panel__description">{region.description}</p>

      {region.redFlags && region.redFlags.length > 0 && (
        <div className="info-panel__redflag" role="alert">
          {region.redFlags.map((flag) => (
            <p key={flag}>⚠ {flag}</p>
          ))}
        </div>
      )}

      <h3>Possible related conditions</h3>
      <ul className="info-panel__causes">
        {region.possibleCauses.map((cause) => (
          <li key={cause}>{cause}</li>
        ))}
      </ul>

      <p className="info-panel__footer">
        This is general educational information, not a diagnosis. Only a
        healthcare professional can evaluate your symptoms properly.
      </p>
    </div>
  );
}
