"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { AppError } from "@/lib/http/errors";
import { formatVnd } from "@/lib/format-currency";
import {
  usePaymentPlansQuery,
  useCreateSubscriptionMutation,
} from "@/features/payments/hooks";

import {
  PREVIEW_DEFAULT_STATE,
  PREVIEW_ENABLED,
  PREVIEW_PLAN,
  resolvePreviewState,
} from "./subscription-preview";

/**
 * `/subscription/checkout` — the confirmation step before payOS.
 *
 * The flow the backend documents is: `GET plans` → `POST subscriptions`
 * (which returns a `checkoutUrl`) → send the user to payOS → payOS calls the
 * webhook → the user comes back to the return or cancel URL.
 *
 * This page owns the middle two steps. It exists because the POST is not free
 * of consequence: it creates a real transaction row and a live payment link
 * on payOS. Firing that straight off a card click in a grid — which is what
 * the pricing page used to do — spends a server-side resource on a stray tap
 * and gives the user nothing to confirm against. Here they see the plan, the
 * amount and the duration before anything is created.
 */
export function SubscriptionCheckout() {
  const t = useTranslations("Payments.checkout");
  const tErrors = useTranslations("Auth.errors");
  const tStates = useTranslations("Payments.states");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");

  // In development, `?preview=` walks the flow without a session: the pay
  // button goes straight to the return page's fixture instead of creating a
  // real payOS link. Plans themselves are a public endpoint, so the rest of
  // this page already renders signed-out. See subscription-preview.
  const preview = resolvePreviewState(searchParams.get("preview"));

  const { plans, isLoading, isError, refetch } = usePaymentPlansQuery();
  const createSubscription = useCreateSubscriptionMutation();

  const realPlan = React.useMemo(
    () => plans.find((candidate) => candidate.id === planId) ?? null,
    [plans, planId],
  );

  // While these are review pages the screen has to render whatever the API and
  // the URL are doing: a missing planId, a stale one, or an unreachable backend
  // would otherwise park a spinner or an error card in front of someone who
  // only wanted to look at the layout.
  //
  // Waiting is still allowed when it can pay off — a planId was given and the
  // lookup is genuinely in flight — so a real plan is not replaced by a
  // stand-in for a frame on its way in. With no planId there is nothing to wait
  // for, and once the query settles without a match there is nothing more
  // coming.
  const lookupWorthWaitingFor = Boolean(planId) && isLoading;
  const usingFallbackPlan = PREVIEW_ENABLED && !realPlan && !lookupWorthWaitingFor;
  const plan = realPlan ?? (usingFallbackPlan ? PREVIEW_PLAN : null);

  const handlePay = React.useCallback(() => {
    if (!plan) return;
    // No real plan means no real payOS link can be created, so walk to the
    // result screen instead of firing a request that can only fail.
    const walkThrough = preview ?? (usingFallbackPlan ? PREVIEW_DEFAULT_STATE : null);
    if (walkThrough) {
      window.location.assign(`/subscription/return?preview=${walkThrough}`);
      return;
    }
    createSubscription.mutate(
      { planId: plan.id, platform: "web" },
      {
        onSuccess: (payment) => {
          // A full navigation, not a router push: payOS is a different origin
          // and the user must actually leave this app to pay.
          window.location.assign(payment.checkoutUrl);
        },
        onError: (err) => {
          toast.error(
            err instanceof AppError && err.message
              ? err.message
              : tErrors("unknown"),
          );
        },
      },
    );
  }, [createSubscription, plan, preview, usingFallbackPlan, tErrors]);

  if (lookupWorthWaitingFor) {
    return <CheckoutShell>{<PendingRow label={t("loading")} />}</CheckoutShell>;
  }

  if (isError && !usingFallbackPlan) {
    return (
      <CheckoutShell>
        <ErrorState
          title={tStates("loadErrorTitle")}
          subtitle={tStates("loadErrorSubtitle")}
          retryLabel={tStates("loadErrorRetry")}
          onRetry={() => void refetch()}
        />
      </CheckoutShell>
    );
  }

  // A missing or unknown planId is a bad link, not a server fault — say so
  // and point back at the catalogue rather than showing an error card.
  if (!plan) {
    return (
      <CheckoutShell>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 text-center md:p-8">
          <h2 className="font-heading text-lg text-foreground">
            {t("unknownPlanTitle")}
          </h2>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground md:text-sm">
            {t("unknownPlanSubtitle")}
          </p>
          <Button asChild variant="outline" className="mx-auto mt-2 rounded-full">
            <Link href="/pricing">{t("backToPlans")}</Link>
          </Button>
        </div>
      </CheckoutShell>
    );
  }

  const isPending = createSubscription.isPending;

  return (
    <CheckoutShell>
      <section className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-6 md:p-7">
        <header className="flex flex-col gap-2">
          <h2 className="font-heading text-xl text-foreground md:text-2xl">
            {plan.name}
          </h2>
          {plan.description ? (
            <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">
              {plan.description}
            </p>
          ) : null}
        </header>

        <dl className="flex flex-col gap-2 border-y border-border/60 py-4 text-sm">
          <SummaryRow
            label={t("summary.duration")}
            value={t("summary.days", { count: plan.durationInDays })}
          />
          <SummaryRow
            label={t("summary.total")}
            value={formatVnd(plan.price, locale)}
            emphasis
          />
        </dl>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="xl"
            className="h-11 w-full rounded-full text-sm font-semibold"
            disabled={isPending}
            aria-busy={isPending || undefined}
            onClick={handlePay}
          >
            {isPending ? (
              <>
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
                {t("redirecting")}
              </>
            ) : (
              <>
                <CreditCard aria-hidden className="size-4" />
                {t("payCta")}
              </>
            )}
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/pricing">{t("cancel")}</Link>
          </Button>
        </div>

        <p className="flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-px size-3.5 shrink-0 text-primary" />
          <span>{t("secureNote")}</span>
        </p>
      </section>
    </CheckoutShell>
  );
}

// ─── Shared chrome ──────────────────────────────────────────────────────────

/** Same container width and header rhythm as the pricing page. */
export function CheckoutShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Payments.checkout");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-3">
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <CreditCard aria-hidden className="size-3.5 text-primary" />
          {t("eyebrow")}
        </span>
        <h1 className="font-heading text-2xl leading-[1.1] tracking-tight text-foreground md:text-3xl">
          {t("title")}
        </h1>
      </header>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-muted-foreground md:text-sm">{label}</dt>
      <dd
        className={
          emphasis
            ? "font-heading text-lg tabular-nums text-foreground md:text-xl"
            : "text-sm tabular-nums text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function PendingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
      <Loader2 aria-hidden className="size-4 animate-spin" />
      {label}
    </div>
  );
}
