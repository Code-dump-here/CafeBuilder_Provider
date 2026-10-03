"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { LayoutTemplate, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { formatVndParts } from "@/lib/format-currency";
import {
  paymentTermsBalance,
  sumQuotationItems,
  type Quotation,
  type QuotationItemInput,
  type QuotationPaymentTermInput,
} from "@/features/projects/quotation-types";
import { quotationUnitOptions } from "@/features/projects/quotation-units";
import type { QuotationVariant } from "@/features/projects/quotation-variant";
import {
  DESIGN_PART_STORED_NAME,
  DESIGN_PART_UNIT,
  DESIGN_QUOTATION_PARTS,
  designPartFromName,
  type DesignQuotationPart,
} from "@/features/projects/quotation-design-parts";
import {
  CONSTRUCTION_TEMPLATE_DURATION_DAYS,
  CONSTRUCTION_TEMPLATE_PHASES,
  CONSTRUCTION_TEMPLATE_TERMS,
  CONSTRUCTION_TEMPLATE_UNIT,
} from "@/features/projects/quotation-construction-template";
import {
  TURNKEY_DEFAULT_PARTS,
  TURNKEY_TEMPLATE_TERMS,
  turnkeyTemplateDurationDays,
} from "@/features/projects/quotation-turnkey-template";
import { roundPercentOf } from "@/features/projects/quotation-percent";

/**
 * Draft editor for a quotation: the priced line items and the instalment
 * schedule, in one dialog.
 *
 * The two halves are here together rather than on separate steps because they
 * constrain each other — the schedule is expressed as percentages of the
 * total, and the total only exists once the lines are priced. Splitting them
 * would mean writing a schedule against a number that is not on screen.
 *
 * Line totals are shown but never sent: the server recomputes
 * `quantity × unitPrice` and the quotation total from the lines, so a rounded
 * or stale figure typed here can't reach the contract.
 */

/**
 * `part` — one of the four fixed design deliverables, priced whole.
 * `free` — a named line with unit × quantity × unit price.
 * The design-parts form has only the first, the construction form only the
 * second; a turnkey (`both`) quotation has both kinds side by side.
 */
type ItemKind = "part" | "free";

/** A row while it is being edited: numbers stay strings so the field can be empty. */
interface ItemDraft {
  key: string;
  kind: ItemKind;
  name: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  note: string;
  /**
   * `part` rows only: which deliverable the line prices. Null on a new row, or
   * on a line written before the parts were fixed (its old `name` is kept so
   * the provider can see what to map it to).
   */
  part: DesignQuotationPart | null;
}

interface TermDraft {
  key: string;
  name: string;
  percentage: string;
  condition: string;
  /** Design-parts mode only: the deliverable this instalment pays for. */
  part: DesignQuotationPart | null;
}

/**
 * Bounds for the committed duration. Required here, unlike on the application
 * form: by quotation time the provider has the brief, the survey and — on the
 * construction side — the approved design, so a schedule can be stood behind.
 * It is also the number `ContractService` reads to derive `ExecutionEndAt`
 * from `ExecutionStartAt`, so a quotation without one leaves the contract
 * with no handover date to fill in automatically.
 */
const DURATION_MIN_DAYS = 1;
const DURATION_MAX_DAYS = 365;

let draftKeySeed = 0;
const nextKey = () => `row-${(draftKeySeed += 1)}`;

function emptyItem(kind: ItemKind = "free"): ItemDraft {
  return {
    key: nextKey(),
    kind,
    name: "",
    description: "",
    unit: "",
    quantity: "1",
    unitPrice: "",
    note: "",
    part: null,
  };
}

function emptyTerm(): TermDraft {
  return { key: nextKey(), name: "", percentage: "", condition: "", part: null };
}

export interface QuotationFormValues {
  title: string;
  note?: string;
  estimatedDurationDays?: number;
  freeRevisionCount?: number;
  extraRevisionFee?: number;
  items: QuotationItemInput[];
  paymentTerms: QuotationPaymentTermInput[];
}

