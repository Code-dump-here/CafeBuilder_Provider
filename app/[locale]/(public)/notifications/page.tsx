"use client";

import * as React from "react";

import { NotificationsPage } from "@/components/notifications/notifications-page";

/**
 * `/[locale]/notifications` — full notification inbox.
 *
 * Lives under the `(public)` route group so the marketing navbar +
 * `ProfileGuard` apply: signed-out users get redirected to /login,
 * provider users without a profile land on /onboarding, and signed-in
 * viewers land on the inbox below.
 */
export default function NotificationsRoutePage() {
  // `NotificationsPage` reads `?n=` via `useSearchParams`, which Next requires
  // to sit under a Suspense boundary so the rest of the route can still be
  // prerendered.
  return (
    <React.Suspense fallback={null}>
      <NotificationsPage />
    </React.Suspense>
  );
}