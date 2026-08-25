"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2 } from "lucide-react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { todayDateInputValue } from "@/lib/date-input";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { useConstructionTemplates } from "@/features/projects/use-construction-templates";
import type { ConstructionTemplate } from "@/features/projects/construction-template-types";

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True when the project already has phases — applying then appends. */
  hasExistingPhases: boolean;
  onSubmit: (input: {
    templateId: string;
    startDate: string;
  }) => void | Promise<void>;
}

/**
 * Pick a process template and copy it onto this engagement.
 *
 * The whole plan is shown before committing, not just the template's name:
 * applying writes every phase and task straight onto a live project, and a
 * name alone gives the provider no way to tell a fit-out template from a
 * shell-and-core one until the rows are already there.
 */
export function ApplyTemplateDialog({
  open,
  onOpenChange,
  hasExistingPhases,
  onSubmit,
}: ApplyTemplateDialogProps) {
  const t = useTranslations("MilestoneManagement.applyTemplate");

  const { templates, isLoading, isError } = useConstructionTemplates({
    // Construction milestones only — a design template on this page would
    // generate phases the constructor has no business owning.
    serviceKind: "construction",
    enabled: open,
  });

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [startDate, setStartDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  useResetOnChange(open, () => {
    if (open) {
      setStartDate(todayDateInputValue());
    } else {
      setSelectedId(null);
      setExpandedId(null);
      setStartDate("");
      setSubmitting(false);
    }
  });

  const selected = templates.find((tpl) => tpl.id === selectedId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !startDate || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit({ templateId: selectedId, startDate });
      onOpenChange(false);
    } catch {
      // The caller toasts the reason. Keep the dialog open on the chosen
      // template so a rejected start date can be corrected in place.
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {isLoading ? (
            <p className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t("loading")}
            </p>
          ) : isError ? (
            <p className="py-6 text-xs text-destructive">{t("loadError")}</p>
          ) : templates.length === 0 ? (
            <p className="py-6 text-xs text-muted-foreground">{t("empty")}</p>
          ) : (
            <ScrollArea className="max-h-[45vh] pr-3">
              <div className="flex flex-col gap-2">
                {templates.map((tpl) => (
                  <TemplateOption
                    key={tpl.id}
                    template={tpl}
                    selected={selectedId === tpl.id}
                    expanded={expandedId === tpl.id}
                    onSelect={() => setSelectedId(tpl.id)}
                    onToggleExpand={() =>
                      setExpandedId((cur) => (cur === tpl.id ? null : tpl.id))
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          <Field label={t("startDate")}>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              // The server rejects a past start: every generated milestone
              // counts forward from here, so a back-dated plan lands overdue.
              min={todayDateInputValue()}
              required
            />
          </Field>

          {selected ? (
            <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {t("summary", {
                phases: selected.items.length,
                tasks: selected.items.reduce(
                  (sum, item) => sum + item.tasks.length,
                  0,
                ),
                days: selected.totalEstimateDays,
              })}
            </p>
          ) : null}

          {hasExistingPhases ? (
            <p className="rounded-md border border-amber-300/50 bg-amber-50/50 px-3 py-2 text-xs text-muted-foreground dark:border-amber-700/40 dark:bg-amber-950/20">
              {t("appendWarning")}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedId || !startDate || submitting}
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              {t("apply")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateOption({
  template,
  selected,
  expanded,
  onSelect,
  onToggleExpand,
}: {
  template: ConstructionTemplate;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}) {
  const t = useTranslations("MilestoneManagement.applyTemplate");

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 transition-colors",
        selected
          ? "border-primary/60 bg-primary/5"
          : "border-border/60 bg-card hover:border-border",
      )}
    >
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="radio"
          name="construction-template"
          className="mt-1"
          checked={selected}
          onChange={onSelect}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">
              {template.name}
            </span>
            {template.isPublic ? (
              <span className="rounded-full border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {t("systemBadge")}
              </span>
            ) : null}
          </span>
          {template.description ? (
            <span className="text-xs leading-relaxed text-muted-foreground">
              {template.description}
            </span>
          ) : null}
          <span className="text-[11px] text-muted-foreground">
            {t("counts", {
              phases: template.items.length,
              days: template.totalEstimateDays,
            })}
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={onToggleExpand}
        className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={cn("size-3 transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
        {expanded ? t("hideDetail") : t("showDetail")}
      </button>

      {expanded ? (
        <ol className="mt-1.5 flex flex-col gap-1.5 border-l border-border/60 pl-3 text-xs">
          {template.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">
                {item.name}
                {item.category ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {item.category}
                  </span>
                ) : null}
                {item.estimateDays != null ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {t("days", { days: item.estimateDays })}
                  </span>
                ) : null}
              </span>
              {item.tasks.length > 0 ? (
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  {item.tasks.map((task) => task.name).join(" • ")}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
