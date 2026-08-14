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
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import type { Contract } from "@/features/projects/contract-types";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

// ---------------------------------------------------------------------------
// Constants

const TERMS_MIN_LENGTH = 20;

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

  const {
    contracts,
    latestContract,
    confirmedContract,
    isLoading: isLoadingContracts,
    isFetching,
    isError: isContractsError,
    error: contractsError,
    refetch,
  } = useContracts({
    projectWorkingId: projectWorkingId ?? 0,
    enabled: Boolean(projectWorkingId),
  });

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [selectedContract, setSelectedContract] = React.useState<Contract | null>(null);

  const handleCreateNew = () => {
    setCreateDialogOpen(true);
  };

  const handleSendOtp = (contract: Contract) => {
    setSelectedContract(contract);
    setOtpDialogOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    // TODO: Open edit dialog
    console.log("Edit contract:", contract.id);
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
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {account?.role === "provider" && (
          <Button onClick={handleCreateNew}>
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
            actionLabel={t("createFirst")}
            onAction={handleCreateNew}
          />
      ) : (
        <div className="flex flex-col gap-4">
          {contracts
            .sort((a, b) => b.id - a.id)
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

  // Sending the OTP is being moved to the owner side (backend role change
  // in progress) — the provider's trigger is removed here, not deleted,
  // so it's easy to bring back if that plan changes. Until the owner-side
  // trigger exists, a drafted contract has no way to reach 'pending_otp'.
  // const canSendOtp = accountRole === "provider" && contract.status === "drafted";
  const canEdit = accountRole === "provider" && contract.status === "drafted";
  const canCancel = accountRole === "provider" && (contract.status === "drafted" || contract.status === "pending_otp");
  const canConfirm = accountRole === "owner" && contract.status === "pending_otp";

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{contract.title}</CardTitle>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color} ${status.bgColor}`}
            >
              <StatusIcon className="size-3" aria-hidden />
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/*
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
            */}
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
  projectWorkingId: number;
  onSuccess: () => void;
}

function CreateContractDialog({
  open,
  onOpenChange,
  projectWorkingId,
  onSuccess,
}: CreateContractDialogProps) {
  const t = useTranslations("Contracts.dialog");

  const [title, setTitle] = React.useState("");
  const [terms, setTerms] = React.useState("");
  const [agreedValue, setAgreedValue] = React.useState("");
  const [documentUrl, setDocumentUrl] = React.useState("");
  const [documentFile, setDocumentFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Reset form when dialog opens
  useResetOnChange(open, () => {
    if (open) {
      setTitle("");
      setTerms("");
      setAgreedValue("");
      setDocumentUrl("");
      setDocumentFile(null);
    }
  });

  const createMutation = useCreateContractMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: onSuccess,
  });

  const isPending = createMutation.isPending;

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = Number.parseFloat(agreedValue);
    if (!title.trim() || !Number.isFinite(value) || value <= 0) {
      return;
    }

    createMutation.mutate({
      projectWorkingId,
      title: title.trim(),
      terms: terms.trim() || undefined,
      agreedValue: value,
      documentUrl: documentUrl || undefined,
    });
  };

  const isValid =
    title.trim().length > 0 &&
    Number.isFinite(Number.parseFloat(agreedValue)) &&
    Number.parseFloat(agreedValue) > 0;

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

          {/* Agreed Value */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contract-value"
              className="text-sm font-medium text-foreground"
            >
              {t("valueLabel")} <span className="text-destructive">*</span>
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
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">VND</span>
            </div>
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
                <Input
                  id="contract-document"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="cursor-pointer file:cursor-pointer"
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
  const isProvider = account?.role === "provider";
  const isOwner = account?.role === "owner";

  const handleSendOtp = () => {
    if (!contract) return;
    sendOtpMutation.mutate(contract.id);
  };

  const handleConfirmOtp = () => {
    if (!contract || !account) return;
    confirmOtpMutation.mutate({
      contractId: contract.id,
      payload: {
        otpCode: otpCode.trim(),
        confirmedBy: account.id,
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
