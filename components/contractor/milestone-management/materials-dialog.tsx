"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { cn } from "@/lib/utils";
import { formatVnd } from "@/lib/format-currency";

import {
  useAddConstructionMaterialMutation,
  useConstructionMaterials,
  useCreateMaterialMutation,
  useDeleteMaterialMutation,
  useMaterialCost,
  useMaterials,
  useRemoveConstructionMaterialMutation,
  useUpdateConstructionMaterialMutation,
} from "@/features/projects/use-materials";
import {
  MATERIAL_UNITS,
  type ConstructionMaterial,
  type MaterialUnit,
} from "@/features/projects/material-types";

interface MaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectWorkingId: string | null;
  /** Milestone the lines are attached to. */
  milestoneId: string | null;
  milestoneLabel?: string;
  /** Actual quantities are refused server-side while the work is `pending`. */
  milestoneStarted?: boolean;
}

/**
 * Materials for a milestone: the project's published price list, the lines
 * this milestone draws from it, and what the whole thing costs.
 *
 * Two things the UI has to be careful about, because both are easy to render
 * misleadingly:
 *
 *  - The actual-cost total is withheld by the server while any line is still
 *    missing its real quantity. Showing a partial sum labelled "actual" would
 *    read as authoritative, so an em dash and the outstanding count are shown
 *    instead.
 *  - A line's unit price is the rate captured when it was added, not today's
 *    price-list rate. Editing the price list does not restate settled lines,
 *    which is stated in the footnote rather than left to be discovered.
 */
