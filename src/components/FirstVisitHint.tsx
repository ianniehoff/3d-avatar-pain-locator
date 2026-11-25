import { useEffect, useState } from "react";
import { useSelectionStore } from "../state/selectionStore";
import { useIsTouch } from "../hooks/useDevice";

const STORAGE_KEY = "pain-locator:hint-dismissed";

function wasDismissed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage can be unavailable (private mode); the hint just shows again next time.
  }
}

/** One-time overlay explaining how to use the model; goes away after the first selection. */
export function FirstVisitHint() {
  const isTouch = useIsTouch();
  const selectedRegionId = useSelectionStore((s) => s.selectedRegionId);
  const [open, setOpen] = useState(() => !wasDismissed());

  useEffect(() => {
    if (open && selectedRegionId) {
      setOpen(false);
      rememberDismissed();
    }
  }, [open, selectedRegionId]);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    rememberDismissed();
  };

  return (
    <div className="first-hint" role="status">
      <span className="first-hint__icon" aria-hidden="true">
        {isTouch ? "👆" : "🖱️"}
      </span>
      <span className="first-hint__text">
        {isTouch ? (
          <>
            <strong>Tap any area</strong> of the body to learn about it. Drag to rotate, pinch to zoom.
          </>
        ) : (
          <>
            <strong>Hover</strong> to preview an area, <strong>click</strong> to select it. Drag to rotate,
            scroll to zoom.
          </>
        )}
      </span>
      <button type="button" className="first-hint__close" onClick={dismiss} aria-label="Dismiss tip">
        ✕
      </button>
    </div>
  );
}
