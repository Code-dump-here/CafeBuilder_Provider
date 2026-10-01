"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  Loader2,
  Ruler,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { EngagementDesignSummary } from "@/features/projects/engagement-types";
import type { DesignType } from "@/features/projects/design-types";

/**
 * Read-only approved-drawings view.
 *
 * Renders `EngagementDesignSummary[]` returned by
 * `GET /api/project-workings/{id}/overview` — the designs the owner has
 * approved, each with its images. The images are shown right here, in a
 * grid with a lightbox, because this view is the constructor's only way in:
 * the per-design detail page (`/design-management/{designId}`) reads
 * `GET /api/designs/{id}`, which answers 401 to anyone outside the
 * designer's engagement, and it carries the full version history, which
 * the constructor is not meant to see. So there is no link onward — what
 * is on this page is the final set, and nothing else.
 *
 * Used by `/projects/[id]/technical-drawings`.
 *
 * i18n strings are injected via the `labels` prop so each page can
 * pass its own namespace (no `useTranslations` coupling here — the
 * component stays a leaf and renders the same in any page context).
 */
export interface ApprovedDrawingsViewLabels {
  empty: string;
  versionPrefix: string;
  loading: string;
  errorTitle: string;
  errorSubtitle: string;
  retry: string;
  footer: string;
  noImages: string;
  typeLabel: (type: DesignType) => string;
  approvedOn: (updatedAt: string) => string;
  imageCount: (count: number) => string;
  viewer: {
    prev: string;
    next: string;
    openOriginal: string;
    unavailable: string;
  };
}

export interface ApprovedDrawingsViewProps {
  approvedDesigns: EngagementDesignSummary[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRefetch: () => void;
  title: string;
  subtitle: string;
  labels: ApprovedDrawingsViewLabels;
}

/** Which image the lightbox is showing — `null` while it is closed. */
type LightboxTarget = { designIndex: number; imageIndex: number } | null;

export function ApprovedDrawingsView({
  approvedDesigns,
  isLoading,
  isFetching,
  isError,
  onRefetch,
  title,
  subtitle,
  labels,
}: ApprovedDrawingsViewProps) {
  const [lightbox, setLightbox] = React.useState<LightboxTarget>(null);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>

      {isError ? (
        <ApprovedDrawingsErrorBanner
          labels={labels}
          onRetry={onRefetch}
        />
      ) : isLoading ? (
        <ApprovedDrawingsSkeleton />
      ) : approvedDesigns.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <ul aria-label={title} className="flex flex-col gap-4">
          {approvedDesigns.map((design, designIndex) => (
            <li key={design.id}>
              <ApprovedDesignCard
                design={design}
                labels={labels}
                onOpenImage={(imageIndex) =>
                  setLightbox({ designIndex, imageIndex })
                }
              />
            </li>
          ))}
        </ul>
      )}

      {isFetching && !isLoading && !isError ? (
        <p
          aria-live="polite"
          className="flex items-center justify-center gap-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground"
        >
          <Loader2 className="size-3 animate-spin" aria-hidden />
          {labels.loading}
        </p>
      ) : null}

      {!isLoading && approvedDesigns.length > 0 && !isError ? (
        <p className="text-center text-[12px] text-muted-foreground">
          {labels.footer}
        </p>
      ) : null}

      <DrawingLightbox
        target={lightbox}
        approvedDesigns={approvedDesigns}
        labels={labels}
        onChange={setLightbox}
      />
    </section>
  );
}

