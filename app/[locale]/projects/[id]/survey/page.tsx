"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Loader2, Plus, Upload } from "lucide-react";

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
import { useSurveys, useCreateSurveyMutation, useUpdateSurveyMutation } from "@/features/projects/use-surveys";
import { useEngagements } from "@/features/projects/use-engagements";
import type { Survey } from "@/features/projects/survey-types";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

// ---------------------------------------------------------------------------
// Constants

const CONDITION_NOTE_MIN_LENGTH = 10;
const ACCEPTED_FILE_TYPES = {
  "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  "application/pdf": [".pdf"],
  ".doc": [".doc"],
  ".docx": [".docx"],
};

// ---------------------------------------------------------------------------
// Page component

export default function SurveyPage() {
  const t = useTranslations("Survey");
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";

  const { account } = useCurrentUser();

  // Fetch engagements for this project, scoped to the viewer's own
  // providerId so another provider's engagement on the same project
  // can never drive this page.
  const viewerProfileId = account?.serviceProvider?.id ?? null;
  const {
    engagements,
    isLoading: isLoadingEngagements,
    isError: isEngagementsError,
  } = useEngagements({
    projectId: projectIdParam,
    providerId: viewerProfileId ?? undefined,
    status: "accepted", // Only get accepted engagements
    pageSize: 10,
    enabled: viewerProfileId != null,
  });

  // Find the engagement for this provider (if they are a provider)
  const myEngagement = React.useMemo(() => {
    if (!account || account.role !== "provider") return null;
    return engagements[0] ?? null;
  }, [engagements, account]);

  const projectWorkingId = myEngagement?.id ?? null;

  const {
    surveys,
    latestSurvey,
    isLoading: isLoadingSurveys,
    isFetching,
    isError: isSurveysError,
    error: surveysError,
    refetch,
  } = useSurveys({
    projectWorkingId: projectWorkingId ?? 0,
    enabled: Boolean(projectWorkingId),
  });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSurvey, setEditingSurvey] = React.useState<Survey | null>(null);

  const handleCreateNew = () => {
    setEditingSurvey(null);
    setDialogOpen(true);
  };

  const handleEdit = (survey: Survey) => {
    setEditingSurvey(survey);
    setDialogOpen(true);
  };

  // Loading state
  if (isLoadingEngagements) {
    return <SurveyLoadingSkeleton />;
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

  if (isSurveysError) {
    return (
      <ErrorState
        title={t("errors.title")}
        subtitle={t("errors.subtitle")}
        retryLabel={t("errors.retry")}
        message={surveysError?.message ?? "Failed to load surveys."}
        onRetry={() => { void refetch(); }}
      />
    );
  }

  if (isLoadingSurveys) {
    return <SurveyLoadingSkeleton />;
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

      {/* Survey List */}
      {surveys.length === 0 ? (
        <EmptyState
            title={t("empty.title")}
            description={t("empty.description")}
            actionLabel={t("createFirst")}
            onAction={handleCreateNew}
          />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Latest Survey Card */}
          {latestSurvey && (
            <SurveyCard
              survey={latestSurvey}
              isLatest
              onEdit={handleEdit}
              canEdit={account?.role === "provider"}
            />
          )}

          {/* Previous Surveys */}
          {surveys.length > 1 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">
                  {t("previousSurveys")}
                </CardTitle>
                <CardDescription>
                  {t("previousSurveysCount", { count: surveys.length - 1 })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {surveys
                  .filter((s) => s.id !== latestSurvey?.id)
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )
                  .map((survey) => (
                    <SurveyCard
                      key={survey.id}
                      survey={survey}
                      isLatest={false}
                      onEdit={handleEdit}
                      canEdit={account?.role === "provider"}
                    />
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Refreshing indicator */}
      {isFetching && !isLoadingSurveys && (
        <p
          aria-live="polite"
          className="flex items-center justify-center gap-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          <Loader2 className="size-3 animate-spin" aria-hidden />
          {t("refreshing")}
        </p>
      )}

      {/* Create/Edit Dialog */}
      <SurveyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        survey={editingSurvey}
        projectWorkingId={projectWorkingId}
        onSuccess={() => {
          setDialogOpen(false);
          void refetch();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Survey Card

interface SurveyCardProps {
  survey: Survey;
  isLatest: boolean;
  onEdit: (survey: Survey) => void;
  canEdit: boolean;
}

function SurveyCard({ survey, isLatest, onEdit, canEdit }: SurveyCardProps) {
  const t = useTranslations("Survey");

  const createdAt = new Date(survey.createdAt);
  const formattedDate = createdAt.toLocaleDateString();
  const formattedTime = createdAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              {t("surveyLabel")}
            </CardTitle>
            {isLatest && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {t("latest")}
              </span>
            )}
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(survey)}
            >
              {t("edit")}
            </Button>
          )}
        </div>
        <CardDescription>
          {t("createdAt", {
            date: formattedDate,
            time: formattedTime,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Condition Note */}
        <div className="flex flex-col gap-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">
            {t("conditionNote")}
          </h4>
          <p className="text-sm whitespace-pre-wrap">{survey.conditionNote}</p>
        </div>

        {/* Report File — `reportUrl` is just the storage object name, not a
            browsable link (that's what 404'd here before); `reportViewUrl`
            is the resolved public URL the backend hands back alongside it. */}
        {(survey.reportViewUrl ?? survey.reportUrl) && (
          <div className="flex flex-col gap-1.5">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t("reportFile")}
            </h4>
            <a
              href={survey.reportViewUrl ?? survey.reportUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Upload className="size-4" aria-hidden />
              {t("viewReport")}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Survey Dialog

interface SurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  survey: Survey | null;
  projectWorkingId: number;
  onSuccess: () => void;
}

function SurveyDialog({
  open,
  onOpenChange,
  survey,
  projectWorkingId,
  onSuccess,
}: SurveyDialogProps) {
  const t = useTranslations("Survey.dialog");

  const [conditionNote, setConditionNote] = React.useState("");
  const [reportUrl, setReportUrl] = React.useState("");
  const [reportFile, setReportFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // Reset form when dialog opens/closes or survey changes
  useResetOnChange(`${open}:${survey?.id ?? "new"}`, () => {
    if (open) {
      setConditionNote(survey?.conditionNote ?? "");
      // Prefer the resolved public URL — `survey.reportUrl` is just the
      // storage object name and isn't directly browsable. The backend
      // accepts either form back on submit (it re-normalizes whatever we
      // send), so reusing this same state for the submit payload is safe.
      setReportUrl(survey?.reportViewUrl ?? survey?.reportUrl ?? "");
      setReportFile(null);
      setUploadError(null);
    }
  });

  const createMutation = useCreateSurveyMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: onSuccess,
  });

  const updateMutation = useUpdateSurveyMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: onSuccess,
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = Boolean(survey);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setReportFile(file);
    setUploadError(null);

    // Upload file immediately
    setIsUploading(true);
    try {
      const response = await uploadFileApi(file);
      setReportUrl(response.url);
    } catch {
      setUploadError(t("uploadFailed"));
      setReportFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedNote = conditionNote.trim();
    if (trimmedNote.length < CONDITION_NOTE_MIN_LENGTH) {
      return;
    }

    if (isEditing && survey) {
      updateMutation.mutate({
        surveyId: survey.id,
        payload: {
          conditionNote: trimmedNote,
          reportUrl: reportUrl || undefined,
        },
      });
    } else {
      createMutation.mutate({
        projectWorkingId,
        conditionNote: trimmedNote,
        reportUrl: reportUrl || undefined,
      });
    }
  };

  const conditionNoteTrimmed = conditionNote.trim();
  const isValid = conditionNoteTrimmed.length >= CONDITION_NOTE_MIN_LENGTH;

  const canSubmit = !isPending && isValid && !isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("titleEdit") : t("titleCreate")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("descriptionEdit") : t("descriptionCreate")}
          </DialogDescription>
        </DialogHeader>

        <form
          id="survey-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {/* Condition Note */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="survey-condition-note"
              className="text-sm font-medium text-foreground"
            >
              {t("conditionNoteLabel")}
            </label>
            <Textarea
              id="survey-condition-note"
              value={conditionNote}
              onChange={(e) => setConditionNote(e.target.value)}
              placeholder={t("conditionNotePlaceholder")}
              rows={6}
              aria-describedby="survey-condition-note-hint"
              aria-invalid={conditionNote.length > 0 && !isValid}
              className="resize-none"
            />
            <p
              id="survey-condition-note-hint"
              className="text-[11px] text-muted-foreground"
            >
              {isValid
                ? t("conditionNoteHint")
                : t("conditionNoteTooShort", {
                    min: CONDITION_NOTE_MIN_LENGTH,
                  })}
            </p>
          </div>

          {/* Report File Upload */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="survey-report-file"
              className="text-sm font-medium text-foreground"
            >
              {t("reportFileLabel")}
            </label>
            {reportUrl ? (
              <div className="flex items-center gap-2">
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Upload className="size-4" aria-hidden />
                  {t("viewCurrentReport")}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReportUrl("");
                    setReportFile(null);
                  }}
                >
                  {t("removeFile")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Input
                  id="survey-report-file"
                  type="file"
                  accept={Object.keys(ACCEPTED_FILE_TYPES).join(",")}
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
                {uploadError && (
                  <p className="text-xs text-destructive">{uploadError}</p>
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {t("reportFileHint")}
            </p>
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
            form="survey-form"
            disabled={!canSubmit}
            aria-busy={isPending}
          >
            {isPending
              ? t("submitting")
              : isEditing
                ? t("saveChanges")
                : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton

function SurveyLoadingSkeleton() {
  const t = useTranslations("Survey");
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
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state

// ---------------------------------------------------------------------------
// Error state
