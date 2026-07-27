"use client";

import * as React from "react";

import { PricingPage } from "@/components/payments/pricing-page";

/**
 * `/[locale]/pricing` — subscription plans for service providers.
 *
 * Lives under the `(public)` route group so it inherits the marketing
 * navbar + `ProfileGuard`. Provider users without a profile are
 * redirected to `/onboarding` by the guard, so the grid here only ever
 * renders for owners (who see the wrong-role notice) or for providers
 * with a populated `serviceProvider`.
 */
export default function PricingRoutePage() {
  return <PricingPage />;
}