import * as React from "react";

/**
 * Labelled form field — a `<label>` wrapper so clicking the caption focuses
 * the control inside it.
 *
 * This markup was copy-pasted identically into five dialogs (add/edit issue,
 * add/edit phase, add task). Two other components are also called `Field` and
 * are deliberately NOT folded in here:
 *
 *   - `admin/projects/page.tsx` renders a read-only `<div>` with different
 *     spacing — a display row, not a form control.
 *   - `design-management/dialogs.tsx` adds a `hint` line and uses a `<div>`
 *     because it wraps a Radix Select; nesting that trigger in a `<label>`
 *     makes the click toggle it twice.
 */
export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  /**
   * Inline validation message rendered under the control in destructive
   * tone. Pass the message from `react-hook-form` (`errors.field.message`)
   * or a local `useState` to drive it.
   */
  error?: string;
  /**
   * Secondary hint shown below the control in muted tone — distinct from
   * `error` so it can coexist (e.g. "VND" under a money input while the
   * field is empty and valid).
   */
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground/80">{hint}</span>
      ) : null}
    </label>
  );
}
