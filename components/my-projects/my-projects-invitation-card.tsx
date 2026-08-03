"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Mail, X } from "lucide-react";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useCurrentUser } from "@/features/auth/user-context";
import { useRespondToInvitationMutation } from "@/features/projects/use-respond-to-invitation";
import type { MyProjectWorking } from "@/features/projects/my-projects-types";

interface MyProjectsInvitationCardProps {
  project: MyProjectWorking;
}

/**
 * Card variant for invitations (`status="requested"`).
 *
 * Unlike the regular `MyProjectCard`, the whole card is NOT a link —
 * Accept / Reject live inside the card and need to capture the click.
 * The project name still links through to the underlying project page
 * so the provider can read the brief before deciding.
 */
export function MyProjectsInvitationCard({
  project,
}: MyProjectsInvitationCardProps) {
  const t = useTranslations("MyProjects.invitations");
  const tCard = useTranslations("MyProjects.card");
  const tErrors = useTranslations("MyProjects.invitations.errors");
  const { account } = useCurrentUser();

  const [pendingAction, setPendingAction] =
    React.useState<"accept" | "reject" | null>(null);

  const profileId = account?.serviceProvider?.id ?? null;
  const mutation = useRespondToInvitationMutation(profileId);

  const statusLabel = tCard(`status.${project.status}`);

  function handleResponse(action: "accept" | "reject") {
    if (mutation.isPending) return;
    setPendingAction(action);
    mutation.mutate(
      { id: project.id, action },
      {
        onSuccess: () => {
          toast.success(
            action === "accept"
              ? t("acceptSuccess", { name: project.projectName })
              : t("rejectSuccess", { name: project.projectName }),
          );
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : tErrors("generic"),
          );
        },
        onSettled: () => {
          setPendingAction(null);
        },
      },
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-sky-300/50 bg-sky-50/40 p-5 text-left dark:border-sky-700/40 dark:bg-sky-950/20">
      <div className="flex items-start justify-between gap-2">
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 text-primary"
        >
          <Mail className="me-1 size-3" aria-hidden />
          {t("badge")}
        </Badge>
        <Badge variant="outline">{statusLabel}</Badge>
      </div>

      <div className="flex flex-col gap-1">
        <Link
          href={`/projects/${project.projectShopOwnerId}`}
          className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary"
        >
          {project.projectName || tCard("unnamedProject")}
        </Link>
        {project.requestMessage ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {project.requestMessage}
          </p>
        ) : null}
      </div>

      <div
        role="group"
        aria-label={t("actionsAria", { name: project.projectName })}
        className="mt-auto flex items-center gap-2 border-t border-border/60 pt-3"
      >
        <Button
          type="button"
          variant="default"
          size="sm"
          className="flex-1 gap-1.5"
          disabled={mutation.isPending}
          onClick={() => handleResponse("accept")}
        >
          {pendingAction === "accept" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="size-3.5" aria-hidden />
          )}
          {t("accept")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
          disabled={mutation.isPending}
          onClick={() => handleResponse("reject")}
        >
          {pendingAction === "reject" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <X className="size-3.5" aria-hidden />
          )}
          {t("reject")}
        </Button>
      </div>
    </div>
  );
}
