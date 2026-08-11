"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApplyToPostMutation } from "@/features/projects/use-project-applications";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

/**
 * Bounds for the apply form. Mirrors typical backend column limits
 * (`proposal TEXT`, `estimated_duration_days INT`) and keeps the input
 * inside `int32` for safety.
 */
const PROPOSAL_MIN_LENGTH = 30;
const DURATION_MIN_DAYS = 1;
const DURATION_MAX_DAYS = 365;
const DURATION_DEFAULT_DAYS = 30;

interface ApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: number;
  providerId: number;
  projectName: string;
}

/**
 * Two-field modal that collects the data the apply API actually needs:
 * a free-form `proposal` and an `estimatedDurationDays`. Validation runs
 * client-side (length / range) before firing the mutation; the backend
 * remains the source of truth for everything else.
 *
 * Mounted by `ProjectApplyCard`. State (open / values) lives in the
 * parent so the card can disable its CTA while a request is in flight.
 */
export function ApplyDialog({
  open,
  onOpenChange,
  postId,
  providerId,
  projectName,
}: ApplyDialogProps) {
  const t = useTranslations("ProjectsOverview.apply.dialog");

  const [proposal, setProposal] = React.useState("");
  const [duration, setDuration] = React.useState<string>(
    String(DURATION_DEFAULT_DAYS),
  );

  // Reset form whenever the dialog re-opens so a previous (failed) attempt
  // doesn't bleed into the next one. Cheap because both inputs are tiny.
  useResetOnChange(open, () => {
    if (open) {
      setProposal("");
      setDuration(String(DURATION_DEFAULT_DAYS));
    }
  });

  const apply = useApplyToPostMutation({
    // Success is suppressed because the dialog closes, which is feedback
    // enough. Errors now fall through to the hook's own `resolveErrorMessage`,
    // which surfaces the real server reason. It previously fell back to
    // "applications are coming soon", mislabelling a genuine failure as an
    // unbuilt feature — and routed it through `projectActionToast`, which
    // renders success styling.
    onSuccessMessage: null,
    onSuccessSideEffect: () => {
      onOpenChange(false);
    },
  });

  const durationNumber = Number.parseInt(duration, 10);
  const durationValid =
    Number.isFinite(durationNumber) &&
    durationNumber >= DURATION_MIN_DAYS &&
    durationNumber <= DURATION_MAX_DAYS;

  const proposalTrimmed = proposal.trim();
  const proposalValid = proposalTrimmed.length >= PROPOSAL_MIN_LENGTH;

  const canSubmit =
    !apply.isPending && proposalValid && durationValid && providerId > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    apply.mutate({
      postId,
      providerId,
      proposal: proposalTrimmed,
      estimatedDurationDays: durationNumber,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { project: projectName })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form
          id="apply-dialog-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="apply-dialog-proposal"
              className="text-xs font-medium text-foreground"
            >
              {t("proposalLabel")}
            </label>
            <textarea
              id="apply-dialog-proposal"
              name="proposal"
              required
              rows={5}
              value={proposal}
              onChange={(event) => setProposal(event.target.value)}
              placeholder={t("proposalPlaceholder")}
              aria-describedby="apply-dialog-proposal-hint"
              aria-invalid={proposal.length > 0 && !proposalValid}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 flex w-full rounded-md border bg-transparent px-3 py-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p
              id="apply-dialog-proposal-hint"
              className="text-[11px] text-muted-foreground"
            >
              {proposalValid
                ? t("proposalHint", { min: PROPOSAL_MIN_LENGTH })
                : t("proposalTooShort", { min: PROPOSAL_MIN_LENGTH })}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="apply-dialog-duration"
              className="text-xs font-medium text-foreground"
            >
              {t("durationLabel")}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="apply-dialog-duration"
                name="estimatedDurationDays"
                type="number"
                inputMode="numeric"
                min={DURATION_MIN_DAYS}
                max={DURATION_MAX_DAYS}
                step={1}
                required
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                aria-describedby="apply-dialog-duration-hint"
                aria-invalid={duration.length > 0 && !durationValid}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">
                {t("durationSuffix")}
              </span>
            </div>
            <p
              id="apply-dialog-duration-hint"
              className="text-[11px] text-muted-foreground"
            >
              {durationValid
                ? t("durationHint")
                : t("durationInvalid", {
                    min: DURATION_MIN_DAYS,
                    max: DURATION_MAX_DAYS,
                  })}
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={apply.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            form="apply-dialog-form"
            disabled={!canSubmit}
            aria-busy={apply.isPending}
          >
            <Send aria-hidden />
            {apply.isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}