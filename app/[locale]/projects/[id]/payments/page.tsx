"use client";

import * as React from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  Link2,
  Loader2,
  Receipt,
  Wallet,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCurrentUser } from "@/features/auth/user-context";
import { useEngagements } from "@/features/projects/use-engagements";
import { useConstructionItems } from "@/features/projects/use-construction";
import {
  useConfirmPaymentBatchMutation,
  useLinkPaymentBatchItemMutation,
  usePaymentBatches,
  useRejectPaymentBatchMutation,
} from "@/features/projects/use-payment-batches";
import type {
  PaymentBatch,
  PaymentBatchStatus,
} from "@/features/projects/payment-batch-types";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { formatVnd, formatVndParts } from "@/lib/format-currency";
import { proxiedImageSrc } from "@/lib/image-proxy";
import { Stamp, type StampTone } from "@/components/drawing-set/stamp";
import { SHEET, SheetTitle } from "@/components/drawing-set/sheet-title";

/**
 * The provider's side of instalment payments.
 *
 * The platform holds no money, so the only thing that closes an instalment is
 * this reconciliation: the owner says "transferred", the provider checks their
 * own bank account and confirms or rejects. Confirming also flips `isPaid` on
 * the linked milestone — which is why the link control is on this page rather
 * than buried in milestone editing.
 */

// No. | instalment | share | amount — shared by the header, rows and total so
// the columns line up. Below `sm` a row is number + one stacked column.
const SCHEDULE_COLS = "sm:grid-cols-[2.5rem_1fr_4.5rem_10rem]";

// Due is a warning (someone has to act), proof submitted is informational
// (waiting on the other side), confirmed is the money actually landing. The
// Badge variants showed confirmed in grey.
const STATUS_STAMP: Record<PaymentBatchStatus, StampTone> = {
  pending: "warning",
  proof_submitted: "info",
  confirmed: "success",
  rejected: "danger",
};

const FILTERS: readonly (PaymentBatchStatus | "all")[] = [
  "all",
  "proof_submitted",
  "pending",
  "confirmed",
  "rejected",
] as const;

