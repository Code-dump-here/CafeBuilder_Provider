"use client";

import * as React from "react";

import { SubscriptionCancel } from "@/components/payments/subscription-cancel";

/**
 * `/[locale]/payment/cancel` — where payOS sends a web payer who backs out.
 * The URL is fixed by the server (`PayOs:CancelUrl`); the screen is the shared
 * one under `/subscription/cancel`. See the success route.
 */
export default function PaymentCancelRoutePage() {
  return (
    <React.Suspense fallback={null}>
      <SubscriptionCancel />
    </React.Suspense>
  );
}
