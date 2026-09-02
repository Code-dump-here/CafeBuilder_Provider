"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  FileSpreadsheet,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

import { useCurrentUser } from "@/features/auth/user-context";
import { useEngagements } from "@/features/projects/use-engagements";
import { useProviderApplies } from "@/features/projects/use-project-applications";
import {
  useAddQuotationAttachmentMutation,
  useCreateQuotationMutation,
  useDeleteQuotationMutation,
  useQuotations,
  useRemoveQuotationAttachmentMutation,
  useSendQuotationMutation,
  useUpdateQuotationMutation,
} from "@/features/projects/use-quotations";
import type { Quotation, QuotationStatus } from "@/features/projects/quotation-types";
import { uploadFileApi } from "@/lib/http/file-upload-api";
import { formatVndParts } from "@/lib/format-currency";
import { notifyError } from "@/lib/notify";
import {
  QuotationEditorDialog,
  type QuotationFormValues,
} from "@/components/quotation/quotation-editor-dialog";

/**
 * The provider's side of the quotation flow.
 *
 * Anchoring mirrors the survey page, and for the same reason: the quotation
 * that decides whether this provider is chosen is written **while the
 * application is still pending**, before any engagement exists. A page that
 * only worked off an engagement would only ever open after the decision it was
 * meant to inform had already been made.
 */

const STATUS_VARIANT: Record<
  QuotationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  sent: "default",
  revision_requested: "default",
  accepted: "secondary",
  rejected: "destructive",
  superseded: "outline",
};

