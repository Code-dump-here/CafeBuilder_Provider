"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectActionToast } from "@/components/project-overview/project-action-toast";
import type {
  DrawingCategory,
  DesignVersion,
} from "@/lib/projects/design-version-types";
import type { Design, DesignType } from "@/lib/projects/design-types";
import { useCreateDesignMutation } from "@/lib/projects/use-designs";

// ---------------------------------------------------------------------------
// NewVersionDialog
//
// Creates a new design by hitting `POST /api/designs`. The wire payload
// is `{ projectWorkingId, title, type, createdBy }` (see API_FLOW_FE.md §6);
// we map the dialog's local state onto that shape on submit and surface
// the resulting `Design` via `onCreated` so the parent can refresh its
// version list.
//
// `nextCode` is retained as a UX hint (the user can still override the
// generated code). Today the backend assigns `version = "0.1"` on
// create; the FE doesn't ship the custom code to the API.

interface NewVersionDialogProps {
  /** Pre-populated next code, e.g. "V4.0". Used when the user leaves the
   * code field empty. */
  nextCode: string;
  /** Engagement id the new design belongs to. When null, the submit
   *  button stays disabled — the parent hasn't resolved the engagement
   *  yet. */
  projectWorkingId: number | null;
  /** Account id of the caller (creator). Same null-when-unknown rule. */
  createdBy: number | null;
  /** Called with the created Design when the API call resolves. */
  onCreated: (design: Design) => void;
  /** Render-prop for the trigger button so the parent controls styling. */
  renderTrigger: (open: () => void) => React.ReactNode;
}

const NEW_VERSION_CATEGORIES: Array<{
  value: DesignType;
  i18nKey: "concept" | "layout2d" | "render3d" | "technicalDrawing";
}> = [
  { value: "concept", i18nKey: "concept" },
  { value: "layout_2d", i18nKey: "layout2d" },
  { value: "render_3d", i18nKey: "render3d" },
  { value: "technical_drawing", i18nKey: "technicalDrawing" },
];

export function NewVersionDialog({
  nextCode,
  projectWorkingId,
  createdBy,
  onCreated,
  renderTrigger,
}: NewVersionDialogProps) {
  const t = useTranslations("DesignManagement");
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [category, setCategory] = React.useState<DesignType>("concept");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setName("");
      setCode("");
      setCategory("concept");
      setNotes("");
    }
  }, [open]);

  const createMutation = useCreateDesignMutation({
    onSuccessMessage: null,
    onErrorMessage: null,
    onSuccessSideEffect: (design) => {
      onCreated(design);
      setOpen(false);
    },
  });

  const isPending = createMutation.isPending;
  const canSubmit =
    !isPending &&
    Boolean(projectWorkingId) &&
    Boolean(createdBy) &&
    name.trim().length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const finalTitle = name.trim();
    if (!finalTitle) return;

    createMutation.mutate({
      projectWorkingId: projectWorkingId as number,
      title: finalTitle,
      type: category,
      createdBy: createdBy as number,
    });

    // Lightweight UX hint — the real toast/error message is rendered by
    // the mutation once the API resolves. We still call `onCreated` only
    // on success so the parent doesn't refetch twice.
    projectActionToast(t("dialogs.newVersion.createSubmitted", { code: code.trim() || nextCode }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {renderTrigger(() => setOpen(true))}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogs.newVersion.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.newVersion.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label={t("dialogs.newVersion.nameLabel")}>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialogs.newVersion.namePlaceholder")}
              required
              disabled={isPending}
            />
          </Field>
          <Field
            label={t("dialogs.newVersion.codeLabel")}
            hint={t("dialogs.newVersion.codeHint", { next: nextCode.replace(/^V/, "") })}
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={nextCode}
              disabled={isPending}
            />
          </Field>
          <Field label={t("dialogs.newVersion.categoryLabel")}>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as DesignType)}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NEW_VERSION_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {t(`tabs.${c.i18nKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("dialogs.newVersion.notesLabel")}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("dialogs.newVersion.notesPlaceholder")}
              rows={3}
              disabled={isPending}
              className="min-h-16 w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-50 dark:bg-input/30"
            />
          </Field>
          {!projectWorkingId || !createdBy ? (
            <p className="rounded-md border border-amber-300/40 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-300">
              {t("dialogs.newVersion.engagementMissing")}
            </p>
          ) : null}
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                {t("dialogs.newVersion.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canSubmit}>
              {isPending
                ? t("dialogs.newVersion.creating")
                : t("dialogs.newVersion.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// PublishRevisionDialog

interface PublishRevisionDialogProps {
  versions: DesignVersion[];
  onPublished: (code: string) => void;
  renderTrigger: (open: () => void) => React.ReactNode;
}

export function PublishRevisionDialog({
  versions,
  onPublished,
  renderTrigger,
}: PublishRevisionDialogProps) {
  const t = useTranslations("DesignManagement");
  // Same gating as the trigger button: skip `submitted` (still awaiting
  // review) and `approved` (locked). See `version-list-table` for the
  // matching `publishableCount` derivation.
  const publishable = React.useMemo(
    () =>
      versions.filter(
        (v) => v.status === "in_progress" || v.status === "revision",
      ),
    [versions],
  );
  const [open, setOpen] = React.useState(false);
  const [versionId, setVersionId] = React.useState<string | null>(
    publishable[0]?.id.toString() ?? null,
  );
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setVersionId(publishable[0]?.id.toString() ?? null);
      setNotes("");
    }
  }, [open, publishable]);

  const selected =
    publishable.find((v) => v.id.toString() === versionId) ?? null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    projectActionToast(t("dialogs.publish.publishComingSoon"));
    onPublished(selected.code);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {renderTrigger(() => setOpen(true))}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogs.publish.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.publish.description")}
          </DialogDescription>
        </DialogHeader>
        {publishable.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
            {t("dialogs.publish.noWorking")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Field label={t("dialogs.publish.selectLabel")}>
              <Select
                value={versionId ?? undefined}
                onValueChange={setVersionId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("dialogs.publish.selectPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {publishable.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.code} — {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("dialogs.publish.notesLabel")}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("dialogs.publish.notesPlaceholder")}
                rows={3}
                className="min-h-16 w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none dark:bg-input/30"
              />
            </Field>
            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("dialogs.publish.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!selected}>
                {t("dialogs.publish.publish")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[10px] text-muted-foreground/80">{hint}</p>
      ) : null}
    </div>
  );
}