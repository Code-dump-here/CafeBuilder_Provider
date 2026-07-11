"use client";

import * as React from "react";

import type { DrawingCategory } from "@/lib/projects/design-version-types";

/**
 * Custom user-defined drawing categories for the design-management
 * page tabs. Today this is React-only state (per-component, lost on
 * refresh); if we ever want persistence we'd lift it into a server
 * route + a query cache.
 *
 * Custom categories get a stable string id (the label, lowercased +
 * hyphenated) and a numeric counter suffix on collision. The shape
 * mirrors the built-in `DrawingCategory` union so the table can treat
 * both kinds identically.
 */
export interface CustomCategory {
  /** Stable id used as the tab value. */
  id: DrawingCategory | string;
  /** Display label. */
  label: string;
}

interface CustomCategoriesContextValue {
  custom: CustomCategory[];
  add: (label: string) => CustomCategory | null;
  remove: (id: CustomCategory["id"]) => void;
  /** True once the consumer has mounted — used to gate SSR-incompatible
   * local state work. */
  hydrated: boolean;
}

const CustomCategoriesContext =
  React.createContext<CustomCategoriesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers

/**
 * Convert a free-form label into a stable, kebab-case id. Returns
 * `null` if the label collapses to an empty string (e.g. "   ").
 */
function labelToId(label: string): string | null {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

/**
 * Returns a unique id given a desired base id and the existing custom
 * categories. Appends `-2`, `-3`, … on collision.
 */
function uniqueId(
  base: string,
  existing: ReadonlyArray<CustomCategory>,
): string {
  const taken = new Set(existing.map((c) => c.id));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// ---------------------------------------------------------------------------
// Provider

interface CustomCategoriesProviderProps {
  children: React.ReactNode;
  /** Initial custom categories (typically `[]`). */
  initial?: CustomCategory[];
}

export function CustomCategoriesProvider({
  children,
  initial = [],
}: CustomCategoriesProviderProps) {
  const [custom, setCustom] = React.useState<CustomCategory[]>(initial);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const add = React.useCallback(
    (label: string): CustomCategory | null => {
      const base = labelToId(label);
      if (!base) return null;
      // Reject duplicates by label so "Site Plans" and "site-plans"
      // both produce the same id.
      const duplicate = custom.some(
        (c) => c.id === base || c.label.toLowerCase() === label.toLowerCase(),
      );
      if (duplicate) return null;
      const id = uniqueId(base, custom);
      const created: CustomCategory = { id, label: label.trim() };
      setCustom((prev) => [...prev, created]);
      return created;
    },
    [custom],
  );

  const remove = React.useCallback((id: CustomCategory["id"]) => {
    setCustom((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = React.useMemo(
    () => ({ custom, add, remove, hydrated }),
    [custom, add, remove, hydrated],
  );

  return (
    <CustomCategoriesContext.Provider value={value}>
      {children}
    </CustomCategoriesContext.Provider>
  );
}

export function useCustomCategories(): CustomCategoriesContextValue {
  const ctx = React.useContext(CustomCategoriesContext);
  if (!ctx) {
    throw new Error(
      "useCustomCategories must be used within <CustomCategoriesProvider>",
    );
  }
  return ctx;
}