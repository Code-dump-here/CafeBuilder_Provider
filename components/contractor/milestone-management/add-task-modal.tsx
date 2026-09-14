"use client";

import * as React from "react";

import { ACCEPT_IMAGES, validateUploadFile } from "@/lib/upload-constraints";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Upload, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { uploadImageApi } from "@/lib/http/file-upload-api";
import { todayDateInputValue } from "@/lib/date-input";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

import type {
  CreateConstructionTaskPayload,
} from "@/features/projects/construction-types";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The parent milestone id. Required to scope the new task to a phase;
   * without it the create payload would be missing `constructionItemId`
   * and the request would 400. The page wires this up when it opens the
   * modal against a specific phase.
   */
  constructionItemId: string;
  phaseLabel?: string;
  onSubmit: (input: CreateConstructionTaskPayload) => void;
}

/**
 * Modal for creating a brand-new task aligned with the
 * `POST /construction-tasks` contract: `name`, `description`, `startAt`,
 * `estimateAt`, `imageUrl`, `estimatedLaborCost`.
 *
 * Image handling: user picks a file, we POST it to
 * `POST /api/files/images` and store the returned **ObjectName** on the
 * task — the absolute URL is resolved server-side as `imageViewUrl`.
 * A local `data:` preview is shown while the upload is in flight so the
 * user gets immediate feedback.
 */
export function AddTaskModal({
  open,
  onOpenChange,
  constructionItemId,
  phaseLabel,
  onSubmit,
}: AddTaskModalProps) {
  const t = useTranslations("MilestoneManagement.task.addTask");
  const tUpload = useTranslations("Upload");
  const tFields = useTranslations("MilestoneManagement.task.fields");
  const tDetailFields = useTranslations("MilestoneManagement.task.detail.fields");
  // startDate, targetDate and estimatedLaborCost live directly under
  // MilestoneManagement.task, not under task.fields (which holds only
  // "title"). Looked up through tFields they rendered as raw key paths.
  const tTask = useTranslations("MilestoneManagement.task");
  const tCommon = useTranslations("MilestoneManagement.common");
  const tShared = useTranslations("ConstructionShared");

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startAt, setStartAt] = React.useState<string>("");
  const [estimateAt, setEstimateAt] = React.useState<string>("");
  const [imageObjectName, setImageObjectName] = React.useState<string | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [estimatedLaborCostText, setEstimatedLaborCostText] =
    React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [estimateAtError, setEstimateAtError] = React.useState<string | null>(
    null,
  );
  const fileRef = React.useRef<HTMLInputElement>(null);

  useResetOnChange(open, () => {
    if (open) {
      // Default to today rather than leaving the picker blank — a task
      // created just now most naturally starts today, and the user can
      // still push it forward.
      setEstimateAt(todayDateInputValue());
    } else {
      setName("");
      setDescription("");
      setStartAt("");
      setEstimateAt("");
      setImageObjectName(null);
      setPreviewUrl(null);
      setEstimatedLaborCostText("");
      setUploadError(null);
      setIsUploading(false);
      setEstimateAtError(null);
    }
  });

  const handleEstimateAtChange = (value: string) => {
    setEstimateAt(value);
    if (value && value < todayDateInputValue()) {
      setEstimateAtError(tShared("validation.estimateAtPast"));
    } else {
      setEstimateAtError(null);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    // `file.type.startsWith("image/")` passed .heic/.svg/.bmp — image/* to the
    // browser, refused by the server, which matches on extension — and never
    // looked at size.
    const check = validateUploadFile(file, { imageOnly: true });
    if (!check.ok) {
      setUploadError(
        check.reason === "too-large"
          ? tUpload("tooLarge", { sizeMb: check.sizeMb, limitMb: check.limitMb })
          : check.reason === "bad-type"
            ? tUpload("badType", { extension: check.extension, allowed: check.allowed })
            : tUpload("empty"),
      );
      return;
    }

    // Local preview while the upload runs.
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploadError(null);
    setIsUploading(true);

    try {
      const response = await uploadImageApi(file);
      // Store the ObjectName — the server resolves it to a view URL when
      // the task is read back.
      setImageObjectName(response.objectName);
    } catch {
      setUploadError(t("uploadFailed"));
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleRemoveImage = () => {
    setImageObjectName(null);
    setPreviewUrl(null);
    setUploadError(null);
  };

  const parseCost = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed.replace(/[\s.,]/g, ""));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isUploading) return;
    if (estimateAt && estimateAt < todayDateInputValue()) {
      setEstimateAtError(tShared("validation.estimateAtPast"));
      return;
    }
    // The page owns the parent id — we emit everything else the API
    // expects.
    const payload: CreateConstructionTaskPayload = {
      constructionItemId,
      name: trimmed,
      description: description.trim() || undefined,
      imageUrl: imageObjectName ?? undefined,
      startAt: startAt || undefined,
      estimateAt: estimateAt || undefined,
      estimatedLaborCost: parseCost(estimatedLaborCostText),
    };
    onSubmit(payload);
    onOpenChange(false);
  };

  const displayUrl = previewUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{phaseLabel ?? t("subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label={tFields("title")}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </Field>

          <Field label={tDetailFields("description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tDetailFields("description") as unknown as string}
              rows={3}
              className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={tTask("startDate")}>
              <Input
                type="date"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </Field>
            <Field
              label={tTask("targetDate")}
              error={estimateAtError ?? undefined}
            >
              <Input
                type="date"
                value={estimateAt}
                onChange={(e) => handleEstimateAtChange(e.target.value)}
                min={todayDateInputValue()}
              />
            </Field>
          </div>

          <Field label={tTask("estimatedLaborCost")}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={estimatedLaborCostText}
              onChange={(e) => setEstimatedLaborCostText(e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label={tDetailFields("images")}>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_IMAGES}
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 aria-hidden className="animate-spin" />
                ) : (
                  <Upload aria-hidden />
                )}
                {t("uploadCta")}
              </Button>
              {uploadError ? (
                <p className="text-xs text-destructive">{uploadError}</p>
              ) : null}
              {displayUrl || imageObjectName ? (
                <div className="relative aspect-square w-32 overflow-hidden rounded-md border border-border/60 bg-muted">
                  {displayUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={displayUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      {t("uploadCta")}
                    </div>
                  )}
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2 aria-hidden className="size-5 animate-spin" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      aria-label="Remove"
                      className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-background/80 transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </Field>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                {tCommon("cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={
                !name.trim() || isUploading || estimateAtError !== null
              }
            >
              <Plus aria-hidden />
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
