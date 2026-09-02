"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadImageApi } from "@/lib/http/file-upload-api";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

interface IssueImageUploadProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

/**
 * Image-upload field used by Issue forms. Wraps `uploadImageApi` and
 * shows a local preview while the upload is in flight, then exposes
 * the server `url` to the caller via `onChange`.
 */
export function IssueImageUpload({
  label,
  value,
  onChange,
  disabled,
}: IssueImageUploadProps) {
  const t = useTranslations("MilestoneManagement.issue");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // When the underlying value changes from outside (form reset),
  // drop the local preview.
  useResetOnChange(value, () => {
    if (!value) {
      setPreviewUrl(null);
      setError(null);
    }
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setError(t("uploadFailed"));
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setError(null);
    setIsUploading(true);

    try {
      const response = await uploadImageApi(file);
      onChange(response.url);
    } catch {
      setError(t("uploadFailed"));
      setPreviewUrl(null);
      onChange(null);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const displayUrl = previewUrl ?? value;

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
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
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Upload aria-hidden />
          )}
          {value ? t("replaceImage") : t("uploadCta")}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
                onClick={() => {
                  setPreviewUrl(null);
                  onChange(null);
                }}
                aria-label="Remove"
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-background/80 transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="size-3" aria-hidden />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
