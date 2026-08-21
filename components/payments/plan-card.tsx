"use client";

import * as React from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  PaymentPlan,
  PaymentPlanId,
  PaymentPlanTargetRole,
} from "@/features/payments/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Heuristic: surface the yearly plan as "best value" when the catalogue
 * contains both a 30-day and a 365-day plan for the same role. We mark
 * the longer-duration plan as the highlight so the UI can place the
 * "Save N%" badge on it without duplicating intent in the data.
 *
 * The function tolerates missing siblings — if only one plan exists for
 * a role, neither will be highlighted.
 */
export function computeHighlightedPlanIds(
  plans: PaymentPlan[],
): Set<PaymentPlanId> {
  const byRoleDurations = new Map<PaymentPlanTargetRole, Map<number, PaymentPlan>>();
  for (const plan of plans) {
    const bucket =
      byRoleDurations.get(plan.targetRole) ?? new Map<number, PaymentPlan>();
    bucket.set(plan.durationInDays, plan);
    byRoleDurations.set(plan.targetRole, bucket);
  }

  const highlighted = new Set<PaymentPlanId>();
  for (const [, durations] of byRoleDurations) {
    const monthly = durations.get(30);
    const yearly = durations.get(365);
    if (!monthly || !yearly) continue;
    // Annual price should be cheaper than 12× monthly; if so, it's the
    // obvious highlight. Otherwise we still highlight it but the savings
    // badge will render a zero-percent label as a hint to the user.
    if (yearly.price < monthly.price * 12) {
      highlighted.add(yearly.id);
    }
  }
  return highlighted;
}

export function computeSavingsPercent(monthly: PaymentPlan, yearly: PaymentPlan): number {
  if (monthly.price <= 0) return 0;
  const yearlyEquivalent = monthly.price * 12;
  if (yearly.price >= yearlyEquivalent) return 0;
  return Math.round(((yearlyEquivalent - yearly.price) / yearlyEquivalent) * 100);
}

// ─── Sub-component: format the price ────────────────────────────────────────

interface PriceDisplayProps {
  amount: number;
  durationInDays: number;
  currency: string;
  /** Locale-aware formatter from `useFormatter`. */
  format: ReturnType<typeof useFormatter>;
  perUnitLabel: string;
  durationLabel: string;
  /**
   * Renders the "about X/day" line. A callback rather than a finished
   * string because the amount it interpolates is derived here, while the
   * message it goes into lives with the translator in `PlanCard`.
   */
  renderApproxPerDay: (amount: string) => string;
}

function PriceDisplay({
  amount,
  durationInDays,
  currency,
  format,
  perUnitLabel,
  durationLabel,
  renderApproxPerDay,
}: PriceDisplayProps) {
  // Suffixed rather than `style: "currency"`, which renders ₫ — the rest of
  // this app and the mobile app both spell the currency out.
  const formatted = `${format.number(amount, {
    maximumFractionDigits: 0,
  })} ${currency}`;

  // Per-day cost is a nice "about" hint that anchors the price against
  // the day count. Floor to two decimals — VND rarely needs more.
  const perDay = amount / Math.max(durationInDays, 1);
  const formattedPerDay = `${format.number(perDay, {
    maximumFractionDigits: 0,
  })} ${currency}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-3xl font-semibold leading-none tracking-tight text-foreground md:text-4xl">
          {formatted}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {perUnitLabel}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{durationLabel}</p>
      <p className="text-[11px] text-muted-foreground/80">
        {renderApproxPerDay(formattedPerDay)}
      </p>
    </div>
  );
}

// ─── Plan card ──────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: PaymentPlan;
  highlighted: boolean;
  savingsPercent: number | null;
  /** Active highlight badge label when the card is the "best value". */
  highlightLabel: string;
  subscribeLabel: string;
  subscribingLabel: string;
  subscribeNote: string;
  currency: string;
  perks: string[];
  /** True while the create-subscription mutation is in flight. */
  isSubmitting: boolean;
  /**
   * Fires when the user clicks Subscribe. The parent owns the mutation
   * so the card stays a presentational component. The card simply
   * forwards the click + the plan id.
   */
  onSubscribe: (planId: PaymentPlanId) => void;
}

export function PlanCard({
  plan,
  highlighted,
  savingsPercent,
  highlightLabel,
  subscribeLabel,
  subscribingLabel,
  subscribeNote,
  currency,
  perks,
  isSubmitting,
  onSubscribe,
}: PlanCardProps) {
  const t = useTranslations("Payments.billing");
  const format = useFormatter();

  const isMonthly = plan.durationInDays === 30;
  const isYearly = plan.durationInDays === 365;
  const perUnitLabel = isYearly ? t("perYear") : isMonthly ? t("perMonth") : "";
  const durationLabel = isYearly
    ? t("duration.year")
    : isMonthly
      ? t("duration.months", { count: 1 })
      : t("duration.days", { count: plan.durationInDays });

  return (
    <article
      data-highlighted={highlighted ? "true" : undefined}
      className={cn(
        "relative flex h-full flex-col gap-5 rounded-2xl border bg-card p-6 transition-shadow md:p-7",
        highlighted
          ? "border-primary/60 shadow-[0_18px_50px_-22px_oklch(0.45_0.12_240_/_0.45)]"
          : "border-border/70",
      )}
    >
      {highlighted ? (
        <Badge
          variant="default"
          className="absolute -top-3 start-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm"
        >
          <Sparkles aria-hidden className="size-3" />
          {highlightLabel}
        </Badge>
      ) : null}

      <header className="flex flex-col gap-2">
        <h2 className="font-heading text-xl text-foreground md:text-2xl">
          {plan.name}
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">
          {plan.description}
        </p>
      </header>

      <PriceDisplay
        amount={plan.price}
        durationInDays={plan.durationInDays}
        currency={currency}
        format={format}
        perUnitLabel={perUnitLabel}
        durationLabel={durationLabel}
        renderApproxPerDay={(amount) => t("approx", { amount })}
      />

      {highlighted && savingsPercent !== null && savingsPercent > 0 ? (
        <p className="-mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {t("savings", { percent: savingsPercent })}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2 text-sm text-foreground">
        {perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Check aria-hidden className="size-3" strokeWidth={2.5} />
            </span>
            <span className="leading-relaxed">{perk}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button
          type="button"
          size="xl"
          className="h-11 w-full rounded-full text-sm font-semibold"
          variant={highlighted ? "default" : "outline"}
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
          onClick={() => onSubscribe(plan.id)}
        >
          {isSubmitting ? (
            <>
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              {subscribingLabel}
            </>
          ) : (
            subscribeLabel
          )}
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          {subscribeNote}
        </p>
      </div>
    </article>
  );
}