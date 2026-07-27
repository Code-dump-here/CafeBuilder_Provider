"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { AppError } from "@/lib/http/errors";
import {
  useCreateSubscriptionMutation,
  usePaymentPlansQuery,
} from "@/features/payments/hooks";
import {
  computeHighlightedPlanIds,
  computeSavingsPercent,
  PlanCard,
} from "./plan-card";
import type {
  PaymentPlan,
  PaymentPlanId,
} from "@/features/payments/api";

// ─── Empty / error / loading wrappers ───────────────────────────────────────

function LoadingState() {
  const t = useTranslations("Payments.states");
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6"
    >
      {[0, 1].map((slot) => (
        <div
          key={slot}
          className="flex h-72 flex-col gap-3 rounded-2xl border border-border/70 bg-card p-6 md:p-7"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
            {t("loading")}
          </div>
          <div className="space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  const t = useTranslations("Payments.states");
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
      <h2 className="text-sm font-semibold text-foreground">
        {t("loadErrorTitle")}
      </h2>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("loadErrorSubtitle")}
      </p>
      <Button type="button" variant="outline" size="lg" onClick={onRetry}>
        {t("loadErrorRetry")}
      </Button>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations("Payments.states");
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-8 text-center">
      <h2 className="text-sm font-semibold text-foreground">
        {t("emptyTitle")}
      </h2>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("emptySubtitle")}
      </p>
    </div>
  );
}

// ─── Grid ───────────────────────────────────────────────────────────────────

const CURRENCY = "VND";

const PERK_KEYS = ["marketplace", "applications", "support", "badge"] as const;

function PerksList() {
  const t = useTranslations("Payments.perks");
  return (
    <section className="rounded-2xl border border-border/60 bg-muted/30 p-5 md:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t("title")}
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-foreground sm:grid-cols-2">
        {PERK_KEYS.map((key) => (
          <li key={key} className="leading-relaxed">
            • {t(`items.${key}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Renders the catalogue of plans for the current viewer.
 *
 * Provider-only by design — the page above filters to `targetRole === 1`
 * before passing data in, but the function also handles the empty,
 * loading, and error states for the plan request itself.
 *
 * The subscribe action is owned by the parent (the mutation lives in
 * `PlanGridContainer`); this component just forwards plan ids up.
 */
interface PlanGridProps {
  plans: PaymentPlan[];
  /** Plan id currently being submitted, if any. */
  submittingPlanId: PaymentPlanId | null;
  onSubscribe: (planId: PaymentPlanId) => void;
}

export function PlanGrid({ plans, submittingPlanId, onSubscribe }: PlanGridProps) {
  const t = useTranslations("Payments");

  if (plans.length === 0) {
    return <EmptyState />;
  }

  const highlightedIds = computeHighlightedPlanIds(plans);

  // The savings badge only shows when a yearly+monthly pair exists for
  // the same role. Find them by role so each role's plans get their
  // own savings computation.
  const byRole = new Map<number, PaymentPlan[]>();
  for (const plan of plans) {
    const bucket = byRole.get(plan.targetRole) ?? [];
    bucket.push(plan);
    byRole.set(plan.targetRole, bucket);
  }

  const savingsByPlanId = new Map<number, number>();
  for (const [, rolePlans] of byRole) {
    const monthly = rolePlans.find((p) => p.durationInDays === 30);
    const yearly = rolePlans.find((p) => p.durationInDays === 365);
    if (!monthly || !yearly) continue;
    const savings = computeSavingsPercent(monthly, yearly);
    if (savings > 0) savingsByPlanId.set(yearly.id, savings);
  }

  // Order: yearly first, monthly second. Stable within each group.
  const sorted = [...plans].sort((a, b) => {
    const ay = a.durationInDays === 365 ? 1 : 0;
    const by = b.durationInDays === 365 ? 1 : 0;
    if (ay !== by) return by - ay;
    return a.id - b.id;
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {sorted.map((plan) => {
          const highlighted = highlightedIds.has(plan.id);
          const savingsPercent = savingsByPlanId.get(plan.id) ?? null;
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              highlighted={highlighted}
              savingsPercent={savingsPercent}
              highlightLabel="Best value"
              subscribeLabel={t("cta.subscribe")}
              subscribingLabel={t("cta.subscribing")}
              subscribeNote={t("cta.subscribeNote")}
              currency={CURRENCY}
              perks={PERK_KEYS.map((key) => t(`perks.items.${key}`))}
              isSubmitting={submittingPlanId === plan.id}
              onSubscribe={onSubscribe}
            />
          );
        })}
      </div>

      <PerksList />
    </div>
  );
}

// ─── Outer wrapper: drives data + role-aware gating ─────────────────────────

interface PlanGridContainerProps {
  /** Target role whose plans should be surfaced. 0 = owner, 1 = provider. */
  targetRole: 0 | 1;
}

export function PlanGridContainer({ targetRole }: PlanGridContainerProps) {
  const t = useTranslations("Payments.states");
  const tCta = useTranslations("Payments.cta");
  const tErrors = useTranslations("Auth.errors");

  const { plans, isLoading, isError, refetch } = usePaymentPlansQuery();
  const createSubscription = useCreateSubscriptionMutation();

  // Filter the cached catalogue to the current viewer's role. The
  // request itself returns every plan; the role selector is a UI
  // concern, not an API parameter.
  const visiblePlans = plans.filter((plan) => plan.targetRole === targetRole);

  const handleSubscribe = React.useCallback(
    (planId: PaymentPlanId) => {
      createSubscription.mutate(
        { planId, platform: "web" },
        {
          onSuccess: () => {
            toast.success(tCta("subscribeSuccess"));
          },
          onError: (err) => {
            const message =
              err instanceof AppError && err.message
                ? err.message
                : tErrors("unknown");
            toast.error(message);
          },
        },
      );
    },
    [createSubscription, tCta, tErrors],
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  if (visiblePlans.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-8 text-center">
        <h2 className="text-sm font-semibold text-foreground">{t("emptyTitle")}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("emptySubtitle")}
        </p>
      </div>
    );
  }

  return (
    <PlanGrid
      plans={visiblePlans}
      submittingPlanId={createSubscription.isPending
        ? createSubscription.variables?.planId ?? null
        : null}
      onSubscribe={handleSubscribe}
    />
  );
}