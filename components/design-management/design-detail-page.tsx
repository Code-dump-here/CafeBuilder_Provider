"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  Eye,
  ImageOff,
  Loader2,
  Maximize2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OwnerAvatar } from "@/components/data-table";
import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/user-context";
import {
  useApproveDesignMutation,
  useDeleteDesignImageMutation,
  useDesign,
  useRequestDesignRevisionMutation,
  useStartRevisionMutation,
  useSubmitDesignMutation,
  useUploadDesignImageMutation,
  mapDesignTypeToCategory,
} from "@/lib/projects/use-designs";
import type { Design, DesignImage } from "@/lib/projects/design-types";
import type { DesignDrawing, DesignVersion } from "@/lib/projects/design-version-types";

// ─── Adapter: Design → DesignVersion ──────────────────────────────────────
//
// One design = one version in the new model. We project a `Design`
// into the `DesignVersion` shape expected by the viewer so we can reuse
// the existing DrawingTree / DrawingViewer components without rewriting them.

function designToVersion(d: Design): DesignVersion {
  const createdAt = new Date(d.createdAt);
  const updatedAt = new Date(d.updatedAt);
  return {
    id: d.id,
    projectId: d.projectWorkingId,
    code: `V${d.version}`,
    name: d.title,
    description: d.reason ?? null,
    status: mapDesignStatus(d.status),
    category: mapDesignTypeToCategory(d.type),
    owner: {
      id: d.createdBy,
      fullName: "",
      avatarColor: null,
    },
    drawingCount: d.images.length,
    createdAt,
    updatedAt,
    publishedAt: d.status === "approved" ? updatedAt : null,
    latestNote: d.reason ?? null,
    drawings: d.images.map((img) => imageToDrawing(img, d)),
  };
}

function mapDesignStatus(
  s: Design["status"],
): DesignVersion["status"] {
  switch (s) {
    case "approved":
      return "PUBLISHED";
    case "submitted":
    case "in_progress":
    case "revision":
      return "WORKING";
    default:
      return "DRAFT";
  }
}

function imageToDrawing(img: DesignImage, d: Design): DesignDrawing {
  return {
    id: img.id,
    versionId: d.id,
    name: img.caption ?? `Image #${img.id}`,
    code: `IMG-${img.id}`,
    category: mapDesignTypeToCategory(d.type),
    thumbnailUrl: img.viewUrl,
    scale: null,
    sheet: null,
    note: img.caption,
    updatedAt: new Date(img.createdAt),
    updatedBy: String(img.uploadedBy),
  };
}

// ─── Status badge config ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Design["status"],
  { label: string; color: string }
