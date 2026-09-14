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
import { Field } from "@/components/ui/field";

import type {
  ConstructionItem,
  UpdateConstructionItemPayload,
} from "@/features/projects/construction-types";
import { todayDateInputValue } from "@/lib/date-input";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

export interface PhaseEditTarget {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  startAt: string | null;
  estimateAt: string | null;
  actualStartAt: string | null;
  actualAt: string | null;
  estimatedLaborCost: number | null;
  actualLaborCost: number | null;
}

interface PhaseEditDialogProps {
  phase: PhaseItemLike | null;
  /** Distinguishes the "rename" variant from the "edit meta" variant. */
  mode: "rename" | "editMeta";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * `rename` mode submits a name-only patch.
   * `editMeta` mode submits the full editable payload (dates + labour).
   */
  onSubmit: (input: UpdateConstructionItemPayload) => void;
}

/**
 * Anything shaped like `ConstructionItem` is acceptable — we only read the
 * fields shown in the form. The page wires this with its full `ConstructionItem`
 * so the dialog can also work as a top-level "edit phase" entry point.
 */
export type PhaseItemLike = Pick<
  ConstructionItem,
  | "id"
  | "name"
  | "category"
  | "description"
  | "startAt"
  | "estimateAt"
  | "actualStartAt"
  | "actualAt"
  | "estimatedLaborCost"
  | "actualLaborCost"
>;

/**
 * Modal dialog for editing a phase. Two variants share the same shell —
 * "rename" exposes only the name field; "editMeta" exposes the rest
 * (description, category, dates, labour cost).
 *
 * Status transitions are intentionally NOT here — they live in the row
 * header (the dedicated `/status` endpoint) so the two paths can't
 * drift.
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
  const tShared = useTranslations("ConstructionShared");

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startAt, setStartAt] = React.useState("");
  const [estimateAt, setEstimateAt] = React.useState("");
  const [actualStartAt, setActualStartAt] = React.useState("");
  const [actualAt, setActualAt] = React.useState("");
  const [estimatedLaborCostText, setEstimatedLaborCostText] = React.useState("");
  const [actualLaborCostText, setActualLaborCostText] = React.useState("");
  const [estimateAtError, setEstimateAtError] = React.useState<string | null>(
    null,
  );

  // Sync local form state with the phase under edit whenever the
  // dialog re-opens for a different phase (or the same one).
  useResetOnChange(`${phase?.id ?? ""}:${mode}:${open}`, () => {
    if (!phase) return;
    setName(phase.name);
    setCategory(phase.category ?? "");
    setDescription(phase.description ?? "");
    setStartAt(toDateInput(phase.startAt));
    setEstimateAt(toDateInput(phase.estimateAt));
    setActualStartAt(toDateInput(phase.actualStartAt));
    setActualAt(toDateInput(phase.actualAt));
    setEstimatedLaborCostText(
      phase.estimatedLaborCost != null ? String(phase.estimatedLaborCost) : "",
    );
    setActualLaborCostText(
      phase.actualLaborCost != null ? String(phase.actualLaborCost) : "",
    );
    setEstimateAtError(null);
  });

  if (!phase) return null;

  const isRename = mode === "rename";

  const handleEstimateAtChange = (value: string) => {
    setEstimateAt(value);
    if (value && value < todayDateInputValue()) {
      setEstimateAtError(tShared("validation.estimateAtPast"));
    } else {
      setEstimateAtError(null);
    }
  };

  const parseCost = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed.replace(/[\s.,]/g, ""));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRename) {
      onSubmit({ name: name.trim() });
    } else {
      // Re-check at submit time — same fail-fast policy as add-phase.
      if (estimateAt && estimateAt < todayDateInputValue()) {
        setEstimateAtError(tShared("validation.estimateAtPast"));
        return;
      }
      const payload: UpdateConstructionItemPayload = {
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        startAt: startAt || undefined,
        estimateAt: estimateAt || undefined,
        actualStartAt: actualStartAt || undefined,
        actualAt: actualAt || undefined,
        estimatedLaborCost: parseCost(estimatedLaborCostText),
        actualLaborCost: parseCost(actualLaborCostText),
      };
      onSubmit(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isRename ? tPhase("renameTitle") : tPhase("editMetaTitle")}
          </DialogTitle>
          <DialogDescription>{phase.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {isRename ? (
            <Field label={tPhase("renameLabel")}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </Field>
          ) : (
            <>
              <Field label={tPhase("category")}>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={tPhase("categoryPlaceholder")}
                />
              </Field>
              <Field label={tPhase("description")}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={tPhase("descriptionPlaceholder")}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tPhase("startDate")}>
                  <Input
                    type="date"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </Field>
                <Field
                  label={tPhase("targetDate")}
                  error={estimateAtError ?? undefined}
                >
                  <Input
                    type="date"
                    value={estimateAt}
                    onChange={(e) => handleEstimateAtChange(e.target.value)}
                    min={todayDateInputValue()}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tPhase("actualStart")}>
                  <Input
                    type="date"
                    value={actualStartAt}
                    onChange={(e) => setActualStartAt(e.target.value)}
                  />
                </Field>
                <Field label={tPhase("actualAt")}>
                  <Input
                    type="date"
                    value={actualAt}
                    onChange={(e) => setActualAt(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={tPhase("estimatedLaborCost")}
                  hint={tPhase("estimatedLaborCostHint")}
                >
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    value={estimatedLaborCostText}
                    onChange={(e) =>
                      setEstimatedLaborCostText(e.target.value)
                    }
                    placeholder="0"
                  />
                </Field>
                <Field label={tPhase("actualLaborCost")}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    value={actualLaborCostText}
                    onChange={(e) => setActualLaborCostText(e.target.value)}
                    placeholder="0"
                  />
                </Field>
              </div>
            </>
          )}

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                {tCommon("cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() && isRename}
            >
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
