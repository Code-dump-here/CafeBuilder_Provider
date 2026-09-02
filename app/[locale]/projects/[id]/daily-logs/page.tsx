"use client";

import * as React from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  ClipboardList,
  CloudSun,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCurrentUser } from "@/features/auth/user-context";
import { useEngagements } from "@/features/projects/use-engagements";
import { useConstructionItems } from "@/features/projects/use-construction";
import {
  useCreateDailyLogMutation,
  useDailyLogs,
  useDeleteDailyLogMutation,
  useUpdateDailyLogMutation,
} from "@/features/projects/use-daily-logs";
import {
  todayInVietnam,
  type DailyLog,
  type DailyLogMediaInput,
} from "@/features/projects/daily-log-types";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { uploadFileApi } from "@/lib/http/file-upload-api";
import { proxiedImageSrc } from "@/lib/image-proxy";
import { notifyError } from "@/lib/notify";

/**
 * The provider's daily site report.
 *
 * Writing requires an `accepted` engagement (the server enforces it), but
 * reading stays open at every status so both sides can still consult the log
 * after handover — which is why this page renders the list before it decides
 * whether to offer the "write" button.
 */

const ALL_ITEMS = "__all__";
const NO_ITEM = "__none__";

export default function ProviderDailyLogsPage() {
  const t = useTranslations("DailyLogs");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";

  const { account } = useCurrentUser();
  const viewerProfileId = account?.serviceProvider?.id ?? null;

  const { engagements, isLoading: loadingEngagements } = useEngagements({
    projectId,
    providerId: viewerProfileId ?? undefined,
    pageSize: 10,
    enabled: Boolean(projectId) && viewerProfileId != null,
  });

  const engagement = React.useMemo(
    () => engagements.find((e) => e.status === "accepted") ?? engagements[0] ?? null,
    [engagements],
  );
  const canWrite = engagement?.status === "accepted";

  const [itemFilter, setItemFilter] = React.useState<string>(ALL_ITEMS);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DailyLog | null>(null);
  const [deleting, setDeleting] = React.useState<DailyLog | null>(null);

  const { topLevelItems } = useConstructionItems({
    projectWorkingId: engagement?.id ?? "",
    pageSize: 100,
    enabled: Boolean(engagement),
  });

  const { logs, totalItems, isLoading, isError, error, refetch } = useDailyLogs({
    projectWorkingId: itemFilter === ALL_ITEMS ? engagement?.id : undefined,
    constructionItemId: itemFilter === ALL_ITEMS ? undefined : itemFilter,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    pageSize: 50,
    enabled: Boolean(engagement),
  });

  const createMutation = useCreateDailyLogMutation();
  const updateMutation = useUpdateDailyLogMutation();
  const deleteMutation = useDeleteDailyLogMutation();

  if (loadingEngagements) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ClipboardList}
          title={t("noEngagement.title")}
          description={t("noEngagement.description")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("subtitleProvider")}
          </p>
        </div>
        {canWrite ? (
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus aria-hidden />
            {t("create")}
          </Button>
        ) : null}
      </header>

      {/* Reading survives handover; writing does not. Saying so beats leaving
          the page looking broken to a provider whose work has been accepted. */}
      {!canWrite ? (
        <p className="rounded-md border border-border/70 bg-muted/40 p-3 text-sm text-muted-foreground">
          {t("readOnlyNotice")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("filters.item")}
          </label>
          <Select value={itemFilter} onValueChange={setItemFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ITEMS}>{t("filters.allItems")}</SelectItem>
              {topLevelItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("filters.from")}
          </label>
          <Input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("filters.to")}
          </label>
          <Input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        {fromDate || toDate || itemFilter !== ALL_ITEMS ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setItemFilter(ALL_ITEMS);
            }}
          >
            <X aria-hidden />
            {t("filters.clear")}
          </Button>
        ) : null}
        <p className="ml-auto text-xs text-muted-foreground">
          {t("count", { count: totalItems })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title={t("error.title")}
          subtitle={t("error.subtitle")}
          retryLabel={t("error.retry")}
          message={error?.message}
          onRetry={() => void refetch()}
        />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t("empty.title")}
          description={t("empty.providerDescription")}
          {...(canWrite
            ? {
                actionLabel: t("create"),
                onAction: () => {
                  setEditing(null);
                  setEditorOpen(true);
                },
              }
            : {})}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <DailyLogBody log={log} locale={locale} />

                {canWrite ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(log);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil aria-hidden />
                      {t("actions.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(log)}
                    >
                      <Trash2 aria-hidden />
                      {t("actions.delete")}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DailyLogEditorDialog
        open={editorOpen}
        onOpenChange={(next) => {
          setEditorOpen(next);
          if (!next) setEditing(null);
        }}
        initial={editing}
        items={topLevelItems.map((item) => ({ id: item.id, name: item.name }))}
        pending={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          const done = () => {
            setEditorOpen(false);
            setEditing(null);
          };
          if (editing) {
            updateMutation.mutate({ id: editing.id, payload: values }, { onSuccess: done });
          } else {
            createMutation.mutate(
              { projectWorkingId: engagement.id, ...values, workDone: values.workDone! },
              { onSuccess: done },
            );
          }
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title={t("delete.title")}
        description={t("delete.description")}
        confirmLabel={t("delete.confirm")}
        cancelLabel={t("dialog.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

/** One log entry, read-only. Shared with any other view of the same data. */
export function DailyLogBody({ log, locale }: { log: DailyLog; locale: string }) {
  const t = useTranslations("DailyLogs");

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="gap-1">
              <CalendarDays className="size-3" aria-hidden />
              {new Date(`${log.logDate}T00:00:00`).toLocaleDateString(locale)}
            </Badge>
            {log.constructionItemName ? (
              <Badge variant="outline">{log.constructionItemName}</Badge>
            ) : null}
            {log.constructionTaskName ? (
              <Badge variant="outline">{log.constructionTaskName}</Badge>
            ) : null}
          </div>
          {log.createdByName ? (
            <p className="text-xs text-muted-foreground">
              {t("byline", { name: log.createdByName })}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {log.workerCount != null ? (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {t("workers", { count: log.workerCount })}
            </span>
          ) : null}
          {log.weatherNote ? (
            <span className="flex items-center gap-1">
              <CloudSun className="size-3.5" aria-hidden />
              {log.weatherNote}
            </span>
          ) : null}
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed">{log.workDone}</p>

      {log.issueNote ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500"
            aria-hidden
          />
          <p className="whitespace-pre-wrap text-sm">{log.issueNote}</p>
        </div>
      ) : null}

      {log.media.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {log.media.map((media) =>
            media.mediaType === "video" ? (
              <video
                key={media.id}
                src={media.mediaViewUrl ?? undefined}
                controls
                className="h-28 rounded-md border border-border/70"
              />
            ) : (
              <a
                key={media.id}
                href={media.mediaViewUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                title={media.caption ?? undefined}
              >
                <Image
                  src={proxiedImageSrc(media.mediaViewUrl ?? "")}
                  alt={media.caption ?? t("photoAlt")}
                  width={112}
                  height={112}
                  className="size-28 rounded-md border border-border/70 object-cover"
                  unoptimized
                />
              </a>
            ),
          )}
        </div>
      ) : null}
    </>
  );
}

interface DailyLogFormValues {
  constructionItemId?: string;
  logDate?: string;
  workDone?: string;
  issueNote?: string;
  weatherNote?: string;
  workerCount?: number;
  media?: DailyLogMediaInput[];
}

function DailyLogEditorDialog({
  open,
  onOpenChange,
  initial,
  items,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DailyLog | null;
  items: { id: string; name: string }[];
  pending: boolean;
  onSubmit: (values: DailyLogFormValues) => void;
}) {
  const t = useTranslations("DailyLogs");

  const [logDate, setLogDate] = React.useState(todayInVietnam());
  const [itemId, setItemId] = React.useState<string>(NO_ITEM);
  const [workDone, setWorkDone] = React.useState("");
  const [issueNote, setIssueNote] = React.useState("");
  const [weatherNote, setWeatherNote] = React.useState("");
  const [workerCount, setWorkerCount] = React.useState("");
  const [media, setMedia] = React.useState<DailyLogMediaInput[]>([]);
  const [uploading, setUploading] = React.useState(false);

  useResetOnChange(open ? (initial?.id ?? "new") : null, () => {
    setLogDate(initial?.logDate ?? todayInVietnam());
    setItemId(initial?.constructionItemId ?? NO_ITEM);
    setWorkDone(initial?.workDone ?? "");
    setIssueNote(initial?.issueNote ?? "");
    setWeatherNote(initial?.weatherNote ?? "");
    setWorkerCount(initial?.workerCount != null ? String(initial.workerCount) : "");
    setMedia(
      initial?.media.map((m) => ({
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        caption: m.caption ?? undefined,
      })) ?? [],
    );
  });

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const result = await uploadFileApi(file);
          return {
            mediaUrl: result.objectName,
            mediaType: file.type.startsWith("video/")
              ? ("video" as const)
              : ("image" as const),
          };
        }),
      );
      setMedia((current) => [...current, ...uploaded]);
    } catch {
      notifyError(t("editor.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const valid = workDone.trim().length > 0 && logDate.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? t("editor.editTitle") : t("editor.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("editor.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("editor.logDate")}</label>
              <Input
                type="date"
                value={logDate}
                // The server refuses a future date against Vietnam time; the
                // picker enforces the same bound so it can't be reached.
                max={todayInVietnam()}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("editor.item")}</label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ITEM}>{t("editor.noItem")}</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("editor.workDone")}</label>
            <Textarea
              rows={5}
              value={workDone}
              placeholder={t("editor.workDonePlaceholder")}
              onChange={(e) => setWorkDone(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("editor.issueNote")}</label>
            <Textarea
              rows={3}
              value={issueNote}
              placeholder={t("editor.issueNotePlaceholder")}
              onChange={(e) => setIssueNote(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("editor.weatherNote")}</label>
              <Input
                value={weatherNote}
                placeholder={t("editor.weatherPlaceholder")}
                onChange={(e) => setWeatherNote(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("editor.workerCount")}</label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={workerCount}
                onChange={(e) => setWorkerCount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t("editor.media")}</label>
            <div className="flex flex-wrap gap-2">
              {media.map((item, index) => (
                <span
                  key={`${item.mediaUrl}-${index}`}
                  className="flex items-center gap-1 rounded-full border border-border/70 py-1 pl-2.5 pr-1 text-xs"
                >
                  <span className="max-w-40 truncate">{item.mediaUrl}</span>
                  <button
                    type="button"
                    aria-label={t("editor.removeMedia")}
                    className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setMedia((rows) => rows.filter((_, i) => i !== index))
                    }
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </span>
              ))}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                {uploading ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-3" aria-hidden />
                )}
                {t("editor.addMedia")}
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const files = e.target.files;
                    e.target.value = "";
                    if (files && files.length > 0) void handleUpload(files);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button
            disabled={pending || uploading || !valid}
            onClick={() =>
              onSubmit({
                logDate,
                // The update endpoint treats null as "keep", so there is no way
                // to detach an anchor once set — leaving it off a create is the
                // only way to file an unanchored entry.
                ...(itemId === NO_ITEM ? {} : { constructionItemId: itemId }),
                workDone: workDone.trim(),
                issueNote: issueNote.trim() || undefined,
                weatherNote: weatherNote.trim() || undefined,
                workerCount: workerCount === "" ? undefined : Number(workerCount),
                media,
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("editor.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
