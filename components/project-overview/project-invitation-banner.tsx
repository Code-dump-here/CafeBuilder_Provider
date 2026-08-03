"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Mail, X } from "lucide-react";
import { toast } from "react-toastify";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useCurrentUser } from "@/features/auth/user-context";
import { useRespondToInvitationMutation } from "@/features/projects/use-respond-to-invitation";
import { getEngagementsApi } from "@/features/projects/engagement-api";
import { queryKeys } from "@/lib/react-query/keys";
import {
  type ProjectDetail,
  type ProjectProvider,
  type ProjectProviderCapability,
} from "@/features/projects/project-detail-types";

// ---------------------------------------------------------------------------
// Component
//

interface ProjectInvitationBannerProps {
  project: ProjectDetail;
}

/**
 * Banner shown at the top of the project overview when the current viewer
 * (a service provider) has a pending invitation (`status === "requested"`)
 * on this project.
 *
 * Self-hides for:
 *   - non-provider viewers,
 *   - viewers whose profile id isn't matched in `project.providers[]`,
 *   - viewers whose row isn't `requested` (already accepted, declined, …).
 *
 * Acceptance / decline flow:
 *   - `POST /api/project-workings/{engagementId}/{accept|reject}` via the
 *     shared `useRespondToInvitationMutation` hook (see
 *     `features/projects/use-respond-to-invitation.ts`). Returns the
 *     refreshed engagement record.
 *   - On success we invalidate both the project-detail cache and the
 *     provider's `myProjects` list so every dependent view (members
 *     card on this page, "My Projects" tab, sidebar badge) flips
 *     without a hard reload.
 *   - Errors surface as a toast with the server's Vietnamese message
 *     when available (matching the rest of the project-overview surfaces).
 */
export function ProjectInvitationBanner({
  project,
}: ProjectInvitationBannerProps) {
  const t = useTranslations("ProjectsOverview.invitationBanner");
  const tCapabilities = useTranslations(
    "ProjectsOverview.members.capabilities",
  );
  const tErrors = useTranslations("ProjectsOverview.invitationBanner.errors");

  const { account } = useCurrentUser();
  const queryClient = useQueryClient();

  const viewerProfileId = account?.serviceProvider?.id ?? null;
  const isProvider = account?.role === "provider";

  // Locate the provider row that represents the viewer's invitation. We
  // use the denormalised providers list from the project detail — it
  // already carries `projectWorkingId` so we don't need a separate fetch
  // for the engagement id.
  const invitation = React.useMemo<ProjectProvider | null>(() => {
    if (!isProvider || typeof viewerProfileId !== "number") return null;
    return (
      project.providers.find(
        (p) =>
          p.providerId === viewerProfileId && p.status === "requested",
      ) ?? null
    );
  }, [project.providers, isProvider, viewerProfileId]);

  // Best-effort fetch of the owner's invitation note. The denormalised
  // `ProjectProvider` row carries no message, so we resolve it via
  // `GET /api/project-workings?...&projectShopOwnerId=...&serviceProviderProfileId=...`.
  // Failure or empty list is non-fatal — the banner renders without a
  // note and the Accept/Reject buttons stay usable.
  const [invitationMessage, setInvitationMessage] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (!invitation || typeof viewerProfileId !== "number") {
      setInvitationMessage(null);
      return;
    }

    const projectId = Number(project.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    getEngagementsApi(
      {
        projectShopOwnerId: projectId,
        serviceProviderProfileId: viewerProfileId,
        status: "requested",
        pageNumber: 1,
        pageSize: 5,
      },
      { signal: controller.signal },
    )
      .then((response) => {
        if (cancelled) return;
        const match = response.items.find(
          (item) => item.id === invitation.projectWorkingId,
        );
        // Wire field is `requestMessage: string | null` per
        // `engagement-types.ts`. Treat null / undefined / "" uniformly.
        setInvitationMessage(
          typeof match?.requestMessage === "string" &&
            match.requestMessage.trim().length > 0
            ? match.requestMessage
            : null,
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Silently ignore aborts / cancellations triggered by cleanup.
        const name = (error as { name?: string } | null)?.name;
        if (name === "AbortError" || name === "CanceledError") return;
        setInvitationMessage(null);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [invitation, project.id, viewerProfileId]);

  // Hook must be called unconditionally so it can invalidate after
  // success even when the banner is currently hidden (e.g. when the
  // mutation was fired right before the row flipped out of `requested`).
  const mutation = useRespondToInvitationMutation(viewerProfileId);

  const [pendingAction, setPendingAction] =
    React.useState<"accept" | "reject" | null>(null);

  // Hide when there's nothing to do.
  if (!invitation) return null;

  const handleResponse = (action: "accept" | "reject") => {
    if (mutation.isPending) return;
    setPendingAction(action);
    mutation.mutate(
      { id: invitation.projectWorkingId, action },
      {
        onSuccess: async () => {
          // Refresh project detail so the members card flips the row out
          // of `requested` (and reveals contract / engagement CTAs for
          // accepted viewers) without a hard reload.
          await queryClient.invalidateQueries({
            queryKey: queryKeys.projects.detail(String(project.id)),
          });

          toast.success(
            action === "accept"
              ? t("acceptSuccess", { name: project.name })
              : t("rejectSuccess", { name: project.name }),
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
  };

  const capabilityLabel = labelForCapability(invitation.capability, tCapabilities);
  const ownerName = project.owner?.fullName ?? t("ownerLabel");

  return (
    <Card
      size="sm"
      aria-labelledby="project-invitation-title"
      aria-describedby="project-invitation-subtitle"
      className="border-sky-300/60 bg-sky-50/50 dark:border-sky-700/40 dark:bg-sky-950/20"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle
            id="project-invitation-title"
            className="flex items-center gap-2 text-base"
          >
            <Mail className="size-4 text-sky-600 dark:text-sky-400" aria-hidden />
            {t("title")}
          </CardTitle>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            {t("badge")}
          </Badge>
        </div>
        <CardDescription id="project-invitation-subtitle">
          {t("subtitle", { name: project.name })}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-4 pt-0">
        <dl className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex items-baseline gap-2">
            <dt className="font-medium text-foreground/80">
              {t("capability")}:
            </dt>
            <dd className="text-foreground">{capabilityLabel}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="font-medium text-foreground/80">
              {t("ownerLabel")}:
            </dt>
            <dd className="text-foreground">{ownerName}</dd>
          </div>
        </dl>

        <Separator className="bg-border/60" />

        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-foreground/80">
            {t("messageLabel")}
          </p>
          <p className="text-sm text-foreground/90">
            {invitationMessage ?? (
              <span className="italic text-muted-foreground">
                {t("messageEmpty")}
              </span>
            )}
          </p>
        </div>

        <div
          role="group"
          aria-label={t("actionsAria", { name: project.name })}
          className="mt-1 flex items-center gap-2"
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
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
//

function labelForCapability(
  cap: ProjectProviderCapability,
  tCapabilities: ReturnType<typeof useTranslations>,
): string {
  return cap === "design"
    ? tCapabilities("design")
    : tCapabilities("construction");
}