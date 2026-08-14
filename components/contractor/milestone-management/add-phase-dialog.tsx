"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

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
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { Field } from "@/components/ui/field";

interface AddPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    name: string;
    category?: string;
    description?: string;
    estimateAt?: string;
  }) => void | Promise<void>;
}

/**
 * Modal for creating a brand-new phase. Matches ConstructionItem API payload.
 */
export function AddPhaseDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddPhaseDialogProps) {
  const t = useTranslations("MilestoneManagement.addPhase");

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [estimateAt, setEstimateAt] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  useResetOnChange(open, () => {
    if (!open) {
      setName("");
      setCategory("");
      setDescription("");
      setEstimateAt("");
      setSubmitting(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        estimateAt: estimateAt || undefined,
      });
      onOpenChange(false);
    } catch {
      // Caller surfaces the error (toast); keep the dialog open with the
      // entered values so the user can retry instead of losing input.
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label={t("label")}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("labelPlaceholder")}
              autoFocus
              required
            />
          </Field>
          <Field label={t("category")}>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t("categoryPlaceholder")}
            />
          </Field>
          <Field label={t("description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={2}
            />
          </Field>
          <Field label={t("targetDate")}>
            <Input
              type="date"
              value={estimateAt}
              onChange={(e) => setEstimateAt(e.target.value)}
            />
          </Field>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || submitting}
            >
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
