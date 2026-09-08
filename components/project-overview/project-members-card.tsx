"use client";

import { paletteIndexForAll } from "@/lib/id-hash";
import { AVATAR_PALETTE } from "@/lib/avatar-palette";
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
import { useIsProjectOwner } from "@/features/projects/use-is-project-owner";
import { isVisibleEngagementStatus } from "@/features/projects/engagement-visibility";
import {
  type ProjectContractType,
  type ProjectDetail,
  type ProjectProvider,
  type ProjectProviderCapability,
  type ProjectProviderStatus,
} from "@/features/projects/project-detail-types";

// ---------------------------------------------------------------------------
// Colour palette — deterministic per provider so each row stays distinct
// regardless of order or filter. Provider rows are stored without their own
// avatar colour (the backend doesn't send one), so we hash a couple of
// stable fields and pick from the palette.


function avatarColorFor(provider: ProjectProvider): string {
  const palette = AVATAR_PALETTE;
  // Both ids come from the wire (`projectWorkingId` + `serviceProviderProfileId`),
  // so the colour is stable per engagement across renders and reloads. This
  // used to multiply `projectProviderId`, a field the API never sends, which
  // made the index `NaN` and the colour `undefined` for every row.
  // Ids are uuids, so the colour comes from hashing them rather than from
  // arithmetic. Both ids are folded in, keeping the colour stable per
  // engagement exactly as before.
  return palette[
    paletteIndexForAll(
      [provider.projectWorkingId, provider.providerId],
      palette.length,
    )
  ];
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
  const tContractTypes = useTranslations(
    "ProjectsOverview.members.contractTypes",
  );
  const format = useFormatter();

  // Who is actually on the project — see `engagement-visibility`. Showing a
  // declined or ended engagement here would advertise other providers'
  // rejections to everyone who opens the project.
  const providers = React.useMemo(
    () => project.providers.filter((p) => isVisibleEngagementStatus(p.status)),
    [project.providers],
  );

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
  /**
   * Subtitle like "Design · Design + Build" — what they were hired for on
   * this project, and (when it differs) what they're capable of overall.
   *
   * This used to key off `providerType`, which is the provider's legal
   * structure (`individual` / `company`), not a service kind — so the
   * `both` branch was unreachable. The meaningful comparison is
   * contractType-vs-capability: worth spelling out only when the provider
   * can do more here than they were engaged for.
   */
  const subtitleFor = (
    contractType: ProjectContractType,
    cap: ProjectProviderCapability,
  ): string => {
    const hiredFor = tContractTypes(contractType);
    if (cap === "both" && contractType !== "both") {
      return `${hiredFor} · ${tCapabilities("both")}`;
    }
    return hiredFor;
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
            const subtitle = subtitleFor(provider.contractType, provider.capability);
            const joinedLabel = provider.createdAt.getTime() !== 0
              ? t("since", {
                  date: format.dateTime(provider.createdAt, {
                    dateStyle: "medium",
                  }),
                })
              : null;
            return (
              <li
                key={provider.projectWorkingId ?? `provider-${index}`}
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
                        className="size-3.5 shrink-0 text-info"
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
  return (
    <span
      className={
        "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
        CAPABILITY_TONE[capability]
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

/**
 * Tone per capability. Deliberately literal hues rather than status tokens:
 * a designer is not "a success" and a constructor is not "a warning" — these
 * only need to be told apart from one another.
 *
 * They are not on the `--chart-*` ramp either. That ramp is sequential (five
 * steps of the same warm hue), so using it here would make the three
 * capabilities nearly indistinguishable, which is the one job this has.
 */
const CAPABILITY_TONE: Record<ProjectProviderCapability, string> = {
  designer:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  constructor:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  both: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
};

/** Tone class per status — survives dark mode via paired CSS vars. */
const STATUS_TONE: Record<ProjectProviderStatus, string> = {
  accepted:
    "bg-success/10 text-success-muted-foreground border-success/30",
  requested:
    "bg-warning/10 text-warning-muted-foreground border-warning/30",
  completed:
    "bg-info/10 text-info-muted-foreground border-info/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  terminated: "bg-muted text-muted-foreground border-border/60",
};

function RatingChip({ rating }: { rating: number }) {
  // Clamp to [0, 5] — backend may briefly send an out-of-range value
  // during a rollout / migration window.
  const clamped = Math.max(0, Math.min(5, rating));
  const rounded = Math.round(clamped * 10) / 10;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
      <Star
        className="size-2.5 fill-rating text-rating"
        aria-hidden
      />
      <span className="font-mono">{rounded.toFixed(1)}</span>
    </span>
  );
}

// (no extra test exports right now)
