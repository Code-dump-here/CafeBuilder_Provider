/**
 * The pre-paint theme script, kept OUTSIDE `theme-provider.tsx` on purpose.
 *
 * The provider is a `"use client"` module, so every one of its exports is a
 * client reference and a server component cannot call into it during render.
 * This module has no directive, so both sides can import it: the root layout
 * server-renders the script into `<head>`, and the provider reuses the same
 * constants for its runtime behaviour. One definition, no drift.
 */

export const THEME_ATTRIBUTE = "class";
export const THEME_STORAGE_KEY = "theme";
export const THEMES = ["light", "dark", "system"];
export const THEME_DEFAULT = "system";

/**
 * Runs before first paint, so it must not reference anything outside its own
 * arguments — it is serialised with `toString()` and evaluated in the document
 * before any bundle has loaded.
 */
function themeInitScriptBody(
  attribute: string,
  storageKey: string,
  defaultTheme: string,
  themes: string[],
  enableSystem: boolean,
  enableColorScheme: boolean,
) {
  const root = document.documentElement;
  const system = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

  function resolve(stored: string | null): "light" | "dark" {
    if (stored === "light" || stored === "dark") return stored;
    if (stored === "system" && enableSystem) return system;
    if (enableSystem) return system;
    return "light";
  }

  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(storageKey);
  } catch {
    // localStorage throws in private mode / blocked-cookie settings. Fall
    // through to the default rather than letting the whole script die and
    // leaving the page unthemed.
    stored = null;
  }
  if (!stored || !themes.includes(stored)) {
    stored = defaultTheme;
  }
  const resolved = resolve(stored);

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    if (resolved === "dark") root.classList.add("dark");
  } else {
    root.setAttribute(attribute, resolved);
  }
  if (enableColorScheme) {
    root.style.colorScheme = resolved;
  }
}

/**
 * Serialise the body into a self-invoking script for `dangerouslySetInnerHTML`.
 *
 * This has to be inline and synchronous in `<head>`: an external or deferred
 * script runs after first paint, which is exactly the bug this replaces — the
 * script used to be appended from a `useEffect`, i.e. after hydration, so a
 * dark-mode user got a full white flash on every cold load before it ever ran.
 */
export function buildThemeInitScript({
  attribute = THEME_ATTRIBUTE,
  storageKey = THEME_STORAGE_KEY,
  defaultTheme = THEME_DEFAULT,
  themes = THEMES,
  enableSystem = true,
  enableColorScheme = true,
}: {
  attribute?: string;
  storageKey?: string;
  defaultTheme?: string;
  themes?: string[];
  enableSystem?: boolean;
  enableColorScheme?: boolean;
} = {}): string {
  const args = JSON.stringify([
    attribute,
    storageKey,
    defaultTheme,
    themes,
    enableSystem,
    enableColorScheme,
  ]).slice(1, -1);

  return `(${themeInitScriptBody.toString()})(${args});`;
}
