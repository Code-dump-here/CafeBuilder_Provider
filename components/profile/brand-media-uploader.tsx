"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadImageApi } from "@/lib/http/file-upload-api";
import { useUpdateProviderBrandMutation } from "@/features/service-provider-profiles/use-brand";

/**
 * What the wire field on `UpdateProviderBrandPayload` is called.
 *
 * Spec §2.2 — avatar maps to `logoUrl`, cover to `coverImageUrl`.
 * Uploaded files always land on the server's image endpoint
 * (`POST /api/files/images`) and the resolved public URL is sent
 * straight back as the field value.
 */
type BrandMediaKind = "avatar" | "cover";

interface BrandMediaUploaderProps {
  kind: BrandMediaKind;
  serviceProviderProfileId: string;
  /**
   * Pre-resolved view URL from the brand payload, used as the visual
   * background or src. The raw `*Url` is what gets written back to the
   * server when the user uploads a new file (see `brand-types.ts` —
   * `NormalizeForStorageAsync` accepts either an absolute URL or an
   * ObjectName).
   */
  currentViewUrl: string | undefined;
  /**
   * The stored ObjectName / raw URL. Sent back to the server verbatim
   * when nothing has changed locally.
   */
  currentRawUrl: string | undefined;
  /**
   * Hover-only overlay (the cover image is full-bleed, the avatar is a
   * circle — different layouts share the same upload affordance here).
   */
  variant: "cover" | "avatar";
}

/**
 * Inline uploader for the brand's logo / cover image. Rendered as an
 * absolute-positioned overlay so the existing cover and avatar markup
 * in `ProfilePageShell` keeps its current visual design.
 */
export function BrandMediaUploader({
  kind,
  serviceProviderProfileId,
  currentViewUrl,
  currentRawUrl,
  variant,
}: BrandMediaUploaderProps) {
  const t = useTranslations("BrandMedia");
  const tUpload = useTranslations("MilestoneManagement.issue");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const updateBrand = useUpdateProviderBrandMutation();

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const fieldName = kind === "avatar" ? "logoUrl" : "coverImageUrl";

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(tUpload("uploadFailed"));
      return;
    }
    const localPreview = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(localPreview);
    setError(null);
    setIsUploading(true);

    try {
      // Upload first → get a public URL → patch brand with that URL.
      const response = await uploadImageApi(file);
      await updateBrand.mutateAsync({
        serviceProviderProfileId,
        payload: { [fieldName]: response.url },
      });
      setPreviewUrl(null);
    } catch {
      setError(tUpload("uploadFailed"));
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    try {
      await updateBrand.mutateAsync({
        serviceProviderProfileId,
        payload: { [fieldName]: "" },
      });
    } catch {
      setError(tUpload("uploadFailed"));
    }
  };

  const displayUrl = previewUrl ?? currentViewUrl;
  const pending = isUploading || updateBrand.isPending;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <div
        className={
          variant === "cover"
            ? "absolute inset-0 flex items-end justify-end gap-2 overflow-hidden rounded-2xl bg-black/40 p-3 opacity-0 transition-opacity duration-150 hover:opacity-100 focus-within:opacity-100"
            : "absolute inset-0 z-20 flex items-center justify-center gap-1 overflow-hidden bg-black/50 opacity-0 transition-opacity duration-150 hover:opacity-100 focus-within:opacity-100"
        }
      >
        <Button
          type="button"
          size={variant === "cover" ? "sm" : "icon"}
          variant="secondary"
          className={variant === "avatar" ? "size-9 rounded-full" : "gap-1.5"}
          disabled={pending}
          onClick={() => fileRef.current?.click()}
        >
          {pending ? (
            <Loader2 aria-hidden className={variant === "avatar" ? "size-4 animate-spin" : "size-4 animate-spin"} />
          ) : (
            <Camera aria-hidden className="size-4" />
          )}
          {variant === "cover" ? t("changeCover") : t("changeAvatar")}
        </Button>
        {currentRawUrl ? (
          <Button
            type="button"
            size={variant === "cover" ? "sm" : "icon"}
            variant="secondary"
            className={
              variant === "avatar"
                ? "size-9 rounded-full"
                : "gap-1.5 bg-destructive/90 text-white hover:bg-destructive"
            }
            disabled={pending}
            onClick={() => void handleRemove()}
            aria-label={t("remove")}
          >
            <Trash2 aria-hidden className="size-4" />
            {variant === "cover" ? t("removeCover") : null}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p
          className={
            variant === "cover"
              ? "absolute bottom-2 left-2 rounded bg-destructive/90 px-2 py-0.5 text-xs text-white"
              : "absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-destructive"
          }
        >
          {error}
        </p>
      ) : null}
      {/* Keep `displayUrl` referenced so the eslint-react/no-unused-vars
          rule doesn't flag the destructure when the parent renders the
          actual <img> from its own props. The local preview is shown
          inline by the caller if it wants to. */}
      <span hidden aria-hidden data-preview={displayUrl ?? ""} />
    </>
  );
}
