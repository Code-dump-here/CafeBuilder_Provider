"use client";

import * as React from "react";

import { PaymentReturnPage } from "@/components/payments/payment-result";

/**
 * `/[locale]/payment/success` — where payOS sends a web payer when the
 * checkout ends. Configured server-side as `PayOs:ReturnUrl`; the mobile
 * client has its own pair (`PayOs:MobileReturnUrl`) pointing at the Flutter
 * build, because a link minted for one platform cannot be reused by the other.
 */
export default function PaymentSuccessRoutePage() {
  // `PaymentReturnPage` reads `?orderCode=` via `useSearchParams`, which Next
  // requires to sit under a Suspense boundary so the route can prerender.
  return (
    <React.Suspense fallback={null}>
      <PaymentReturnPage />
    </React.Suspense>
  );
}
