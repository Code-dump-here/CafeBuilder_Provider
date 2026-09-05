"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, Check, CircleDashed, Loader2, Plus, Trash2, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

import {
  useChecklistItems,
  useCreateChecklistItemsMutation,
  useDeleteChecklistItemMutation,
} from "@/features/projects/use-checklists";
import {
  summarizeChecklist,
  type ChecklistItem,
  type ChecklistStatus,
} from "@/features/projects/checklist-types";

interface ChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Milestone id, or null when nothing is open. */
  milestoneId: string | null;
  milestoneLabel?: string;
}

const STATUS_STYLE: Record<
  ChecklistStatus,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  pending: { icon: CircleDashed, className: "text-muted-foreground" },
  passed: { icon: Check, className: "text-emerald-600 dark:text-emerald-400" },
  failed: { icon: X, className: "text-rose-600 dark:text-rose-400" },
};

/**
 * The acceptance checklist a provider writes and the shop owner grades.
 *
 * The provider side is deliberately write-and-read-only: adding and removing
 * items is here, but marking anything passed or failed is not. Sign-off is the
 * owner's, and a provider who could tick their own boxes would make the whole
 * checklist decorative.
 *
 * Since required items now block closing the milestone, the summary at the top
 * states what is outstanding — otherwise the first a provider hears of it is a
 * rejected status change.
 */
export function ChecklistDialog({
  open,
  onOpenChange,
  milestoneId,
  milestoneLabel,
}: ChecklistDialogProps) {
  const t = useTranslations("MilestoneManagement.checklist");
  const tCommon = useTranslations("MilestoneManagement.common");
  const format = useFormatter();

  const { items, isLoading, isError } = useChecklistItems({
    constructionItemId: open ? milestoneId : null,
  });
  const createItems = useCreateChecklistItemsMutation();
  const deleteItem = useDeleteChecklistItemMutation();

  const [name, setName] = React.useState("");
  const [isRequired, setIsRequired] = React.useState(true);
  // Deleting a checklist item takes its pass/fail history with it and the
  // server offers no undo, so the row asks first rather than acting on the
  // click that lands on a small icon beside every item in the list.
  const [deletingItem, setDeletingItem] = React.useState<ChecklistItem | null>(
    null,
  );

  const progress = React.useMemo(() => summarizeChecklist(items), [items]);
  const ordered = React.useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items],
  );

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || milestoneId == null || createItems.isPending) return;

    await createItems.mutateAsync({
      constructionItemId: String(milestoneId),
      items: [{ name: trimmed, isRequired }],
    });
    setName("");
    setIsRequired(true);
  };

  const blockedCount = progress.requiredPending + progress.requiredFailed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {milestoneLabel
              ? t("subtitleWithPhase", { phase: milestoneLabel })
              : t("requiredHint")}
          </DialogDescription>
        </DialogHeader>

        {/* Standing of the gate, before the list — this is the reason a
            provider opens the dialog at all. */}
        {!isLoading && !isError && (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              progress.requiredTotal === 0 && "border-border text-muted-foreground",
              progress.requiredTotal > 0 &&
                progress.isSatisfied &&
                "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
              blockedCount > 0 &&
                "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
            )}
          >
            {progress.requiredTotal === 0
              ? t("noRequired")
              : progress.isSatisfied
                ? t("satisfied")
                : t("blocked", { count: blockedCount })}
            {progress.requiredTotal > 0 && (
              <span className="ml-2 text-muted-foreground">
                (
                {t("progress", {
                  passed: progress.requiredPassed,
                  total: progress.requiredTotal,
                })}
                )
              </span>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 py-6 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t("error")}
          </div>
        )}

        {!isLoading && !isError && (
          <ScrollArea className="max-h-[45vh] pr-3">
            {ordered.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {ordered.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    onDelete={() => setDeletingItem(item)}
                    deleting={deleteItem.isPending}
                  />
                ))}
              </ul>
            )}
          </ScrollArea>
        )}

        {/* Add form */}
        <div className="flex flex-col gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
            />
            <Button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!name.trim() || createItems.isPending}
            >
              {createItems.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-1">{t("add")}</span>
            </Button>
          </div>

          {/* No checkbox primitive in this design system — a native input keeps
              the dependency surface unchanged and stays keyboard accessible. */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {t("required")}
            <span className="text-xs">— {t("requiredHint")}</span>
          </label>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={deletingItem !== null}
        onOpenChange={(next) => {
          if (!next) setDeletingItem(null);
        }}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={t("delete")}
        cancelLabel={tCommon("cancel")}
        variant="destructive"
        onConfirm={() => {
          if (deletingItem) deleteItem.mutate(deletingItem.id);
          setDeletingItem(null);
        }}
      />
    </Dialog>
  );
}

function ChecklistRow({
  item,
  onDelete,
  deleting,
}: {
  item: ChecklistItem;
  onDelete: () => void;
  deleting: boolean;
}) {
  const t = useTranslations("MilestoneManagement.checklist");
  const format = useFormatter();

  const style = STATUS_STYLE[item.status];
  const Icon = style.icon;

  return (
    <li className="flex items-start gap-3 rounded-md border px-3 py-2">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.className)} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{item.name}</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px]",
              item.isRequired
                ? "bg-muted text-foreground"
                : "text-muted-foreground",
            )}
          >
            {item.isRequired ? t("required") : t("optional")}
          </span>
          <span className={cn("text-[11px]", style.className)}>
            {t(`status.${item.status}`)}
          </span>
        </div>

        {item.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        )}

        {/* The owner's note is the actionable half of a failed item. */}
        {item.note && (
          <p className="mt-1 rounded bg-muted/60 px-2 py-1 text-xs">
            <span className="font-medium">{t("ownerNote")}: </span>
            {item.note}
          </p>
        )}

        {item.checkedAt && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("checkedAt", {
              date: format.dateTime(new Date(item.checkedAt), {
                dateStyle: "medium",
              }),
            })}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={deleting}
        aria-label={t("delete")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
