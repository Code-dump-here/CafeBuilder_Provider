"use client";

import * as React from "react";
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
import { uploadImageApi } from "@/lib/http/file-upload-api";
import { todayDateInputValue } from "@/lib/date-input";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { Field } from "@/components/ui/field";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseLabel?: string;
  onSubmit: (input: {
    name: string;
    description: string;
    estimateAt: string | null;
    imageUrl: string | null;
  }) => void;
}

/**
 * Modal for creating a brand-new task aligned with the
 * `POST /construction-tasks` contract: `name`, `description`,
 * `imageUrl`, `estimateAt`. Item id is supplied by the page-level
 * mutation; the creator is derived server-side from the JWT.
 *
 * Image handling: user picks a file, we POST it to
 * `POST /api/files/images` and store the returned `url` on the task.
 * A local `data:` preview is shown while the upload is in flight so
 * the user gets immediate feedback.
 */
export function AddTaskModal({
  open,
  onOpenChange,
  phaseLabel,
  onSubmit,
}: AddTaskModalProps) {
  const t = useTranslations("MilestoneManagement.task.addTask");
  const tFields = useTranslations("MilestoneManagement.task.detail.fields");
  const tCommon = useTranslations("MilestoneManagement.common");

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [estimateAt, setEstimateAt] = React.useState<string>("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
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
      setEstimateAt("");
      setImageUrl(null);
      setPreviewUrl(null);
      setUploadError(null);
      setIsUploading(false);
    }
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setUploadError(t("uploadFailed"));
      return;
    }

    // Local preview while the upload runs
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploadError(null);
    setIsUploading(true);

    try {
      const response = await uploadImageApi(file);
      setImageUrl(response.url);
    } catch {
      setUploadError(t("uploadFailed"));
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setPreviewUrl(null);
    setUploadError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isUploading) return;
    onSubmit({
      name: trimmed,
      description: description.trim(),
      estimateAt: estimateAt || null,
      imageUrl,
    });
    onOpenChange(false);
  };

  const displayUrl = previewUrl ?? imageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
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

          <Field label={tFields("description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to happen here?"
              rows={3}
              className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
            />
          </Field>

          <Field label={tFields("dueDate")}>
            <Input
              type="date"
              value={estimateAt}
              onChange={(e) => setEstimateAt(e.target.value)}
              min={todayDateInputValue()}
            />
          </Field>

          <Field label={tFields("images")}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
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
                {imageUrl ? t("uploadCta") : t("uploadCta")}
              </Button>
              {uploadError ? (
                <p className="text-xs text-destructive">{uploadError}</p>
              ) : null}
              {displayUrl ? (
                <div className="relative aspect-square w-32 overflow-hidden rounded-md border border-border/60 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={displayUrl} alt="" className="h-full w-full object-cover" />
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2 aria-hidden className="size-5 animate-spin" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      aria-label="Remove"
                      className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-background/80"
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
              <Button type="button" variant="ghost" size="sm">{tCommon("cancel")}</Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || isUploading}
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
