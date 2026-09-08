"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/format-currency";
import { usePaymentStatusQuery } from "@/features/payments/hooks";
import { PAYMENT_TRANSACTION_STATUS } from "@/features/payments/api";

import { CheckoutShell, PendingRow } from "./subscription-checkout";
import {
  PREVIEW_AMOUNT,
  PREVIEW_DEFAULT_STATE,
  PREVIEW_ENABLED,
  resolvePreviewState,
} from "./subscription-preview";

/**
 * `/subscription/return` — where payOS sends the user after a payment attempt.
 *
 * The page cannot trust the redirect. payOS appends its own verdict to the URL
 * (`status=PAID`, `code=00`), but the record that matters is written by the
 * webhook payOS sends to our backend, and the browser redirect frequently wins
 * that race. So the query string is used only to identify the transaction; the
 * answer comes from polling `GET /api/payments/status` until `isFinal`.
 *
 * That is also why "still pending" is a first-class state here rather than an
 * error. Someone who has genuinely paid can sit in it for a second or two, and
 * telling them it failed would be worse than telling them to wait.
 */
export function SubscriptionReturn() {
  const t = useTranslations("Payments.result");
  const locale = useLocale();
  const searchParams = useSearchParams();

  // payOS appends `orderCode` and `id` (its payment link id). Either is enough
  // for the backend to find the transaction; we forward whatever arrived.
  const orderCodeRaw = searchParams.get("orderCode");
  const orderCode = orderCodeRaw ? Number(orderCodeRaw) : undefined;
  const paymentLinkId = searchParams.get("id") ?? undefined;

  // `?preview=` short-circuits the page so a state can be looked at without a
  // session or a real payment. With no identifiers in the URL there is no
  // payment to report on either, so rather than showing an empty-handed card
  // the page falls back to the default state — a bare /subscription/return
  // renders something worth looking at. A real `orderCode` still wins and is
  // polled for its real outcome. See subscription-preview.
  const hasRealPayment = Boolean(orderCodeRaw) || Boolean(paymentLinkId);
  const preview =
    resolvePreviewState(searchParams.get("preview")) ??
    (PREVIEW_ENABLED && !hasRealPayment ? PREVIEW_DEFAULT_STATE : null);

  const { data, isLoading, isError } = usePaymentStatusQuery({
    // Disable the poll entirely while previewing — there is nothing to poll.
    orderCode: preview ? undefined : Number.isFinite(orderCode) ? orderCode : undefined,
    paymentLinkId: preview ? undefined : paymentLinkId,
  });

  if (preview) {
    if (preview === "pending") {
      return (
        <CheckoutShell>
          <div className="flex flex-col gap-3">
            <PendingRow label={t("pending")} />
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              {t("pendingNote")}
            </p>
          </div>
        </CheckoutShell>
      );
    }
    const paidPreview = preview === "paid";
    return (
      <CheckoutShell>
        <ResultCard
          tone={paidPreview ? "success" : "error"}
          title={
            paidPreview
              ? t("paidTitle")
              : preview === "cancelled"
                ? t("cancelledTitle")
                : t("failedTitle")
          }
          body={
            paidPreview
              ? t("paidBody")
              : preview === "cancelled"
                ? t("cancelledBody")
                : t("failedBody")
          }
          amount={formatVnd(PREVIEW_AMOUNT, locale)}
          primary={
            paidPreview
              ? { href: "/marketplace", label: t("startBrowsing") }
              : { href: "/pricing", label: t("tryAgain") }
          }
          secondary={
            paidPreview ? { href: "/profile", label: t("viewProfile") } : undefined
          }
        />
      </CheckoutShell>
    );
  }

  // Landing here with no identifiers means the URL was hand-typed or mangled.
  // There is nothing to poll for, so say that rather than spinning forever.
  if (orderCode === undefined && !paymentLinkId) {
    return (
      <CheckoutShell>
        <ResultCard
          tone="error"
          title={t("missingTitle")}
          body={t("missingBody")}
          primary={{ href: "/pricing", label: t("backToPlans") }}
        />
      </CheckoutShell>
    );
  }

  if (isLoading || (data && !data.isFinal)) {
    return (
      <CheckoutShell>
        <div className="flex flex-col gap-3">
          <PendingRow label={t("pending")} />
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            {t("pendingNote")}
          </p>
        </div>
      </CheckoutShell>
    );
  }

  if (isError || !data) {
    return (
      <CheckoutShell>
        <ResultCard
          tone="error"
          title={t("unknownTitle")}
          body={t("unknownBody")}
          primary={{ href: "/pricing", label: t("backToPlans") }}
        />
      </CheckoutShell>
    );
  }

  const paid = data.status === PAYMENT_TRANSACTION_STATUS.paid;

  return (
    <CheckoutShell>
      <ResultCard
        tone={paid ? "success" : "error"}
        title={paid ? t("paidTitle") : t("failedTitle")}
        // The backend writes a human-readable `message` per outcome; prefer it
        // over a generic line, since it can explain *why* a payment failed.
        body={data.message || (paid ? t("paidBody") : t("failedBody"))}
        amount={formatVnd(data.amount, locale)}
        primary={
          paid
            ? { href: "/marketplace", label: t("startBrowsing") }
            : { href: "/pricing", label: t("tryAgain") }
        }
        secondary={paid ? { href: "/profile", label: t("viewProfile") } : undefined}
      />
    </CheckoutShell>
  );
}

// ─── Result card ────────────────────────────────────────────────────────────

interface ResultAction {
  href: string;
  label: string;
}

export function ResultCard({
  tone,
  title,
  body,
  amount,
  primary,
  secondary,
}: {
  tone: "success" | "error" | "neutral";
  title: string;
  body: string;
  amount?: string;
  primary: ResultAction;
  secondary?: ResultAction;
}) {
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "error" ? XCircle : Loader2;

  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card p-8 text-center md:p-10">
      <span
        className={
          tone === "success"
            ? "grid size-14 place-items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "grid size-14 place-items-center bg-destructive/10 text-destructive"
        }
      >
        <Icon aria-hidden className="size-7" />
      </span>

      <h2 className="font-heading text-xl text-foreground md:text-2xl">{title}</h2>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground md:text-sm">
        {body}
      </p>

      {amount ? (
        <p className="font-heading text-2xl tabular-nums text-foreground">
          {amount}
        </p>
      ) : null}

      <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
        <Button asChild size="lg" >
          <Link href={primary.href}>{primary.label}</Link>
        </Button>
        {secondary ? (
          <Button asChild size="lg" variant="outline" >
            <Link href={secondary.href}>{secondary.label}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
