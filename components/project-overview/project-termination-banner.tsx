"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { PauseCircle } from "lucide-react";
import { notifySuccess } from "@/lib/notify";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import {
  useCancelTerminationRequestMutation,
  useRequestTerminationMutation,
  useRespondToTerminationMutation,
} from "@/features/projects/use-engagement-termination";
import type { Engagement } from "@/features/projects/engagement-types";

interface ProjectTerminationBannerProps {
  /** The viewer's engagement on this project, or null when they have none. */
  engagement: Engagement | null;
}

/**
 * Surfaces the two-sided "end this engagement" flow for the provider.
 *
 * Ending a running engagement needs both parties to agree: one side requests,
 * the other approves. Before this, the provider had no way to see a request
 * the owner had raised — the fields were on the wire and nothing read them —
 * and no way to raise one of their own.
 *
 * Three states:
 *   - owner asked   → reason + Agree / Decline
 *   - provider asked → waiting, + Withdraw
 *   - nothing pending → the "propose ending" affordance
 */
export function ProjectTerminationBanner({
  engagement,
}: ProjectTerminationBannerProps) {
  const t = useTranslations("ProjectsOverview.terminationBanner");

  const requestMutation = useRequestTerminationMutation();
  const respondMutation = useRespondToTerminationMutation();
  const cancelMutation = useCancelTerminationRequestMutation();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  useResetOnChange(dialogOpen, () => {
    if (dialogOpen) setReason("");
  });

  // Only live engagements can be ended. `terminated` / `completed` rows have
  // nothing to negotiate.
  if (!engagement || engagement.status !== "accepted") return null;

  const pending = engagement.isAwaitingTerminationApproval;
  const raisedByOwner = engagement.terminationRequestedBy === "owner";
  const busy =
    requestMutation.isPending ||
    respondMutation.isPending ||
    cancelMutation.isPending;

  const handleRequest = () => {
    requestMutation.mutate(
      { id: engagement.id, reason },
      {
        onSuccess: (updated) => {
          setDialogOpen(false);
          // If the owner had already asked, our request counts as agreement
          // and the engagement really is over — report what happened.
          notifySuccess(
            updated.status === "terminated" ? t("ended") : t("requestSent"),
          );
        },
      },
    );
  };

  const handleRespond = (approve: boolean) => {
    respondMutation.mutate(
      { id: engagement.id, approve },
      {
        onSuccess: () => {
          notifySuccess(approve ? t("ended") : t("declined"));
        },
      },
    );
  };

  const handleWithdraw = () => {
    cancelMutation.mutate(
      { id: engagement.id },
      {
        onSuccess: () => {
          notifySuccess(t("withdrawn"));
        },
      },
    );
  };

  if (!pending) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => setDialogOpen(true)}
          className="text-destructive hover:text-destructive"
        >
          {t("request")}
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("request")}</DialogTitle>
              <DialogDescription>{t("requestBody")}</DialogDescription>
            </DialogHeader>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              rows={3}
              disabled={busy}
              className="min-h-16 w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-60 dark:bg-input/30"
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={handleRequest}
              >
                {t("send")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card
      size="sm"
      aria-labelledby="engagement-termination-title"
      className="border-amber-300/60 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/20"
    >
      <CardHeader>
        <CardTitle
          id="engagement-termination-title"
          className="flex items-center gap-2 text-base"
        >
          <PauseCircle
            className="size-4 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          {raisedByOwner ? t("titleFromOwner") : t("titleFromYou")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {engagement.terminationRequestNote?.trim() ? (
          <p className="text-sm text-muted-foreground">
            {t("reasonLabel")}: {engagement.terminationRequestNote}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {raisedByOwner
            ? t("stillRunningFromOwner")
            : t("stillRunningFromYou")}
        </p>
        {raisedByOwner ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => handleRespond(false)}
            >
              {t("reject")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => handleRespond(true)}
            >
              {t("approve")}
            </Button>
          </div>
        ) : (
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={handleWithdraw}
            >
              {t("withdraw")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
