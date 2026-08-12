import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Full-panel error with a retry affordance.
 *
 * Three copies of this existed (contracts, project overview, survey) whose
 * markup was byte-identical — the only difference was which i18n namespace
 * each read its copy from. Rather than hard-code a namespace here, the caller
 * resolves its own strings and passes them in, so per-page wording survives
 * while the layout lives in one place.
 */
export interface ErrorStateProps {
  title: string;
  subtitle: string;
  retryLabel: string;
  /** Raw server message, rendered small and monospaced. Optional. */
  message?: string;
  onRetry: () => void;
}

export function ErrorState({
  title,
  subtitle,
  retryLabel,
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center"
    >
      <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{subtitle}</p>
        {message ? (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
            {message}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onRetry}
        className="mt-1"
      >
        {retryLabel}
      </Button>
    </div>
  );
}
