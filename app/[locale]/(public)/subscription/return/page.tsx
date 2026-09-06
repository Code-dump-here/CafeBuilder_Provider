"use client";

import * as React from "react";

import { SubscriptionReturn } from "@/components/payments/subscription-return";

/**
 * `/[locale]/subscription/return` — payOS `returnUrl`. Polls the real
 * transaction status rather than trusting the redirect's query string.
 */
export default function SubscriptionReturnPage() {
  // `useSearchParams` needs a Suspense boundary for static rendering; these
  // routes are the redirect targets payOS is configured with, so they are
  // always entered with a query string.
  return (
    <React.Suspense fallback={null}>
      <SubscriptionReturn />
    </React.Suspense>
  );
}