> = {
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  submitted: { label: "Submitted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  revision: { label: "Revision", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

// ─── Props ────────────────────────────────────────────────────────────────

interface DesignDetailPageProps {
  projectId: string;
  /** `projectWorkingId` — needed to fetch the engagement for account resolution. */
  projectWorkingId: number | null;
  /** Account id of the current user (creator for uploads). */
  currentUserId: number | null;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function DesignDetailPage({
  projectId,
  projectWorkingId,
  currentUserId,
}: DesignDetailPageProps) {
  const params = useParams<{ id: string; designId: string }>();
  const designIdRaw = params?.designId ?? "";
  const designId = Number.parseInt(designIdRaw, 10);

  const t = useTranslations("DesignManagement");
  const format = useFormatter();
  const { account } = useCurrentUser();

  const isOwner = account?.role === "owner";
  const isProvider = account?.role === "provider";
  const uid = currentUserId ?? 0;

  // ── Data fetch ──────────────────────────────────────────────────────────
  const {
    design,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDesign({ designId });

  const version: DesignVersion | null = design ? designToVersion(design) : null;

  // ── Selected drawing ──────────────────────────────────────────────────────
  const defaultDrawing = React.useMemo<DesignDrawing | null>(() => {
    if (!version || version.drawings.length === 0) return null;
    return version.drawings[version.drawings.length - 1] ?? null;
  }, [version]);

  const [selectedDrawingId, setSelectedDrawingId] = React.useState<number | null>(null);
  const effectiveDrawing = React.useMemo<DesignDrawing | null>(() => {
    if (selectedDrawingId !== null) {
      return version?.drawings.find((d) => d.id === selectedDrawingId) ?? null;
    }
    return defaultDrawing;
  }, [version, selectedDrawingId, defaultDrawing]);

  // Seed selection once data arrives
  React.useEffect(() => {
    if (selectedDrawingId === null && defaultDrawing) {
      setSelectedDrawingId(defaultDrawing.id);
    }
  }, [defaultDrawing, selectedDrawingId]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const submitMutation = useSubmitDesignMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: () => projectActionToast(t("actions.submitSuccess")),
  });
  const approveMutation = useApproveDesignMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: () => projectActionToast(t("actions.approveSuccess")),
  });
  const requestRevisionMutation = useRequestDesignRevisionMutation({
    onSuccessMessage: null,
  });
  const startRevisionMutation = useStartRevisionMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: () => projectActionToast(t("actions.revisionStarted")),
  });

  const uploadMutation = useUploadDesignImageMutation(designId, {
    onSuccessMessage: null,
  });
  const deleteImageMutation = useDeleteDesignImageMutation(designId, {
    onSuccessMessage: null,
  });

  // ── Error / loading states ─────────────────────────────────────────────
  if (Number.isNaN(designId) || (!isLoading && isError)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertTriangle aria-hidden className="size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t("version.notFound")}</p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/projects/${projectId}/design-management`}>
            <ArrowLeft aria-hidden />
            {t("version.backToList")}
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Loader2 aria-hidden className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("version.loading")}</p>
      </div>
    );
  }

  if (!design || !version) return null;

  const statusCfg = STATUS_CONFIG[design.status];
  const isApproved = design.status === "approved";
  const canUpload = !isApproved && isProvider;
  const canDeleteImage = !isApproved && isProvider;
  const canSubmit = design.status === "in_progress" && isProvider && design.images.length > 0;
  const canApprove = design.status === "submitted" && isOwner;
  const canRequestRevision = design.status === "submitted" && isOwner;
  const canStartRevision = design.status === "revision" && isProvider;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"
      >
        <Link href={`/projects/${projectId}/design-management`} className="hover:text-foreground">
          {t("crumbs.versions")}
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <Link href={`/projects/${projectId}/design-management`} className="hover:text-foreground">
          {version.code}
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <span className="font-semibold text-foreground">{version.name}</span>
      </nav>

      {/* Three-column layout */}
      <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        {/* Left: image list */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <ImageListPanel
            images={design.images}
            selectedId={effectiveDrawing?.id ?? null}
            onSelect={(img) => setSelectedDrawingId(img.id)}
            canDelete={canDeleteImage}
            onDelete={(img) => deleteImageMutation.mutate(img.id)}
            isDeleting={deleteImageMutation.isPending}
            canUpload={canUpload}
            onUpload={async (file) => {
              if (!currentUserId) return;
              uploadMutation.mutate({ file, caption: "", uploadedBy: currentUserId });
            }}
            isUploading={uploadMutation.isPending}
          />
        </div>

        {/* Center: viewer */}
        <DesignImageViewer
          image={effectiveDrawing}
          images={version.drawings}
          version={version}
          onSelect={(d) => setSelectedDrawingId(d.id)}
        />

        {/* Right: version info + actions */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card p-4">
          <VersionInfoRail
            design={design}
            version={version}
            statusCfg={statusCfg}
            format={format}
            t={t}
            onSubmit={() => submitMutation.mutate(designId)}
            onApprove={() => approveMutation.mutate(designId)}
            onRequestRevision={() => {
              const reason = window.prompt(t("actions.requestRevisionPrompt"));
              if (!reason?.trim()) return;
              requestRevisionMutation.mutate({ designId, payload: { reason } });
            }}
            onStartRevision={() => startRevisionMutation.mutate(designId)}
            canSubmit={canSubmit}
            canApprove={canApprove}
            canRequestRevision={canRequestRevision}
            canStartRevision={canStartRevision}
            isSubmitting={submitMutation.isPending}
            isApproving={approveMutation.isPending}
            isRequestingRevision={requestRevisionMutation.isPending}
            isStartingRevision={startRevisionMutation.isPending}
          />
        </div>
      </div>

      {/* Footer note */}
      {version.latestNote ? (
        <p className="hidden rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground lg:block">
          <span className="font-semibold text-foreground/80">{t("version.latestNoteLabel")}:</span>{" "}
          {version.latestNote} · {format.dateTime(version.updatedAt, { dateStyle: "medium" })}
        </p>
      ) : null}
    </div>
  );
}

