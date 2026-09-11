"use client";

import * as React from "react";

import { SubscriptionReturn } from "@/components/payments/subscription-return";

/**
 * `/[locale]/payment/success` — where payOS sends a web payer when the
 * checkout ends. The URL is fixed by the server (`PayOs:ReturnUrl`), so the
 * route has to live here; the screen itself is the shared one under
 * `/subscription/return`, rendered from a second entry point rather than
 * duplicated.
 *
 * The mobile client has its own pair (`PayOs:MobileReturnUrl`) pointing at the
 * Flutter build, because a link minted for one platform cannot be reused by
 * the other.
 */
export default function PaymentSuccessRoutePage() {
  // `SubscriptionReturn` reads `?orderCode=` / `?id=` via `useSearchParams`,
  // which Next requires to sit under a Suspense boundary so the route can
  // prerender.
  return (
    <React.Suspense fallback={null}>
      <SubscriptionReturn />
    </React.Suspense>
  );
}
