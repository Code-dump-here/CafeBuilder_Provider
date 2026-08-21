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
} from "@/features/projects/design-version-types";
import type { Design, DesignType } from "@/features/projects/design-types";
import {
  useCreateDesignMutation,
  useSubmitDesignMutation,
} from "@/features/projects/use-designs";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

// ---------------------------------------------------------------------------
// NewVersionDialog
//
// Creates a new design by hitting `POST /api/designs`. The wire payload
// is `{ projectWorkingId, title, type }` (see API_FLOW_FE.md §6); we map
// the dialog's local state onto that shape on submit and surface the
// resulting `Design` via `onCreated` so the parent can refresh its
// version list.
//
// There is no version-code input: the backend owns the number. It assigns
// `version = 0.1` on create and bumps it by 0.1 on each `start-revision`,
// and `POST /api/designs` has no field to override it. Asking the user for a
// code only produced a value that was silently thrown away.

interface NewVersionDialogProps {
  /** Engagement id the new design belongs to. When null, the submit
   *  button stays disabled — the parent hasn't resolved the engagement
   *  yet. */
  projectWorkingId: string | null;
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
  projectWorkingId,
  onCreated,
  renderTrigger,
}: NewVersionDialogProps) {
  const t = useTranslations("DesignManagement");
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<DesignType>("concept");
  const [notes, setNotes] = React.useState("");

  useResetOnChange(open, () => {
    if (!open) {
      setName("");
      setCategory("concept");
      setNotes("");
    }
  });

  const createMutation = useCreateDesignMutation({
    onSuccessMessage: null,
    onSuccessSideEffect: (design) => {
      onCreated(design);
      setOpen(false);
    },
  });

  const isPending = createMutation.isPending;
  const canSubmit =
    !isPending &&
    Boolean(projectWorkingId) &&
    name.trim().length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const finalTitle = name.trim();
    if (!finalTitle) return;

    createMutation.mutate({
      projectWorkingId: projectWorkingId as string,
      title: finalTitle,
      type: category,
    });

    // Lightweight UX hint — the real toast/error message is rendered by
    // the mutation once the API resolves. We still call `onCreated` only
    // on success so the parent doesn't refetch twice. No code in this
    // message: the version number only exists once the backend replies.
    projectActionToast(t("dialogs.newVersion.createSubmitted"));
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
          {!projectWorkingId ? (
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
//
// "Publish" maps onto `POST /api/designs/{id}/submit` — the backend moves the
// design `in_progress` → `submitted`, snapshots it into design_versions, and
// notifies the owner for review. There is no separate publish endpoint, and
// submit takes no request body: that is why this dialog has no release-notes
// field (see API_FLOW_FE.md §6).

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
  // Only `in_progress` is publishable. The backend's submit guard is
  // `status == in_progress` — `revision` designs must first go through
  // `POST /start-revision` (which bumps the version and returns them to
  // `in_progress`), and `submitted` / `approved` are already past this
  // step. Offering a `revision` row here would just 409.
  // `version-list-table` derives `publishableCount` with the same rule.
  const publishable = React.useMemo(
    () => versions.filter((v) => v.status === "in_progress"),
    [versions],
  );
  const [open, setOpen] = React.useState(false);
  const [versionId, setVersionId] = React.useState<string | null>(
    publishable[0]?.id.toString() ?? null,
  );

  // Token carries the first publishable id too: the original effect also
  // re-ran when the list changed while closed, so the default selection
  // wouldn't be stale on reopen.
  useResetOnChange(`${open}:${publishable[0]?.id ?? ""}`, () => {
    if (!open) {
      setVersionId(publishable[0]?.id.toString() ?? null);
    }
  });

  const selected =
    publishable.find((v) => v.id.toString() === versionId) ?? null;

  // A row's id *is* the design id (see use-designs.ts `mapDesignToVersion`),
  // so the selected version can be submitted directly.
  const submitMutation = useSubmitDesignMutation({
    // The parent renders the success toast through `onPublished` so we don't
    // stack two toasts for the same action.
    onSuccessMessage: null,
    onSuccessSideEffect: (design) => {
      onPublished(`V${design.version}`);
      setOpen(false);
    },
  });

  const isPending = submitMutation.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || isPending) return;
    // Errors surface as a toast from the mutation (e.g. 400 when the design
    // has no uploaded file yet) and the dialog stays open so the user can fix
    // it without re-picking a version.
    submitMutation.mutate(selected.id);
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
                disabled={isPending}
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
            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  {t("dialogs.publish.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!selected || isPending}>
                {isPending
                  ? t("dialogs.publish.publishing")
                  : t("dialogs.publish.publish")}
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