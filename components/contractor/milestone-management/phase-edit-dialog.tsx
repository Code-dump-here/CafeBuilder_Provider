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

import type { MilestonePhase } from "@/lib/contractor/construction-overview-data";

export interface PhaseEditInput {
  label: string;
  lead: string;
  targetDate: string;
  startDate: string;
  endDate: string;
}

interface PhaseEditDialogProps {
  phase: MilestonePhase | null;
  /** Distinguishes the "rename" variant from the "edit meta" variant. */
  mode: "rename" | "editMeta";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: PhaseEditInput) => void;
}

/**
 * Modal dialog for editing a phase. Two variants share the same dialog
 * shell — "rename" exposes only the label field; "editMeta" exposes
 * lead + target date.
 *
 * The Input row uses native `<input type="date">` for the target date
 * to keep the dep list short; the rest of the UI uses our standard
 * design-system primitives.
 */
export function PhaseEditDialog({
  phase,
  mode,
  open,
  onOpenChange,
  onSubmit,
}: PhaseEditDialogProps) {
  const tPhase = useTranslations("MilestoneManagement.phase");
  const tCommon = useTranslations("MilestoneManagement.common");

  const [label, setLabel] = React.useState("");
  const [lead, setLead] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // Sync local form state with the phase under edit whenever the
  // dialog re-opens for a different phase (or the same one).
  React.useEffect(() => {
    if (!phase) return;
    setLabel(phase.label);
    setLead(phase.lead);
    // ISO → yyyy-MM-dd for native date input.
    setTargetDate(toDateInput(phase.targetDate));
    setStartDate(toDateInput(phase.startDate));
    setEndDate(toDateInput(phase.endDate));
  }, [phase?.id, open]);

  if (!phase) return null;

  const isRename = mode === "rename";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      label: isRename ? label.trim() : phase.label,
      lead: lead.trim(),
      targetDate: targetDate ? new Date(targetDate).toISOString() : phase.targetDate,
      startDate: startDate ? new Date(startDate).toISOString() : phase.startDate,
      endDate: endDate ? new Date(endDate).toISOString() : phase.endDate,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isRename ? tPhase("renameTitle") : tPhase("editMetaTitle")}
          </DialogTitle>
          <DialogDescription>{phase.shortLabel}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {isRename ? (
            <Field label={tPhase("renameLabel")}>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
                required
              />
            </Field>
          ) : (
            <>
              <Field label={tPhase("lead")}>
                <Input
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  placeholder={tPhase("leadPlaceholder")}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={tPhase("startDate")}>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </Field>
                <Field label={tPhase("endDate")}>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label={tPhase("targetDate")}>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                />
              </Field>
            </>
          )}

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                {tCommon("cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!label.trim() && isRename}>
              {tCommon("save")}
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

function toDateInput(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}