export function MaterialsDialog({
  open,
  onOpenChange,
  projectWorkingId,
  milestoneId,
  milestoneLabel,
  milestoneStarted = false,
}: MaterialsDialogProps) {
  const t = useTranslations("MilestoneManagement.materials");
  const tCommon = useTranslations("MilestoneManagement.common");
  const locale = useLocale();

  // Both deletes here used to fire on the click. Removing a usage line throws
  // away a recorded quantity, and removing a price-list material takes a rate
  // the whole project quotes against — neither has an undo, and the controls
  // are icon buttons sitting one row apart in a scrolling list.
  const [removingUsageId, setRemovingUsageId] = React.useState<string | null>(null);
  const [deletingMaterialId, setDeletingMaterialId] = React.useState<string | null>(null);

  const { materials, isLoading: loadingList, isError: listError } = useMaterials({
    projectWorkingId: open ? projectWorkingId : null,
  });
  const { lines, isLoading: loadingLines } = useConstructionMaterials({
    constructionItemId: open ? milestoneId : null,
  });
  const { cost } = useMaterialCost({
    constructionItemId: open ? milestoneId : null,
  });

  const createMaterial = useCreateMaterialMutation();
  const deleteMaterial = useDeleteMaterialMutation();
  const addUsage = useAddConstructionMaterialMutation();
  const updateUsage = useUpdateConstructionMaterialMutation();
  const removeUsage = useRemoveConstructionMaterialMutation();

  // New price-list row
  const [name, setName] = React.useState("");
  const [unit, setUnit] = React.useState<MaterialUnit>("m2");
  const [unitPrice, setUnitPrice] = React.useState("");

  // New usage line
  const [materialId, setMaterialId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");

  const handleAddMaterial = async () => {
    const trimmed = name.trim();
    const price = Number(unitPrice);
    if (!trimmed || !Number.isFinite(price) || price < 0 || !projectWorkingId) return;

    await createMaterial.mutateAsync({
      projectWorkingId: String(projectWorkingId),
      name: trimmed,
      unit,
      unitPrice: price,
    });
    setName("");
    setUnitPrice("");
  };

  const handleAddUsage = async () => {
    const qty = Number(quantity);
    if (!materialId || !Number.isFinite(qty) || qty <= 0 || !milestoneId) return;

    await addUsage.mutateAsync({
      constructionItemId: String(milestoneId),
      materialId,
      estimatedQuantity: qty,
    });
    setMaterialId("");
    setQuantity("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {milestoneLabel
              ? t("subtitleWithPhase", { phase: milestoneLabel })
              : t("priceListHint")}
          </DialogDescription>
        </DialogHeader>

        {listError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t("error")}
          </div>
        )}

        {/* ── Cost roll-up ─────────────────────────────────────────── */}
        {cost && (
          <div className="grid grid-cols-2 gap-3 rounded-md border p-3 sm:grid-cols-3">
            <Figure label={t("ownLines")} value={formatVnd(cost.ownEstimatedCost, locale)} />
            <Figure label={t("taskLines")} value={formatVnd(cost.tasksEstimatedCost, locale)} />
            <Figure
              label={t("estimatedCost")}
              value={formatVnd(cost.totalEstimatedCost, locale)}
              emphasis
            />
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">{t("actualCost")}</p>
              <p className="text-sm font-medium tabular-nums">
                {cost.totalActualCost === null
                  ? t("actualUnavailable")
                  : formatVnd(cost.totalActualCost, locale)}
              </p>
              {cost.missingActualCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t("actualPending", { count: cost.missingActualCount })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Lines on this milestone ──────────────────────────────── */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("usage")}</h3>

          {loadingLines ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : lines.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">{t("usageEmpty")}</p>
          ) : (
            <ScrollArea className="max-h-[28vh] pr-3">
              <ul className="flex flex-col gap-2">
                {lines.map((line) => (
                  <UsageRow
                    key={line.id}
                    line={line}
                    canRecordActual={milestoneStarted}
                    onSaveActual={(actual) =>
                      updateUsage.mutate({
                        id: line.id,
                        payload: { actualQuantity: actual },
                      })
                    }
                    onRemove={() => setRemovingUsageId(line.id)}
                    saving={updateUsage.isPending || removeUsage.isPending}
                  />
                ))}
              </ul>
            </ScrollArea>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={t("pickMaterial")} />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} — {formatVnd(m.unitPrice, locale)}/{m.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={t("estimated")}
              className="w-28"
            />

            <Button
              type="button"
              onClick={() => void handleAddUsage()}
              disabled={!materialId || !quantity || addUsage.isPending}
            >
              {addUsage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-1">{t("addUsage")}</span>
            </Button>
          </div>
        </section>

        {/* ── Price list ───────────────────────────────────────────── */}
        <section className="flex flex-col gap-2 border-t pt-3">
          <div>
            <h3 className="text-sm font-semibold">{t("priceList")}</h3>
            <p className="text-xs text-muted-foreground">{t("priceListHint")}</p>
          </div>

          {loadingList ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : materials.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">{t("priceListEmpty")}</p>
          ) : (
            <ScrollArea className="max-h-[22vh] pr-3">
              <ul className="flex flex-col gap-1">
                {materials.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded border px-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate">{m.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-muted-foreground">
                        {formatVnd(m.unitPrice, locale)}/{m.unit}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingMaterialId(m.id)}
                        disabled={deleteMaterial.isPending}
                        aria-label={t("remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("materialNamePlaceholder")}
              className="min-w-[180px] flex-1"
            />

            <Select value={unit} onValueChange={(v) => setUnit(v as MaterialUnit)}>
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder={t("unit")} />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              min="0"
              step="any"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder={t("unitPrice")}
              className="w-36"
            />

            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleAddMaterial()}
              disabled={!name.trim() || !unitPrice || createMaterial.isPending}
            >
              {createMaterial.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-1">{t("addMaterial")}</span>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{t("priceNote")}</p>
        </section>
      </DialogContent>

      <ConfirmDialog
        open={removingUsageId !== null}
        onOpenChange={(next) => {
          if (!next) setRemovingUsageId(null);
        }}
        title={t("removeUsageTitle")}
        description={t("removeUsageDescription")}
        confirmLabel={t("remove")}
        cancelLabel={tCommon("cancel")}
        variant="destructive"
        onConfirm={() => {
          if (removingUsageId) removeUsage.mutate(removingUsageId);
          setRemovingUsageId(null);
        }}
      />

      <ConfirmDialog
        open={deletingMaterialId !== null}
        onOpenChange={(next) => {
          if (!next) setDeletingMaterialId(null);
        }}
        title={t("deleteMaterialTitle")}
        description={t("deleteMaterialDescription")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        variant="destructive"
        onConfirm={() => {
          if (deletingMaterialId) deleteMaterial.mutate(deletingMaterialId);
          setDeletingMaterialId(null);
        }}
      />
    </Dialog>
  );
}

function Figure({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm tabular-nums", emphasis && "font-semibold")}>{value}</p>
    </div>
  );
}

function UsageRow({
  line,
  canRecordActual,
  onSaveActual,
  onRemove,
  saving,
}: {
  line: ConstructionMaterial;
  canRecordActual: boolean;
  onSaveActual: (actual: number) => void;
  onRemove: () => void;
  saving: boolean;
}) {
  const t = useTranslations("MilestoneManagement.materials");
  const locale = useLocale();

  const [draft, setDraft] = React.useState(
    line.actualQuantity === null ? "" : String(line.actualQuantity),
  );

  // Keep the field in step when the server value changes under us (another
  // tab, a refetch) — without this the input keeps a stale local edit.
  //
  // Adjusted during render rather than in an effect: the effect version
  // painted the stale number once and then corrected it, which is the
  // cascading render the set-state-in-effect rule is about.
  useResetOnChange(line.actualQuantity, () => {
    setDraft(line.actualQuantity === null ? "" : String(line.actualQuantity));
  });

  const parsed = Number(draft);
  const dirty =
    draft.trim() !== "" &&
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    parsed !== line.actualQuantity;

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">{line.materialName}</span>

      <span className="tabular-nums text-muted-foreground">
        {t("estimated")}: {line.estimatedQuantity} {line.unit}
      </span>

      <span className="tabular-nums text-muted-foreground">
        {formatVnd(line.estimatedCost, locale)}
      </span>

      <span className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          step="any"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={canRecordActual ? t("actualPlaceholder") : t("actualLocked")}
          disabled={!canRecordActual || saving}
          title={canRecordActual ? undefined : t("actualLocked")}
          className="w-32"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onSaveActual(parsed)}
          disabled={!dirty || !canRecordActual || saving}
        >
          {t("save")}
        </Button>
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={saving}
        aria-label={t("remove")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
