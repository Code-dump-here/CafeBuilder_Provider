"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCancelPaymentMutation,
  usePaymentStatusQuery,
} from "@/features/payments/hooks";
import { Link } from "@/i18n/navigation";
import { formatVnd } from "@/lib/format-currency";
import { queryKeys } from "@/lib/react-query/keys";

/**
 * payOS appends its own query string to whichever URL it was told to come
 * back to — `PayOs:ReturnUrl` / `PayOs:CancelUrl` in the backend config —
 * looking like `?code=00&id=…&cancel=false&status=PAID&orderCode=1788…`.
 *
 * `orderCode` is the only parameter read here. The `status` payOS puts in
 * that string travelled through the user's own browser and can be retyped in
 * the address bar, so it proves nothing; the transaction is settled by the
 * server-to-server webhook, and `GET /api/payments/status` is the answer we
 * actually trust.
 */
function useOrderCode(): number | null {
  const params = useSearchParams();
  const raw = params.get("orderCode");
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

type Tone = "success" | "pending" | "danger" | "neutral";

const TONE_STYLES: Record<Tone, { ring: string; icon: string }> = {
  success: {
    ring: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    icon: "text-emerald-600",
  },
  pending: {
    ring: "bg-amber-50 text-amber-600 ring-amber-100",
    icon: "text-amber-600",
  },
  danger: {
    ring: "bg-rose-50 text-rose-600 ring-rose-100",
    icon: "text-rose-600",
  },
  neutral: {
    ring: "bg-muted text-muted-foreground ring-border",
    icon: "text-muted-foreground",
  },
};

interface ResultShellProps {
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  /** Order code + amount, when the transaction is known. */
  details?: React.ReactNode;
  actions: React.ReactNode;
}

function ResultShell({
  tone,
  icon,
  title,
  subtitle,
  details,
  actions,
}: ResultShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12 sm:px-6 lg:py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
          <span
            className={`flex size-14 items-center justify-center rounded-full ring-8 ${TONE_STYLES[tone].ring}`}
          >
            {icon}
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {details}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {actions}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Order code + amount, shown once the server has told us about the order. */
function TransactionDetails({
  orderCode,
  amount,
}: {
  orderCode: number;
  amount: number | null;
}) {
  const t = useTranslations("Payments.result");
  const locale = useLocale();

  return (
    <dl className="w-full max-w-xs divide-y divide-border rounded-lg border border-border text-sm">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <dt className="text-muted-foreground">{t("orderCode")}</dt>
        <dd className="font-medium tabular-nums text-foreground">
          {orderCode}
        </dd>
      </div>
      {amount !== null ? (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted-foreground">{t("amount")}</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {formatVnd(amount, locale)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function BackToPricing() {
  const t = useTranslations("Payments.result");
  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/pricing">{t("backToPricing")}</Link>
    </Button>
  );
}

function BackHome() {
  const t = useTranslations("Payments.result");
  return (
    <Button asChild size="sm">
      <Link href="/">{t("backHome")}</Link>
    </Button>
  );
}

// ─── Return (payOS "success" redirect) ──────────────────────────────────────

/**
 * Landing page for `PayOs:ReturnUrl`.
 *
 * Arriving here means payOS finished with the payer, not that the money
 * landed: the webhook may still be in flight. So the page polls
 * `GET /api/payments/status` until the transaction is final and reports what
 * the server says, rather than congratulating the user on arrival.
 */
export function PaymentReturnPage() {
  const t = useTranslations("Payments.result");
  const orderCode = useOrderCode();
  const { status, isLoading, isError, isSettling } =
    usePaymentStatusQuery(orderCode);
  const queryClient = useQueryClient();

  // The plan only becomes real once the transaction settles, so that is when
  // anything deriving entitlements from the account has to be re-read.
  const settledPaid = status?.isFinal === true && status.status === "paid";
  React.useEffect(() => {
    if (!settledPaid) return;
    queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
    void queryClient.refetchQueries({ queryKey: queryKeys.auth.me() });
  }, [settledPaid, queryClient]);

  // No order code: payOS was configured to come back somewhere else, or the
  // user opened the URL by hand. Nothing to verify.
  if (orderCode === null) {
    return (
      <ResultShell
        tone="neutral"
        icon={<AlertCircle aria-hidden className="size-7" />}
        title={t("unknownTitle")}
        subtitle={t("unknownSubtitle")}
        actions={
          <>
            <BackToPricing />
            <BackHome />
          </>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <ResultShell
        tone="pending"
        icon={<Loader2 aria-hidden className="size-7 animate-spin" />}
        title={t("checkingTitle")}
        subtitle={t("checkingSubtitle")}
        actions={<BackToPricing />}
      />
    );
  }

  if (isError || status === null) {
    return (
      <ResultShell
        tone="danger"
        icon={<AlertCircle aria-hidden className="size-7" />}
        title={t("errorTitle")}
        subtitle={t("errorSubtitle")}
        details={<TransactionDetails orderCode={orderCode} amount={null} />}
        actions={
          <>
            <BackToPricing />
            <BackHome />
          </>
        }
      />
    );
  }

  const details = (
    <TransactionDetails orderCode={status.orderCode || orderCode} amount={status.amount} />
  );

  if (isSettling) {
    return (
      <ResultShell
        tone="pending"
        icon={<Clock aria-hidden className="size-7" />}
        title={t("pendingTitle")}
        subtitle={t("pendingSubtitle")}
        details={details}
        actions={<BackToPricing />}
      />
    );
  }

  if (status.status === "paid") {
    return (
      <ResultShell
        tone="success"
        icon={<CheckCircle2 aria-hidden className="size-7" />}
        title={t("paidTitle")}
        subtitle={t("paidSubtitle")}
        details={details}
        actions={<BackHome />}
      />
    );
  }

  // cancelled | failed — the server's message is more specific than anything
  // that can be written here, so prefer it when there is one.
  return (
    <ResultShell
      tone="danger"
      icon={<XCircle aria-hidden className="size-7" />}
      title={t("failedTitle")}
      subtitle={status.message || t("failedSubtitle")}
      details={details}
      actions={
        <>
          <BackToPricing />
          <BackHome />
        </>
      }
    />
  );
}

// ─── Cancel (payOS "cancel" redirect) ───────────────────────────────────────

/**
 * Landing page for `PayOs:CancelUrl`.
 *
 * Tells the server the pending transaction is abandoned so it does not sit
 * `pending` forever. The endpoint is idempotent, so a refresh here is safe;
 * the ref guard is only to avoid a duplicate request in React's development
 * double-invoke.
 */
export function PaymentCancelPage() {
  const t = useTranslations("Payments.result");
  const orderCode = useOrderCode();
  const cancelPayment = useCancelPaymentMutation();
  const requested = React.useRef(false);

  React.useEffect(() => {
    if (orderCode === null || requested.current) return;
    requested.current = true;
    // Best-effort: the user has already been told the payment was cancelled,
    // and a failure here changes nothing they can act on.
    cancelPayment.mutate(orderCode);
  }, [orderCode, cancelPayment]);

  return (
    <ResultShell
      tone="neutral"
      icon={<XCircle aria-hidden className="size-7" />}
      title={t("cancelTitle")}
      subtitle={t("cancelSubtitle")}
      details={
        orderCode === null ? undefined : (
          <TransactionDetails orderCode={orderCode} amount={null} />
        )
      }
      actions={
        <>
          <BackToPricing />
          <BackHome />
        </>
      }
    />
  );
}
