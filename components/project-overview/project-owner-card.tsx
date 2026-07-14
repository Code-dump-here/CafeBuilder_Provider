"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Phone,
  Copy,
  Mail,
  Store,
  UserCircle2,
} from "lucide-react";

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
import { useIsProjectOwner } from "@/lib/projects/use-is-project-owner";
import type { ProjectDetail, ProjectOwner } from "@/lib/projects/project-detail-types";

// ---------------------------------------------------------------------------
// Avatar palette — mirrors the one in `project-members-card.tsx` so the
// owner and the providers feel like they live in the same visual world
// without forcing identical colours.

const OWNER_AVATAR_PALETTE = [
  "#A07B5A",
  "#5A8F7B",
  "#3B5BA9",
  "#8E5A3B",
  "#7B5A9B",
  "#5A7B8F",
  "#A95A8E",
  "#9B8B5A",
] as const;

function ownerAvatarColorFor(owner: ProjectOwner): string {
  const palette = OWNER_AVATAR_PALETTE;
  const idx = (owner.id * 11 + 3) % palette.length;
  return palette[Math.abs(idx)];
}

// ---------------------------------------------------------------------------
// Card

interface ProjectOwnerCardProps {
  project: ProjectDetail;
}

/**
 * Right-column "Owner" card for the project overview page.
 *
 * Sits between Quick Facts and Providers so the right rail reads
 * naturally:
 *   Quick Facts → Owner → Providers
 *
 * What it shows:
 *   - Owner's avatar, full name, and shop name.
 *   - Phone (with a copy-to-clipboard CTA placeholder).
 *   - "Send message" placeholder CTA (real chat flow not wired yet).
 *
 * Renders nothing if the API response didn't include `project.owner`
 * (older backends — the field is optional on the wire).
 */
export function ProjectOwnerCard({ project }: ProjectOwnerCardProps) {
  const t = useTranslations("ProjectsOverview.owner");
  const owner = project.owner;

  const handleCopyPhone = React.useCallback(async () => {
    if (!owner?.phone) return;
    const phone = owner.phone;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(phone);
      }
    } catch {
      // Clipboard write may be denied (permissions / insecure context).
    }
    projectActionToast(t("phoneCopied"));
  }, [owner?.phone, t]);

  if (!owner) {
    return null;
  }

  // Don't offer "Send message" when the viewer IS the project owner —
  // messaging yourself doesn't make sense. Everyone else (other owners,
  // providers, admins) sees the CTA.
  const isOwner = useIsProjectOwner(project);
  const canMessageOwner = !isOwner;

  return (
    <Card
      size="sm"
      aria-labelledby="project-owner-title"
      aria-describedby="project-owner-subtitle"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle
          id="project-owner-title"
          className="flex items-center gap-2 text-base"
        >
          <UserCircle2 className="size-4 text-primary" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription id="project-owner-subtitle">
          {t("subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 pt-0">
        {/* Owner identity — large avatar, name, shop name */}
        <div className="flex items-start gap-3">
          <OwnerAvatar
            name={owner.fullName}
            color={ownerAvatarColorFor(owner)}
            size="lg"
            className="size-12 text-sm"
          />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold text-foreground"
              title={owner.fullName}
            >
              {owner.fullName}
            </p>
            {owner.shopName ? (
              <p
                className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground"
                title={owner.shopName}
              >
                <Store className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{owner.shopName}</span>
              </p>
            ) : null}
          </div>
        </div>

        {/* Phone row — shown only if the owner has set one. Click-to-copy. */}
        {owner.phone ? (
          <>
            <Separator className="bg-border/60" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Phone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <a
                  href={`tel:${owner.phone}`}
                  className="truncate font-mono text-xs text-foreground hover:underline"
                  aria-label={t("phoneAria", { phone: owner.phone })}
                >
                  {owner.phone}
                </a>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyPhone}
                aria-label={t("copyPhone")}
                title={t("copyPhone")}
              >
                <Copy aria-hidden />
              </Button>
            </div>
          </>
        ) : null}

        {/* Contact CTA — wired through the same placeholder toast used
            elsewhere so swapping to a real chat flow is one place.
            Hidden when the viewer IS the project owner (no point
            messaging yourself). */}
        {canMessageOwner ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => projectActionToast(t("messageComingSoon"))}
          >
            <Mail aria-hidden />
            {t("message")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
