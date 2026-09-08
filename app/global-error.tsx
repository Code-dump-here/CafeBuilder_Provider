"use client";

import * as React from "react";

/**
 * Last resort: a throw in the root layout itself.
 *
 * When the root layout fails there is no app shell left to render into, so
 * Next replaces the whole document — which is why this file has to supply its
 * own `<html>` and `<body>`. Nothing from the app can be imported safely here
 * either: the failure may well be in the very providers, fonts or stylesheet
 * that those components depend on, and pulling them in would take the fallback
 * down with the thing it is meant to catch.
 *
 * So this is hand-rolled, with inline styles and no imports on purpose. The
 * colours are the light-theme values from globals.css written out literally,
 * because the stylesheet may not have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app] root layout error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          // --background / --foreground, literal so this survives a missing
          // stylesheet.
          background: "oklch(0.985 0.002 80)",
          color: "oklch(0.25 0.03 55)",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            The app failed to start
          </h1>
          <p
            style={{
              margin: "0 0 1.5rem",
              lineHeight: 1.6,
              color: "oklch(0.42 0.03 48)",
            }}
          >
            Something went wrong before the page could load. Reloading usually
            fixes it.
          </p>
          {error.digest ? (
            <p
              style={{
                margin: "0 0 1.5rem",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: "0.6875rem",
                color: "oklch(0.42 0.03 48)",
              }}
            >
              {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              // --primary / --primary-foreground.
              background: "oklch(0.52 0.18 55)",
              color: "oklch(0.97 0.01 90)",
              border: "none",
              borderRadius: "0.625rem",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
