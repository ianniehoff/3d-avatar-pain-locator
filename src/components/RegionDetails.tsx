import type { RegionDef } from "../data/regions";
import { CATEGORY_LABEL } from "../data/categoryLabels";


/** Full educational content for one region (shared by the side panel and the phone sheet). */
export function RegionDetails({ region, showHeader = true, onClear }: {
  region: RegionDef;
  showHeader?: boolean;
  onClear?: () => void;
}) {
  return (
    <>
      {showHeader && (
        <div className="info-panel__header">
          <span className="info-panel__category">{CATEGORY_LABEL[region.category]}</span>
          <h2>{region.name}</h2>
          {onClear && (
            <button type="button" className="info-panel__close" onClick={onClear} aria-label="Clear selection">
              Clear
            </button>
          )}
        </div>
      )}

      {showHeader && <p className="info-panel__group">{region.group}</p>}
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
        This is general educational information, not a diagnosis. Only a healthcare professional can evaluate
        your symptoms properly.
      </p>
    </>
  );
}
