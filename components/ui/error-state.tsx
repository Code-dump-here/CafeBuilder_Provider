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
  /** Raw server message, rendered small and monospaced. Optional. */
  message?: string;
  /**
   * Retry affordance. Both are optional now, because not every failure is
   * worth retrying: a 401/403/404 will return the identical answer however
   * many times it is asked, and a button promising otherwise is a lie the
   * user can sit and click. Omit them and no retry is offered.
   */
  retryLabel?: string;
  onRetry?: () => void;
  /**
   * A way out, for failures the user cannot resolve where they are — most
   * obviously "you don't have access to this", where the only useful move is
   * back to somewhere they do.
   */
  action?: { label: string; onClick: () => void };
}

export function ErrorState({
  title,
  subtitle,
  retryLabel,
  message,
  onRetry,
  action,
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
          <p className="mt-1 font-mono text-[12px] text-muted-foreground/80">
            {message}
          </p>
        ) : null}
      </div>
      {onRetry || action ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {onRetry && retryLabel ? (
            <Button type="button" variant="outline" size="lg" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {action ? (
            <Button
              type="button"
              variant={onRetry ? "ghost" : "outline"}
              size="lg"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
