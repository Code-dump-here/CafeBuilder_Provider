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

interface AddPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    label: string;
    lead: string;
    targetDate: string;
    startDate: string;
    endDate: string;
  }) => void;
}

/**
 * Modal for creating a brand-new phase. Lands at the end of the
 * timeline with status `upcoming` and progress 0.
 */
export function AddPhaseDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddPhaseDialogProps) {
  const t = useTranslations("MilestoneManagement.addPhase");
  const tCommon = useTranslations("MilestoneManagement.common");

  const [label, setLabel] = React.useState("");
  const [lead, setLead] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setLabel("");
      setLead("");
      setTargetDate("");
      setStartDate("");
      setEndDate("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSubmit({
      label: label.trim(),
      lead: lead.trim(),
      targetDate: targetDate
        ? new Date(targetDate).toISOString()
        : new Date().toISOString(),
      startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
    });
    onOpenChange(false);
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
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("labelPlaceholder")}
              autoFocus
              required
            />
          </Field>
          <Field label={t("lead")}>
            <Input
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              placeholder={t("leadPlaceholder")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("startDate")}>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label={t("endDate")}>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label={t("targetDate")}>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
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
              disabled={!label.trim()}
            >
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}