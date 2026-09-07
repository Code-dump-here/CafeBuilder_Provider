"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Plus,
  Send,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/ui/file-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

import { useCurrentUser } from "@/features/auth/user-context";
import { uploadFileApi } from "@/lib/http/file-upload-api";
import { useContracts, useCreateContractMutation, useUpdateContractMutation, useSendContractOtpMutation, useConfirmContractOtpMutation, useCancelContractMutation } from "@/features/projects/use-contracts";
import { useEngagements } from "@/features/projects/use-engagements";
import { useQuotations } from "@/features/projects/use-quotations";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import type { Contract } from "@/features/projects/contract-types";
import type { Quotation } from "@/features/projects/quotation-types";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

// ---------------------------------------------------------------------------
// Constants

const TERMS_MIN_LENGTH = 20;

/**
 * Format a `DateOnly` (`yyyy-MM-dd`) string for display. The server
 * returns execution dates as plain dates (no time / timezone), so we
 * parse them as local dates to avoid a UTC-shift off-by-one day in
 * display. Anything that doesn't match the expected shape falls back
 * to the raw string so the user still sees something.
 */
function formatExecutionDate(value: string): string {
  // Strict yyyy-MM-dd — anything else goes back to the raw value so a
  // misformatted legacy row still renders instead of "Invalid Date".
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  const [, y, mo, d] = m;
  // Construct as a local date — `new Date(y, mo-1, d)` is timezone-safe.
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("vi-VN");
}

/**
 * Resolve the URL we should hand to `<a href>` when opening a contract
 * document. The backend exposes a fully-qualified, public `documentViewUrl`
 * (typically a signed/Cloud Storage link); `documentUrl` is just the
 * storage-relative key. We always prefer the view URL and fall back to
 * the relative path only as a safety net for older rows.
 */
function resolveDocumentHref(
  contract: Pick<Contract, "documentUrl" | "documentViewUrl">,
): string | null {
  return contract.documentViewUrl ?? contract.documentUrl ?? null;
}

// ---------------------------------------------------------------------------
// Page component