// ─── Image List Panel ─────────────────────────────────────────────────────

interface ImageListPanelProps {
  images: DesignImage[];
  selectedId: number | null;
  onSelect: (img: DesignImage) => void;
  canDelete: boolean;
  onDelete: (img: DesignImage) => void;
  isDeleting: boolean;
  canUpload: boolean;
  onUpload: (file: File) => void;
  isUploading: boolean;
}

function ImageListPanel({
  images,
  selectedId,
  onSelect,
  canDelete,
  onDelete,
  isDeleting,
  canUpload,
  onUpload,
  isUploading,
}: ImageListPanelProps) {
  const t = useTranslations("DesignManagement");
  const [dragOver, setDragOver] = React.useState(false);
  const [captionDialog, setCaptionDialog] = React.useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const preview = URL.createObjectURL(file);
    setCaptionDialog({ file, preview });
  };

  const handleUploadConfirm = () => {
    if (!captionDialog) return;
    onUpload(captionDialog.file);
    URL.revokeObjectURL(captionDialog.preview);
    setCaptionDialog(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const isImage = (file: File) =>
    file.type.startsWith("image/");

  if (images.length === 0 && !canUpload) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
          {t("version.noImages")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
        <header className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("tree.heading")}
          </p>
        </header>

        {/* Upload drop zone */}
        {canUpload && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-xs transition-colors",
              dragOver
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            {isUploading ? (
              <Loader2 aria-hidden className="size-5 animate-spin" />
            ) : (
              <Upload aria-hidden className="size-5" />
            )}
            <span>{t("upload.dropOrClick")}</span>
          </div>
        )}

        {/* Image list */}
        <ul className="flex flex-col gap-1">
          {images.map((img) => {
            const isSelected = img.id === selectedId;
            return (
              <li key={img.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(img)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(img);
                    }
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    isSelected
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-transparent hover:bg-muted/60",
                  )}
                >
                  <div className="size-8 shrink-0 overflow-hidden rounded bg-muted">
                    {img.viewUrl ? (
                      <img
                        src={img.viewUrl}
                        alt={img.caption ?? `Image ${img.id}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageOff aria-hidden className="size-full p-1.5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate">
                    {img.caption ?? `Image #${img.id}`}
                  </span>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(img);
                      }}
                      disabled={isDeleting}
                      aria-label="Delete image"
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 aria-hidden className="size-3" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Caption dialog */}
      {captionDialog && (
        <Dialog open onOpenChange={(open) => !open && setCaptionDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("upload.captionTitle")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <img
                src={captionDialog.preview}
                alt="Preview"
                className="max-h-48 w-full rounded-md object-contain bg-muted"
              />
              <Input
                placeholder={t("upload.captionPlaceholder")}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUploadConfirm();
                }}
                id="upload-caption"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCaptionDialog(null)}>
                  {t("upload.cancel")}
                </Button>
                <Button onClick={handleUploadConfirm} disabled={isUploading}>
                  {isUploading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Upload aria-hidden className="size-4" />}
                  {t("upload.confirm")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── Image Viewer ─────────────────────────────────────────────────────────

interface DesignImageViewerProps {
  image: DesignDrawing | null;
  images: DesignDrawing[];
  version: DesignVersion;
  onSelect: (d: DesignDrawing) => void;
}

function DesignImageViewer({ image, images, version, onSelect }: DesignImageViewerProps) {
  const t = useTranslations("DesignManagement");
  const format = useFormatter();
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => { setImgError(false); }, [image?.id]);

  const currentIndex = image ? images.findIndex((d) => d.id === image.id) : -1;
  const prevImage = currentIndex > 0 ? images[currentIndex - 1] : null;
  const nextImage = currentIndex >= 0 && currentIndex < images.length - 1 ? images[currentIndex + 1] : null;

  if (!image) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {t("viewer.empty")}
      </div>
    );
  }

  return (
    <article className="flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">{image.code}</span>
        <span aria-hidden>/</span>
        <span className="truncate font-medium text-foreground/80">{image.name}</span>
        <span aria-hidden>/</span>
        <span className="truncate">{version.name}</span>
      </header>

      {/* Image area */}
      <div className="relative flex-1 bg-stone-50 px-4 py-4 dark:bg-stone-950/40">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-center">
          {image.thumbnailUrl && !imgError ? (
            <img
              src={image.thumbnailUrl}
              alt={image.name}
              onError={() => setImgError(true)}
              className="max-h-full max-w-full rounded-md border border-border/40 bg-white object-contain shadow-sm dark:bg-stone-100"
            />
          ) : (
            <div className="flex aspect-video w-full max-w-5xl items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted text-xs text-muted-foreground">
              <ImageOff aria-hidden className="size-4" />
              {t("viewer.unavailable")}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock aria-hidden className="size-3" />
          <span>{format.dateTime(image.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" disabled={!prevImage} onClick={() => prevImage && onSelect(prevImage)}>
            <ChevronLeft aria-hidden />
            {t("viewer.prev")}
          </Button>
          <span className="rounded border border-border/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {currentIndex + 1} / {images.length}
          </span>
          <Button size="sm" variant="outline" disabled={!nextImage} onClick={() => nextImage && onSelect(nextImage)}>
            {t("viewer.next")}
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </footer>
    </article>
  );
}

// ─── Version Info Rail ────────────────────────────────────────────────────

interface VersionInfoRailProps {
  design: Design;
  version: DesignVersion;
  statusCfg: { label: string; color: string };
  format: ReturnType<typeof useFormatter>;
  t: ReturnType<typeof useTranslations>;
  onSubmit: () => void;
  onApprove: () => void;
  onRequestRevision: () => void;
  onStartRevision: () => void;
  canSubmit: boolean;
  canApprove: boolean;
  canRequestRevision: boolean;
  canStartRevision: boolean;
  isSubmitting: boolean;
  isApproving: boolean;
  isRequestingRevision: boolean;
  isStartingRevision: boolean;
}

function VersionInfoRail({
  design,
  version,
  statusCfg,
  format,
  t,
  onSubmit,
  onApprove,
  onRequestRevision,
  onStartRevision,
  canSubmit,
  canApprove,
  canRequestRevision,
  canStartRevision,
  isSubmitting,
  isApproving,
  isRequestingRevision,
  isStartingRevision,
}: VersionInfoRailProps) {
  const isPending =
    isSubmitting || isApproving || isRequestingRevision || isStartingRevision;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Version meta */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-foreground">{version.code}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", statusCfg.color)}>
            {statusCfg.label}
          </span>
        </div>
        <h2 className="text-sm font-semibold text-foreground">{version.name}</h2>
        <p className="text-xs text-muted-foreground">
          {t("version.uploadedBy")} {format.dateTime(version.createdAt, { dateStyle: "medium" })}
        </p>
        {design.reason && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <span className="font-semibold">{t("version.revisionReason")}:</span>{" "}
            {design.reason}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-auto flex flex-col gap-2">
        {canSubmit && (
          <Button onClick={onSubmit} disabled={isPending} className="w-full">
            <Send aria-hidden className="size-4" />
            {t("actions.submitForReview")}
          </Button>
        )}
        {canApprove && (
          <Button onClick={onApprove} disabled={isPending} variant="default" className="w-full">
            <Eye aria-hidden className="size-4" />
            {t("actions.approve")}
          </Button>
        )}
        {canRequestRevision && (
          <Button onClick={onRequestRevision} disabled={isPending} variant="outline" className="w-full">
            <RefreshCw aria-hidden className="size-4" />
            {t("actions.requestRevision")}
          </Button>
        )}
        {canStartRevision && (
          <Button onClick={onStartRevision} disabled={isPending} variant="outline" className="w-full">
            <Edit2 aria-hidden className="size-4" />
            {t("actions.startRevision")}
          </Button>
        )}
        {!canSubmit && !canApprove && !canRequestRevision && !canStartRevision && (
          <p className="text-center text-xs text-muted-foreground">
            {design.status === "approved"
              ? t("actions.alreadyApproved")
              : design.status === "submitted"
              ? t("actions.awaitingOwnerReview")
              : t("actions.noActionsAvailable")}
          </p>
        )}
      </div>
    </div>
  );
}
