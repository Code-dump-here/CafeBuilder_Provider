"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  CircleDollarSign,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  TriangleAlert,
  Undo2,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

import { formatVndParts } from "@/lib/format-currency";
import { useCurrentUser } from "@/features/auth/user-context";
import { useEngagements } from "@/features/projects/use-engagements";
import {
  useAcceptChangeOrderMutation,
  useChangeOrderSummary,
  useChangeOrders,
  useCreateChangeOrderMutation,
  useRejectChangeOrderMutation,
  useUpdateChangeOrderMutation,
  useWithdrawChangeOrderMutation,
} from "@/features/projects/use-change-orders";
import {
  CHANGE_ORDER_KINDS,
  type ChangeOrder,
  type ChangeOrderKind,
  type ChangeOrderStatus,
} from "@/features/projects/change-order-types";

const FILTERS: readonly (ChangeOrderStatus | "all")[] = [
  "all",
  "pending",
  "accepted",
  "rejected",
] as const;

/** Status → badge tint. `pending` is the only one that still wants a decision. */
const STATUS_VARIANT: Record<ChangeOrderStatus, "default" | "secondary" | "destructive"> =
  {
    pending: "default",
    accepted: "secondary",
    rejected: "destructive",
  };

export default function ChangeOrdersPage() {
  const t = useTranslations("ChangeOrders");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";

  const { account } = useCurrentUser();
  const viewerProfileId = account?.serviceProvider?.id ?? null;

  const { engagements, isLoading: loadingEngagements } = useEngagements({
    projectId,
    providerId: viewerProfileId ?? undefined,
    enabled: Boolean(projectId) && Boolean(viewerProfileId),
  });

  // The viewer's own live engagement. Everything on this page hangs off it —
  // change orders belong to an engagement, not to a project.
  const engagement = React.useMemo(
    () => engagements.find((e) => e.status === "accepted") ?? engagements[0] ?? null,
    [engagements],
  );

  const [filter, setFilter] = React.useState<ChangeOrderStatus | "all">("all");
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<ChangeOrder | null>(null);
  const [rejecting, setRejecting] = React.useState<ChangeOrder | null>(null);
  const [withdrawing, setWithdrawing] = React.useState<ChangeOrder | null>(null);

  const { orders, isLoading, isError, error, refetch } = useChangeOrders({
    projectWorkingId: engagement?.id,
    status: filter === "all" ? undefined : filter,
    enabled: Boolean(engagement),
  });
  const { summary } = useChangeOrderSummary({
    projectWorkingId: engagement?.id,
    enabled: Boolean(engagement),
  });

  const createMutation = useCreateChangeOrderMutation();
  const updateMutation = useUpdateChangeOrderMutation();
  const acceptMutation = useAcceptChangeOrderMutation();
  const rejectMutation = useRejectChangeOrderMutation();
  const withdrawMutation = useWithdrawChangeOrderMutation();

  const money = (amount: number) => formatVndParts(amount, locale).full;

  if (loadingEngagements) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ReceiptText}
          title={t("noEngagement.title")}
          description={t("noEngagement.description")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          {t("create")}
        </Button>
      </header>

      {summary ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="size-4 text-primary" aria-hidden />
              {t("summary.title")}
            </CardTitle>
            <CardDescription>{t("summary.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 p-4 pt-0 lg:grid-cols-4">
            <Stat
              label={t("summary.contractValue")}
              value={
                summary.contractValue === null
                  ? t("summary.noContract")
                  : money(summary.contractValue)
              }
            />
            <Stat
              label={t("summary.accepted")}
              value={money(summary.acceptedAmount)}
              hint={t("summary.acceptedCount", { count: summary.acceptedCount })}
            />
            <Stat
              label={t("summary.pending")}
              value={money(summary.pendingAmount)}
              hint={t("summary.pendingCount", { count: summary.pendingCount })}
            />
            <Stat
              label={t("summary.totalCommitted")}
              value={
                summary.totalCommitted === null
                  ? t("summary.noContract")
                  : money(summary.totalCommitted)
              }
              hint={t("summary.totalCommittedHint")}
              emphasis
            />
            {summary.acceptedRevisionFee > 0 ? (
              <Stat
                label={t("summary.revisionFees")}
                value={money(summary.acceptedRevisionFee)}
                hint={t("summary.revisionFeesHint")}
              />
            ) : null}
            <Stat
              label={t("summary.billed")}
              value={money(summary.billedAmount)}
              hint={t("summary.billedHint")}
            />
            <Stat
              label={t("summary.paid")}
              value={money(summary.paidAmount)}
              hint={t("summary.paidHint")}
            />
          </CardContent>

          {/* Agreed money with no way to collect it is the one number worth
              interrupting over — it is invisible everywhere else. */}
          {summary.unbilledAmount > 0 ? (
            <CardContent className="px-4 pb-4 pt-0">
              <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500"
                  aria-hidden
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">
                    {t("summary.unbilled", { amount: money(summary.unbilledAmount) })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("summary.unbilledHint")}
                  </p>
                </div>
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

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
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title={t("error.title")}
          subtitle={t("error.subtitle")}
          retryLabel={t("error.retry")}
          message={error?.message}
          onRetry={() => void refetch()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={t("empty.title")}
          description={t("empty.description")}
          actionLabel={t("create")}
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            // The side that raised it can edit or withdraw it; the other side
            // is the one that answers. Both are enforced server-side — this
            // only decides which buttons are worth showing.
            const mine = order.requestedByParty === "provider";
            const open = order.status === "pending";

            return (
              <Card key={order.id}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={STATUS_VARIANT[order.status]}>
                          {t(`status.${order.status}`)}
                        </Badge>
                        <Badge variant="outline">{t(`kind.${order.kind}`)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {mine ? t("raisedByYou") : t("raisedByOwner")}
                        </span>
                        {order.revisionNo !== null ? (
                          <span className="text-xs text-muted-foreground">
                            {t("revisionNo", { no: order.revisionNo })}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium">{order.title}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {order.reason}
                      </p>
                      {order.rejectReason ? (
                        <p className="text-sm leading-relaxed text-destructive">
                          {t("rejectedBecause", { reason: order.rejectReason })}
                        </p>
                      ) : null}

                      {/* Where the money got to after both sides agreed. Without
                          this the card stops at "accepted" and the provider has
                          no idea whether it is collectable. */}
                      {order.paymentBatchId ? (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Wallet className="size-3.5" aria-hidden />
                          {t(`billing.${order.paymentBatchStatus ?? "pending"}`)}
                        </p>
                      ) : order.status === "accepted" && order.amount > 0 ? (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                          <TriangleAlert className="size-3.5" aria-hidden />
                          {t("billing.notBilled")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="text-lg font-semibold">
                        {order.needsPricing ? t("unpriced") : money(order.amount)}
                      </p>
                    </div>
                  </div>

                  {/* The system opened this fee but only the provider can put a
                      number on it. Saying so is the difference between a task
                      and a 0 VND row nobody understands. */}
                  {order.needsPricing ? (
                    <div className="flex items-start gap-3 rounded-md border border-primary/40 bg-primary/5 p-3">
                      <CircleDollarSign
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <p className="text-sm">
                        {mine ? t("needsPricing.provider") : t("needsPricing.owner")}
                      </p>
                    </div>
                  ) : null}

                  {open ? (
                    <div className="flex flex-wrap gap-2">
                      {mine ? (
                        <>
                          <Button
                            size="sm"
                            variant={order.needsPricing ? "default" : "outline"}
                            onClick={() => setEditing(order)}
                          >
                            <Pencil aria-hidden />
                            {order.needsPricing ? t("actions.setPrice") : t("actions.edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setWithdrawing(order)}
                          >
                            <Undo2 aria-hidden />
                            {t("actions.withdraw")}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            // Approving a fee the provider has not priced would
                            // settle it at 0 VND, and accepted is final.
                            disabled={acceptMutation.isPending || order.needsPricing}
                            onClick={() => acceptMutation.mutate(order.id)}
                          >
                            {acceptMutation.isPending ? (
                              <Loader2 className="animate-spin" aria-hidden />
                            ) : (
                              <Check aria-hidden />
                            )}
                            {t("actions.accept")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejecting(order)}
                          >
                            <X aria-hidden />
                            {t("actions.reject")}
                          </Button>
                        </>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ChangeOrderDialog
        open={creating || editing !== null}
        onOpenChange={(next) => {
          if (!next) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={editing}
        pending={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          const done = () => {
            setCreating(false);
            setEditing(null);
          };
          if (editing) {
            updateMutation.mutate({ id: editing.id, payload: values }, { onSuccess: done });
          } else {
            createMutation.mutate(
              { projectWorkingId: engagement.id, ...values },
              { onSuccess: done },
            );
          }
        }}
      />

      <RejectDialog
        order={rejecting}
        onOpenChange={(next) => {
          if (!next) setRejecting(null);
        }}
        pending={rejectMutation.isPending}
        onSubmit={(reason) => {
          if (!rejecting) return;
          rejectMutation.mutate(
            { id: rejecting.id, rejectReason: reason },
            { onSuccess: () => setRejecting(null) },
          );
        }}
      />

      <ConfirmDialog
        open={withdrawing !== null}
        onOpenChange={(next) => {
          if (!next) setWithdrawing(null);
        }}
        title={t("withdraw.title")}
        description={t("withdraw.description")}
        confirmLabel={t("withdraw.confirm")}
        cancelLabel={t("dialog.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (withdrawing) withdrawMutation.mutate(withdrawing.id);
          setWithdrawing(null);
        }}
      />
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

function ChangeOrderDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ChangeOrder | null;
  pending: boolean;
  onSubmit: (values: {
    kind: ChangeOrderKind;
    title: string;
    reason: string;
    amount: number;
  }) => void;
}) {
  const t = useTranslations("ChangeOrders");

  const [kind, setKind] = React.useState<string>("scope_change");
  const [title, setTitle] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [amount, setAmount] = React.useState("");

  useResetOnChange(open ? (initial?.id ?? "new") : null, () => {
    setKind(initial?.kind ?? "scope_change");
    setTitle(initial?.title ?? "");
    setReason(initial?.reason ?? "");
    setAmount(initial ? String(initial.amount) : "");
  });

  const parsedAmount = Number(amount);
  const valid =
    title.trim().length > 0 &&
    reason.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? t("dialog.editTitle") : t("dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("dialog.kind")}</label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANGE_ORDER_KINDS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`kind.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("dialog.titleLabel")}</label>
            <Input
              value={title}
              placeholder={t("dialog.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("dialog.amount")}</label>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">{t("dialog.amountHint")}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("dialog.reason")}</label>
            <Textarea
              rows={4}
              value={reason}
              placeholder={t("dialog.reasonPlaceholder")}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">{t("dialog.reasonHint")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button
            disabled={pending || !valid}
            onClick={() =>
              onSubmit({
                kind: kind as ChangeOrderKind,
                title: title.trim(),
                reason: reason.trim(),
                amount: parsedAmount,
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("dialog.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  order,
  onOpenChange,
  pending,
  onSubmit,
}: {
  order: ChangeOrder | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (reason: string) => void;
}) {
  const t = useTranslations("ChangeOrders");
  const [reason, setReason] = React.useState("");

  useResetOnChange(order?.id ?? null, () => setReason(""));

  return (
    <Dialog open={order !== null} onOpenChange={onOpenChange}>
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