export default function ProviderPaymentsPage() {
  const t = useTranslations("PaymentBatches");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";

  const { account } = useCurrentUser();
  const viewerProfileId = account?.serviceProvider?.id ?? null;

  const { engagements, isLoading: loadingEngagements } = useEngagements({
    projectId,
    providerId: viewerProfileId ?? undefined,
    pageSize: 10,
    enabled: Boolean(projectId) && viewerProfileId != null,
  });

  const engagement = React.useMemo(
    () => engagements.find((e) => e.status === "accepted") ?? engagements[0] ?? null,
    [engagements],
  );

  const [filter, setFilter] = React.useState<PaymentBatchStatus | "all">("all");
  const [confirming, setConfirming] = React.useState<PaymentBatch | null>(null);
  const [rejecting, setRejecting] = React.useState<PaymentBatch | null>(null);
  const [linking, setLinking] = React.useState<PaymentBatch | null>(null);

  const { batches, isLoading, isError, error, refetch } = usePaymentBatches({
    projectWorkingId: engagement?.id,
    status: filter === "all" ? undefined : filter,
    enabled: Boolean(engagement),
  });
  // The summary is computed from whatever list it is given, and the server
  // filters by status — so reading it off the filtered list made "Contract
  // total" shrink to the confirmed instalments when that filter was on. The
  // contract doesn't change with a filter; read it from the unfiltered list,
  // which is the same cached query whenever the filter is "all".
  const { summary } = usePaymentBatches({
    projectWorkingId: engagement?.id,
    enabled: Boolean(engagement),
  });

  const confirmMutation = useConfirmPaymentBatchMutation();
  const rejectMutation = useRejectPaymentBatchMutation();

  const digits = (amount: number) => formatVnd(amount, locale, "");

  if (loadingEngagements) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!engagement) {
    return (
      <div>
        <EmptyState
          icon={Wallet}
          title={t("noEngagement.title")}
          description={t("noEngagement.description")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <SheetTitle sheet={SHEET.payments}>{t("title")}</SheetTitle>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("subtitleProvider")}
        </p>
      </header>

      <ContractDimension summary={summary} />

      {/* A segmented strip rather than a row of loose chips: one control with
          one current value. */}
      <div
        role="group"
        aria-label={t("schedule.filterLabel")}
        className="flex w-fit max-w-full overflow-x-auto rounded-md border border-foreground/20"
      >
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className="shrink-0 whitespace-nowrap border-foreground/20 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background [&:not(:last-child)]:border-r"
          >
            {t(`filters.${value}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title={t("error.title")}
          subtitle={t("error.subtitle")}
          retryLabel={t("error.retry")}
          message={error?.message}
          onRetry={() => void refetch()}
        />
      ) : batches.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("empty.title")}
          description={t("empty.providerDescription")}
        />
      ) : (
        // The payment schedule, set the way it is in the contract: a ruled
        // table of numbered instalments with the figures in one column, so
        // amounts can be read down and checked against a bank statement.
        // It was a stack of cards, each with its amount floating top-right.
        <section className="overflow-hidden rounded-lg bg-card shadow-e1 ring-1 ring-foreground/10">
          <div
            aria-hidden
            className={`hidden border-b border-foreground/20 px-4 py-2 font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground sm:grid ${SCHEDULE_COLS}`}
          >
            <span>{t("schedule.no")}</span>
            <span>{t("schedule.instalment")}</span>
            <span className="text-end">{t("schedule.share")}</span>
            <span className="text-end">{t("schedule.amount")}</span>
          </div>

          <ol className="divide-y divide-border">
            {batches.map((batch) => (
              <li
                key={batch.id}
                className={`grid grid-cols-[2rem_1fr] gap-x-4 gap-y-3 px-4 py-4 ${SCHEDULE_COLS}`}
              >
                <span className="pt-0.5 font-mono text-sm text-muted-foreground tabular-nums">
                  {String(batch.sortOrder).padStart(2, "0")}
                </span>

                <div className="flex min-w-0 flex-col gap-3">
                  <BatchHeader batch={batch} />

                  {/* On a phone the figure columns collapse into this line, so
                      the amount stays next to the name instead of dropping
                      below the proof and actions. */}
                  <p className="font-mono text-base font-semibold tabular-nums text-foreground sm:hidden">
                    {digits(batch.amount)}
                    <span className="ms-1 text-2xs font-normal text-muted-foreground">VND</span>
                    {batch.percentage != null ? (
                      <span className="ms-2 text-sm font-normal text-muted-foreground">
                        · {batch.percentage}%
                      </span>
                    ) : null}
                  </p>

                  {batch.rejectReason ? (
                    <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                      {t("rejectedBecause", { reason: batch.rejectReason })}
                    </p>
                  ) : null}

                  <ProofList batch={batch} />

                  <div className="flex flex-wrap gap-2 empty:hidden">
                    {batch.status === "proof_submitted" ? (
                      <>
                        <Button
                          size="sm"
                          disabled={confirmMutation.isPending}
                          onClick={() => setConfirming(batch)}
                        >
                          {confirmMutation.isPending ? (
                            <Loader2 className="animate-spin" aria-hidden />
                          ) : (
                            <Check aria-hidden />
                          )}
                          {t("actions.confirm")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejecting(batch)}
                        >
                          <X aria-hidden />
                          {t("actions.reject")}
                        </Button>
                      </>
                    ) : null}

                    {/* Linkable until the batch is confirmed: after that the flag
                        it drives has already been written to a milestone. */}
                    {batch.status !== "confirmed" ? (
                      <Button size="sm" variant="ghost" onClick={() => setLinking(batch)}>
                        <Link2 aria-hidden />
                        {batch.constructionItemId
                          ? t("actions.relink")
                          : t("actions.link")}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <span className="hidden pt-0.5 text-end font-mono text-sm text-muted-foreground tabular-nums sm:block">
                  {batch.percentage != null ? `${batch.percentage}%` : "—"}
                </span>
                <span className="hidden text-end font-mono text-base font-semibold tabular-nums text-foreground sm:block">
                  {digits(batch.amount)}
                </span>
              </li>
            ))}
          </ol>

          <div
            className={`grid grid-cols-[2rem_1fr] gap-x-4 border-t border-foreground/30 px-4 py-3 ${SCHEDULE_COLS}`}
          >
            <span className="col-span-2 font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground sm:col-span-3 sm:self-center">
              {filter === "all" ? t("schedule.total") : t("schedule.totalShown")}
            </span>
            <span className="col-start-2 font-mono text-base font-semibold tabular-nums sm:col-start-auto sm:text-end">
              {digits(batches.reduce((sum, b) => sum + b.amount, 0))}
              <span className="ms-1 text-2xs font-normal text-muted-foreground sm:hidden">
                VND
              </span>
            </span>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(next) => {
          if (!next) setConfirming(null);
        }}
        title={t("confirm.title")}
        description={t("confirm.description")}
        confirmLabel={t("confirm.confirm")}
        cancelLabel={t("dialog.cancel")}
        onConfirm={() => {
          if (confirming) confirmMutation.mutate(confirming.id);
          setConfirming(null);
        }}
      />

      <RejectProofDialog
        batch={rejecting}
        pending={rejectMutation.isPending}
        onOpenChange={(next) => {
          if (!next) setRejecting(null);
        }}
        onSubmit={(reason) => {
          if (!rejecting) return;
          rejectMutation.mutate(
            { id: rejecting.id, payload: { reason } },
            { onSuccess: () => setRejecting(null) },
          );
        }}
      />

      <LinkItemDialog
        batch={linking}
        projectWorkingId={engagement.id}
        onOpenChange={(next) => {
          if (!next) setLinking(null);
        }}
      />
    </div>
  );
}

/** Status, name and the facts under it. The figures sit in the schedule's columns. */
function BatchHeader({ batch }: { batch: PaymentBatch }) {
  const t = useTranslations("PaymentBatches");

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Stamp size="sm" tone={STATUS_STAMP[batch.status]} seed={batch.id}>
          {t(`status.${batch.status}`)}
        </Stamp>
        {/* An instalment created by a change order is not part of the price
            the owner originally agreed — saying so avoids it reading as a
            batch that appeared from nowhere. */}
        {batch.changeOrderId ? (
          <Badge variant="outline">{t("fromChangeOrder")}</Badge>
        ) : null}
      </div>
      <p className="text-base font-semibold">{batch.name}</p>
      {batch.constructionItemName || batch.dueAt ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {batch.dueAt ? <span>{t("dueAt", { date: batch.dueAt })}</span> : null}
          {batch.constructionItemName ? (
            <span className="inline-flex items-center gap-1.5">
              <Link2 className="size-3.5" aria-hidden />
              {batch.constructionItemName}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/** The proof trail. Kept as a list because a batch can be paid in parts. */
function ProofList({ batch }: { batch: PaymentBatch }) {
  const t = useTranslations("PaymentBatches");
  const locale = useLocale();
  const money = (amount: number) => formatVndParts(amount, locale).full;

  if (batch.proofs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("proofs.none")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("proofs.title")}
      </p>
      <ul className="flex flex-col gap-2">
        {batch.proofs.map((proof) => (
          <li
            key={proof.id}
            className="flex items-start gap-3 rounded-lg p-2.5 bg-foreground/5"
          >
            {proof.imageViewUrl ? (
              <a
                href={proof.imageViewUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0"
              >
                <Image
                  src={proxiedImageSrc(proof.imageViewUrl)}
                  alt={t("proofs.imageAlt")}
                  width={64}
                  height={64}
                  className="size-16 rounded-md object-cover"
                  unoptimized
                />
              </a>
            ) : (
              <div className="grid size-16 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                <Receipt className="size-5" aria-hidden />
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-medium tabular-nums">
                {/* A proof with no amount means "the whole instalment" — see
                    SubmitPaymentProofRequest. Rendering 0 VND would be a lie. */}
                {proof.amount != null ? money(proof.amount) : t("proofs.fullAmount")}
              </p>
              {proof.transferredAt ? (
                <p className="text-xs text-muted-foreground">
                  {t("proofs.transferredAt", {
                    date: new Date(proof.transferredAt).toLocaleString(locale),
                  })}
                </p>
              ) : null}
              {proof.note ? <p className="text-xs">{proof.note}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Summary = ReturnType<typeof usePaymentBatches>["summary"];

/**
 * The contract as a dimension string: one bar the length of the contract
 * total, divided where the money stands — confirmed, awaiting the provider's
 * check, and not yet paid. It replaces four stat tiles whose figures overlapped
 * (outstanding included what was awaiting) without the page showing it.
 */
function ContractDimension({ summary }: { summary: Summary }) {
  const t = useTranslations("PaymentBatches");
  const locale = useLocale();
  const money = (amount: number) => formatVnd(amount, locale);

  const total = Math.max(summary.total, 0);
  const confirmed = Math.min(summary.confirmed, total);
  const awaiting = Math.min(summary.awaitingConfirmation, total - confirmed);
  const rest = Math.max(total - confirmed - awaiting, 0);
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <section aria-label={t("summary.total")} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground">
          {t("summary.total")}
        </p>
        <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {money(total)}
        </p>
      </div>

      {total > 0 ? (
        <div aria-hidden className="relative px-px">
          {/* Extension ticks at both ends, as on a drawn dimension. */}
          <span className="absolute -top-1.5 left-0 h-6 w-px bg-foreground/60" />
          <span className="absolute -top-1.5 right-0 h-6 w-px bg-foreground/60" />
          <div className="flex h-3 w-full overflow-hidden border border-foreground/25">
            <span className="h-full bg-success" style={{ width: `${pct(confirmed)}%` }} />
            <span className="h-full bg-info/70" style={{ width: `${pct(awaiting)}%` }} />
            <span className="hatch h-full" style={{ width: `${pct(rest)}%` }} />
          </div>
        </div>
      ) : null}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
        <Legend
          swatch="bg-success"
          label={t("summary.confirmed")}
          value={money(confirmed)}
          hint={t("summary.confirmedCount", { count: summary.confirmedCount })}
        />
        <Legend
          swatch="bg-info/70"
          label={t("summary.awaiting")}
          value={money(awaiting)}
          hint={t("summary.awaitingCount", { count: summary.awaitingCount })}
        />
        <Legend
          swatch="hatch border border-foreground/40"
          label={t("summary.notPaid")}
          value={money(rest)}
        />
      </dl>
    </section>
  );
}

function Legend({
  swatch,
  label,
  value,
  hint,
}: {
  swatch: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span aria-hidden className={`mt-0.5 size-3 shrink-0 ${swatch}`} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-muted-foreground">
          {label}
          {hint ? <span className="text-muted-foreground/80"> · {hint}</span> : null}
        </dt>
        {/* No accent on the awaiting figure: its swatch already marks it, and
            an orange number beside a blue swatch read as a third category. */}
        <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {value}
        </dd>
      </div>
    </div>
  );
}

function RejectProofDialog({
  batch,
  pending,
  onOpenChange,
  onSubmit,
}: {
  batch: PaymentBatch | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
}) {
  const t = useTranslations("PaymentBatches");
  const [reason, setReason] = React.useState("");

  useResetOnChange(batch?.id ?? null, () => setReason(""));

  return (
    <Dialog open={batch !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reject.title")}</DialogTitle>
          <DialogDescription>{t("reject.description")}</DialogDescription>
        </DialogHeader>

        <Textarea
          rows={4}
          value={reason}
          placeholder={t("reject.placeholder")}
          onChange={(e) => setReason(e.target.value)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button
            variant="destructive"
            // The reason is what tells the owner what to fix before paying
            // again, so an empty rejection is not worth sending.
            disabled={pending || reason.trim().length === 0}
            onClick={() => onSubmit(reason.trim())}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("reject.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Ties an instalment to the milestone it pays for — the "xác nhận đã thanh
 * toán từng hạng mục" half of review 3's point 7.
 */
function LinkItemDialog({
  batch,
  projectWorkingId,
  onOpenChange,
}: {
  batch: PaymentBatch | null;
  projectWorkingId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("PaymentBatches");
  const linkMutation = useLinkPaymentBatchItemMutation();

  const { topLevelItems, isLoading } = useConstructionItems({
    projectWorkingId,
    // The endpoint pages at 10 by default; a milestone missing from this list
    // simply cannot be linked, and nothing on screen would explain why.
    pageSize: 100,
    enabled: batch !== null,
  });

  const NONE = "__none__";
  const [selected, setSelected] = React.useState<string>(NONE);

  useResetOnChange(batch?.id ?? null, () =>
    setSelected(batch?.constructionItemId ?? NONE),
  );

  return (
    <Dialog open={batch !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("link.title")}</DialogTitle>
          <DialogDescription>{t("link.description")}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder={t("link.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("link.none")}</SelectItem>
              {topLevelItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button
            disabled={linkMutation.isPending}
            onClick={() => {
              if (!batch) return;
              linkMutation.mutate(
                {
                  id: batch.id,
                  payload: {
                    constructionItemId: selected === NONE ? null : selected,
                  },
                },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            {linkMutation.isPending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : null}
            {t("link.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