export default function ProviderQuotationsPage() {
  const t = useTranslations("Quotations");
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
    () => engagements.find((e) => e.status === "accepted") ?? null,
    [engagements],
  );
  // Bidding-time anchor, for a provider who has applied but not yet won.
  const { getApplyForProject, isLoading: loadingApplies } = useProviderApplies({
    projectShopOwnerId: projectId,
    enabled: viewerProfileId != null,
  });
  const pendingApply = engagement ? undefined : getApplyForProject(projectId);

  // A quotation never changes anchor. `ck_quotations_anchor` lets it hold only
  // one of `applyId` / `projectWorkingId`, and approving a bid does not move
  // it, so the bid that won an engagement stays filed under the application it
  // came in on. Reading by `projectWorkingId` alone therefore finds nothing for
  // the provider who just won — and the empty state invited them to write a
  // second quotation for work already priced and under contract.
  //
  // `engagement.applyId` is that original application when the engagement grew
  // out of a bid, and null when the owner hired directly. So it names the real
  // anchor in both cases, which guessing from the application list could not:
  // a provider can hold an old rejected bid on the same project.
  const applyId = engagement
    ? engagement.applyId
    : pendingApply?.status === "pending"
      ? pendingApply.id
      : null;
  const projectWorkingId = applyId ? null : (engagement?.id ?? null);

  const { quotations, isLoading, isError, error, refetch } = useQuotations({
    projectWorkingId,
    applyId,
    enabled: Boolean(projectWorkingId || applyId),
  });

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Quotation | null>(null);
  /**
   * Prefill for a *new* quotation copied off an earlier one, used when the
   * owner asked for another version. Distinct from `editing`, which is what
   * switches the submit path from create to update.
   */
  const [seed, setSeed] = React.useState<Quotation | null>(null);
  const [deleting, setDeleting] = React.useState<Quotation | null>(null);
  const [sending, setSending] = React.useState<Quotation | null>(null);
  const [uploadingFor, setUploadingFor] = React.useState<string | null>(null);

  const createMutation = useCreateQuotationMutation();
  const updateMutation = useUpdateQuotationMutation();
  const sendMutation = useSendQuotationMutation();
  const deleteMutation = useDeleteQuotationMutation();
  const attachMutation = useAddQuotationAttachmentMutation();
  const detachMutation = useRemoveQuotationAttachmentMutation();

  const money = (amount: number) => formatVndParts(amount, locale).full;

  const handleSubmit = (values: QuotationFormValues) => {
    const done = () => {
      setEditorOpen(false);
      setEditing(null);
      setSeed(null);
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: values }, { onSuccess: done });
      return;
    }

    createMutation.mutate(
      {
        ...values,
        // Exactly one anchor; sending both is a 400 server-side.
        ...(projectWorkingId ? { projectWorkingId } : { applyId: applyId! }),
      },
      { onSuccess: done },
    );
  };

  const handleAttach = async (quotationId: string, file: File) => {
    setUploadingFor(quotationId);
    try {
      const uploaded = await uploadFileApi(file);
      attachMutation.mutate({
        id: quotationId,
        payload: { fileUrl: uploaded.objectName, fileName: file.name },
      });
    } catch {
      // The upload itself failed, so no attachment mutation ran and its error
      // toast never fires — this branch is the only place that can say so.
      notifyError(t("attachments.uploadFailed"));
    } finally {
      setUploadingFor(null);
    }
  };

  if (loadingEngagements || loadingApplies) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!projectWorkingId && !applyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FileSpreadsheet}
          title={t("noAnchor.title")}
          description={t("noAnchor.description")}
        />
      </div>
    );
  }

  // Only one live quotation per job is useful: a new draft alongside a bid the
  // owner is already reading is two prices for one job.
  //
  // `accepted` counts as live and is in fact final — the server refuses any
  // further version once a bid is approved, and the contract is built from it.
  // `revision_requested` is deliberately absent: that status exists precisely
  // to ask for a new version, so the button has to stay available there.
  const hasOpenQuotation = quotations.some(
    (q) => q.status === "draft" || q.status === "sent" || q.status === "accepted",
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {/* Keyed on the engagement, not on which anchor the read used: a
                provider who won from a bid still reads by `applyId`, but they
                are no longer bidding. */}
            {engagement ? t("subtitleEngaged") : t("subtitleBidding")}
          </p>
        </div>
        <Button
          disabled={hasOpenQuotation}
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus aria-hidden />
          {t("create")}
        </Button>
      </header>

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
      ) : quotations.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={t("empty.title")}
          description={t("empty.description")}
          actionLabel={t("create")}
          onAction={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {quotations.map((quotation) => {
            // `isLocked` only covers the approved one. A quotation the owner
            // rejected — or that lost to another bid (`superseded`) — is just
            // as finished, and attaching a file to it would be writing to a
            // dead document.
            const editable = quotation.status === "draft";

            return (
            <Card key={quotation.id}>
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANT[quotation.status]}>
                        {t(`status.${quotation.status}`)}
                      </Badge>
                      <Badge variant="outline">v{quotation.version}</Badge>
                      {quotation.isLocked ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="size-3" aria-hidden />
                          {t("locked")}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-base font-semibold">{quotation.title}</p>
                    {quotation.estimatedDurationDays != null ? (
                      <p className="text-xs text-muted-foreground">
                        {t("durationDays", { days: quotation.estimatedDurationDays })}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xl font-semibold tabular-nums">
                    {money(quotation.totalAmount)}
                  </p>
                </div>

                {/* The owner's answer, verbatim. A revision request without its
                    reason on screen is an instruction with no content. */}
                {quotation.status === "revision_requested" && quotation.revisionReason ? (
                  <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                    {t("revisionReason", { reason: quotation.revisionReason })}
                  </p>
                ) : null}
                {quotation.status === "rejected" && quotation.rejectReason ? (
                  <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    {t("rejectReason", { reason: quotation.rejectReason })}
                  </p>
                ) : null}

                <QuotationBreakdown quotation={quotation} />

                <div className="flex flex-wrap items-center gap-2">
                  {quotation.attachments.map((attachment) => (
                    <span
                      key={attachment.id}
                      className="flex items-center gap-1 rounded-full border border-border/70 py-1 pl-2.5 pr-1 text-xs"
                    >
                      <a
                        href={attachment.fileViewUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="max-w-40 truncate hover:underline"
                      >
                        {attachment.fileName ?? t("attachments.unnamed")}
                      </a>
                      {editable ? (
                        <button
                          type="button"
                          aria-label={t("attachments.remove")}
                          className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            detachMutation.mutate({
                              id: quotation.id,
                              attachmentId: attachment.id,
                            })
                          }
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      ) : null}
                    </span>
                  ))}

                  {editable ? (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                      {uploadingFor === quotation.id ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                      ) : (
                        <Paperclip className="size-3" aria-hidden />
                      )}
                      {t("attachments.add")}
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingFor !== null}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          // Reset first: picking the same file twice in a row
                          // fires no change event otherwise, so a retry after
                          // a failed upload would look like a dead control.
                          e.target.value = "";
                          if (file) void handleAttach(quotation.id, file);
                        }}
                      />
                    </label>
                  ) : null}
                </div>

                {/* Only a draft is still editable. A quotation the owner has
                    seen is history: the server refuses both an edit and a
                    re-send once it leaves `draft`, and asks for a new version
                    instead — so offering those buttons here would only produce
                    a 409. */}
                {quotation.status === "draft" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => setSending(quotation)}
                      disabled={sendMutation.isPending || quotation.items.length === 0}
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="animate-spin" aria-hidden />
                      ) : (
                        <Send aria-hidden />
                      )}
                      {t("actions.send")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(quotation);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil aria-hidden />
                      {t("actions.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(quotation)}
                    >
                      <Trash2 aria-hidden />
                      {t("actions.delete")}
                    </Button>
                  </div>
                ) : quotation.status === "revision_requested" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      // Seeded from the version the owner is reacting to, so
                      // the provider edits a copy rather than retyping the
                      // whole bill of quantities. `initial` only fills the
                      // form; the submit path still creates a new quotation
                      // because `editing` stays null.
                      setEditing(null);
                      setSeed(quotation);
                      setEditorOpen(true);
                    }}
                  >
                    <Plus aria-hidden />
                    {t("actions.newVersion")}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <QuotationEditorDialog
        open={editorOpen}
        onOpenChange={(next) => {
          setEditorOpen(next);
          if (!next) {
            setEditing(null);
            setSeed(null);
          }
        }}
        initial={editing ?? seed}
        isNewVersion={editing === null && seed !== null}
        pending={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={sending !== null}
        onOpenChange={(next) => {
          if (!next) setSending(null);
        }}
        title={t("send.title")}
        description={t("send.description")}
        confirmLabel={t("send.confirm")}
        cancelLabel={t("dialog.cancel")}
        onConfirm={() => {
          if (sending) sendMutation.mutate(sending.id);
          setSending(null);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title={t("delete.title")}
        description={t("delete.description")}
        confirmLabel={t("delete.confirm")}
        cancelLabel={t("dialog.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

/**
 * Line items and instalments, read-only.
 *
 * Shared by both roles' views of a quotation — the owner comparing bids needs
 * exactly the same breakdown the provider wrote, or the comparison is between
 * two different documents.
 */
export function QuotationBreakdown({ quotation }: { quotation: Quotation }) {
  const t = useTranslations("Quotations");
  const locale = useLocale();
  const money = (amount: number) => formatVndParts(amount, locale).full;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("breakdown.items")}
        </p>
        <ul className="flex flex-col gap-1">
          {quotation.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {item.name}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {item.quantity}
                  {item.unit ? ` ${item.unit}` : ""} × {money(item.unitPrice)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{money(item.amount)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("breakdown.terms")}
        </p>
        {quotation.paymentTerms.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("breakdown.noTerms")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {quotation.paymentTerms.map((term) => (
              <li
                key={term.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  {term.name}
                  {term.condition ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {term.condition}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums">
                  {term.percentage != null ? `${term.percentage}% · ` : ""}
                  {money(term.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