function ApprovedDesignCard({
  design,
  labels,
  onOpenImage,
}: {
  design: EngagementDesignSummary;
  labels: ApprovedDrawingsViewLabels;
  onOpenImage: (imageIndex: number) => void;
}) {
  const images = design.images ?? [];

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4">
      <header className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
          <Ruler aria-hidden className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-sm font-semibold break-words text-foreground">
            {design.title}
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
            <span className="rounded-full border border-border/60 px-2 py-0.5 font-medium text-foreground/80">
              {labels.typeLabel(design.type)}
            </span>
            <span>
              {labels.versionPrefix}
              {design.version}
            </span>
            <span aria-hidden>·</span>
            <span>{labels.approvedOn(design.updatedAt)}</span>
            <span aria-hidden>·</span>
            <span>{labels.imageCount(images.length)}</span>
          </p>
        </div>
      </header>

      {images.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
          {labels.noImages}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, imageIndex) => (
            <button
              key={image.id}
              type="button"
              onClick={() => onOpenImage(imageIndex)}
              aria-label={`${design.title} — ${imageIndex + 1}/${images.length}`}
              className="group flex flex-col gap-1.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <DrawingImage
                src={image.viewUrl}
                alt={image.caption ?? design.title}
                unavailable={labels.viewer.unavailable}
                className="aspect-[4/3] w-full transition-shadow duration-150 group-hover:shadow-e1"
              />
              {image.caption ? (
                <span className="text-[12px] break-words text-muted-foreground">
                  {image.caption}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

/**
 * A drawing on its white plate. The plate stays light in both themes on
 * purpose (same as the designer's viewer): a drawing is ink on paper, and
 * inverting its backing makes the linework unreadable.
 */
function DrawingImage({
  src,
  alt,
  unavailable,
  className,
}: {
  src: string;
  alt: string;
  unavailable: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted text-xs text-muted-foreground",
          className,
        )}
      >
        <ImageOff aria-hidden className="size-4" />
        {unavailable}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(
        "rounded-md border border-border/40 bg-white object-contain dark:bg-stone-100",
        className,
      )}
    />
  );
}

function DrawingLightbox({
  target,
  approvedDesigns,
  labels,
  onChange,
}: {
  target: LightboxTarget;
  approvedDesigns: EngagementDesignSummary[];
  labels: ApprovedDrawingsViewLabels;
  onChange: (next: LightboxTarget) => void;
}) {
  const design = target ? approvedDesigns[target.designIndex] : undefined;
  const images = design?.images ?? [];
  const image = target ? images[target.imageIndex] : undefined;
  const open = design != null && image != null;

  const go = (delta: number) => {
    if (!target) return;
    const next = target.imageIndex + delta;
    if (next < 0 || next >= images.length) return;
    onChange({ ...target, imageIndex: next });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onChange(null)}>
      {open ? (
        <DialogContent
          className="sm:max-w-5xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
          }}
        >
          <DialogHeader className="pr-8">
            <DialogTitle className="break-words">{design.title}</DialogTitle>
            <DialogDescription>
              {labels.typeLabel(design.type)} · {labels.versionPrefix}
              {design.version} · {labels.approvedOn(design.updatedAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center rounded-md bg-muted/40 p-3">
            {/* Keyed by image so prev/next remounts it: a failed image must
                not leave the next one stuck on the placeholder. */}
            <DrawingImage
              key={image.id}
              src={image.viewUrl}
              alt={image.caption ?? design.title}
              unavailable={labels.viewer.unavailable}
              // A fixed box with `object-contain`, not `max-*` bounds: those
              // only shrink, so a small file stayed a few pixels wide.
              className="h-[65dvh] w-full"
            />
          </div>

          {image.caption ? (
            <p className="text-center text-xs break-words text-muted-foreground">
              {image.caption}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={image.viewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
                {labels.viewer.openOriginal}
              </a>
            </Button>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={target!.imageIndex === 0}
                onClick={() => go(-1)}
              >
                <ChevronLeft aria-hidden />
                {labels.viewer.prev}
              </Button>
              <span className="rounded border border-border/60 px-2 py-0.5 font-mono text-[12px] text-muted-foreground">
                {target!.imageIndex + 1} / {images.length}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={target!.imageIndex >= images.length - 1}
                onClick={() => go(1)}
              >
                {labels.viewer.next}
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function ApprovedDrawingsSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border/40 bg-muted/20 px-3 py-3"
        >
          <div className="size-9 animate-pulse rounded-md bg-muted" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ApprovedDrawingsErrorBanner({
  labels,
  onRetry,
}: {
  labels: ApprovedDrawingsViewLabels;
  onRetry: () => void;
}) {
  // Local translator fallback for callers that didn't pass labels —
  // shouldn't happen in production, but keeps the component safe to
  // render standalone during tests.
  const t = useTranslations("DesignManagement");
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border/60 bg-card p-8 text-center"
    >
      <p className="text-sm font-medium text-foreground">
        {labels.errorTitle}
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        {labels.errorSubtitle}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {labels.retry ?? t("errorBanner.retry")}
      </Button>
    </div>
  );
}
