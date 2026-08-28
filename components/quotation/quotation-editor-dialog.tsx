"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { formatVndParts } from "@/lib/format-currency";
import {
  paymentTermsBalance,
  sumQuotationItems,
  type Quotation,
  type QuotationItemInput,
  type QuotationPaymentTermInput,
} from "@/features/projects/quotation-types";
import type { QuotationVariant } from "@/features/projects/quotation-variant";

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

/** A row while it is being edited: numbers stay strings so the field can be empty. */
interface ItemDraft {
  key: string;
  name: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  note: string;
}

interface TermDraft {
  key: string;
  name: string;
  percentage: string;
  condition: string;
}

let draftKeySeed = 0;
const nextKey = () => `row-${(draftKeySeed += 1)}`;

function emptyItem(): ItemDraft {
  return {
    key: nextKey(),
    name: "",
    description: "",
    unit: "",
    quantity: "1",
    unitPrice: "",
    note: "",
  };
}

function emptyTerm(): TermDraft {
  return { key: nextKey(), name: "", percentage: "", condition: "" };
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

  const [title, setTitle] = React.useState("");
  const [note, setNote] = React.useState("");
  const [durationDays, setDurationDays] = React.useState("");
  const [freeRevisions, setFreeRevisions] = React.useState("");
  const [extraRevisionFee, setExtraRevisionFee] = React.useState("");
  const [items, setItems] = React.useState<ItemDraft[]>([emptyItem()]);
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
        ? initial.items.map((item) => ({
            key: nextKey(),
            name: item.name,
            description: item.description ?? "",
            unit: item.unit ?? "",
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            note: item.note ?? "",
          }))
        : [emptyItem()],
    );
    setTerms(
      initial
        ? initial.paymentTerms.map((term) => ({
            key: nextKey(),
            name: term.name,
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

  const parsedItems: QuotationItemInput[] = React.useMemo(
    () =>
      items
        .filter((item) => item.name.trim().length > 0)
        .map((item) => ({
          name: item.name.trim(),
          description: item.description.trim() || undefined,
          unit: item.unit.trim() || undefined,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          note: item.note.trim() || undefined,
        })),
    [items],
  );

  const parsedTerms: QuotationPaymentTermInput[] = React.useMemo(
    () =>
      terms
        .filter((term) => term.name.trim().length > 0)
        .map((term) => ({
          name: term.name.trim(),
          percentage: Number(term.percentage) || undefined,
          condition: term.condition.trim() || undefined,
        })),
    [terms],
  );

  const total = sumQuotationItems(parsedItems);
  const balance = paymentTermsBalance(parsedTerms, total);
  const money = (amount: number) => formatVndParts(amount, locale).full;

  const valid =
    title.trim().length > 0 &&
    parsedItems.length > 0 &&
    parsedItems.every((item) => item.quantity > 0 && item.unitPrice >= 0);

  const patchItem = (key: string, patch: Partial<ItemDraft>) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const patchTerm = (key: string, patch: Partial<TermDraft>) =>
    setTerms((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
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
              <label className="text-sm font-medium">{t("editor.duration")}</label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{t("editor.itemsTitle")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("editor.itemsHint")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setItems((rows) => [...rows, emptyItem()])}
              >
                <Plus aria-hidden />
                {t("editor.addItem")}
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {items.map((item, index) => {
                const lineTotal =
                  (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
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
                        onClick={() =>
                          setItems((rows) => rows.filter((r) => r.key !== item.key))
                        }
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>

                    <div className="grid gap-2 pl-7 sm:grid-cols-4">
                      <Input
                        value={item.unit}
                        placeholder={t("editor.itemUnit")}
                        onChange={(e) => patchItem(item.key, { unit: e.target.value })}
                      />
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        placeholder={t("editor.itemQuantity")}
                        onChange={(e) =>
                          patchItem(item.key, { quantity: e.target.value })
                        }
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1000"
                        value={item.unitPrice}
                        placeholder={t("editor.itemUnitPrice")}
                        onChange={(e) =>
                          patchItem(item.key, { unitPrice: e.target.value })
                        }
                      />
                      <p className="self-center text-right text-sm font-medium tabular-nums">
                        {money(lineTotal)}
                      </p>
                    </div>

                    <Input
                      className="ml-7"
                      value={item.description}
                      placeholder={t("editor.itemDescription")}
                      onChange={(e) =>
                        patchItem(item.key, { description: e.target.value })
                      }
                    />
                  </div>
                );
              })}
            </div>

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
                <p className="text-xs text-muted-foreground">{t("editor.termsHint")}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
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
                  return (
                    <div
                      key={term.key}
                      className="flex flex-col gap-2 rounded-lg border border-border/70 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-2 w-5 shrink-0 text-xs text-muted-foreground">
                          {index + 1}.
                        </span>
                        <Input
                          className="flex-1"
                          value={term.name}
                          placeholder={t("editor.termName")}
                          onChange={(e) => patchTerm(term.key, { name: e.target.value })}
                        />
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
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500"
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
                estimatedDurationDays: Number(durationDays) || undefined,
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
  return <QuotationEditorBase {...props} variant="construction" />;
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
