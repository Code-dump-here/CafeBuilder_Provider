import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getServerSnapshot() {
  // Assume non-mobile on the server so the initial markup matches Chrome's
  // behaviour. The client snapshot will swap to the mobile Sheet on the next
  // tick if the viewport truly is narrow, instead of producing a hydration
  // mismatch that Safari turns into a layout flash.
  return false;
}

/**
 * SSR-safe mobile detection. Uses `useSyncExternalStore` so React keeps the
 * server-rendered value and the first client render identical, preventing the
 * hydration mismatch that causes Safari (and any browser with a slow
 * matchMedia bootstrap) to flash a different layout on first paint.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}