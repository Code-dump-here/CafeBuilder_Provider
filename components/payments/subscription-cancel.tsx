"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useCancelPaymentMutation } from "@/features/payments/hooks";

import { CheckoutShell } from "./subscription-checkout";
import { ResultCard } from "./subscription-return";

/**
 * `/subscription/cancel` — where payOS sends the user who backs out.
 *
 * This page is not only a message. Abandoning the payOS screen leaves a
 * pending transaction row on our side and a live payment link on theirs, so
 * landing here fires `POST /api/payments/cancel` to close both. The endpoint
 * is idempotent and owner-scoped, which is what makes it safe to call from a
 * URL the user can refresh or bookmark.
 *
 * The result of that call is deliberately not shown. The user's intent was to
 * stop, and they have stopped either way — surfacing "we could not cancel the
 * transaction you already walked away from" would be noise about our
 * bookkeeping, not information they can act on. A failure leaves the row
 * pending, which expires on its own.
 */
export function SubscriptionCancel() {
  const t = useTranslations("Payments.result");
  const searchParams = useSearchParams();

  const orderCodeRaw = searchParams.get("orderCode");
  const orderCode = orderCodeRaw ? Number(orderCodeRaw) : NaN;

  const cancelPayment = useCancelPaymentMutation();

  // Fire once per order code. A ref rather than a dependency guard because
  // React 18 mounts effects twice in development, and a second POST — while
  // harmless against an idempotent endpoint — is still a request we know we
  // do not need to send.
  const cancelledRef = React.useRef<number | null>(null);
  const { mutate } = cancelPayment;

  React.useEffect(() => {
    if (!Number.isFinite(orderCode)) return;
    if (cancelledRef.current === orderCode) return;
    cancelledRef.current = orderCode;
    // Errors are swallowed on purpose — see the note above.
    mutate(orderCode);
  }, [mutate, orderCode]);

  return (
    <CheckoutShell>
      <ResultCard
        tone="error"
        title={t("cancelledTitle")}
        body={t("cancelledBody")}
        primary={{ href: "/pricing", label: t("tryAgain") }}
        secondary={{ href: "/marketplace", label: t("keepBrowsing") }}
      />
    </CheckoutShell>
  );
}
