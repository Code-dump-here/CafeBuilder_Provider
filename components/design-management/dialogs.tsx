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

// ---------------------------------------------------------------------------
// NewVersionDialog

interface NewVersionDialogProps {
  /** Pre-populated next code, e.g. "V4.0". Used when the user leaves the
   * code field empty. */
  nextCode: string;
  /** Called with the chosen code when the user confirms. */
  onCreated: (code: string) => void;
  /** Render-prop for the trigger button so the parent controls styling. */
  renderTrigger: (open: () => void) => React.ReactNode;
}

const NEW_VERSION_CATEGORIES: Array<{
  value: DrawingCategory;
  i18nKey: "revision" | "floorPlan" | "threeD" | "elevation" | "section";
}> = [
  { value: "REVISION", i18nKey: "revision" },
  { value: "FLOOR_PLAN", i18nKey: "floorPlan" },
  { value: "3D", i18nKey: "threeD" },
  { value: "ELEVATION", i18nKey: "elevation" },
  { value: "SECTION", i18nKey: "section" },
];

export function NewVersionDialog({
  nextCode,
  onCreated,
  renderTrigger,
}: NewVersionDialogProps) {
  const t = useTranslations("DesignManagement");
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [category, setCategory] = React.useState<DrawingCategory>("REVISION");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setName("");
      setCode("");
      setCategory("REVISION");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    const finalCode = code.trim() || nextCode;
    projectActionToast(t("dialogs.newVersion.createComingSoon"));
    onCreated(finalCode);
    setOpen(false);
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
            />
          </Field>
          <Field label={t("dialogs.newVersion.categoryLabel")}>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as DrawingCategory)}
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
              className="min-h-16 w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none dark:bg-input/30"
            />
          </Field>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t("dialogs.newVersion.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!name.trim()}>
              {t("dialogs.newVersion.create")}
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
  const working = React.useMemo(
    () => versions.filter((v) => v.status === "WORKING"),
    [versions],
  );
  const [open, setOpen] = React.useState(false);
  const [versionId, setVersionId] = React.useState<string | null>(
    working[0]?.id.toString() ?? null,
  );
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setVersionId(working[0]?.id.toString() ?? null);
      setNotes("");
    }
  }, [open, working]);

  const selected = working.find((v) => v.id.toString() === versionId) ?? null;

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
        {working.length === 0 ? (
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
                  {working.map((v) => (
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

// ---------------------------------------------------------------------------
// AddCategoryDialog
//
// Captures a single label for a new custom category and notifies the
// parent via `onAdd`. The parent owns persistence (today: local React
// state via CustomCategoriesProvider). Built-in categories cannot be
// re-created — duplicate labels are silently rejected at the provider
// level so this dialog just confirms whether the new tab was accepted.

interface AddCategoryDialogProps {
  onAdd: (label: string) => { id: string; label: string } | null;
  renderTrigger: (open: () => void) => React.ReactNode;
}

export function AddCategoryDialog({
  onAdd,
  renderTrigger,
}: AddCategoryDialogProps) {
  const t = useTranslations("DesignManagement");
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");

  React.useEffect(() => {
    if (!open) setLabel("");
  }, [open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const created = onAdd(trimmed);
    if (!created) {
      projectActionToast(t("dialogs.addCategory.duplicate"));
      return;
    }
    projectActionToast(
      t("dialogs.addCategory.created", { label: created.label }),
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {renderTrigger(() => setOpen(true))}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogs.addCategory.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.addCategory.description")}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          <Field label={t("dialogs.addCategory.label")}>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t("dialogs.addCategory.placeholder")}
              autoFocus
              autoComplete="off"
            />
          </Field>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t("dialogs.addCategory.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!label.trim()}>
              {t("dialogs.addCategory.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Shared form field wrapper

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