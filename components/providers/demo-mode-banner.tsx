"use client";

import * as React from "react";

import { tokenStore } from "@/features/auth/token-store";
import { isDemoActive } from "@/lib/http/demo-mode";

/**
 * A standing marker that the data on screen is invented.
 *
 * Demo mode is convincing on purpose — that is what makes it useful for
 * looking at the design — and that is exactly why it needs to announce itself.
 * Without this, a populated contracts page with a signed contract and a real
 * looking figure is indistinguishable from production, and someone will
 * eventually screenshot it as evidence of something.
 *
 * Deliberately not dismissible. It costs one corner of the viewport and it is
 * only ever present in development. Bottom-right rather than bottom-left: the
 * sidebar's account chip lives in the other corner and the two overlapped.
 */
export function DemoModeBanner() {
  // Demo mode depends on the token store, which is browser state — so it is
  // read through useSyncExternalStore rather than a mounted flag set from an
  // effect. `getServerSnapshot` returns false, so the server and the first
  // client pass agree that the badge is absent, and it appears once hydration
  // hands over. It also disappears by itself the moment a real login replaces
  // the sentinel token.
  const active = React.useSyncExternalStore(
    (onChange) => tokenStore.subscribe(onChange),
    () => isDemoActive(),
    () => false,
  );

  if (!active) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed right-3 bottom-3 z-[100] flex items-center gap-2 border border-warning/40 bg-warning-muted px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-warning-muted-foreground shadow-sm"
    >
      <span aria-hidden className="size-1.5 bg-warning" />
      Demo data · no backend
    </div>
  );
}
