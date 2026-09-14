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
import { todayDateInputValue } from "@/lib/date-input";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

import type {
  ConstructionTask,
  UpdateConstructionTaskPayload,
} from "@/features/projects/construction-types";

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ConstructionTask | null;
  onSubmit: (input: UpdateConstructionTaskPayload) => void;
}

/**
 * Full edit form for a `ConstructionTask`.
 *
 * `name` is required. All other fields are optional; `estimateAt`, if
 * provided, is checked client-side for not-in-past (the server rechecks).
 *
 * `imageUrl` carries the **ObjectName** returned from `/api/files` —
 * the absolute URL is resolved server-side. The page wires the upload
 * button separately; this dialog only stores the resulting value.
 */
export function TaskEditDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
}: TaskEditDialogProps) {
  const t = useTranslations("MilestoneManagement.task");
  const tCommon = useTranslations("MilestoneManagement.common");
  const tShared = useTranslations("ConstructionShared");

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [startAt, setStartAt] = React.useState("");
  const [estimateAt, setEstimateAt] = React.useState("");
  const [actualStartAt, setActualStartAt] = React.useState("");
  const [actualAt, setActualAt] = React.useState("");
  const [estimatedLaborCostText, setEstimatedLaborCostText] =
    React.useState("");
  const [actualLaborCostText, setActualLaborCostText] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [estimateAtError, setEstimateAtError] = React.useState<string | null>(
    null,
  );

  useResetOnChange(`${task?.id ?? ""}:${open}`, () => {
    if (!task) return;
    setName(task.name);
    setDescription(task.description ?? "");
    setImageUrl(task.imageUrl ?? "");
    setStartAt(toDateInput(task.startAt));
    setEstimateAt(toDateInput(task.estimateAt));
    setActualStartAt(toDateInput(task.actualStartAt));
    setActualAt(toDateInput(task.actualAt));
    setEstimatedLaborCostText(
      task.estimatedLaborCost != null ? String(task.estimatedLaborCost) : "",
    );
    setActualLaborCostText(
      task.actualLaborCost != null ? String(task.actualLaborCost) : "",
    );
    setReason(task.reason ?? "");
    setEstimateAtError(null);
  });

  if (!task) return null;

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
    if (!name.trim()) return;
    if (estimateAt && estimateAt < todayDateInputValue()) {
      setEstimateAtError(tShared("validation.estimateAtPast"));
      return;
    }
    const payload: UpdateConstructionTaskPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      startAt: startAt || undefined,
      estimateAt: estimateAt || undefined,
      actualStartAt: actualStartAt || undefined,
      actualAt: actualAt || undefined,
      estimatedLaborCost: parseCost(estimatedLaborCostText),
      actualLaborCost: parseCost(actualLaborCostText),
      reason: reason.trim() || undefined,
    };
    onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("taskLabel")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label={t("fields.title")}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </Field>
          <Field label={t("detail.fields.description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("startDate")}>
              <Input
                type="date"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </Field>
            <Field
              label={t("targetDate")}
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
            <Field label={t("actualStart")}>
              <Input
                type="date"
                value={actualStartAt}
                onChange={(e) => setActualStartAt(e.target.value)}
              />
            </Field>
            <Field label={t("actualAt")}>
              <Input
                type="date"
                value={actualAt}
                onChange={(e) => setActualAt(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("estimatedLaborCost")}>
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
            <Field label={t("actualLaborCost")}>
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
          <Field label={t("reason")} hint={t("reasonHint")}>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={2}
            />
          </Field>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                {tCommon("cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || estimateAtError !== null}
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
