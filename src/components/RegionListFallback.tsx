import { useMemo, useState } from "react";
import { REGIONS } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";

/** Keyboard/screen-reader friendly way to reach the same info without pointer-based 3D interaction. */
export function RegionListFallback() {
  const [query, setQuery] = useState("");
  const selectedRegionId = useSelectionStore((s) => s.selectedRegionId);
  const setSelected = useSelectionStore((s) => s.setSelected);

  const sorted = useMemo(
    () => [...REGIONS].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => r.name.toLowerCase().includes(q));
  }, [sorted, query]);

  return (
    <details className="region-list">
      <summary>Or browse the full list of body areas</summary>
      <div className="region-list__body">
        <label htmlFor="region-search" className="visually-hidden">
          Search body areas
        </label>
        <input
          id="region-search"
          type="search"
          placeholder={'Search, e.g. "ankle"'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul>
          {filtered.map((region) => (
            <li key={region.id}>
              <button
                type="button"
                aria-pressed={region.id === selectedRegionId}
                className={region.id === selectedRegionId ? "region-list__item region-list__item--active" : "region-list__item"}
                onClick={() => setSelected(region.id)}
              >
                {region.name}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="region-list__empty">No matches.</li>}
        </ul>
      </div>
    </details>
  );
}