export default function ContractsPage() {
  const t = useTranslations("Contracts");
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";

  const { account } = useCurrentUser();
  const isProvider = account?.role === "provider";
  const isOwner = account?.role === "owner";

  // Fetch engagements for this project. Providers are scoped to their own
  // providerId so another provider's engagement on the same project (e.g.
  // the constructor when this viewer is the designer) can never drive
  // this page. Owners own the project itself rather than a specific
  // engagement, so they aren't scoped by providerId — every engagement on
  // the project comes back and the right one is picked in `myEngagement`
  // below.
  //
  // No `status` filter here (this used to hardcode `status: "accepted"`,
  // which meant a provider whose engagement had ended lost contract
  // access entirely — including their own confirmed contract history).
  // Status-based access is handled per-role below instead.
  const viewerProfileId = account?.serviceProvider?.id ?? null;
  const {
    engagements,
    isLoading: isLoadingEngagements,
    isError: isEngagementsError,
  } = useEngagements({
    projectId: projectIdParam,
    providerId: isProvider ? (viewerProfileId ?? undefined) : undefined,
    pageSize: 10,
    enabled: isProvider ? viewerProfileId != null : isOwner,
  });

  // Find the engagement whose contracts this viewer should see.
  const myEngagement = React.useMemo(() => {
    if (isProvider) {
      // A provider keeps contract access regardless of how the
      // engagement ended — it's still their own history, not the
      // owner's to revoke.
      return (
        engagements.find((e) => e.status === "accepted") ??
        engagements.find((e) => e.status === "completed") ??
        engagements.find((e) => e.status === "terminated") ??
        null
      );
    }
    if (isOwner) {
      // An owner loses contract access once the engagement is
      // terminated — the relationship (and the paperwork tied to it) is
      // over from their side. A completed engagement's contract stays
      // visible for their records.
      return (
        engagements.find((e) => e.status === "accepted") ??
        engagements.find((e) => e.status === "completed") ??
        null
      );
    }
    return null;
  }, [engagements, isProvider, isOwner]);

  const projectWorkingId = myEngagement?.id ?? null;
  // Spec §5.1 — accepted quotations on this engagement can be anchored
  // either to the engagement id (direct hire) or to the application
  // that became it (marketplace flow). The picker needs both so the
  // provider can attach the bid that actually won the engagement
  // rather than re-drafting terms by hand.
  const contractPickerApplyId = myEngagement?.applyId ?? null;

  const {
    contracts,
    latestContract,
    confirmedContract,
    activeContract,
    isLoading: isLoadingContracts,
    isFetching,
    isError: isContractsError,
    error: contractsError,
    refetch,
  } = useContracts({
    projectWorkingId: projectWorkingId ?? "",
    enabled: Boolean(projectWorkingId),
  });

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [selectedContract, setSelectedContract] = React.useState<Contract | null>(null);

  // One live contract per provider per project: a draft, one awaiting the
  // owner's OTP, and a signed one all hold the slot. The server refuses a
  // second one with a 409, so offering the button here would only produce a
  // rejection the provider can't act on without being told what to do.
  const canCreateContract = isProvider && !activeContract;

  const BLOCKED_KEY = {
    confirmed: "blocked.confirmed",
    pending_otp: "blocked.pendingOtp",
    drafted: "blocked.drafted",
    cancelled: "blocked.drafted", // unreachable: cancelled never occupies the slot
  } as const;

  const createBlockedReason =
    isProvider && activeContract
      ? t(BLOCKED_KEY[activeContract.status], { title: activeContract.title })
      : null;

  const handleCreateNew = () => {
    if (!canCreateContract) return;
    setCreateDialogOpen(true);
  };

  const handleSendOtp = (contract: Contract) => {
    setSelectedContract(contract);
    setOtpDialogOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setSelectedContract(contract);
    setEditDialogOpen(true);
  };

  const handleCancel = (contract: Contract) => {
    setSelectedContract(contract);
    setCancelDialogOpen(true);
  };

  // Loading state
  if (isLoadingEngagements || isLoadingContracts) {
    return <ContractsLoadingSkeleton />;
  }

  // No engagement found
  if (!projectWorkingId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-16 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <FileText className="size-5" aria-hidden />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-foreground">
              {t("noEngagement.title")}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("noEngagement.description")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isContractsError) {
    return (
      <ErrorState
        title={t("errors.title")}
        subtitle={t("errors.subtitle")}
        retryLabel={t("errors.retry")}
        message={contractsError?.message ?? "Failed to load contracts."}
        onRetry={() => { void refetch(); }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
          {createBlockedReason && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {createBlockedReason}
            </p>
          )}
        </div>
        {isProvider && (
          <Button
            onClick={handleCreateNew}
            disabled={!canCreateContract}
            title={createBlockedReason ?? undefined}
          >
            <Plus aria-hidden />
            {t("createNew")}
          </Button>
        )}
      </div>

      {/* Confirmed Contract Banner */}
      {confirmedContract && (
        <ConfirmedContractBanner contract={confirmedContract} />
      )}

      {/* Contract List */}
      {contracts.length === 0 ? (
        <EmptyState
            title={t("empty.title")}
            description={t("empty.description")}
            {...(canCreateContract
              ? { actionLabel: t("createFirst"), onAction: handleCreateNew }
              : {})}
          />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Newest first. Was "highest id first", which only ordered
              correctly while ids were sequential; uuids need the timestamp.
              Copied before sorting — `sort` mutates, and this array comes
              straight from the query cache. */}
          {[...contracts]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                accountRole={account?.role ?? "owner"}
                onSendOtp={handleSendOtp}
                onEdit={handleEdit}
                onCancel={handleCancel}
              />
            ))}
        </div>
      )}

      {/* Refreshing indicator */}
      {isFetching && !isLoadingContracts && (
        <p
          aria-live="polite"
          className="flex items-center justify-center gap-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          <Loader2 className="size-3 animate-spin" aria-hidden />
          {t("refreshing")}
        </p>
      )}

      {/* Create Contract Dialog */}
      <CreateContractDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectWorkingId={projectWorkingId}
        applyId={contractPickerApplyId}
        onSuccess={() => {
          setCreateDialogOpen(false);
          void refetch();
        }}
      />

      {/* OTP Dialog */}
      <OtpConfirmDialog
        open={otpDialogOpen}
        onOpenChange={setOtpDialogOpen}
        contract={selectedContract}
        onSuccess={() => {
          setOtpDialogOpen(false);
          setSelectedContract(null);
          void refetch();
        }}
      />

      {/* Cancel Contract Dialog */}
      <CancelContractDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        contract={selectedContract}
        onSuccess={() => {
          setCancelDialogOpen(false);
          setSelectedContract(null);
          void refetch();
        }}
      />

      {/* Edit Contract Dialog — mirrors `CreateContractDialog` but is
          pre-filled with the selected draft contract's current values
          and PUTs through `useUpdateContractMutation` instead of POSTing.
          Only the provider can open it (button visibility is gated in
          `ContractCard.canEdit`), and the dialog refuses to load a
          contract that's already past `drafted` (sent / confirmed /
          cancelled) since the backend will reject the update anyway. */}
      <EditContractDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        contract={selectedContract}
        onSuccess={() => {
          setEditDialogOpen(false);
          setSelectedContract(null);
          void refetch();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contract Card

interface ContractCardProps {
  contract: Contract;
  accountRole: string;
  onSendOtp: (contract: Contract) => void;
  onEdit: (contract: Contract) => void;
  onCancel: (contract: Contract) => void;
}

function ContractCard({
  contract,
  accountRole,
  onSendOtp,
  onEdit,
  onCancel,
}: ContractCardProps) {
  const t = useTranslations("Contracts");

  const createdAt = new Date(contract.createdAt);
  const formattedDate = createdAt.toLocaleDateString();
  const formattedTime = createdAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusConfig = {
    drafted: {
      label: t("status.drafted"),
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      icon: FileText,
    },
    pending_otp: {
      label: t("status.pendingOtp"),
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      icon: Clock,
    },
    confirmed: {
      label: t("status.confirmed"),
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      icon: CheckCircle2,
    },
    cancelled: {
      label: t("status.cancelled"),
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      icon: XCircle,
    },
  };

  const status = statusConfig[contract.status];
  const StatusIcon = status.icon;

  // Backend now requires the owner to trigger OTP send (the code always
  // emails the owner's own account regardless of who calls the endpoint,
  // so only the owner can meaningfully send it to themselves).
  const canSendOtp = accountRole === "owner" && contract.status === "drafted";
  const canEdit = accountRole === "provider" && contract.status === "drafted";
  const canCancel = accountRole === "provider" && (contract.status === "drafted" || contract.status === "pending_otp");
  const canConfirm = accountRole === "owner" && contract.status === "pending_otp";

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{contract.title}</CardTitle>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color} ${status.bgColor}`}
            >
              <StatusIcon className="size-3" aria-hidden />
              {status.label}
            </span>
            {/*
              Spec §5.1 — contracts anchored to an accepted quotation
              (quotationId != null) have their `agreedValue` locked and
              will generate `payment_batches` on confirmation. Surface
              the badge so the provider/owner can see "this came from a
              signed quotation, not a hand-drafted agreement" without
              having to inspect the raw row.
            */}
            {contract.quotationId != null ? (
              <span
                title={t("fromQuotationHint")}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
              >
                <FileText className="size-3" aria-hidden />
                {t("fromQuotation")}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {canSendOtp && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendOtp(contract)}
              >
                <Send className="size-3.5" aria-hidden />
                {t("sendOtp")}
              </Button>
            )}
            {canConfirm && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onSendOtp(contract)}
              >
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t("confirm")}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(contract)}
              >
                {t("edit")}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(contract)}
                className="text-destructive hover:text-destructive"
              >
                <X className="size-3.5" aria-hidden />
                {t("cancel")}
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          {t("createdAt", { date: formattedDate, time: formattedTime })}
          {" • "}
          {/* The backend treats the agreed value as optional ("tham khảo"),
              so say so explicitly rather than implying a figure of zero.
              This used to call `.toLocaleString()` straight on the value,
              which threw on any contract drafted without one. */}
          {contract.agreedValue !== null
            ? t("value", {
                value: contract.agreedValue.toLocaleString("vi-VN"),
              })
            : t("valueNotSet")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Spec §5.3 — execution window. Rendered as a compact meta strip
            so both provider and owner can see "from when → to when" at a
            glance without scrolling. We use the server-derived
            `executionDurationDays` when present (it's `end - start + 1`,
            inclusive of both dates). */}
        {(contract.executionStartAt || contract.executionEndAt) ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            <span>
              {contract.executionStartAt
                ? t("executionFrom", {
                    date: formatExecutionDate(contract.executionStartAt),
                  })
                : t("executionFromUnknown")}
            </span>
            <span aria-hidden>→</span>
            <span>
              {contract.executionEndAt
                ? t("executionTo", {
                    date: formatExecutionDate(contract.executionEndAt),
                  })
                : t("executionToUnknown")}
            </span>
            {contract.executionDurationDays != null ? (
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-foreground/80">
                {t("executionDuration", {
                  days: contract.executionDurationDays,
                })}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Party info — free text from the create/edit dialog. Two parties
            (owner ↔ provider) usually; collapsed to a small block so it
            doesn't dominate the card. */}
        {contract.partyInfo ? (
          <div className="flex flex-col gap-1.5">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t("partyInfoLabel")}
            </h4>
            <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {contract.partyInfo}
            </p>
          </div>
        ) : null}

        {/* Terms Preview */}
        {contract.terms && (
          <div className="flex flex-col gap-1.5">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t("termsLabel")}
            </h4>
            <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {contract.terms}
            </p>
          </div>
        )}

        {/* Document Link — prefer the public `documentViewUrl`; falls back
            to the relative `documentUrl` only for older rows that don't
            carry a view URL yet. */}
        {(() => {
          const href = resolveDocumentHref(contract);
          if (!href) return null;
          return (
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" aria-hidden />
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {t("viewDocument")}
              </a>
            </div>
          );
        })()}

        {/* OTP Expires Info */}
        {contract.otpExpiresAt && contract.status === "pending_otp" && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <Clock className="size-3.5" aria-hidden />
            {t("otpExpiresAt", {
              time: new Date(contract.otpExpiresAt).toLocaleString("vi-VN"),
            })}
          </div>
        )}

        {/* Confirmed Info */}
        {contract.confirmedAt && contract.status === "confirmed" && (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-3.5" aria-hidden />
            {t("confirmedAt", {
              time: new Date(contract.confirmedAt).toLocaleString("vi-VN"),
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Confirmed Contract Banner

interface ConfirmedContractBannerProps {
  contract: Contract;
}

function ConfirmedContractBanner({ contract }: ConfirmedContractBannerProps) {
  const t = useTranslations("Contracts");

  return (
    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
      <div className="grid size-10 place-items-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
        <CheckCircle2 className="size-5" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
          {t("confirmedBanner.title")}
        </p>
        <p className="text-xs text-green-700 dark:text-green-400/80">
          {t("confirmedBanner.description", { title: contract.title })}
        </p>
      </div>
      {(() => {
        const href = resolveDocumentHref(contract);
        if (!href) return null;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md bg-green-200 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-300 dark:bg-green-900 dark:text-green-300"
          >
            {t("viewDocument")}
          </a>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Contract Dialog

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectWorkingId: string;
  /**
   * Spec §5.1 — a quotation can be anchored to the engagement either
   * directly (`projectWorkingId`) or through the application that
   * became the engagement (`applyId`, marketplace flow). The contract
   * picker needs to surface both kinds of accepted quotations;
   * otherwise marketplace-flow engagements end up with an empty
   * picker and the provider has no way to attach the priced bid they
   * already won.
   */
  applyId?: string | null;
  onSuccess: () => void;
}

function CreateContractDialog({
  open,
  onOpenChange,
  projectWorkingId,
  applyId,
  onSuccess,
}: CreateContractDialogProps) {
  const t = useTranslations("Contracts.dialog");

  const [title, setTitle] = React.useState("");
  const [partyInfo, setPartyInfo] = React.useState("");
  const [terms, setTerms] = React.useState("");
  const [agreedValue, setAgreedValue] = React.useState("");
  const [executionStartAt, setExecutionStartAt] = React.useState("");
  const [executionEndAt, setExecutionEndAt] = React.useState("");
  const [quotationId, setQuotationId] = React.useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = React.useState("");
  const [documentFile, setDocumentFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Reset form when dialog opens
  useResetOnChange(open, () => {
    if (open) {
      setTitle("");
      setPartyInfo("");
      setTerms("");
      setAgreedValue("");
      setExecutionStartAt("");
      setExecutionEndAt("");
      setQuotationId(null);
      setDocumentUrl("");
      setDocumentFile(null);
    }
  });

  // Spec §5.1 — accepted quotations the provider can build a contract
  // from. We only list `status === "accepted"` because the server
  // rejects any other status with a 409. The backend filters by either
  // `projectWorkingId` OR `applyId`, so passing both covers the
  // direct-hire and marketplace flows uniformly; a row is anchored to
  // exactly one of those ids.
  const quotationsQuery = useQuotations({
    projectWorkingId: applyId ? null : projectWorkingId,
    applyId: applyId ?? null,
    status: "accepted",
    enabled: open,
  });
  const acceptedQuotations = quotationsQuery.quotations;

  // When the provider picks a quotation we lock `agreedValue` (server
  // ignores it anyway) and prefill it from `quotation.totalAmount` so
  // the displayed number still reflects reality. Dates stay editable:
  // only `executionEndAt` may be auto-derived server-side when omitted
  // (spec §5.3), so we don't try to second-guess the provider here.
  const selectedQuotation: Quotation | null = React.useMemo(() => {
    if (!quotationId) return null;
    return acceptedQuotations.find((q) => q.id === quotationId) ?? null;
  }, [acceptedQuotations, quotationId]);

  React.useEffect(() => {
    if (!selectedQuotation) return;
    setAgreedValue(String(selectedQuotation.totalAmount));
    // Only seed once per quotation choice — keep the user's later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuotation?.id]);

  const createMutation = useCreateContractMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: onSuccess,
  });

  const isPending = createMutation.isPending;

  const clearSelectedFile = () => {
    setDocumentFile(null);
    setDocumentUrl("");
  };

  const handleFileSelect = async (file: File) => {
    setDocumentFile(file);
    setIsUploading(true);
    try {
      const response = await uploadFileApi(file);
      setDocumentUrl(response.url);
    } catch {
      setDocumentFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Spec §5.3 — `executionEndAt < executionStartAt` is a 400. Block at
  // submit time so the user gets instant feedback instead of a server
  // round-trip.
  const startMs = executionStartAt ? Date.parse(executionStartAt) : NaN;
  const endMs = executionEndAt ? Date.parse(executionEndAt) : NaN;
  const datesValid =
    !executionStartAt ||
    !executionEndAt ||
    (Number.isFinite(startMs) &&
      Number.isFinite(endMs) &&
      endMs >= startMs);

  const parsedValue = Number.parseFloat(agreedValue);
  // When a quotation is picked, agreedValue is required to be a positive
  // number (server pulls it from the quotation regardless, but the
  // client-side check matches the shape).
  const agreedValueValid =
    quotationId != null
      ? Number.isFinite(parsedValue) && parsedValue > 0
      : Number.isFinite(parsedValue) && parsedValue > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!datesValid || !title.trim() || !agreedValueValid) return;

    createMutation.mutate({
      projectWorkingId,
      quotationId: quotationId ?? undefined,
      title: title.trim(),
      partyInfo: partyInfo.trim() || undefined,
      terms: terms.trim() || undefined,
      agreedValue: parsedValue,
      documentUrl: documentUrl || undefined,
      executionStartAt: executionStartAt || undefined,
      executionEndAt: executionEndAt || undefined,
    });
  };

  const isValid =
    title.trim().length > 0 && agreedValueValid && datesValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("titleCreate")}</DialogTitle>
          <DialogDescription>{t("descriptionCreate")}</DialogDescription>
        </DialogHeader>

        <form
          id="create-contract-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contract-title"
              className="text-sm font-medium text-foreground"
            >
              {t("titleLabel")} <span className="text-destructive">*</span>
            </label>
            <Input
              id="contract-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              required
            />
          </div>

          {/* Quotation picker (spec §4.3, §5.1). Anchoring a contract to
              an accepted quotation makes `agreedValue` server-derived
              and locks it from editing; it also causes the server to
              generate `payment_batches` from `quotation_payment_terms`
              on confirm. Empty list → "draft by hand" path. */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contract-quotation"
              className="text-sm font-medium text-foreground"
            >
              {t("quotationLabel")}
            </label>
            {acceptedQuotations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {quotationsQuery.isLoading
                  ? t("quotationsLoading")
                  : t("quotationsEmpty")}
              </p>
            ) : (
              <select
                id="contract-quotation"
                value={quotationId ?? ""}
                onChange={(e) =>
                  setQuotationId(e.target.value === "" ? null : e.target.value)
                }
                className="h-9 w-full rounded-md border border-input bg-input/20 px-2 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none dark:bg-input/30"
              >
                <option value="">{t("quotationNone")}</option>
                {acceptedQuotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {`${q.title} — ${q.totalAmount.toLocaleString("vi-VN")} VND`}
                  </option>
                ))}
              </select>
            )}
            {selectedQuotation ? (
              <p className="text-[11px] text-muted-foreground">
                {t("quotationHint", {
                  days:
                    selectedQuotation.estimatedDurationDays != null
                      ? String(selectedQuotation.estimatedDurationDays)
                      : "—",
                })}
              </p>
            ) : null}
          </div>

          {/* Agreed Value — read-only when a quotation is picked (the
              server pulls it from `quotation.totalAmount`). */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contract-value"
              className="text-sm font-medium text-foreground"
            >
              {t("valueLabel")}{" "}
              {quotationId == null ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-[10px] font-normal text-muted-foreground">
                  {t("valueLockedFromQuotation")}
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="contract-value"
                type="number"
                inputMode="decimal"
                min={0}
                step={1000}
                value={agreedValue}
                onChange={(e) => setAgreedValue(e.target.value)}
                placeholder={t("valuePlaceholder")}
                required
                disabled={quotationId != null}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">VND</span>
            </div>
          </div>

          {/* Execution dates (spec §4.3, §5.3). DateOnly on the server —
              `yyyy-MM-dd`. We use the native date input which serialises
              in exactly that format, so no conversion is needed at
              submit time. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="contract-execution-start"
                className="text-sm font-medium text-foreground"
              >
                {t("executionStartLabel")}
              </label>
              <Input
                id="contract-execution-start"
                type="date"
                value={executionStartAt}
                onChange={(e) => setExecutionStartAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="contract-execution-end"
                className="text-sm font-medium text-foreground"
              >
                {t("executionEndLabel")}
              </label>
              <Input
                id="contract-execution-end"
                type="date"
                value={executionEndAt}
                min={executionStartAt || undefined}
                onChange={(e) => setExecutionEndAt(e.target.value)}
              />
              {selectedQuotation?.estimatedDurationDays != null ? (
                <p className="text-[11px] text-muted-foreground">
                  {t("executionEndAutoDerive", {
                    days: selectedQuotation.estimatedDurationDays,
                  })}
                </p>
              ) : null}
            </div>
          </div>
          {!datesValid ? (
            <p
              role="alert"
              className="flex items-center gap-2 text-xs text-destructive"
            >
              <AlertCircle className="size-3" aria-hidden />
              {t("executionEndBeforeStart")}
            </p>
          ) : null}

          {/* Party info — free text describing both sides. */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contract-party-info"
              className="text-sm font-medium text-foreground"
            >
              {t("partyInfoLabel")}
            </label>
            <Textarea
              id="contract-party-info"
              value={partyInfo}
              onChange={(e) => setPartyInfo(e.target.value)}
              placeholder={t("partyInfoPlaceholder")}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Terms */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contract-terms"
              className="text-sm font-medium text-foreground"
            >
              {t("termsLabel")}
            </label>
            <Textarea
              id="contract-terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder={t("termsPlaceholder")}
              rows={4}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              {t("termsHint")}
            </p>
          </div>

          {/* Document Upload */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contract-document"
              className="text-sm font-medium text-foreground"
            >
              {t("documentLabel")}
            </label>
            {documentUrl ? (
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" aria-hidden />
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {t("viewCurrentDocument")}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDocumentUrl("");
                    setDocumentFile(null);
                  }}
                >
                  {t("removeFile")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <FilePicker
                  id="contract-document"
                  accept=".pdf,.doc,.docx"
                  file={documentFile}
                  onSelect={handleFileSelect}
                  onClear={clearSelectedFile}
                  disabled={isUploading}
                  hideClear={isUploading}
                  labels={{
                    choose: t("chooseFile"),
                    empty: t("noFileChosen"),
                    remove: t("removeFile"),
                  }}
                />
                {isUploading && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                    {t("uploading")}
                  </p>
                )}
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            form="create-contract-form"
            disabled={!isValid || isPending}
            aria-busy={isPending}
          >
            {isPending ? t("creating") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit Contract Dialog
//
// Pre-filled mirror of `CreateContractDialog`. The button to open it is
// only shown for `status === "drafted"` (provider side), and the dialog
// itself guards against opening for any other status — the backend
// rejects updates once the contract has been sent, confirmed, or
// cancelled, so loading the form for those cases only invites a 409 the
// user can't act on.
//
// What changes vs the create flow:
//   - Title / terms / agreedValue / documentUrl are seeded from the
//     selected contract instead of starting blank.
//   - Submit hits `PUT /api/contracts/{id}` via `useUpdateContractMutation`
//     instead of `POST /api/contracts`.
//   - Validation is the same (`title` required, `agreedValue` positive if
//     set) but we additionally require at least one field to have been
//     edited so we don't fire a no-op PUT when the user opens the dialog
//     and immediately hits Save without changing anything.

interface EditContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onSuccess: () => void;
}

function EditContractDialog({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: EditContractDialogProps) {
  const t = useTranslations("Contracts.dialog");

  const [title, setTitle] = React.useState("");
  const [partyInfo, setPartyInfo] = React.useState("");
  const [terms, setTerms] = React.useState("");
  const [agreedValue, setAgreedValue] = React.useState("");
  const [executionStartAt, setExecutionStartAt] = React.useState("");
  const [executionEndAt, setExecutionEndAt] = React.useState("");
  const [documentUrl, setDocumentUrl] = React.useState("");
  const [documentFile, setDocumentFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Seed the form from the loaded contract whenever it (re)loads.
  // `contract?.updatedAt` keys the reset so an optimistic update from
  // the parent (or a cache refresh) re-seeds the inputs rather than
  // leaving them stale on the previous values.
  useResetOnChange(contract?.updatedAt ?? null, () => {
    if (!contract) return;
    setTitle(contract.title);
    setPartyInfo(contract.partyInfo ?? "");
    setTerms(contract.terms ?? "");
    setAgreedValue(
      contract.agreedValue != null ? String(contract.agreedValue) : "",
    );
    setExecutionStartAt(contract.executionStartAt ?? "");
    setExecutionEndAt(contract.executionEndAt ?? "");
    setDocumentUrl(contract.documentUrl ?? "");
    setDocumentFile(null);
  });

  const updateMutation = useUpdateContractMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: onSuccess,
  });

  const isPending = updateMutation.isPending;

  // Only drafts are editable. The card-level `canEdit` gate already
  // hides the button, but we belt-and-brace it here too in case the
  // dialog is opened programmatically.
  const editable = contract?.status === "drafted";

  // Spec §5.1 — quotation-anchored contracts cannot change
  // `agreedValue` (server 409). Lock the field at the form layer so
  // the user doesn't think they can edit and burn a request.
  const valueLocked = contract?.quotationId != null;

  const clearSelectedFile = () => {
    setDocumentFile(null);
    // Clearing the staged upload also clears the seeded URL — the
    // backend treats `documentUrl: ""` as "no change" only when not
    // explicitly set, so we instead remember the seed URL and reset to
    // it via a ref-style pattern below. The simplest correct behavior is
    // "clearing a newly picked file goes back to the seed URL", which is
    // what `handleFileSelect` already does on first pick. For an explicit
    // remove we just unset both.
    setDocumentUrl("");
  };

  const handleFileSelect = async (file: File) => {
    setDocumentFile(file);
    setIsUploading(true);
    try {
      const response = await uploadFileApi(file);
      setDocumentUrl(response.url);
    } catch {
      setDocumentFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Track which fields actually changed so we don't fire a no-op PUT.
  // The backend's `UpdateContractPayload` is all-optional, so an empty
  // payload would technically be a valid request — but it's pointless
  // traffic and the resulting `notifySuccess` would mislead the user
  // into thinking they saved something.
  const initialTitle = contract?.title ?? "";
  const initialPartyInfo = contract?.partyInfo ?? "";
  const initialTerms = contract?.terms ?? "";
  const initialAgreedValue =
    contract?.agreedValue != null ? String(contract.agreedValue) : "";
  const initialExecutionStartAt = contract?.executionStartAt ?? "";
  const initialExecutionEndAt = contract?.executionEndAt ?? "";
  const initialDocumentUrl = contract?.documentUrl ?? "";
  const hasChanges =
    title.trim() !== initialTitle ||
    partyInfo.trim() !== initialPartyInfo ||
    terms.trim() !== initialTerms ||
    (!valueLocked && agreedValue.trim() !== initialAgreedValue) ||
    executionStartAt !== initialExecutionStartAt ||
    executionEndAt !== initialExecutionEndAt ||
    (documentUrl || "") !== (initialDocumentUrl || "");

  // Spec §5.3 — executionEndAt < executionStartAt is a 400.
  const startMs = executionStartAt ? Date.parse(executionStartAt) : NaN;
  const endMs = executionEndAt ? Date.parse(executionEndAt) : NaN;
  const datesValid =
    !executionStartAt ||
    !executionEndAt ||
    (Number.isFinite(startMs) &&
      Number.isFinite(endMs) &&
      endMs >= startMs);

  const parsedValue = Number.parseFloat(agreedValue);
  const isValid =
    editable &&
    title.trim().length > 0 &&
    datesValid &&
    (valueLocked ||
      agreedValue.trim() === "" ||
      (Number.isFinite(parsedValue) && parsedValue > 0));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract || !editable || !hasChanges || !datesValid) return;

    const payload: {
      title?: string;
      partyInfo?: string;
      terms?: string;
      agreedValue?: number;
      executionStartAt?: string;
      executionEndAt?: string;
      documentUrl?: string;
    } = {};

    if (title.trim() !== initialTitle) payload.title = title.trim();
    if (partyInfo.trim() !== initialPartyInfo) {
      payload.partyInfo = partyInfo.trim();
    }
    if (terms.trim() !== initialTerms) {
      payload.terms = terms.trim();
    }
    if (!valueLocked && agreedValue.trim() !== initialAgreedValue) {
      // Empty string after a prior number means "clear the value".
      // The backend field is nullable so we send undefined in that case
      // (the server omits it from the SQL update).
      payload.agreedValue =
        agreedValue.trim() === ""
          ? undefined
          : Number.isFinite(parsedValue)
            ? parsedValue
            : undefined;
    }
    if (executionStartAt !== initialExecutionStartAt) {
      payload.executionStartAt = executionStartAt || undefined;
    }
    if (executionEndAt !== initialExecutionEndAt) {
      payload.executionEndAt = executionEndAt || undefined;
    }
    if ((documentUrl || "") !== (initialDocumentUrl || "")) {
      payload.documentUrl = documentUrl || undefined;
    }

    updateMutation.mutate({ contractId: contract.id, payload });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("titleEdit")}</DialogTitle>
          <DialogDescription>{t("descriptionEdit")}</DialogDescription>
        </DialogHeader>

        {!editable ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{t("editNotEditableHint")}</span>
          </div>
        ) : null}
        {valueLocked && editable ? (
          <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
            <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{t("editValueLockedHint")}</span>
          </div>
        ) : null}

        <form
          id="edit-contract-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-contract-title"
              className="text-sm font-medium text-foreground"
            >
              {t("titleLabel")} <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-contract-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              required
              disabled={!editable}
            />
          </div>

          {/* Agreed Value — read-only when anchored to a quotation. */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-contract-value"
              className="text-sm font-medium text-foreground"
            >
              {t("valueLabel")}{" "}
              {valueLocked ? (
                <span className="text-[10px] font-normal text-muted-foreground">
                  {t("valueLockedFromQuotation")}
                </span>
              ) : null}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-contract-value"
                type="number"
                inputMode="decimal"
                min={0}
                step={1000}
                value={agreedValue}
                onChange={(e) => setAgreedValue(e.target.value)}
                placeholder={t("valuePlaceholder")}
                className="flex-1"
                disabled={!editable || valueLocked}
              />
              <span className="text-sm text-muted-foreground">VND</span>
            </div>
          </div>

          {/* Execution dates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-contract-execution-start"
                className="text-sm font-medium text-foreground"
              >
                {t("executionStartLabel")}
              </label>
              <Input
                id="edit-contract-execution-start"
                type="date"
                value={executionStartAt}
                onChange={(e) => setExecutionStartAt(e.target.value)}
                disabled={!editable}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-contract-execution-end"
                className="text-sm font-medium text-foreground"
              >
                {t("executionEndLabel")}
              </label>
              <Input
                id="edit-contract-execution-end"
                type="date"
                value={executionEndAt}
                min={executionStartAt || undefined}
                onChange={(e) => setExecutionEndAt(e.target.value)}
                disabled={!editable}
              />
            </div>
          </div>
          {!datesValid ? (
            <p
              role="alert"
              className="flex items-center gap-2 text-xs text-destructive"
            >
              <AlertCircle className="size-3" aria-hidden />
              {t("executionEndBeforeStart")}
            </p>
          ) : null}

          {/* Party info */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-contract-party-info"
              className="text-sm font-medium text-foreground"
            >
              {t("partyInfoLabel")}
            </label>
            <Textarea
              id="edit-contract-party-info"
              value={partyInfo}
              onChange={(e) => setPartyInfo(e.target.value)}
              placeholder={t("partyInfoPlaceholder")}
              rows={3}
              className="resize-none"
              disabled={!editable}
            />
          </div>

          {/* Terms */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-contract-terms"
              className="text-sm font-medium text-foreground"
            >
              {t("termsLabel")}
            </label>
            <Textarea
              id="edit-contract-terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder={t("termsPlaceholder")}
              rows={4}
              className="resize-none"
              disabled={!editable}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("termsHint")}
            </p>
          </div>

          {/* Document Upload */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-contract-document"
              className="text-sm font-medium text-foreground"
            >
              {t("documentLabel")}
            </label>
            {documentUrl ? (
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" aria-hidden />
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {t("viewCurrentDocument")}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDocumentUrl("");
                    setDocumentFile(null);
                  }}
                  disabled={!editable}
                >
                  {t("removeFile")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <FilePicker
                  id="edit-contract-document"
                  accept=".pdf,.doc,.docx"
                  file={documentFile}
                  onSelect={handleFileSelect}
                  onClear={clearSelectedFile}
                  disabled={isUploading || !editable}
                  hideClear={isUploading}
                  labels={{
                    choose: t("chooseFile"),
                    empty: t("noFileChosen"),
                    remove: t("removeFile"),
                  }}
                />
                {isUploading && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                    {t("uploading")}
                  </p>
                )}
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            form="edit-contract-form"
            disabled={!isValid || !hasChanges || isPending}
            aria-busy={isPending}
          >
            {isPending ? t("updating") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// OTP Confirm Dialog

interface OtpConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onSuccess: () => void;
}

function OtpConfirmDialog({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: OtpConfirmDialogProps) {
  const t = useTranslations("Contracts.dialog");
  const { account } = useCurrentUser();

  const [otpCode, setOtpCode] = React.useState("");
  const [step, setStep] = React.useState<"send" | "confirm">("send");

  // Reset when dialog opens
  useResetOnChange(open && contract ? `${contract.id}:${contract.status}` : null, () => {
    if (open && contract) {
      setOtpCode("");
      setStep(contract.status === "drafted" ? "send" : "confirm");
    }
  });

  const sendOtpMutation = useSendContractOtpMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: (updatedContract) => {
      if (updatedContract.status === "pending_otp") {
        setStep("confirm");
      }
    },
  });

  const confirmOtpMutation = useConfirmContractOtpMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: onSuccess,
  });

  const isPending = sendOtpMutation.isPending || confirmOtpMutation.isPending;
  // Spec §4.5/§4.6 — only the owner can send or confirm OTP (admin
  // can't act on owner's behalf). We use `account` purely as a guard
  // so an opening context that lost the session can't fire either
  // request.
  const handleSendOtp = () => {
    if (!contract || !account) return;
    sendOtpMutation.mutate(contract.id);
  };

  const handleConfirmOtp = () => {
    if (!contract || !account) return;
    // Spec §4.6 — `confirmedBy` is derived server-side from the JWT.
    // Earlier FE versions sent it from the body; the backend ignored
    // it (server-derived) but spec mandates we don't ship it anymore.
    confirmOtpMutation.mutate({
      contractId: contract.id,
      payload: {
        otpCode: otpCode.trim(),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "send" ? t("otpTitleSend") : t("otpTitleConfirm")}
          </DialogTitle>
          <DialogDescription>
            {step === "send"
              ? t("otpDescriptionSend")
              : t("otpDescriptionConfirm")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {step === "send" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t("otpSendHint")}
              </p>
              <Button
                onClick={handleSendOtp}
                disabled={isPending}
                aria-busy={isPending}
              >
                <Send className="size-4" aria-hidden />
                {isPending ? t("sending") : t("sendOtpButton")}
              </Button>
            </div>
          )}

          {step === "confirm" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="otp-code"
                  className="text-sm font-medium text-foreground"
                >
                  {t("otpCodeLabel")}
                </label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder={t("otpCodePlaceholder")}
                  className="text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("otpCodeHint")}
                </p>
              </div>
              <Button
                onClick={handleConfirmOtp}
                disabled={otpCode.length < 6 || isPending}
                aria-busy={isPending}
              >
                {isPending ? t("confirming") : t("confirmOtpButton")}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Cancel Contract Dialog
//
// Confirmation dialog for cancelling a contract. The actual API call goes
// through `useCancelContractMutation` (which posts to
// `POST /api/contracts/{id}/cancel`) — only allowed while the contract
// is in `drafted` or `pending_otp`. Once cancelled the contract cannot
// be confirmed by the owner; a new draft must be created to retry.
//
// Why a confirmation step:
//   - Cancellation is terminal and irreversible from the UI.
//   - The provider can lose work in progress (terms, document).
//   - We surface the side effect ("owner can no longer confirm") before
//     firing the mutation so the user has one chance to back out.
//
// Visual treatment:
//   - Red `AlertTriangle` icon + a `text-destructive` confirm button so
//     the destructive action is visually distinct from the create/otp
//     flows above.

interface CancelContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onSuccess: () => void;
}

function CancelContractDialog({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: CancelContractDialogProps) {
  const t = useTranslations("Contracts.dialog");

  // We don't need local state to track the OTP step here — cancel is a
  // single-shot confirm. We still wire the mutation per-page so the
  // success side-effect (close dialog + refetch list) stays in the page
  // that knows about `refetch`.

  const cancelMutation = useCancelContractMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: () => {
      onSuccess();
    },
  });

  const isPending = cancelMutation.isPending;

  const handleConfirm = () => {
    if (!contract) return;
    cancelMutation.mutate(contract.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>{t("cancelTitle")}</DialogTitle>
              <DialogDescription>
                {t("cancelDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {contract ? (
          <div className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {contract.title}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                #{contract.id}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("cancelWarning")}
            </p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !contract}
            aria-busy={isPending}
          >
            {isPending ? t("cancelling") : t("cancelConfirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton

function ContractsLoadingSkeleton() {
  const t = useTranslations("Contracts");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state

// ---------------------------------------------------------------------------
// Error state
