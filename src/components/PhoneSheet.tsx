import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { REGIONS_BY_ID } from "../data/regions";
import { useSelectionStore } from "../state/selectionStore";
import { RegionDetails } from "./RegionDetails";
import { CATEGORY_LABEL } from "../data/categoryLabels";
import { RegionListFallback } from "./RegionListFallback";
import { Attribution } from "./Attribution";

type SheetState = "bar" | "peek" | "expanded";

// Visible height of each state, in px (the expanded height is measured).
const BAR_HEIGHT = 64;
const PEEK_HEIGHT = 148;
const DRAG_THRESHOLD = 6;

/**
 * Phone-only bottom sheet (Google/Apple Maps style).
 *  bar      nothing selected: a prompt plus "Browse" to open the full list
 *  peek     an area is selected: name, category, red-flag badge
 *  expanded full details, then the searchable list and credits
 * Drag the handle area up/down, or tap it, to move between states.
 */
export function PhoneSheet() {
  const selectedRegionId = useSelectionStore((s) => s.selectedRegionId);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const region = selectedRegionId ? REGIONS_BY_ID[selectedRegionId] : null;

  const [state, setState] = useState<SheetState>("bar");
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [expandedHeight, setExpandedHeight] = useState(() => Math.round(window.innerHeight * 0.8));
  const drag = useRef<{ startY: number; startVisible: number; moved: boolean; lastY: number; lastT: number; v: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastSource = useRef<"model" | "list">("model");

  useLayoutEffect(() => {
    const onResize = () => setExpandedHeight(Math.round(window.innerHeight * 0.8));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Selecting on the model shows the peek card so the body stays visible;
  // picking from the list (already expanded) shows the full details.
  useEffect(() => {
    if (!region) {
      setState("bar");
      return;
    }
    if (lastSource.current === "list") {
      setState("expanded");
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setState("peek");
    }
    lastSource.current = "model";
  }, [region]);

  const visibleFor = (s: SheetState) => (s === "bar" ? BAR_HEIGHT : s === "peek" ? PEEK_HEIGHT : expandedHeight);
  const restingVisible = visibleFor(state);
  const visible = dragOffset ?? restingVisible;

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startVisible: restingVisible, moved: false, lastY: e.clientY, lastT: e.timeStamp, v: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientY - d.lastY) / dt; // px/ms, positive = moving down
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    const min = BAR_HEIGHT;
    setDragOffset(Math.min(expandedHeight, Math.max(min, d.startVisible - dy)));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      // Tap on the handle area: toggle between compact and expanded.
      setState(state === "expanded" ? (region ? "peek" : "bar") : "expanded");
      return;
    }
    const current = dragOffset ?? restingVisible;
    setDragOffset(null);
    const options: SheetState[] = region ? ["peek", "expanded"] : ["bar", "expanded"];
    // A quick flick decides the direction; otherwise snap to the nearest state.
    if (Math.abs(d.v) > 0.5) {
      setState(d.v < 0 ? "expanded" : options[0]);
      return;
    }
    const nearest = options.reduce((a, b) =>
      Math.abs(visibleFor(a) - current) < Math.abs(visibleFor(b) - current) ? a : b,
    );
    setState(nearest);
  };

  const expanded = state === "expanded" && dragOffset === null;

  return (
    <section
      className={`phone-sheet${dragOffset !== null ? " is-dragging" : ""}`}
      style={{ height: expandedHeight, transform: `translateY(${expandedHeight - visible}px)` }}
      aria-label="Body area details"
    >
      <div
        className="phone-sheet__handle-area"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse details" : "Expand details"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setState(state === "expanded" ? (region ? "peek" : "bar") : "expanded");
          }
        }}
      >
        <div className="phone-sheet__grabber" />
        {region ? (
          <div className="phone-sheet__peek">
            <div className="phone-sheet__peek-top">
              <span className="info-panel__category">{CATEGORY_LABEL[region.category]}</span>
              {region.redFlags && region.redFlags.length > 0 && (
                <span className="phone-sheet__flag" title="Includes warning signs">⚠ Warning signs</span>
              )}
            </div>
            <h2 className="phone-sheet__title">{region.name}</h2>
            <p className="phone-sheet__sub">
              {region.group} · {expanded ? "Swipe down to close" : "Swipe up or tap for details"}
            </p>
          </div>
        ) : (
          <div className="phone-sheet__bar">
            <span>Tap the body to choose an area</span>
            <span className="phone-sheet__browse">{expanded ? "Close" : "Browse all ▲"}</span>
          </div>
        )}
      </div>

      <div className="phone-sheet__content" ref={contentRef} aria-hidden={!expanded} inert={!expanded}>
        {region && (
          <div className="phone-sheet__details">
            <RegionDetails region={region} showHeader={false} />
            <button type="button" className="phone-sheet__clear" onClick={() => setSelected(null)}>
              Clear selection
            </button>
          </div>
        )}
        <RegionListFallback embedded onPick={() => (lastSource.current = "list")} />
        <Attribution />
      </div>
    </section>
  );
}
