"use client";

import * as React from "react";
import {
  MapPin,
  Edit3,
  Eye,
  Settings,
  Star,
  Images,
  Sparkles,
  TriangleAlert,
  Globe,
  Loader2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandMediaUploader } from "@/components/profile/brand-media-uploader";
import { Stamp } from "@/components/drawing-set/stamp";
import { TitleBlock, TitleCell } from "@/components/drawing-set/title-block";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/features/auth/user-context";
import type { NormalizedAccount } from "@/features/auth/auth-me-types";
import { AppError } from "@/lib/http/errors";
import {
  useProviderBrand,
  useProviderPortfolios,
} from "@/features/service-provider-profiles/use-brand";
// Two hooks share the name useProviderRatingSummary. The one in
// service-provider-profiles returns { summary, isLoading }; this one returns
// the query itself, which is what ReviewsList reads (`.data`). Importing the
// other would type-check nowhere near here and leave the summary blank.
import {
  useProviderRatingSummary,
  useProviderReviews,
} from "@/features/reviews/use-provider-reviews";
import {
  REVIEW_DIMENSIONS,
  reviewDimensionKey,
} from "@/features/projects/review-dimensions";

import { ProviderProfileEditor } from "./provider-profile-editor";
import { BrandTab } from "./brand-tab";
import { PortfolioTab } from "./portfolio-tab";

// ─── Profile Header ───────────────────────────────────────────────────────────

interface ProfileHeaderProps {
  /** Stripped shape of `NormalizedAccount` — only the fields the header
   *  consumes. Keeps the component testable without re-mocking the whole
   *  account record. */
  account: Pick<NormalizedAccount, "email" | "serviceProvider">;
  isOwner: boolean;
  /**
   * Owned callbacks for the header CTAs. Optional so the header still
   * renders in preview contexts where wiring doesn't matter.
   */
  onEdit?: () => void;
  onOpenSettings?: () => void;
  /** Number of portfolio entries (already loaded). Shown as the stat. */
  portfolioCount?: number;
}

