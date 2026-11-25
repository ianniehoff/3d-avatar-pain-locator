import { useSyncExternalStore } from "react";

/** Phones get their own layout (full-screen model + bottom sheet). */
export const PHONE_QUERY = "(max-width: 767px)";
/** Primary input is a finger (phones, tablets) rather than a mouse/trackpad. */
export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

function subscribe(query: string) {
  return (cb: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useIsPhone() {
  return useMediaQuery(PHONE_QUERY);
}

export function useIsTouch() {
  return useMediaQuery(TOUCH_QUERY);
}

/** Non-React access (e.g. inside three.js event handlers). */
export function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia(TOUCH_QUERY).matches;
}
