"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Briefcase,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import { uploadFileApi, uploadImageApi } from "@/lib/http/file-upload-api";
import {
  useAddPortfolioImageMutation,
  useCreatePortfolioMutation,
  useDeletePortfolioMutation,
  useProviderPortfolios,
  useRemovePortfolioImageMutation,
  useUpdatePortfolioMutation,
} from "@/features/service-provider-profiles/use-brand";
import {
  PORTFOLIO_ROLES,
  type PortfolioRole,
  type ProviderPortfolio,
  type ProviderPortfolioImage,
} from "@/features/service-provider-profiles/portfolio-types";

/** A nullable number as an input value — blank means "not recorded". */
function toInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

interface PortfolioTabProps {
  serviceProviderProfileId: string;
  /** False for an owner browsing someone else's work. */
  editable: boolean;
}

/**
 * Past jobs, with photos and an optional walk-through video.
 *
 * Featured entries come back first from the server; this preserves that order
 * rather than re-sorting, so what a provider pins is what an owner sees first.
 */
export function PortfolioTab({ serviceProviderProfileId, editable }: PortfolioTabProps) {
  const t = useTranslations("Portfolio");
  const locale = useLocale();

  const { portfolios, isLoading } = useProviderPortfolios({ serviceProviderProfileId });

  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<ProviderPortfolio | null>(null);
  const [deleting, setDeleting] = React.useState<ProviderPortfolio | null>(null);
  const [addingImageTo, setAddingImageTo] = React.useState<ProviderPortfolio | null>(null);
  // Deleting a whole portfolio entry already confirmed; deleting one of its
  // photos did not, even though the trigger is a smaller target — an icon that
  // only appears on hover, in the corner of a 28px thumbnail.
  const [removingImageId, setRemovingImageId] = React.useState<string | null>(null);
  const [viewingGallery, setViewingGallery] = React.useState<ProviderPortfolio | null>(null);

  const createMutation = useCreatePortfolioMutation();
  const updateMutation = useUpdatePortfolioMutation();
  const deleteMutation = useDeletePortfolioMutation();
  const addImageMutation = useAddPortfolioImageMutation();
  const removeImageMutation = useRemovePortfolioImageMutation();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {editable ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        </div>
      ) : null}

      {portfolios.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={t("empty.title")}
          description={editable ? t("empty.description") : t("empty.readOnly")}
          actionLabel={editable ? t("add") : undefined}
          onAction={editable ? () => setCreating(true) : undefined}
        />
      ) : (
        portfolios.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
                    {entry.isFeatured ? (
                      <Star className="size-4 fill-primary text-primary" aria-hidden />
                    ) : null}
                    {entry.title}
                    <Badge variant="outline">{t(`role.${entry.role}`)}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      entry.location,
                      entry.style,
                      entry.areaM2 !== null
                        ? t("areaValue", { value: entry.areaM2 })
                        : null,
                      entry.durationDays !== null
                        ? t("durationValue", { count: entry.durationDays })
                        : null,
                      entry.completedAt,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("noDetail")}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {entry.contractValue !== null ? (
                    <p className="text-sm font-semibold">
                      {formatVndParts(entry.contractValue, locale).full}
                    </p>
                  ) : null}
                  {editable ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAddingImageTo(entry)}
                      >
                        <ImagePlus className="size-4" aria-hidden />
                        <span className="sr-only">{t("addImage")}</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(entry)}>
                        <Pencil className="size-4" aria-hidden />
                        <span className="sr-only">{t("edit")}</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(entry)}>
                        <Trash2 className="size-4 text-destructive" aria-hidden />
                        <span className="sr-only">{t("delete")}</span>
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {entry.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {entry.description}
                </p>
              ) : null}

              {entry.videoViewUrl ? (
                <a
                  href={entry.videoViewUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Video className="size-4" aria-hidden />
                  {t("watchVideo")}
                </a>
              ) : null}

              {entry.images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {entry.images.map((image) => (
                    <figure key={image.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => setViewingGallery(entry)}
                        aria-label={t("viewImage")}
                        className="block size-28 overflow-hidden rounded-lg border border-border/60"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.imageViewUrl ?? image.imageUrl}
                          alt={image.caption ?? ""}
                          className="size-full object-cover"
                        />
                      </button>
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => setRemovingImageId(image.id)}
                          className="absolute right-1 top-1 hidden rounded-full bg-background/90 p-1 group-hover:block"
                        >
                          <Trash2 className="size-3 text-destructive" aria-hidden />
                          <span className="sr-only">{t("removeImage")}</span>
                        </button>
                      ) : null}
                      {image.caption ? (
                        <figcaption className="mt-1 w-28 truncate text-xs text-muted-foreground">
                          {image.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}

      <PortfolioDialog
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
              { serviceProviderProfileId, ...values },
              { onSuccess: done },
            );
          }
        }}
      />

      <AddImageDialog
        entry={addingImageTo}
        onOpenChange={(next) => {
          if (!next) setAddingImageTo(null);
        }}
        pending={addImageMutation.isPending}
        onSubmit={(payload) => {
          if (!addingImageTo) return;
          addImageMutation.mutate(
            { portfolioId: addingImageTo.id, payload },
            { onSuccess: () => setAddingImageTo(null) },
          );
        }}
      />

      <ImageGalleryDialog
        entry={viewingGallery}
        onOpenChange={(next) => {
          if (!next) setViewingGallery(null);
        }}
        editable={editable}
        pending={updateMutation.isPending}
        onSetAsCover={(image) => {
          if (!viewingGallery) return;
          // PUT the portfolio with `coverImageUrl` swapped to this image's
          // raw URL. The backend's `NormalizeForStorageAsync` will resolve
          // the URL exactly the same way it did when the image was added.
          updateMutation.mutate(
            {
              id: viewingGallery.id,
              payload: { coverImageUrl: image.imageUrl },
            },
            { onSuccess: () => setViewingGallery(null) },
          );
        }}
      />

      <ConfirmDialog
        open={removingImageId !== null}
        onOpenChange={(next) => {
          if (!next) setRemovingImageId(null);
        }}
        title={t("removeImageTitle")}
        description={t("removeImageDescription")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        onConfirm={() => {
          if (removingImageId) removeImageMutation.mutate(removingImageId);
          setRemovingImageId(null);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function PortfolioDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ProviderPortfolio | null;
  pending: boolean;
  onSubmit: (values: {
    title: string;
    description?: string;
    role?: PortfolioRole;
    style?: string;
    location?: string;
    areaM2?: number;
    contractValue?: number;
    completedAt?: string;
    durationDays?: number;
    videoUrl?: string;
    images?: { imageUrl: string; caption?: string; sortOrder?: number }[];
    isFeatured?: boolean;
  }) => void;
}) {
  const t = useTranslations("Portfolio");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [role, setRole] = React.useState<string>("both");
  const [style, setStyle] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [areaM2, setAreaM2] = React.useState("");
  const [contractValue, setContractValue] = React.useState("");
  const [completedAt, setCompletedAt] = React.useState("");
  const [durationDays, setDurationDays] = React.useState("");
  /**
   * Each item is a free-form media URL — image or video. The wire contract
   * still speaks in terms of `images[]` + a single `videoUrl`, so on submit
   * we split this list into those two buckets based on `type`.
   */
  const [media, setMedia] = React.useState<MediaItem[]>([]);
  const [isFeatured, setIsFeatured] = React.useState(false);

  useResetOnChange(open ? (initial?.id ?? "new") : null, () => {
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setRole(initial?.role ?? "both");
    setStyle(initial?.style ?? "");
    setLocation(initial?.location ?? "");
    setAreaM2(toInput(initial?.areaM2));
    setContractValue(toInput(initial?.contractValue));
    setCompletedAt(initial?.completedAt ?? "");
    setDurationDays(toInput(initial?.durationDays));
    // Re-derive the media list from the entity shape the server sent us.
    const rebuilt: MediaItem[] = [];
    if (initial?.images?.length) {
      for (const image of initial.images) {
        rebuilt.push({
          id: `existing-image-${image.id}`,
          url: image.imageUrl,
          type: "image",
          caption: image.caption ?? "",
        });
      }
    }
    if (initial?.videoUrl) {
      rebuilt.push({
        id: `existing-video-${initial.id ?? "new"}`,
        url: initial.videoUrl,
        type: "video",
        caption: "",
      });
    }
    setMedia(rebuilt);
    setIsFeatured(initial?.isFeatured ?? false);
  });

  const num = (value: string) => {
    const parsed = Number(value.trim());
    return value.trim() === "" || !Number.isFinite(parsed) ? undefined : parsed;
  };

  // Bucket the free-form media list into the two wire fields: `images[]`
  // for image items, `videoUrl` for the first video item. The wire contract
  // (see `portfolio-types.ts`) only supports a single video per project,
  // so we collapse extras — `MediaItemRow` already blocks more than one.
  const cleanMedia = media
    .map((m) => ({ ...m, url: m.url.trim(), caption: m.caption.trim() }))
    .filter((m) => m.url.length > 0);
  const videoCount = cleanMedia.filter((m) => m.type === "video").length;
  const imagePayloads = cleanMedia
    .filter((m) => m.type === "image")
    .map((m, idx) => ({
      imageUrl: m.url,
      ...(m.caption ? { caption: m.caption } : {}),
      sortOrder: idx,
    }));
  const videoUrlPayload = cleanMedia.find((m) => m.type === "video")?.url;

  const mediaValid = videoCount <= 1;
  const canSubmit = pending || title.trim().length === 0 || !mediaValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">{t("fields.title")}</label>
            <Input
              value={title}
              placeholder={t("fields.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("fields.role")}</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PORTFOLIO_ROLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`role.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TextField label={t("fields.style")} value={style} onChange={setStyle} />
          <TextField
            label={t("fields.location")}
            value={location}
            onChange={setLocation}
          />
          <TextField
            label={t("fields.areaM2")}
            value={areaM2}
            onChange={setAreaM2}
            type="number"
          />
          <TextField
            label={t("fields.contractValue")}
            value={contractValue}
            onChange={setContractValue}
            type="number"
          />
          <TextField
            label={t("fields.durationDays")}
            value={durationDays}
            onChange={setDurationDays}
            type="number"
          />
          <TextField
            label={t("fields.completedAt")}
            value={completedAt}
            onChange={setCompletedAt}
            type="date"
          />

          <div className="flex flex-col gap-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">{t("media.title")}</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setMedia((prev) => [
                    ...prev,
                    { id: makeMediaId(), url: "", type: "image", caption: "" },
                  ])
                }
              >
                <Plus aria-hidden className="size-4" />
                {t("media.add")}
              </Button>
            </div>
            {media.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                {t("media.empty")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {media.map((item, idx) => (
                  <MediaItemRow
                    key={item.id}
                    item={item}
                    onChange={(next) =>
                      setMedia((prev) => prev.map((m, i) => (i === idx ? next : m)))
                    }
                    onRemove={() =>
                      setMedia((prev) => prev.filter((_, i) => i !== idx))
                    }
                  />
                ))}
              </div>
            )}
            {videoCount > 1 ? (
              <p className="text-xs text-destructive">{t("media.onlyOneVideoError")}</p>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            {t("fields.isFeatured")}
          </label>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">{t("fields.description")}</label>
            <Textarea
              rows={3}
              value={description}
              placeholder={t("fields.descriptionPlaceholder")}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            disabled={canSubmit}
            onClick={() => {
              const payload: Parameters<typeof onSubmit>[0] = {
                title: title.trim(),
                description: description.trim() || undefined,
                role: role as PortfolioRole,
                style: style.trim() || undefined,
                location: location.trim() || undefined,
                areaM2: num(areaM2),
                contractValue: num(contractValue),
                completedAt: completedAt || undefined,
                durationDays: num(durationDays),
                isFeatured,
              };
              if (videoUrlPayload) {
                payload.videoUrl = videoUrlPayload;
              }
              if (imagePayloads.length > 0) {
                payload.images = imagePayloads;
              }
              onSubmit(payload);
            }}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddImageDialog({
  entry,
  onOpenChange,
  pending,
  onSubmit,
}: {
  entry: ProviderPortfolio | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (payload: { imageUrl: string; caption?: string }) => void;
}) {
  const t = useTranslations("Portfolio");
  const [imageUrl, setImageUrl] = React.useState("");
  const [caption, setCaption] = React.useState("");

  useResetOnChange(entry?.id ?? null, () => {
      setImageUrl("");
      setCaption("");
  });

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addImage")}</DialogTitle>
          <DialogDescription>{t("addImageDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <TextField label={t("fields.imageUrl")} value={imageUrl} onChange={setImageUrl} />
          <TextField label={t("fields.caption")} value={caption} onChange={setCaption} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            disabled={pending || imageUrl.trim().length === 0}
            onClick={() =>
              onSubmit({
                imageUrl: imageUrl.trim(),
                caption: caption.trim() || undefined,
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** A free-form media entry inside `PortfolioDialog`. */
type MediaItem = {
  /** Local React key — keeps row identity stable across re-renders. */
  id: string;
  /** Server-resolved public URL once the upload finished. Empty while
   *  the upload is still in flight or hasn't started yet. */
  url: string;
  /** Wire field this item maps to: `images[]` or `videoUrl`. */
  type: "image" | "video";
  caption: string;
  /** Display-only — shown next to the thumbnail. Server doesn't know it. */
  fileName?: string;
};

let mediaIdCounter = 0;
function makeMediaId(): string {
  // Server-agnostic id for client-only list rendering; reset on each module
  // load, so collisions across mounts are impossible within a single session.
  mediaIdCounter += 1;
  return `media-${Date.now().toString(36)}-${mediaIdCounter}`;
}

function MediaItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: MediaItem;
  onChange: (next: MediaItem) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Portfolio");
  const tUpload = useTranslations("MilestoneManagement.issue");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // Cleanup local preview blob URL when the item is removed or rebuilt.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const accept = item.type === "image" ? "image/*" : "video/*";

  const handleFile = async (file: File) => {
    if (item.type === "image" && !file.type.startsWith("image/")) {
      setError(tUpload("uploadFailed"));
      return;
    }
    if (item.type === "video" && !file.type.startsWith("video/")) {
      setError(tUpload("uploadFailed"));
      return;
    }

    const localPreview = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(localPreview);
    setError(null);
    setIsUploading(true);

    try {
      // Route through the dedicated image endpoint when possible so the
      // server enforces the content-type it advertises.
      const response =
        item.type === "image"
          ? await uploadImageApi(file)
          : await uploadFileApi(file);
      // Server returns the resolved public URL; store it on the item so the
      // existing submit pipeline can hand it to the wire payload.
      onChange({ ...item, url: response.url, fileName: file.name });
    } catch {
      setError(tUpload("uploadFailed"));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onChange({ ...item, url: "" });
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl ?? item.url;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-2">
      <div className="flex items-center gap-2">
        <Select
          value={item.type}
          onValueChange={(value) =>
            onChange({ ...item, type: value as MediaItem["type"], url: "" })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">{t("media.typeImage")}</SelectItem>
            <SelectItem value="video">{t("media.typeVideo")}</SelectItem>
          </SelectContent>
        </Select>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={isUploading}
          onClick={() => fileRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Upload aria-hidden className="size-4" />
          )}
          {item.url ? tUpload("replaceImage") : t("media.uploadCta")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={t("media.remove")}
          disabled={isUploading}
        >
          <Trash2 className="size-4 text-destructive" aria-hidden />
          <span className="sr-only">{t("media.remove")}</span>
        </Button>
      </div>

      {/* Already-uploaded file: show filename + tiny preview thumbnail. */}
      {!isUploading && item.url ? (
        <div className="flex items-center gap-2">
          {item.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt=""
              className="size-12 rounded-md border border-border/60 object-cover"
            />
          ) : (
            <div className="grid size-12 place-items-center rounded-md border border-border/60 bg-muted text-muted-foreground">
              <Video className="size-5" aria-hidden />
            </div>
          )}
          <span className="truncate text-xs text-muted-foreground">
            {item.fileName ?? item.url}
          </span>
        </div>
      ) : null}

      {/* Local preview while the upload is still in flight. */}
      {isUploading && displayUrl && item.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt=""
          className="size-16 rounded-md border border-border/60 object-cover"
        />
      ) : null}

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}

      {item.type === "image" && item.url ? (
        <Input
          value={item.caption}
          placeholder={t("fields.caption")}
          onChange={(e) => onChange({ ...item, caption: e.target.value })}
        />
      ) : null}
    </div>
  );
}

function ImageGalleryDialog({
  entry,
  onOpenChange,
  editable,
  pending,
  onSetAsCover,
}: {
  entry: ProviderPortfolio | null;
  onOpenChange: (open: boolean) => void;
  editable: boolean;
  pending: boolean;
  onSetAsCover: (image: ProviderPortfolioImage) => void;
}) {
  const t = useTranslations("Portfolio");
  const [activeIdx, setActiveIdx] = React.useState(0);

  // Reset to the first image whenever we open a different entry.
  useResetOnChange(entry?.id ?? null, () => {
    setActiveIdx(0);
  });

  if (!entry) return null;
  const images = entry.images;
  const active = images[activeIdx];

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{entry.title}</DialogTitle>
          <DialogDescription>
            {t("gallery.imagesCount", { count: images.length })}
          </DialogDescription>
        </DialogHeader>

        {images.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("gallery.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {active ? (
              <figure className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.imageViewUrl ?? active.imageUrl}
                  alt={active.caption ?? ""}
                  className="max-h-[60vh] w-full rounded-lg object-contain"
                />
                {active.caption ? (
                  <figcaption className="text-sm text-muted-foreground">
                    {active.caption}
                  </figcaption>
                ) : null}
              </figure>
            ) : null}

            {images.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {images.map((image, idx) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    aria-label={image.caption ?? t("viewImage")}
                    className={
                      idx === activeIdx
                        ? "size-12 overflow-hidden rounded-md border-2 border-primary"
                        : "size-12 overflow-hidden rounded-md border border-border/60 opacity-80 hover:opacity-100"
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.imageViewUrl ?? image.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {editable && active && entry.coverImageUrl !== active.imageUrl ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => onSetAsCover(active)}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t("gallery.setAsCover")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
