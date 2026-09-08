"use client";

import * as React from "react";

import { PaymentCancelPage } from "@/components/payments/payment-result";

/**
 * `/[locale]/payment/cancel` — where payOS sends a web payer who backs out.
 * Configured server-side as `PayOs:CancelUrl`.
 */
export default function PaymentCancelRoutePage() {
  // Reads `?orderCode=` via `useSearchParams` — see the success route.
  return (
    <React.Suspense fallback={null}>
      <PaymentCancelPage />
    </React.Suspense>
  );
}
