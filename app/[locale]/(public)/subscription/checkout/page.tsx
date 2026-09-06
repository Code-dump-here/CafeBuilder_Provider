"use client";

import * as React from "react";

import { SubscriptionCheckout } from "@/components/payments/subscription-checkout";

/**
 * `/[locale]/subscription/checkout?planId=…` — confirm a plan, then create
 * the payOS link and leave for it.
 */
export default function SubscriptionCheckoutPage() {
  // `useSearchParams` needs a Suspense boundary for static rendering; these
  // routes are the redirect targets payOS is configured with, so they are
  // always entered with a query string.
  return (
    <React.Suspense fallback={null}>
      <SubscriptionCheckout />
    </React.Suspense>
  );
}
