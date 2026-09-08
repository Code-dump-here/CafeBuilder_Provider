"use client";

import * as React from "react";

import { ErrorState } from "@/components/ui/error-state";

/**
 * Catches a render-time throw anywhere below the locale segment.
 *
 * There was no error boundary in the app at all, which meant any one component
 * throwing during render — a null field the API stopped sending, a bad date, a
 * map access on undefined — unmounted the entire tree and left a white page.
 * No message, no way back except the browser's reload button, and no signal to
 * the user that anything recoverable had happened.
 *
 * `reset()` re-renders the segment rather than reloading the document, so a
 * transient failure costs the user a click instead of a full page load and
 * their place in the app.
 *
 * Deliberately not translated. This file has to render when things are already
 * broken, and reaching for `useTranslations` here means a failure inside
 * next-intl — a missing key, a bad locale segment — takes the error screen down
 * with it and puts us back at the white page. Plain English is the reliable
 * choice for the one screen whose job is to work when nothing else does.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app] unhandled render error", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col justify-center px-4 py-16">
      <ErrorState
        title="Something went wrong"
        subtitle="This screen failed to load. Trying again often clears it — if it keeps happening, the details below help us track it down."
        retryLabel="Try again"
        // `digest` is the server-side hash Next assigns the error; it is the
        // only handle on a production stack trace, which is stripped from the
        // client. Falling back to the message keeps dev useful.
        message={error.digest ?? error.message}
        onRetry={reset}
      />
    </div>
  );
}
