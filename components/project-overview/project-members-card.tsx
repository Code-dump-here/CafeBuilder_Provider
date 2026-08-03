"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BadgeCheck, Star, UserPlus, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OwnerAvatar } from "@/components/data-table/owner-avatar";
import { projectActionToast } from "./project-action-toast";
import { ProviderEngagementActions } from "./provider-engagement-actions";
import { useIsProjectOwner } from "@/features/projects/use-is-project-owner";
import {
  type ProjectDetail,
  type ProjectProvider,
  type ProjectProviderCapability,
  type ProjectProviderStatus,
  type ProjectProviderType,
} from "@/features/projects/project-detail-types";

// ---------------------------------------------------------------------------
// Colour palette — deterministic per provider so each row stays distinct
// regardless of order or filter. Provider rows are stored without their own
// avatar colour (the backend doesn't send one), so we hash a couple of
// stable fields and pick from the palette.

const AVATAR_PALETTE = [
  "#A07B5A",
  "#3B5BA9",
  "#5A8F7B",
  "#8E5A3B",
  "#7B5A9B",
  "#5A7B8F",
  "#A95A8E",
  "#9B8B5A",
] as const;

function avatarColorFor(provider: ProjectProvider): string {
  const palette = AVATAR_PALETTE;
  const idx =
    (provider.projectProviderId * 7 + provider.providerId * 13) % palette.length;
  return palette[Math.abs(idx)];
}

// ---------------------------------------------------------------------------
// Card

interface ProjectMembersCardProps {
  project: ProjectDetail;
}

/**
 * Right-column "Providers" card for the project overview page.
 *
 * Renders each provider attached to the project as a compact row:
 *   - avatar with deterministic colour from `AVATAR_PALETTE`
 *   - display name (with verified check if `isVerified`)
 *   - subtitle showing capability / provider type
 *   - capability badge (Design / Construction)
 *   - status badge (Active / Requested / …)
 *   - inline rating chip when `avgRating` is set
 *
 * Data source: `project.providers` — populated by the updated
 * `GET /api/project-shop-owners/{id}` response. If the API hasn't shipped yet or
 * returns an empty array, the card renders an empty-state with the same
 * Invite CTA so the right rail still feels complete.
 */
