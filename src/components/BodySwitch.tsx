import { BODY_TYPES, type BodyType } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";

const LABEL: Record<BodyType, string> = { male: "Male", female: "Female" };

/** Male / Female body switch shown on the viewer. */
export function BodySwitch() {
  const body = useSelectionStore((s) => s.body);
  const setBody = useSelectionStore((s) => s.setBody);
  return (
    <div className="body-switch" role="radiogroup" aria-label="Body">
      {BODY_TYPES.map((b) => (
        <button
          key={b}
          type="button"
          role="radio"
          aria-checked={body === b}
          className={body === b ? "is-active" : undefined}
          onClick={() => setBody(b)}
        >
          {LABEL[b]}
        </button>
      ))}
    </div>
  );
}
