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
import { Card, CardContent } from "@/components/ui/card";
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
import { formatVndParts } from "@/lib/format-currency";
import { proxiedImageSrc } from "@/lib/image-proxy";

/**
 * The provider's side of instalment payments.
 *
 * The platform holds no money, so the only thing that closes an instalment is
 * this reconciliation: the owner says "transferred", the provider checks their
 * own bank account and confirms or rejects. Confirming also flips `isPaid` on
 * the linked milestone — which is why the link control is on this page rather
 * than buried in milestone editing.
 */

const STATUS_VARIANT: Record<
  PaymentBatchStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  proof_submitted: "default",
  confirmed: "secondary",
  rejected: "destructive",
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

  const { batches, summary, isLoading, isError, error, refetch } = usePaymentBatches({
    projectWorkingId: engagement?.id,
    status: filter === "all" ? undefined : filter,
    enabled: Boolean(engagement),
  });

  const confirmMutation = useConfirmPaymentBatchMutation();
  const rejectMutation = useRejectPaymentBatchMutation();

  const money = (amount: number) => formatVndParts(amount, locale).full;

  if (loadingEngagements) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Wallet}
          title={t("noEngagement.title")}
          description={t("noEngagement.description")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("subtitleProvider")}
        </p>
      </header>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-4">
          <Stat label={t("summary.total")} value={money(summary.total)} />
          <Stat
            label={t("summary.confirmed")}
            value={money(summary.confirmed)}
            hint={t("summary.confirmedCount", { count: summary.confirmedCount })}
          />
          <Stat
            label={t("summary.awaiting")}
            value={money(summary.awaitingConfirmation)}
            hint={t("summary.awaitingCount", { count: summary.awaitingCount })}
            emphasis={summary.awaitingCount > 0}
          />
          <Stat
            label={t("summary.outstanding")}
            value={money(summary.outstanding)}
            hint={t("summary.outstandingHint")}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {t(`filters.${value}`)}
          </Button>
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
        <div className="flex flex-col gap-3">
          {batches.map((batch) => (
            <Card key={batch.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <BatchHeader batch={batch} />

                {batch.rejectReason ? (
                  <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    {t("rejectedBecause", { reason: batch.rejectReason })}
                  </p>
                ) : null}

                <ProofList batch={batch} />

                <div className="flex flex-wrap gap-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
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

/** Shared by both roles' payment pages — name, money, due date and status. */
export function BatchHeader({ batch }: { batch: PaymentBatch }) {
  const t = useTranslations("PaymentBatches");
  const locale = useLocale();
  const money = (amount: number) => formatVndParts(amount, locale).full;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[batch.status]}>
            {t(`status.${batch.status}`)}
          </Badge>
          {batch.percentage != null ? (
            <Badge variant="outline">{batch.percentage}%</Badge>
          ) : null}
          {/* An instalment created by a change order is not part of the price
              the owner originally agreed — saying so avoids it reading as a
              batch that appeared from nowhere. */}
          {batch.changeOrderId ? (
            <Badge variant="outline">{t("fromChangeOrder")}</Badge>
          ) : null}
        </div>
        <p className="text-base font-semibold">{batch.name}</p>
        {batch.constructionItemName ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 className="size-3.5" aria-hidden />
            {batch.constructionItemName}
          </p>
        ) : null}
        {batch.dueAt ? (
          <p className="text-xs text-muted-foreground">
            {t("dueAt", { date: batch.dueAt })}
          </p>
        ) : null}
      </div>
      <p className="text-xl font-semibold tabular-nums">{money(batch.amount)}</p>
    </div>
  );
}

/** The proof trail. Kept as a list because a batch can be paid in parts. */
export function ProofList({ batch }: { batch: PaymentBatch }) {
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
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("proofs.title")}
      </p>
      <ul className="flex flex-col gap-2">
        {batch.proofs.map((proof) => (
          <li
            key={proof.id}
            className="flex items-start gap-3 rounded-lg border border-border/70 p-2.5"
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

function Stat({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          emphasis ? "text-lg font-semibold text-primary" : "text-base font-semibold"
        }
      >
        {value}
      </p>
      {hint ? <p className="text-[11px] text-muted-foreground/80">{hint}</p> : null}
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
