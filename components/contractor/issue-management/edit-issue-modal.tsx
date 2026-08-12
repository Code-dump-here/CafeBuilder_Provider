"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Save, TriangleAlert } from "lucide-react";

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
import type { Issue, IssueType } from "@/features/projects/issue-types";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { Field } from "@/components/ui/field";

export interface EditIssueInput {
  issueTypeId: number;
  cause: string;
  reason: string;
  solution: string;
  estimateAt: string | null;
  issueImage: string | null;
  confirmImage: string | null;
}

interface EditIssueModalProps {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: number, input: EditIssueInput) => void;
  isSubmitting?: boolean;
}

const fromIssue = (issue: Issue): EditIssueInput => ({
  issueTypeId: issue.issueTypeId,
  cause: issue.cause ?? "",
  reason: issue.reason ?? "",
  solution: issue.solution ?? "",
  estimateAt: issue.estimateAt,
  issueImage: issue.issueImage,
  confirmImage: issue.confirmImage,
});

/**
 * Edit form for an existing issue. Mirrors the Add modal so users
 * can fix typos or attach a confirm-image once the issue is fixed.
 * Image fields reset to null if the user clears the existing upload.
 */
export function EditIssueModal({
  issue,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditIssueModalProps) {
  const t = useTranslations("MilestoneManagement.issue.edit");
  const tCommon = useTranslations("MilestoneManagement.common");
  const tIssue = useTranslations("MilestoneManagement.issue");

  const [form, setForm] = React.useState<EditIssueInput | null>(null);

  const { items: issueTypes, isLoading: isLoadingTypes } = useIssueTypes({
    enabled: open,
  });

  useResetOnChange(`${open}:${issue?.id ?? ""}`, () => {
    if (open && issue) {
      setForm(fromIssue(issue));
    } else if (!open) {
      setForm(null);
    }
  });

  const update = <K extends keyof EditIssueInput>(
    key: K,
    value: EditIssueInput[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue || !form || !form.issueTypeId) return;
    onSubmit(issue.id, form);
    onOpenChange(false);
  };

  if (!issue || !form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert aria-hidden className="size-4 text-amber-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("subtitle", { id: issue.id })}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label={tIssue("fields.issueType")}>
            <select
              value={form.issueTypeId}
              onChange={(e) => update("issueTypeId", Number(e.target.value))}
              required
              disabled={isLoadingTypes}
              className="border-input bg-transparent flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none"
            >
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
              rows={2}
              className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
            />
          </Field>

          <Field label={tIssue("fields.reason")}>
            <textarea
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              rows={2}
              className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
            />
          </Field>

          <Field label={tIssue("fields.solution")}>
            <textarea
              value={form.solution}
              onChange={(e) => update("solution", e.target.value)}
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
              disabled={!form.issueTypeId || isSubmitting}
            >
              <Save aria-hidden />
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
