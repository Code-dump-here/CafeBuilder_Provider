"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus, TriangleAlert } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { IssueImageUpload } from "./issue-image-upload";
import { useIssueTypes } from "@/features/projects/use-issues";
import type { IssueType } from "@/features/projects/issue-types";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

export interface AddIssueInput {
  issueTypeId: number;
  cause: string;
  reason: string;
  solution: string;
  estimateAt: string | null;
  issueImage: string | null;
  confirmImage: string | null;
}

interface AddIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AddIssueInput) => void;
  isSubmitting?: boolean;
}

const EMPTY: AddIssueInput = {
  issueTypeId: 0,
  cause: "",
  reason: "",
  solution: "",
  estimateAt: null,
  issueImage: null,
  confirmImage: null,
};

/**
 * Form for reporting a new issue. Aligned with `POST /issues`
 * (subset of fields the UI exposes — `projectWorkingId` and
 * `constructionItemId` are filled by the page-level mutation).
 *
 * Loads the issue-type catalog from `/api/issue-types` so the user
 * picks from a controlled list rather than typing a freeform label.
 */
export function AddIssueModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddIssueModalProps) {
  const t = useTranslations("MilestoneManagement.issue.add");
  const tCommon = useTranslations("MilestoneManagement.common");
  const tIssue = useTranslations("MilestoneManagement.issue");

  const [form, setForm] = React.useState<AddIssueInput>(EMPTY);

  const { items: issueTypes, isLoading: isLoadingTypes } = useIssueTypes({
    enabled: open,
  });

  useResetOnChange(open, () => {
    if (!open) setForm(EMPTY);
  });

  // Default to the first catalogue entry once it loads. Derived at render
  // rather than written back into state: storing it meant an extra render,
  // and the effect had `form.issueTypeId` in its own deps — it re-ran on
  // every change to the field it was setting.
  const effectiveIssueTypeId =
    form.issueTypeId !== 0 ? form.issueTypeId : issueTypes[0]?.id ?? 0;

  const update = <K extends keyof AddIssueInput>(
    key: K,
    value: AddIssueInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveIssueTypeId) return;
    onSubmit({
      issueTypeId: effectiveIssueTypeId,
      cause: form.cause.trim(),
      reason: form.reason.trim(),
      solution: form.solution.trim(),
      estimateAt: form.estimateAt,
      issueImage: form.issueImage,
      confirmImage: form.confirmImage,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert aria-hidden className="size-4 text-amber-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label={tIssue("fields.issueType")}>
            <select
              value={effectiveIssueTypeId}
              onChange={(e) => update("issueTypeId", Number(e.target.value))}
              required
              disabled={isLoadingTypes}
              className="border-input bg-transparent flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none"
            >
              <option value={0} disabled>
                {isLoadingTypes ? t("loadingTypes") : t("selectType")}
              </option>
              {issueTypes.map((it: IssueType) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.code})
                </option>
              ))}
            </select>
          </Field>

          <Field label={tIssue("fields.cause")}>
            <textarea
              value={form.cause}
              onChange={(e) => update("cause", e.target.value)}
              placeholder={t("causePlaceholder")}
              rows={2}
              className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
            />
          </Field>

          <Field label={tIssue("fields.reason")}>
            <textarea
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder={t("reasonPlaceholder")}
              rows={2}
              className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
            />
          </Field>

          <Field label={tIssue("fields.solution")}>
            <textarea
              value={form.solution}
              onChange={(e) => update("solution", e.target.value)}
              placeholder={t("solutionPlaceholder")}
              rows={2}
              className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
            />
          </Field>

          <Field label={tIssue("fields.estimateAt")}>
            <Input
              type="date"
              value={form.estimateAt ?? ""}
              onChange={(e) =>
                update("estimateAt", e.target.value || null)
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <IssueImageUpload
              label={tIssue("fields.issueImage")}
              value={form.issueImage}
              onChange={(url) => update("issueImage", url)}
              disabled={isSubmitting}
            />
            <IssueImageUpload
              label={tIssue("fields.confirmImage")}
              value={form.confirmImage}
              onChange={(url) => update("confirmImage", url)}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                {tCommon("cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!effectiveIssueTypeId || isSubmitting}
            >
              <Plus aria-hidden />
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
