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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.imageViewUrl ?? image.imageUrl}
                        alt={image.caption ?? ""}
                        className="size-28 rounded-lg border border-border/60 object-cover"
                      />
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => removeImageMutation.mutate(image.id)}
                          className="absolute right-1 top-1 hidden rounded-full bg-background/90 p-1 group-hover:block"
                        >
                          <Trash2 className="size-3 text-destructive" aria-hidden />
                          <span className="sr-only">{t("removeImage")}</span>
                        </button>
                      ) : null}
                      {image.caption ? (
                        <figcaption className="mt-1 w-28 truncate text-[11px] text-muted-foreground">
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
    coverImageUrl?: string;
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
  const [videoUrl, setVideoUrl] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
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
    setVideoUrl(initial?.videoUrl ?? "");
    setCoverImageUrl(initial?.coverImageUrl ?? "");
    setIsFeatured(initial?.isFeatured ?? false);
  });

  const num = (value: string) => {
    const parsed = Number(value.trim());
    return value.trim() === "" || !Number.isFinite(parsed) ? undefined : parsed;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
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
          <TextField
            label={t("fields.videoUrl")}
            value={videoUrl}
            onChange={setVideoUrl}
          />
          <TextField
            label={t("fields.coverImageUrl")}
            value={coverImageUrl}
            onChange={setCoverImageUrl}
          />

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
            disabled={pending || title.trim().length === 0}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                description: description.trim() || undefined,
                role: role as PortfolioRole,
                style: style.trim() || undefined,
                location: location.trim() || undefined,
                areaM2: num(areaM2),
                contractValue: num(contractValue),
                completedAt: completedAt || undefined,
                durationDays: num(durationDays),
                videoUrl: videoUrl.trim() || undefined,
                coverImageUrl: coverImageUrl.trim() || undefined,
                isFeatured,
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