export function ProjectMembersCard({ project }: ProjectMembersCardProps) {
  const t = useTranslations("ProjectsOverview.members");
  const tCapabilities = useTranslations(
    "ProjectsOverview.members.capabilities",
  );
  const tStatuses = useTranslations(
    "ProjectsOverview.members.providerStatus",
  );
  const format = useFormatter();

  const providers = project.providers;

  // Only the project owner can invite providers onto the project. Hide
  // the "Invite" CTA for everyone else so non-owners don't see buttons
  // that would 403 on the backend.
  const isOwner = useIsProjectOwner(project);

  // Empty / placeholder project — nothing attached yet. Show an
  // empty-state instead of hiding entirely so the right rail stays
  // a self-contained stack.
  if (providers.length === 0) {
    return (
      <Card
        size="sm"
        aria-labelledby="project-members-title"
        className="border-border/60"
      >
        <CardHeader>
          <CardTitle
            id="project-members-title"
            className="flex items-center gap-2 text-base"
          >
            <Users className="size-4 text-primary" aria-hidden />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{t("empty")}</p>
          {isOwner ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => projectActionToast(t("inviteComingSoon"))}
            >
              <UserPlus aria-hidden />
              {t("invite")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // Inline helpers — pull from translation hooks so we don't hard-code
  // English/Vietnamese strings. Kept short on purpose.
  const capabilityLabel = (cap: ProjectProviderCapability): string =>
    cap === "design" ? tCapabilities("design") : tCapabilities("construction");

  const statusLabel = (status: ProjectProviderStatus): string => {
    switch (status) {
      case "requested":
        return tStatuses("requested");
      case "accepted":
        return tStatuses("accepted");
      case "active":
        return tStatuses("active");
      case "paused":
        return tStatuses("paused");
      case "completed":
        return tStatuses("completed");
      case "declined":
        return tStatuses("declined");
    }
  };

  /** Build a subtitle like "Design · Design + Build" when the provider is
   *  registered for both kinds but was hired for only one capability. */
  const subtitleFor = (
    type: ProjectProviderType,
    cap: ProjectProviderCapability,
  ): string => {
    const capText = capabilityLabel(cap);
    if (type === "both") {
      return `${capText} · ${tCapabilities("both")}`;
    }
    return capText;
  };

  return (
    <Card
      size="sm"
      aria-labelledby="project-members-title"
      aria-describedby="project-members-subtitle"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle
          id="project-members-title"
          className="flex items-center gap-2 text-base"
        >
          <Users className="size-4 text-primary" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription id="project-members-subtitle">
          {t("subtitle", { count: providers.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 p-0">
        <ul className="flex flex-col">
          {providers.map((provider, index) => {
            const subtitle = subtitleFor(provider.providerType, provider.capability);
            const joinedLabel = provider.createdAt.getTime() !== 0
              ? t("since", {
                  date: format.dateTime(provider.createdAt, {
                    dateStyle: "medium",
                  }),
                })
              : null;
            return (
              <li
                key={provider.projectProviderId ?? `provider-${index}`}
                className="flex items-start gap-3 px-4 py-2.5"
              >
                <OwnerAvatar
                  name={provider.displayName}
                  color={avatarColorFor(provider)}
                  size="default"
                  className="size-8 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {provider.displayName}
                    </p>
                    {provider.isVerified ? (
                      <BadgeCheck
                        className="size-3.5 shrink-0 text-sky-500"
                        aria-label={t("verified")}
                      />
                    ) : null}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {subtitle}
                    {joinedLabel ? (
                      <>
                        <span aria-hidden> · </span>
                        {joinedLabel}
                      </>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <CapabilityBadge capability={provider.capability} />
                    <StatusBadge status={provider.status} />
                    {typeof provider.avgRating === "number" ? (
                      <RatingChip rating={provider.avgRating} />
                    ) : null}
                  </div>
                  {/* Provider-only lifecycle CTAs (Báo hoàn thành /
                      Huỷ ngang hợp tác). Component self-hides for any
                      viewer who isn't the engaged provider, so it's
                      safe to mount unconditionally on every row. */}
                  <ProviderEngagementActions provider={provider} />
                </div>
              </li>
            );
          })}
        </ul>
        <Separator className="bg-border/60" />
        <div className="px-4 py-3">
          {isOwner ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => projectActionToast(t("inviteComingSoon"))}
            >
              <UserPlus aria-hidden />
              {t("invite")}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-components

function CapabilityBadge({
  capability,
}: {
  capability: ProjectProviderCapability;
}) {
  const t = useTranslations("ProjectsOverview.members.capabilities");
  const isDesign = capability === "design";
  return (
    <span
      className={
        "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
        (isDesign
          ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
          : "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300")
      }
    >
      {t(capability)}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: ProjectProviderStatus;
}) {
  const t = useTranslations("ProjectsOverview.members.providerStatus");
  return (
    <span
      className={
        "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
        STATUS_TONE[status]
      }
    >
      {t(status)}
    </span>
  );
}

/** Tone class per status — survives dark mode via paired CSS vars. */
const STATUS_TONE: Record<ProjectProviderStatus, string> = {
  active:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  accepted:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  requested:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  paused: "bg-muted text-muted-foreground border-border/60",
  completed:
    "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  declined: "bg-destructive/10 text-destructive border-destructive/30",
};

function RatingChip({ rating }: { rating: number }) {
  // Clamp to [0, 5] — backend may briefly send an out-of-range value
  // during a rollout / migration window.
  const clamped = Math.max(0, Math.min(5, rating));
  const rounded = Math.round(clamped * 10) / 10;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
      <Star
        className="size-2.5 fill-amber-400 text-amber-400"
        aria-hidden
      />
      <span className="font-mono">{rounded.toFixed(1)}</span>
    </span>
  );
}

// (no extra test exports right now)
