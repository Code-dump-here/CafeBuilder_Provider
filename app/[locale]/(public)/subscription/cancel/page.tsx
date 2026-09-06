"use client";

import * as React from "react";

import { SubscriptionCancel } from "@/components/payments/subscription-cancel";

/**
 * `/[locale]/subscription/cancel` — payOS `cancelUrl`. Closes the pending
 * transaction and its payment link on the way in.
 */
export default function SubscriptionCancelPage() {
  // `useSearchParams` needs a Suspense boundary for static rendering; these
  // routes are the redirect targets payOS is configured with, so they are
  // always entered with a query string.
  return (
    <React.Suspense fallback={null}>
      <SubscriptionCancel />
    </React.Suspense>
  );
}
