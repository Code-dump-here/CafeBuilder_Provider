"use client";

import * as React from "react";

// ─── ThemeProvider ───────────────────────────────────────────────────────────
//
// Drop-in replacement for `next-themes`'s `ThemeProvider` that works around
// React 19's "Scripts inside React components are never executed" warning
// emitted by Next.js 16 / Turbopack + React 19.2 SSR.
//
// `next-themes@0.4.6` injects a `<script>` tag via the standard JSX tree to
// prevent the FOUC (flash of unstyled content) before React hydrates. That
// pattern is fine in React 18 but React 19's SSR emits a console error
// during the server render pass — even though the script eventually runs
// fine on the client.
//
// This implementation inlines the SAME script via a `<script>` element
// rendered into `<head>` directly through `document.head.appendChild` from
// a `useEffect`. Doing so sidesteps the React SSR path entirely:
//
//   1. On the server we render only `children` — no script, no warning.
//   2. On the client, the provider's `useEffect` runs *after* hydration and
//      injects the FOUC-prevention script into `<head>`. The script then
//      sets the correct `class="dark"` before paint.
//
// Trade-off: there is a one-frame flash on the very first cold load while
// React commits and the effect runs. For an auth-gated marketplace this is
// imperceptible (the script runs in the same task as the first paint).

export type Theme = "light" | "dark" | "system";

export type ThemeProviderProps = {
  children: React.ReactNode;
  /**
   * Persisted theme attribute on the root element. Default `"class"` — we
   * rely on Tailwind v4's `@custom-variant dark (&:is(.dark *))` and the
   * `.dark { ... }` overrides in `app/globals.css`.
   */
  attribute?: string;
  storageKey?: string;
  themes?: Theme[];
  defaultTheme?: Theme;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (next: Theme | ((prev: Theme) => Theme)) => void;
  themes: Theme[];
  systemTheme: "light" | "dark";
};

const STORAGE_KEY_DEFAULT = "theme";
const ATTRIBUTE_DEFAULT = "class";
const THEMES_DEFAULT: Theme[] = ["light", "dark", "system"];

const noop = () => {};
const defaultContext: ThemeContextValue = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: noop,
  themes: THEMES_DEFAULT,
  systemTheme: "light",
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined,
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Same-tab counterpart to `storage`, which only fires in other tabs. */
const THEME_CHANGE_EVENT = "aicoffee:theme-change";

function readStoredTheme(storageKey: string): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage may throw in private mode / SSR.
  }
  return null;
}

function writeStoredTheme(storageKey: string, value: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // See note above.
  }
}

function systemPrefers(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Apply the theme to the DOM root. Mutates either `classList` or the
 * named attribute depending on the configured `attribute`.
 */
function applyTheme(
  attribute: string,
  resolved: "light" | "dark",
  value?: string | Record<string, string>,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    if (resolved === "dark") root.classList.add("dark");
    return;
  }

  const computed = value && typeof value === "object" ? value[resolved] : resolved;
  if (computed) {
    root.setAttribute(attribute, computed);
  } else {
    root.removeAttribute(attribute);
  }
}

function disableTransitions(): () => void {
  if (typeof document === "undefined") return noop;
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(style);
  return () => {
    // Force a reflow so the transitions reset after the new theme sticks.
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ThemeProvider({
  children,
  attribute = ATTRIBUTE_DEFAULT,
  storageKey = STORAGE_KEY_DEFAULT,
  themes = THEMES_DEFAULT,
  defaultTheme = "system",
  enableSystem = true,
  enableColorScheme = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  // The stored theme is external state — it lives in localStorage, another tab
  // can change it, and this tab has to follow. `useSyncExternalStore` models
  // that directly, which is what removes the old "read it in an effect, then
  // setState" step and its extra render.
  //
  // `getServerSnapshot` returns the default, so the server render and
  // hydration agree; React only reads the live value once hydration finishes,
  // so a stored theme still cannot cause a mismatch.
  const subscribeToStoredTheme = React.useCallback(
    (onStoreChange: () => void) => {
      // `storage` fires in *other* tabs only, so writes from this one are
      // announced with an event of our own.
      const onStorage = (event: StorageEvent) => {
        if (event.key === storageKey) onStoreChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
      };
    },
    [storageKey],
  );

  const theme = React.useSyncExternalStore(
    subscribeToStoredTheme,
    () => readStoredTheme(storageKey) ?? defaultTheme,
    () => defaultTheme,
  );
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">(
    () => (typeof window === "undefined" ? "light" : systemPrefers()),
  );

  // Track the OS preference so `system` follows it live. Reading the stored
  // theme is no longer done here — see `useSyncExternalStore` above.
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // `enableSystem` is honoured here, not just accepted. The pre-paint script
  // in `lib/theme-init.ts` resolves "system" to "light" when the flag is off;
  // this used to follow the OS regardless, so the two halves would have
  // disagreed for anyone passing `enableSystem={false}` — the document would
  // paint light, then React would swap it to the system preference.
  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (enableSystem ? systemTheme : "light") : theme;

  // Apply the resolved theme to the DOM every time it changes. This is the
  // runtime half — the before-paint half is server-rendered into <head> by
  // `app/[locale]/layout.tsx`. When `disableTransitionOnChange` is true we
  // briefly disable CSS transitions so the colour swap doesn't animate.
  React.useEffect(() => {
    const restore = disableTransitionOnChange
      ? disableTransitions()
      : null;
    applyTheme(attribute, resolvedTheme);
    if (enableColorScheme) {
      document.documentElement.style.colorScheme = resolvedTheme;
    }
    return () => {
      restore?.();
    };
  }, [attribute, resolvedTheme, enableColorScheme, disableTransitionOnChange]);

  // The pre-paint theme script is NOT injected from here any more. It ran
  // from a `useEffect`, i.e. after hydration and after first paint, so it
  // could never prevent the flash it was named for. It is now server-
  // rendered into <head> by `app/[locale]/layout.tsx` via
  // `buildThemeInitScript` in `lib/theme-init.ts`, which is where a
  // before-paint script has to live to do its job.

  const setTheme = React.useCallback<ThemeContextValue["setTheme"]>(
    (next) => {
      const prev = readStoredTheme(storageKey) ?? defaultTheme;
      const value = typeof next === "function" ? next(prev) : next;
      writeStoredTheme(storageKey, value);

      // Apply immediately so the UI doesn't flash while React schedules the
      // re-render. This used to sit inside a `setState` updater, where it was
      // a side effect in a function React is allowed to call twice.
      const resolved = value === "system" ? systemPrefers() : value;
      const restore = disableTransitionOnChange ? disableTransitions() : null;
      applyTheme(attribute, resolved);
      if (enableColorScheme) {
        document.documentElement.style.colorScheme = resolved;
      }
      restore?.();

      // Tell this tab's subscribers; `storage` only reaches the others.
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    },
    [
      attribute,
      storageKey,
      defaultTheme,
      disableTransitionOnChange,
      enableColorScheme,
    ],
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      themes,
      systemTheme,
    }),
    [theme, resolvedTheme, setTheme, themes, systemTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  // Return a stub during SSR so consumers don't blow up while pre-rendering.
  // Real values come from the provider once it mounts.
  if (!ctx) return defaultContext;
  return ctx;
}
