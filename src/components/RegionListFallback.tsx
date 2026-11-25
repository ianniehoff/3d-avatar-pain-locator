import { useMemo, useState } from "react";
import { BODY_GROUPS, REGIONS } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";

/** Keyboard/screen-reader friendly way to reach the same info without pointer-based 3D interaction.
 *  `embedded` renders the list directly (phone sheet) instead of inside a collapsible <details>. */
export function RegionListFallback({ embedded = false, onPick }: { embedded?: boolean; onPick?: () => void } = {}) {
  const [query, setQuery] = useState("");
  const selectedRegionId = useSelectionStore((s) => s.selectedRegionId);
  const setSelected = useSelectionStore((s) => s.setSelected);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = REGIONS.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q) ||
        r.possibleCauses.some((c) => c.toLowerCase().includes(q)),
    ).sort((a, b) => a.name.localeCompare(b.name));
    return BODY_GROUPS.map((g) => ({ group: g, regions: matches.filter((r) => r.group === g) })).filter(
      (g) => g.regions.length > 0,
    );
  }, [query]);

  const body = (
      <div className="region-list__body">
        <label htmlFor="region-search" className="visually-hidden">
          Search body areas or conditions
        </label>
        <input
          id="region-search"
          type="search"
          placeholder={'Search, e.g. "ankle" or "tendinitis"'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="region-list__scroll">
          {grouped.map(({ group, regions }) => (
            <section key={group}>
              <h4 className="region-list__group">{group}</h4>
              <ul>
                {regions.map((region) => (
                  <li key={region.id}>
                    <button
                      type="button"
                      aria-pressed={region.id === selectedRegionId}
                      className={
                        region.id === selectedRegionId
                          ? "region-list__item region-list__item--active"
                          : "region-list__item"
                      }
                      onClick={() => {
                        setSelected(region.id);
                        onPick?.();
                      }}
                    >
                      {region.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {grouped.length === 0 && <p className="region-list__empty">No matches.</p>}
        </div>
      </div>
  );

  if (embedded) {
    return (
      <section className="region-list region-list--embedded" aria-label="All body areas">
        <h3 className="region-list__title">Browse all {REGIONS.length} body areas</h3>
        {body}
      </section>
    );
  }

  return (
    <details className="region-list">
      <summary>Or browse all {REGIONS.length} body areas</summary>
      {body}
    </details>
  );
}
