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
  return <NotificationsPage />;
}