function ProfileHeader({
  account,
  isOwner,
  onEdit,
  onOpenSettings,
  portfolioCount,
}: ProfileHeaderProps) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const sp = account.serviceProvider;

  // Live data — the cover image, address and website come from the
  // brand endpoint, not from the bare ServiceProviderProfile. Calling
  // it for the header (in addition to the Brand tab) keeps the cover
  // fresh after edits without forcing the tab to be mounted first.
  const { brand } = useProviderBrand({ serviceProviderProfileId: sp?.id ?? null });

  // Defensive null-check — `NormalizedAccount.serviceProvider` is `null`
  // for non-provider accounts (and for providers mid-onboarding). The
  // header is provider-centric, so an empty shell would be misleading;
  // render a minimal email-only placeholder instead.
  if (!sp) {
    return (
      <div className="relative">
        <div className="p-6">
          <p className="text-sm font-medium text-foreground">{account.email}</p>
        </div>
      </div>
    );
  }

  const initials = sp.displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const capabilityLabel =
    sp.capability === "designer"
      ? t("fields.capabilityDesigner")
      : sp.capability === "constructor"
        ? t("fields.capabilityConstructor")
        : t("fields.capabilityBoth");

  const providerTypeLabel =
    sp.providerType === "individual"
      ? t("fields.providerTypeIndividual")
      : t("fields.providerTypeCompany");

  const memberSince = sp.createdAt.toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-US",
    { month: "long", year: "numeric" },
  );

  // Laid out as the public profile is — a cover sheet with the firm's
  // particulars in a title block — so what the provider edits here is what
  // owners see. It was an orange gradient banner with a round avatar hanging
  // off it and a row of icon stats, the pattern the public profile dropped.
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-e1 ring-1 ring-foreground/10">
      {brand?.coverImageViewUrl || isOwner ? (
        <div
          className={cn(
            "relative w-full border-b border-border",
            brand?.coverImageViewUrl ? "h-40 sm:h-52" : "hatch h-20",
          )}
        >
          {brand?.coverImageViewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.coverImageViewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground">
              <span className="border border-foreground/20 bg-background px-2 py-1">
                {t("header.noCover")}
              </span>
            </p>
          )}
          {isOwner ? (
            <BrandMediaUploader
              kind="cover"
              serviceProviderProfileId={sp.id}
              currentViewUrl={brand?.coverImageViewUrl ?? undefined}
              currentRawUrl={brand?.coverImageUrl ?? undefined}
              variant="cover"
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {/* Actions on their own row above the name: beside it they squeezed a
            normal-length firm name onto two lines at this page's width. */}
        <div className="flex flex-col gap-4">
          {isOwner ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {/* The only way in to the public profile now that the provider
                  directory is gone from web: it is how owners see this firm,
                  so a provider should be able to check it. */}
              <Button variant="ghost" size="sm" className="gap-2" asChild>
                <Link href={`/providers/${sp.id}`}>
                  <Eye className="size-4" />
                  {t("actions.viewPublicProfile")}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onOpenSettings}
              >
                <Settings className="size-4" />
                {t("actions.settings")}
              </Button>
              <Button size="sm" className="gap-2" onClick={onEdit}>
                <Edit3 className="size-4" />
                {t("actions.editProfile")}
              </Button>
            </div>
          ) : null}
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden border border-foreground/25 bg-foreground/5 sm:size-20">
              {brand?.logoViewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logoViewUrl}
                  alt={sp.displayName}
                  className="size-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid size-full place-items-center font-mono text-lg font-semibold text-foreground"
                >
                  {initials}
                </span>
              )}
              {isOwner ? (
                <BrandMediaUploader
                  kind="avatar"
                  serviceProviderProfileId={sp.id}
                  currentViewUrl={brand?.logoViewUrl ?? undefined}
                  currentRawUrl={brand?.logoUrl ?? undefined}
                  variant="avatar"
                />
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-2 pt-0.5">
              <p className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground">
                {capabilityLabel} · {providerTypeLabel}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="sheet-title text-3xl text-foreground sm:text-4xl">
                  {sp.displayName}
                </h1>
                {sp.isVerified ? (
                  <Stamp tone="success" seed={sp.id}>
                    {t("header.verified")}
                  </Stamp>
                ) : null}
              </div>
            </div>
          </div>

        </div>

        {sp.bio ? (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {sp.bio}
          </p>
        ) : null}

        {/* Only rows whose data we actually have */}
        {brand?.companyAddress || brand?.website ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {brand?.companyAddress ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {brand.companyAddress}
              </span>
            ) : null}
            {brand?.website ? (
              <span className="inline-flex items-center gap-1.5">
                <Globe className="size-4" />
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="max-w-xs truncate hover:text-primary hover:underline"
                >
                  {brand.website.replace(/^https?:\/\//, "")}
                </a>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <TitleBlock className="w-full border-x-0 border-b-0">
        <TitleCell label={t("header.stats.portfolio")} grow>
          {portfolioCount ?? 0}
        </TitleCell>
        <TitleCell label={t("header.stats.rating")} grow>
          {typeof sp.avgRating === "number" && sp.avgRating > 0
            ? `${sp.avgRating.toFixed(1)} / 5`
            : t("header.stats.newRating")}
        </TitleCell>
        <TitleCell label={t("header.stats.yearsExperience")} grow>
          {sp.yearsExperience ?? "—"}
        </TitleCell>
        <TitleCell label={t("header.stats.joined")} grow>
          {memberSince}
        </TitleCell>
      </TitleBlock>
    </section>
  );
}

// ─── Tab Navigation ─────────────────────────────────────────────────────────────

type TabType = "portfolio" | "brand" | "reviews";

function TabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
  const t = useTranslations("Profile");

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "portfolio", label: t("tabs.portfolio"), icon: Images },
    { id: "brand", label: t("tabs.brand"), icon: Sparkles },
    { id: "reviews", label: t("tabs.reviews"), icon: Star },
  ];

  return (
    <div className="mt-8 border-b border-border">
      <nav className="flex gap-1" aria-label="Profile sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Content Grid ─────────────────────────────────────────────────────────────

/**
 * Reviews a shop owner left on this provider, plus the per-criterion averages.
 *
 * This used to render two hard-coded reviews ("Nguyen Van A", "2 weeks ago")
 * that every provider saw as their own, and the per-criterion breakdown the
 * API already returns was not rendered anywhere — `review-dimensions.ts` had
 * no importer at all. Both now come from the server.
 */
function ReviewsList({ profileId }: { profileId: string }) {
  const t = useTranslations("Profile.reviewsTab");

  const summaryQuery = useProviderRatingSummary(profileId);
  const reviewsQuery = useProviderReviews(profileId);

  if (summaryQuery.isLoading || reviewsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (summaryQuery.isError || reviewsQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
        <TriangleAlert className="size-5 text-warning" />
        {t("error")}
      </div>
    );
  }

  const summary = summaryQuery.data;
  const reviews = reviewsQuery.data?.items ?? [];

  // Chỉ liệt kê tiêu chí ĐÃ có điểm. Vẽ đủ 5 dòng với 4 dòng trống trông như
  // provider bị chấm 0 ở những tiêu chí chưa ai chấm.
  const scoredDimensions = REVIEW_DIMENSIONS.filter(
    (dimension) => summary?.dimensionAverages?.[dimension] !== undefined,
  );

  return (
    <div className="space-y-4">
      {summary && summary.reviewCount > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-semibold text-foreground">{t("summaryTitle")}</h3>
            <span className="text-xs text-muted-foreground">
              {t("reviewCount", { count: summary.reviewCount })}
            </span>
          </div>

          {scoredDimensions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("noScore")}</p>
          ) : (
            <dl className="mt-4 space-y-3">
              {scoredDimensions.map((dimension) => {
                const average = summary.dimensionAverages[dimension];
                return (
                  <div key={dimension} className="flex items-center gap-3">
                    <dt className="w-36 shrink-0 text-sm text-muted-foreground">
                      {t(`dimensions.${reviewDimensionKey(dimension)}`)}
                    </dt>
                    <dd className="flex flex-1 items-center gap-3">
                      {/* Thanh 5 điểm — đọc nhanh hơn con số khi so nhiều tiêu chí. */}
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-rating"
                          style={{ width: `${(average / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-semibold text-foreground">
                        {average.toFixed(1)}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        // One surface with rules between reviews, rather than a bordered card
        // per review: the reviews are one list, and a stack of identical boxes
        // spends its contrast on edges instead of on what people wrote.
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {reviews.map((review) => (
            <div key={review.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-4",
                        i < Math.round(review.overallRating)
                          ? "text-rating fill-rating"
                          : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                  <span className="ml-1 text-sm font-semibold text-foreground">
                    {review.overallRating.toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground/60">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.comment && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{review.comment}&rdquo;
                </p>
              )}

              {review.scores.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.scores.map((score) => (
                    <span
                      key={score.id}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {t(`dimensions.${reviewDimensionKey(score.dimension)}`)}
                      {": "}
                      <span className="font-semibold text-foreground">
                        {score.score}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {review.providerReply && (
                <div className="mt-4 rounded-lg border-l-2 border-primary bg-foreground/5 p-3">
                  <p className="text-xs font-semibold text-foreground">
                    {t("replyLabel")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.providerReply}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Shell ───────────────────────────────────────────────────────────

export function ProfilePageShell() {
  const t = useTranslations("Profile");

  const { account, isLoading, isAuthenticated, isError, error, refetch } =
    useCurrentUser();

  const [activeTab, setActiveTab] = React.useState<TabType>("portfolio");
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Owner's portfolio count drives the header's "Projects" stat.
  // We keep the call enabled as soon as we know the id, regardless of
  // which tab is open, so the number is always fresh by the time the
  // user clicks through.
  const profileId = account?.serviceProvider?.id ?? null;
  const { portfolios } = useProviderPortfolios({
    serviceProviderProfileId: profileId,
  });

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading && !account) {
    return <LoadingShell />;
  }

  // ── Unauthenticated ─────────────────────────────────────────────────────
  if (!isAuthenticated || !account) {
    return <UnauthenticatedState onRetry={() => void refetch()} />;
  }

  // ── API failure ─────────────────────────────────────────────────────────
  if (isError) {
    return (
      <ErrorState
        message={
          error instanceof AppError && error.message
            ? error.message
            : undefined
        }
        onRetry={() => void refetch()}
      />
    );
  }

  // ── Wrong role (admin / owner / provider-without-profile) ───────────────
  if (account.role !== "provider" || !account.serviceProvider) {
    if (account.role === "provider" && !account.serviceProvider) {
      return <MissingProviderState />;
    }
    return <WrongRoleState role={account.role} />;
  }

  // ── Render the profile ─────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <ProfileHeader
        account={account}
        isOwner
        onEdit={() => setIsEditDialogOpen(true)}
        onOpenSettings={() => setActiveTab("brand")}
        portfolioCount={portfolios.length}
      />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === "portfolio" && (
          <PortfolioTab
            serviceProviderProfileId={account.serviceProvider.id}
            editable
          />
        )}
        {activeTab === "brand" && (
          <BrandTab
            serviceProviderProfileId={account.serviceProvider.id}
            editable
          />
        )}
        {activeTab === "reviews" && (
          <ReviewsList profileId={account.serviceProvider.id} />
        )}
      </div>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      >
        <DialogContent
          className="sm:max-w-lg"
          // The form has its own sticky footer; suppress the built-in
          // close button so it doesn't visually collide with the X.
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>{t("actions.editProfile")}</DialogTitle>
            <DialogDescription>
              {t("actions.editProfileDescription")}
            </DialogDescription>
          </DialogHeader>
          <ProviderProfileEditor
            account={account}
            onSaved={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-states ────────────────────────────────────────────────────────────

function LoadingShell() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="h-56 w-full animate-pulse rounded-2xl bg-muted" />
      <div className="mt-6 flex items-center gap-4">
        <div className="size-36 -mt-16 rounded-full border-4 border-background bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function UnauthenticatedState({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("Profile");
  return (
    <NoticeState
      title={t("states.notAuthorizedTitle")}
      subtitle={t("states.notAuthorizedSubtitle")}
      ctaHref="/login"
      ctaLabel={t("states.notAuthorizedCta")}
      onRetry={onRetry}
    />
  );
}

function MissingProviderState() {
  const t = useTranslations("Profile");
  return (
    <NoticeState
      title={t("states.missingProviderTitle")}
      subtitle={t("states.missingProviderSubtitle")}
      ctaHref="/onboarding"
      ctaLabel={t("states.missingProviderCta")}
    />
  );
}

function WrongRoleState({ role }: { role: string }) {
  const heading = role === "owner"
    ? "Owners manage projects from the workspace."
    : role === "admin"
      ? "Admin accounts don't have a public provider profile."
      : "Profile editing is only available to provider accounts.";
  const subtitle = role === "owner"
    ? "Head to the workspace to see your projects and notifications."
    : role === "admin"
      ? "Use the admin console to manage users and projects."
      : undefined;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6 lg:px-8">
      <NoticeShell title={heading} subtitle={subtitle} />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  const t = useTranslations("Profile");
  return (
    <NoticeState
      title={t("states.loadErrorTitle")}
      subtitle={message ?? t("states.loadErrorSubtitle")}
      ctaLabel={t("states.loadErrorRetry")}
      onRetry={onRetry}
    />
  );
}

// ─── Reusable notice block ─────────────────────────────────────────────────

interface NoticeStateProps {
  title: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  onRetry?: () => void;
}

function NoticeState({
  title,
  subtitle,
  ctaHref,
  ctaLabel,
  onRetry,
}: NoticeStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6 lg:px-8">
      <NoticeShell title={title} subtitle={subtitle} />
      <div className="flex items-center gap-2">
        {onRetry ? (
          <Button type="button" variant="outline" size="lg" onClick={onRetry}>
            {ctaLabel}
          </Button>
        ) : null}
        {ctaHref && ctaLabel ? (
          <Button asChild size="lg">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface NoticeShellProps {
  title: string;
  subtitle?: string;
}

function NoticeShell({ title, subtitle }: NoticeShellProps) {
  return (
    <div className="flex items-start gap-3 p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
        <TriangleAlert aria-hidden className="size-4" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