function QuotationEditorBase({
  open,
  onOpenChange,
  initial,
  isNewVersion = false,
  variant,
  designParts = false,
  turnkey = false,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Which contract this quotation prices. Drives whether the revision terms
   * are on the form at all — see `features/projects/quotation-variant.ts`.
   */
  variant: QuotationVariant;
  /**
   * Price the four fixed design deliverables (concept, 2D, 3D, design
   * documents) instead of free-text lines, each at most once — and tie each
   * instalment to one of them. Only for a pure design scope: a `both`
   * engagement also prices construction, which these four can't express.
   */
  designParts?: boolean;
  /**
   * A `both` engagement or post: one provider sells design AND construction
   * (chốt 03/10/2026). The design half is priced as the fixed parts — any 1 to
   * 4, each once, same as `designParts` — and the construction half as free
   * lines, with a template button that lays out both. Instalments stay free
   * text; the template's shares are round tens, but any figure may be typed.
   */
  turnkey?: boolean;
  /** Prefill. Null when starting from scratch. */
  initial: Quotation | null;
  /**
   * True when `initial` is only a starting point for a brand-new quotation —
   * the owner asked for another version, and the server refuses to overwrite
   * one it has already shown them. The form is identical; only the wording
   * changes, so the provider knows a second document is being issued rather
   * than the first one rewritten.
   */
  isNewVersion?: boolean;
  pending: boolean;
  onSubmit: (values: QuotationFormValues) => void;
}) {
  const t = useTranslations("Quotations");
  const locale = useLocale();
  const isDesign = variant === "design";
  // Turnkey only makes sense on the design-side form (it carries the revision
  // terms), and never together with the all-parts form.
  const isTurnkey = turnkey && isDesign && !designParts;
  const firstRows = (): ItemDraft[] =>
    designParts
      ? [emptyItem("part")]
      : isTurnkey
        ? [emptyItem("part"), emptyItem("free")]
        : [emptyItem("free")];

  /**
   * Label for a unit token. A legacy row can hold a string that predates the
   * fixed list and has no translation, so fall back to the raw value rather
   * than rendering next-intl's missing-key marker in the dropdown.
   */
  const unitLabel = (unit: string) =>
    t.has(`editor.units.${unit}`) ? t(`editor.units.${unit}`) : unit;

  const [title, setTitle] = React.useState("");
  const [note, setNote] = React.useState("");
  const [durationDays, setDurationDays] = React.useState("");
  const [freeRevisions, setFreeRevisions] = React.useState("");
  const [extraRevisionFee, setExtraRevisionFee] = React.useState("");
  const [items, setItems] = React.useState<ItemDraft[]>(firstRows);
  const [terms, setTerms] = React.useState<TermDraft[]>([]);

  useResetOnChange(open ? (initial?.id ?? "new") : null, () => {
    setTitle(initial?.title ?? "");
    setNote(initial?.note ?? "");
    setDurationDays(
      initial?.estimatedDurationDays != null ? String(initial.estimatedDurationDays) : "",
    );
    setFreeRevisions(
      initial?.freeRevisionCount != null ? String(initial.freeRevisionCount) : "",
    );
    setExtraRevisionFee(
      initial?.extraRevisionFee != null ? String(initial.extraRevisionFee) : "",
    );
    setItems(
      initial && initial.items.length > 0
        ? initial.items.map((item) => {
            // Turnkey: a line stored under a part's fixed name is that part;
            // anything else is a construction line. Design-parts form: every
            // line is a part, mapped or not.
            const part =
              designParts || isTurnkey ? designPartFromName(item.name) : null;
            const kind: ItemKind =
              designParts || (isTurnkey && part !== null) ? "part" : "free";
            return {
              key: nextKey(),
              kind,
              name: item.name,
              description: item.description ?? "",
              unit: item.unit ?? "",
              quantity: String(item.quantity),
              // A part is sold whole, so a part line's price is the line
              // total — an old line priced as 2 × 500k reads as 1M.
              unitPrice:
                kind === "part"
                  ? String(item.quantity * item.unitPrice)
                  : String(item.unitPrice),
              note: item.note ?? "",
              part,
            };
          })
        : firstRows(),
    );
    setTerms(
      initial
        ? initial.paymentTerms.map((term) => ({
            key: nextKey(),
            name: term.name,
            part: designParts ? designPartFromName(term.name) : null,
            // Terms written as a flat amount come back with percentage null;
            // re-deriving one from the total keeps the editor on a single
            // input instead of an amount/percentage mode switch.
            percentage:
              term.percentage != null
                ? String(term.percentage)
                : initial.totalAmount > 0
                  ? String(
                      Math.round((term.amount / initial.totalAmount) * 1000) / 10,
                    )
                  : "",
            condition: term.condition ?? "",
          }))
        : [],
    );
  });

  const partLabel = (part: DesignQuotationPart) => t(`editor.designParts.${part}`);

  // A `part` row with a part is a whole deliverable — fixed name, one package.
  // One with no part but an old name or a price is an unmapped legacy line: it
  // blocks saving (below) rather than vanishing.
  const isBlankItem = (item: ItemDraft) =>
    item.part === null && !item.name.trim() && !item.unitPrice.trim();
  const unmappedItems = items.filter(
    (item) => item.kind === "part" && item.part === null && !isBlankItem(item),
  );
  const partRows = items.filter((item) => item.kind === "part");
  const freeRows = items.filter((item) => item.kind === "free");

  const parsedItems: QuotationItemInput[] = React.useMemo(
    () =>
      items.flatMap((item): QuotationItemInput[] => {
        if (item.kind === "part") {
          return item.part === null
            ? []
            : [
                {
                  name: DESIGN_PART_STORED_NAME[item.part],
                  description: item.description.trim() || undefined,
                  unit: DESIGN_PART_UNIT,
                  quantity: 1,
                  unitPrice: Number(item.unitPrice) || 0,
                  note: item.note.trim() || undefined,
                },
              ];
        }
        return item.name.trim().length === 0
          ? []
          : [
              {
                name: item.name.trim(),
                description: item.description.trim() || undefined,
                unit: item.unit.trim() || undefined,
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                note: item.note.trim() || undefined,
              },
            ];
      }),
    [items],
  );

  const parsedTerms: QuotationPaymentTermInput[] = React.useMemo(
    () =>
      designParts
        ? terms
            .filter((term) => term.part !== null)
            .map((term) => ({
              name: DESIGN_PART_STORED_NAME[term.part!],
              percentage: Number(term.percentage) || undefined,
              condition: term.condition.trim() || undefined,
            }))
        : terms
            .filter((term) => term.name.trim().length > 0)
            .map((term) => ({
              name: term.name.trim(),
              percentage: Number(term.percentage) || undefined,
              condition: term.condition.trim() || undefined,
            })),
    [terms, designParts],
  );

  const total = sumQuotationItems(parsedItems);
  const balance = paymentTermsBalance(parsedTerms, total);
  const money = (amount: number) => formatVndParts(amount, locale).full;

  // Parts already priced, in line order — what an instalment may pay for.
  const pricedParts = items.flatMap((item) => (item.part ? [item.part] : []));
  const termProblem = (term: TermDraft): "missing" | "notQuoted" | null =>
    !designParts
      ? null
      : term.part === null
        ? "missing"
        : pricedParts.includes(term.part)
          ? null
          : "notQuoted";

  // A turnkey quotation sells design too: at least one part must be priced.
  const missingTurnkeyPart =
    isTurnkey && !partRows.some((item) => item.part !== null);

  const durationNumber = Number.parseInt(durationDays.trim(), 10);
  const durationValid =
    Number.isFinite(durationNumber) &&
    durationNumber >= DURATION_MIN_DAYS &&
    durationNumber <= DURATION_MAX_DAYS;

  const valid =
    title.trim().length > 0 &&
    durationValid &&
    parsedItems.length > 0 &&
    parsedItems.every((item) => item.quantity > 0 && item.unitPrice >= 0) &&
    unmappedItems.length === 0 &&
    !missingTurnkeyPart &&
    terms.every((term) => termProblem(term) === null);

  const patchItem = (key: string, patch: Partial<ItemDraft>) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const patchTerm = (key: string, patch: Partial<TermDraft>) =>
    setTerms((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  /**
   * Picking a part for an instalment pre-fills what the provider would type
   * anyway: that part's share of the total — snapped to a round ten — and when
   * it falls due. Only empty fields are filled — a percentage already
   * negotiated is never overwritten.
   */
  const chooseTermPart = (term: TermDraft, part: DesignQuotationPart) => {
    const item = items.find((i) => i.part === part);
    const price = Number(item?.unitPrice) || 0;
    patchTerm(term.key, {
      part,
      percentage:
        term.percentage.trim() || total <= 0
          ? term.percentage
          : String(roundPercentOf(price, total)),
      condition:
        term.condition.trim() || t("editor.designTermCondition", { part: partLabel(part) }),
    });
  };

  // ── Construction 3-phase template ──────────────────────────────────────────
  const [templateConfirmOpen, setTemplateConfirmOpen] = React.useState(false);
  const hasEnteredLines =
    items.some((item) => item.name.trim() || item.unitPrice.trim()) || terms.length > 0;

  const constructionPhaseRows = (): ItemDraft[] =>
    CONSTRUCTION_TEMPLATE_PHASES.map((phase) => ({
      ...emptyItem("free"),
      name: t(`editor.template.phases.${phase.key}.name`),
      description: t(`editor.template.phases.${phase.key}.description`),
      unit: CONSTRUCTION_TEMPLATE_UNIT,
      quantity: "1",
    }));

  const applyConstructionTemplate = () => {
    setItems(constructionPhaseRows());
    setTerms(
      CONSTRUCTION_TEMPLATE_TERMS.map((term) => ({
        ...emptyTerm(),
        name: t(`editor.template.terms.${term.key}.name`),
        percentage: String(term.percentage),
        condition: t(`editor.template.terms.${term.key}.condition`),
      })),
    );
    if (!title.trim()) setTitle(t("editor.template.title"));
    if (!durationDays.trim()) setDurationDays(String(CONSTRUCTION_TEMPLATE_DURATION_DAYS));
  };

  // ── Turnkey (design + construction) template ───────────────────────────────
  const [turnkeyPickerOpen, setTurnkeyPickerOpen] = React.useState(false);
  const [turnkeyParts, setTurnkeyParts] =
    React.useState<readonly DesignQuotationPart[]>(TURNKEY_DEFAULT_PARTS);

  const applyTurnkeyTemplate = (parts: readonly DesignQuotationPart[]) => {
    // Kept in the order the work is done, whatever order they were ticked in.
    const chosen = DESIGN_QUOTATION_PARTS.filter((part) => parts.includes(part));
    setItems([
      ...chosen.map((part) => ({ ...emptyItem("part"), part })),
      ...constructionPhaseRows(),
    ]);
    setTerms(
      TURNKEY_TEMPLATE_TERMS.map((term) => ({
        ...emptyTerm(),
        name: t(`editor.turnkey.terms.${term.key}.name`),
        percentage: String(term.percentage),
        condition: t(`editor.turnkey.terms.${term.key}.condition`),
      })),
    );
    if (!title.trim()) setTitle(t("editor.turnkey.title"));
    if (!durationDays.trim()) setDurationDays(String(turnkeyTemplateDurationDays(chosen)));
  };

  const addRow = (kind: ItemKind) => setItems((rows) => [...rows, emptyItem(kind)]);
  const removeRow = (key: string) => setItems((rows) => rows.filter((r) => r.key !== key));

  /** One design deliverable: which part, and its price. */
  const renderPartRow = (item: ItemDraft, index: number) => {
    // A part chosen on another row can't be chosen again.
    const takenElsewhere = new Set(
      items.flatMap((other) =>
        other.key !== item.key && other.part ? [other.part] : [],
      ),
    );
    const unmapped = item.part === null && !isBlankItem(item);
    return (
      <div
        key={item.key}
        className="flex flex-col gap-2 rounded-lg border border-border/70 p-3"
      >
        <div className="flex items-start gap-2">
          <span className="mt-2 w-5 shrink-0 text-xs text-muted-foreground">
            {index + 1}.
          </span>
          <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_12rem_8rem]">
            <Select
              value={item.part ?? ""}
              onValueChange={(value) =>
                patchItem(item.key, {
                  part: value as DesignQuotationPart,
                  name: "",
                })
              }
            >
              <SelectTrigger className="w-full" aria-invalid={unmapped}>
                <SelectValue placeholder={t("editor.designPartPlaceholder")} />
              </SelectTrigger>
              <SelectContent position="popper">
                {DESIGN_QUOTATION_PARTS.map((part) => (
                  <SelectItem
                    key={part}
                    value={part}
                    disabled={takenElsewhere.has(part)}
                  >
                    {partLabel(part)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              step="1000"
              value={item.unitPrice}
              placeholder={t("editor.designPartPrice")}
              aria-label={t("editor.designPartPrice")}
              onChange={(e) => patchItem(item.key, { unitPrice: e.target.value })}
            />
            <p className="self-center text-right text-sm font-medium tabular-nums">
              {money(Number(item.unitPrice) || 0)}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("editor.removeItem")}
            disabled={items.length === 1}
            onClick={() => removeRow(item.key)}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
        {unmapped ? (
          <p className="pl-7 text-xs text-destructive">
            {item.name.trim()
              ? t("editor.designPartLegacy", { name: item.name.trim() })
              : t("editor.designPartMissing")}
          </p>
        ) : null}
        <div className="pl-7">
          <Input
            value={item.description}
            placeholder={t("editor.itemDescription")}
            onChange={(e) => patchItem(item.key, { description: e.target.value })}
          />
        </div>
      </div>
    );
  };

  /** A named line priced as unit × quantity × unit price. */
  const renderFreeRow = (item: ItemDraft, index: number) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return (
      <div
        key={item.key}
        className="flex flex-col gap-2 rounded-lg border border-border/70 p-3"
      >
        <div className="flex items-start gap-2">
          <span className="mt-2 w-5 shrink-0 text-xs text-muted-foreground">
            {index + 1}.
          </span>
          <Input
            className="flex-1"
            value={item.name}
            placeholder={t("editor.itemName")}
            onChange={(e) => patchItem(item.key, { name: e.target.value })}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("editor.removeItem")}
            // Never leave the list empty: an editor with no rows
            // gives no obvious way back to a valid quotation.
            disabled={items.length === 1}
            onClick={() => removeRow(item.key)}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>

        <div className="grid gap-2 pl-7 sm:grid-cols-4">
          <Select
            value={item.unit}
            onValueChange={(value) => patchItem(item.key, { unit: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("editor.itemUnit")} />
            </SelectTrigger>
            {/* Capped and scrollable: the construction list is 16
                units, and `SelectContent` otherwise grows to the
                full height the viewport allows, covering the rest
                of the row it is being edited in. `popper` anchors
                the panel under the trigger instead of aligning the
                selected item over it. */}
            <SelectContent position="popper" className="max-h-56">
              {/* A turnkey quotation's free lines are its construction half. */}
              {quotationUnitOptions(isTurnkey ? "construction" : variant, item.unit).map(
                (u) => (
                  <SelectItem key={u} value={u}>
                    {unitLabel(u)}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={item.quantity}
            placeholder={t("editor.itemQuantity")}
            onChange={(e) => patchItem(item.key, { quantity: e.target.value })}
          />
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            step="1000"
            value={item.unitPrice}
            placeholder={t("editor.itemUnitPrice")}
            onChange={(e) => patchItem(item.key, { unitPrice: e.target.value })}
          />
          <p className="self-center text-right text-sm font-medium tabular-nums">
            {money(lineTotal)}
          </p>
        </div>

        {/* The indent is padding on a wrapper, not a margin on the
            input: `Input` is `w-full`, so `ml-7` made the field a
            full row wide *plus* the indent and it hung over the
            right edge of the card. */}
        <div className="pl-7">
          <Input
            value={item.description}
            placeholder={t("editor.itemDescription")}
            onChange={(e) => patchItem(item.key, { description: e.target.value })}
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isNewVersion
              ? t("editor.newVersionTitle")
              : initial
                ? t("editor.editTitle")
                : t("editor.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isNewVersion
              ? t("editor.newVersionDescription")
              : isDesign
                ? t("editor.designDescription")
                : t("editor.constructionDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("editor.titleLabel")}</label>
            <Input
              value={title}
              placeholder={t("editor.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div
            className={
              isDesign ? "grid gap-4 sm:grid-cols-3" : "grid gap-4 sm:max-w-[12rem]"
            }
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="quotation-duration">
                {t("editor.duration")}
              </label>
              <Input
                id="quotation-duration"
                type="number"
                inputMode="numeric"
                min={DURATION_MIN_DAYS}
                max={DURATION_MAX_DAYS}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                aria-describedby="quotation-duration-hint"
                aria-invalid={durationDays.length > 0 && !durationValid}
              />
              <p
                id="quotation-duration-hint"
                className="text-[12px] text-muted-foreground"
              >
                {durationValid
                  ? t("editor.durationHint")
                  : t("editor.durationInvalid", {
                      min: DURATION_MIN_DAYS,
                      max: DURATION_MAX_DAYS,
                    })}
              </p>
            </div>

            {/* Revision terms exist only on the design side. A contractor
                filling them in would be publishing a rate the server never
                charges: revision quota is resolved from the design flow, and a
                construction engagement has no designs to resolve it against. */}
            {isDesign ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">
                    {t("editor.freeRevisions")}
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={freeRevisions}
                    onChange={(e) => setFreeRevisions(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">
                    {t("editor.extraRevisionFee")}
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1000"
                    value={extraRevisionFee}
                    onChange={(e) => setExtraRevisionFee(e.target.value)}
                  />
                </div>
              </>
            ) : null}
          </div>

          {/* Say where scope changes go instead, so the missing fields read as
              a deliberate rule rather than a form that forgot something. */}
          {isDesign ? null : (
            <p className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
              {t("editor.constructionChangeOrderHint")}
            </p>
          )}

          {/* ── Line items ─────────────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{t("editor.itemsTitle")}</h3>
                <p className="text-xs text-muted-foreground">
                  {designParts
                    ? t("editor.designItemsHint")
                    : isTurnkey
                      ? t("editor.turnkey.itemsHint")
                      : t("editor.itemsHint")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {variant === "construction" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    title={t("editor.template.hint")}
                    onClick={() =>
                      hasEnteredLines
                        ? setTemplateConfirmOpen(true)
                        : applyConstructionTemplate()
                    }
                  >
                    <LayoutTemplate aria-hidden />
                    {t("editor.template.button")}
                  </Button>
                ) : null}
                {isTurnkey ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    title={t("editor.turnkey.hint")}
                    onClick={() => {
                      setTurnkeyParts(TURNKEY_DEFAULT_PARTS);
                      setTurnkeyPickerOpen(true);
                    }}
                  >
                    <LayoutTemplate aria-hidden />
                    {t("editor.turnkey.button")}
                  </Button>
                ) : (
                  // Turnkey adds rows per half instead, below.
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    // Four parts, each once: a fifth row could only repeat one.
                    disabled={designParts && items.length >= DESIGN_QUOTATION_PARTS.length}
                    onClick={() => addRow(designParts ? "part" : "free")}
                  >
                    <Plus aria-hidden />
                    {t("editor.addItem")}
                  </Button>
                )}
              </div>
            </div>

            {variant === "construction" ? (
              <p className="text-xs text-muted-foreground">{t("editor.template.hint")}</p>
            ) : null}
            {isTurnkey ? (
              <p className="text-xs text-muted-foreground">{t("editor.turnkey.hint")}</p>
            ) : null}

            {isTurnkey ? (
              <>
                {/* Design half: the fixed parts, any 1 to 4, each once. */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-medium">{t("editor.turnkey.designTitle")}</h4>
                      <p className="text-xs text-muted-foreground">
                        {t("editor.turnkey.designHint")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={partRows.length >= DESIGN_QUOTATION_PARTS.length}
                      title={
                        partRows.length >= DESIGN_QUOTATION_PARTS.length
                          ? t("editor.designPartsAllUsed")
                          : undefined
                      }
                      onClick={() => addRow("part")}
                    >
                      <Plus aria-hidden />
                      {t("editor.turnkey.addDesignPart")}
                    </Button>
                  </div>
                  {partRows.map(renderPartRow)}
                  {/* Not on a blank form — only once the provider has started. */}
                  {missingTurnkeyPart && hasEnteredLines ? (
                    <p className="text-xs text-destructive">
                      {t("editor.turnkey.designRequired")}
                    </p>
                  ) : null}
                </div>

                {/* Construction half: free lines, construction units. */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-medium">
                        {t("editor.turnkey.constructionTitle")}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {t("editor.turnkey.constructionHint")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addRow("free")}
                    >
                      <Plus aria-hidden />
                      {t("editor.turnkey.addConstructionLine")}
                    </Button>
                  </div>
                  {freeRows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                      {t("editor.turnkey.noConstructionLines")}
                    </p>
                  ) : (
                    freeRows.map(renderFreeRow)
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                {designParts ? items.map(renderPartRow) : items.map(renderFreeRow)}
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-sm font-medium">{t("editor.total")}</span>
              <span className="text-lg font-semibold tabular-nums">{money(total)}</span>
            </div>
          </section>

          {/* ── Payment schedule ───────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{t("editor.termsTitle")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("editor.termsHint")}
                  {designParts ? ` ${t("editor.designTermsHint")}` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                // One instalment per priced part — no part left, no new row.
                disabled={designParts && terms.length >= pricedParts.length}
                title={
                  designParts && pricedParts.length > 0 && terms.length >= pricedParts.length
                    ? t("editor.designTermsAllUsed")
                    : undefined
                }
                onClick={() => setTerms((rows) => [...rows, emptyTerm()])}
              >
                <Plus aria-hidden />
                {t("editor.addTerm")}
              </Button>
            </div>

            {terms.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                {t("editor.noTerms")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {terms.map((term, index) => {
                  const termAmount = (total * (Number(term.percentage) || 0)) / 100;
                  const problem = termProblem(term);
                  const termTakenElsewhere = new Set(
                    terms.flatMap((other) =>
                      other.key !== term.key && other.part ? [other.part] : [],
                    ),
                  );
                  return (
                    <div
                      key={term.key}
                      className="flex flex-col gap-2 rounded-lg border border-border/70 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-2 w-5 shrink-0 text-xs text-muted-foreground">
                          {index + 1}.
                        </span>
                        {designParts ? (
                          <Select
                            value={term.part ?? ""}
                            onValueChange={(value) =>
                              chooseTermPart(term, value as DesignQuotationPart)
                            }
                          >
                            <SelectTrigger className="flex-1" aria-invalid={problem !== null}>
                              <SelectValue placeholder={t("editor.designTermPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              {/* Only parts priced above, each paid once. */}
                              {DESIGN_QUOTATION_PARTS.filter(
                                (part) => pricedParts.includes(part) || part === term.part,
                              ).map((part) => (
                                <SelectItem
                                  key={part}
                                  value={part}
                                  disabled={
                                    termTakenElsewhere.has(part) || !pricedParts.includes(part)
                                  }
                                >
                                  {partLabel(part)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="flex-1"
                            value={term.name}
                            placeholder={t("editor.termName")}
                            onChange={(e) => patchTerm(term.key, { name: e.target.value })}
                          />
                        )}
                        <Input
                          className="w-24"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="100"
                          step="1"
                          value={term.percentage}
                          placeholder="%"
                          onChange={(e) =>
                            patchTerm(term.key, { percentage: e.target.value })
                          }
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={t("editor.removeTerm")}
                          onClick={() =>
                            setTerms((rows) => rows.filter((r) => r.key !== term.key))
                          }
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 pl-7">
                        <Input
                          className="flex-1"
                          value={term.condition}
                          placeholder={t("editor.termCondition")}
                          onChange={(e) =>
                            patchTerm(term.key, { condition: e.target.value })
                          }
                        />
                        <span className="w-32 text-right text-sm tabular-nums text-muted-foreground">
                          {money(termAmount)}
                        </span>
                      </div>
                      {problem ? (
                        <p className="pl-7 text-xs text-destructive">
                          {problem === "notQuoted"
                            ? t("editor.designTermNotQuoted")
                            : term.name.trim()
                              ? t("editor.designPartLegacy", { name: term.name.trim() })
                              : t("editor.designTermMissing")}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {/* A schedule that doesn't add up to the total is not rejected by
                the server — it just leaves money with no instalment to collect
                it, or asks for more than was quoted. Say so here, where it can
                still be fixed. */}
            {terms.length > 0 && !balance.isBalanced ? (
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3">
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-warning-muted-foreground"
                  aria-hidden
                />
                <p className="text-xs">
                  {balance.difference > 0
                    ? t("editor.termsOver", { amount: money(balance.difference) })
                    : t("editor.termsUnder", { amount: money(-balance.difference) })}
                </p>
              </div>
            ) : null}
          </section>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("editor.note")}</label>
            <Textarea
              rows={3}
              value={note}
              placeholder={t("editor.notePlaceholder")}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button
            disabled={pending || !valid}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                note: note.trim() || undefined,
                // Required by `valid` above, so this is always a real number.
                estimatedDurationDays: durationNumber,
                // Omitted entirely on the construction form — not sent as 0.
                // A published 0 reads as "no free revisions, extra rounds are
                // free", which is a term the owner could hold the contractor
                // to; absent means the quotation makes no revision promise.
                ...(isDesign
                  ? {
                      freeRevisionCount:
                        freeRevisions === "" ? undefined : Number(freeRevisions),
                      extraRevisionFee:
                        extraRevisionFee === "" ? undefined : Number(extraRevisionFee),
                    }
                  : {}),
                items: parsedItems,
                paymentTerms: parsedTerms,
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("editor.save")}
          </Button>
        </DialogFooter>

        <ConfirmDialog
          open={templateConfirmOpen}
          onOpenChange={setTemplateConfirmOpen}
          title={t("editor.template.confirmTitle")}
          description={t("editor.template.confirmBody")}
          confirmLabel={t("editor.template.confirm")}
          cancelLabel={t("dialog.cancel")}
          onConfirm={() => {
            setTemplateConfirmOpen(false);
            applyConstructionTemplate();
          }}
        />

        {/* Turnkey template: which design parts this job sells (1 to 4),
            then both halves are laid out at once. */}
        <AlertDialog open={turnkeyPickerOpen} onOpenChange={setTurnkeyPickerOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("editor.turnkey.pickerTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("editor.turnkey.pickerBody")}
                {hasEnteredLines ? ` ${t("editor.turnkey.pickerReplaces")}` : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{t("editor.turnkey.designTitle")}</legend>
              {DESIGN_QUOTATION_PARTS.map((part) => {
                const checked = turnkeyParts.includes(part);
                return (
                  <label
                    key={part}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      onChange={() =>
                        setTurnkeyParts((current) =>
                          checked
                            ? current.filter((p) => p !== part)
                            : [...current, part],
                        )
                      }
                    />
                    {partLabel(part)}
                  </label>
                );
              })}
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={() => setTurnkeyParts(DESIGN_QUOTATION_PARTS)}
                >
                  {t("editor.turnkey.pickAll")}
                </button>
              </div>
              {turnkeyParts.length === 0 ? (
                <p className="text-xs text-destructive">{t("editor.turnkey.pickAtLeastOne")}</p>
              ) : null}
            </fieldset>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("dialog.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={turnkeyParts.length === 0}
                onClick={() => applyTurnkeyTemplate(turnkeyParts)}
              >
                {t("editor.turnkey.apply", { count: turnkeyParts.length })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The design studio's quotation form: price, schedule, **and** the revision
 * terms the design flow will enforce.
 */
export function DesignQuotationEditorDialog(
  props: Omit<React.ComponentProps<typeof QuotationEditorBase>, "variant">,
) {
  return <QuotationEditorBase {...props} variant="design" />;
}

/**
 * The contractor's quotation form: the same priced lines and instalments, with
 * the revision terms removed. Extra work on a build is a change order against
 * the signed contract, not a rate published up front.
 */
export function ConstructionQuotationEditorDialog(
  props: Omit<React.ComponentProps<typeof QuotationEditorBase>, "variant">,
) {
  // Built work is never priced as the four design deliverables.
  return <QuotationEditorBase {...props} variant="construction" designParts={false} />;
}

/**
 * Variant-driven entry point, for call sites that resolve the kind of work at
 * runtime rather than knowing it statically.
 */
export function QuotationEditorDialog(
  props: React.ComponentProps<typeof QuotationEditorBase>,
) {
  return <QuotationEditorBase {...props} />;
}
