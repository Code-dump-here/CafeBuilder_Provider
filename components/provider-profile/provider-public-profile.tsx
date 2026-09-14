"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  Briefcase,
  Globe,
  Images,
  Link2,
  MapPin,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppError } from "@/lib/http/errors";
import { formatVndParts } from "@/lib/format-currency";
import { useCurrentUser } from "@/features/auth/user-context";
import {
  useProviderBrand,
  useProviderPortfolios,
} from "@/features/service-provider-profiles/use-brand";
import {
  useServiceProviderProfile,
  useProviderRatingSummary,
} from "@/features/service-provider-profiles/use-providers";
import { RatingStars } from "./capability-badge";
import { ReviewDimensionsList } from "./review-dimensions-list";
import { Stamp } from "@/components/drawing-set/stamp";
import { TitleBlock, TitleCell } from "@/components/drawing-set/title-block";

interface ProviderPublicProfileProps {
  profileId: string;
}

/**
 * A provider's public profile, as other providers see it on web.
 *
 * Renders the same identity / brand / portfolio data as the
 * self-editing `/profile` page, read-only. Reviews are fetched from
 * `/api/reviews/providers/{id}/summary`; we don't yet have a public
 * reviews list endpoint, so we only show the summary for now.
 */
export function ProviderPublicProfile({ profileId }: ProviderPublicProfileProps) {
  const t = useTranslations("ProviderPublicProfile");
  const tDirectory = useTranslations("ProviderDirectory");
  const locale = useLocale();
  // Same query the Reviews tab reads, so the header's rating costs nothing extra.
  const { summary: rating } = useProviderRatingSummary(profileId);

  // Provider details fetch — `useServiceProviderProfile(id)` returns
  // the public profile (logo/cover/intro-video URLs included).
  const { profile, isLoading, isError, error, refetch } =
    useServiceProviderProfile(profileId);

  const { account } = useCurrentUser();
  const isSelf =
    account?.serviceProvider?.id === profileId && account.role === "provider";

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title={t("errors.title")}
        subtitle={t("errors.subtitle")}
        retryLabel={t("errors.retry")}
        message={
          error instanceof AppError && error.message
            ? error.message
            : t("errors.generic")
        }
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={Briefcase}
        title={t("notFound.title")}
        description={t("notFound.description")}
      />
    );
  }

  const initials = profile.displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joinedYear = new Date(profile.createdAt).toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-US",
    { year: "numeric" },
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* ── Header ───────────────────────────────────────────────── */}
      {/* A cover sheet, not a social banner: the gradient with a round avatar
          hanging off it said nothing about the firm, and the name collided
          with the banner's edge. The firm's particulars now sit in a title
          block along the bottom, like the edge of a drawing. */}
      <section className="overflow-hidden rounded-lg bg-card shadow-e1 ring-1 ring-foreground/10">
        {profile.coverImageViewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.coverImageViewUrl}
            alt=""
            className="h-40 w-full border-b border-border object-cover sm:h-52"
          />
        ) : null}

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              {profile.logoViewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logoViewUrl}
                  alt={profile.displayName}
                  className="size-16 shrink-0 border border-foreground/20 object-cover sm:size-20"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid size-16 shrink-0 place-items-center border border-foreground/25 bg-foreground/5 font-mono text-lg font-semibold text-foreground sm:size-20"
                >
                  {initials}
                </span>
              )}

              <div className="flex min-w-0 flex-col gap-2 pt-0.5">
                <p className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground">
                  {tDirectory(`capability.${profile.capability}`)}
                  {" · "}
                  {profile.providerType === "company"
                    ? t("type.company")
                    : t("type.individual")}
                </p>
                <h1 className="sheet-title text-3xl text-foreground sm:text-4xl">
                  {profile.displayName}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {profile.isVerified ? (
                <Stamp tone="success" seed={profile.id}>
                  {t("verified")}
                </Stamp>
              ) : null}
              {/* The web app is for providers; owners hire through the mobile
                  app. So another provider's profile carries no actions — the
                  "Invite to a project" and "Message" buttons that were here
                  are owner actions, and on web the first only linked to the
                  marketplace while the second had no handler at all. */}
              {isSelf ? (
                <Button variant="outline" asChild>
                  <Link href="/profile">
                    <ShieldCheck aria-hidden className="size-4" />
                    {t("actions.manageOwnProfile")}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          {profile.portfolioHeadline || profile.bio ? (
            <div className="flex max-w-3xl flex-col gap-2">
              {profile.portfolioHeadline ? (
                <p className="text-base font-medium text-foreground">
                  {profile.portfolioHeadline}
                </p>
              ) : null}
              {profile.bio ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <TitleBlock className="w-full border-x-0 border-b-0">
          <TitleCell label={t("sheet.experience")} grow>
            {profile.yearsExperience
              ? t("sheet.years", { count: profile.yearsExperience })
              : "—"}
          </TitleCell>
          <TitleCell label={t("sheet.rating")} grow>
            {rating && rating.reviewCount > 0
              ? t("sheet.ratingValue", {
                  rating: rating.averageRating.toFixed(1),
                  count: rating.reviewCount,
                })
              : t("sheet.noRating")}
          </TitleCell>
          <TitleCell label={t("sheet.joined")} grow>
            {joinedYear}
          </TitleCell>
        </TitleBlock>
      </section>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">{t("tabs.about")}</TabsTrigger>
          <TabsTrigger value="brand">{t("tabs.brand")}</TabsTrigger>
          <TabsTrigger value="portfolio">{t("tabs.portfolio")}</TabsTrigger>
          <TabsTrigger value="reviews">{t("tabs.reviews")}</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-4">
          <AboutTab profileId={profileId} />
        </TabsContent>

        <TabsContent value="brand" className="mt-4">
          <BrandTab profileId={profileId} />
        </TabsContent>

        <TabsContent value="portfolio" className="mt-4">
          <PortfolioTab profileId={profileId} locale={locale} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <ReviewsTab profileId={profileId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tab bodies ───────────────────────────────────────────────────────────────

function AboutTab({ profileId }: { profileId: string }) {
  const t = useTranslations("ProviderPublicProfile.about");
  // Reuse the public brand endpoint for "About" too — the about tab
  // surfaces the brand's story / website / company address which are
  // part of the BrandResponse, not the bare ServiceProviderProfile.
  const { brand, isLoading } = useProviderBrand({ serviceProviderProfileId: profileId });

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!brand) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        {t("empty")}
      </p>
    );
  }

  // Experience and rating were repeated here from the header; they now live
  // only in the header's title block.
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <TitleBlock>
          <TitleCell label={t("founded")}>
            {brand.foundedYear?.toString() ?? "—"}
          </TitleCell>
          <TitleCell label={t("teamSize")}>
            {brand.employeeCount !== null
              ? t("teamSizeValue", { count: brand.employeeCount })
              : "—"}
          </TitleCell>
        </TitleBlock>

        {brand.brandStory ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("brandStory")}
            </p>
            <p className="text-sm leading-relaxed">{brand.brandStory}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 text-sm">
          {brand.website ? (
            <a
              href={brand.website}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Globe aria-hidden className="size-4" />
              {t("website")}
            </a>
          ) : null}
          {brand.introVideoViewUrl ? (
            <a
              href={brand.introVideoViewUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Video aria-hidden className="size-4" />
              {t("introVideo")}
            </a>
          ) : null}
          {brand.companyAddress ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin aria-hidden className="size-4" />
              {brand.companyAddress}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandTab({ profileId }: { profileId: string }) {
  const { brand, isLoading } = useProviderBrand({ serviceProviderProfileId: profileId });
  const t = useTranslations("ProviderPublicProfile");
  // The owner's brand tab already labels these; the public view printed the
  // raw enum ("license", "award") beside translated text.
  const tKind = useTranslations("ProviderBrand.certificateKind");

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!brand) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        {t("brand.empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <SectionTitle icon={Link2} title={t("brand.socialTitle")} />
          {brand.socialLinks.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("brand.noSocial")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {brand.socialLinks.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-foreground/5 px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {t(`platform.${link.platform}`, { defaultValue: link.platform })}
                    </span>
                    {link.label ? (
                      <span className="text-xs text-muted-foreground">{link.label}</span>
                    ) : null}
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="truncate text-xs text-primary hover:underline"
                  >
                    {link.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <SectionTitle icon={MapPin} title={t("brand.areasTitle")} />
          {brand.serviceAreas.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("brand.noAreas")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {brand.serviceAreas.map((area) => (
                <Badge key={area.id} variant="outline">
                  {area.district
                    ? `${area.district}, ${area.province}`
                    : area.province}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <SectionTitle icon={Award} title={t("brand.certificatesTitle")} />
          {brand.certificates.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("brand.noCertificates")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {brand.certificates.map((cert) => (
                <li
                  key={cert.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-foreground/5 px-3 py-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <Badge variant="outline">{tKind(cert.kind)}</Badge>
                      {cert.name}
                      {cert.isVerified ? (
                        <Stamp size="sm" tone="success" seed={cert.id}>
                          {t("brand.verified")}
                        </Stamp>
                      ) : null}
                      {cert.isExpired ? (
                        <Stamp size="sm" tone="danger" seed={cert.id + "expired"}>
                          {t("brand.expired")}
                        </Stamp>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[cert.issuer, cert.certificateNo, cert.issuedAt]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  {cert.fileViewUrl ? (
                    <a
                      href={cert.fileViewUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs text-primary hover:underline"
                    >
                      {t("brand.viewFile")}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PortfolioTab({
  profileId,
  locale,
}: {
  profileId: string;
  locale: string;
}) {
  const t = useTranslations("ProviderPublicProfile");
  const { portfolios, isLoading } = useProviderPortfolios({
    serviceProviderProfileId: profileId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <EmptyState
        icon={Images}
        title={t("portfolio.empty.title")}
        description={t("portfolio.empty.description")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {portfolios.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
                  {entry.isFeatured ? (
                    <Star aria-hidden className="size-4 fill-primary text-primary" />
                  ) : null}
                  {entry.title}
                  <Badge variant="outline">{entry.role}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {[
                    entry.location,
                    entry.style,
                    entry.areaM2 !== null ? `${entry.areaM2} m²` : null,
                    entry.durationDays !== null
                      ? `${entry.durationDays} days`
                      : null,
                    entry.completedAt,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              {entry.contractValue !== null ? (
                <p className="text-sm font-semibold tabular-nums">
                  {formatVndParts(entry.contractValue, locale).full}
                </p>
              ) : null}
            </div>

            {entry.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {entry.description}
              </p>
            ) : null}

            {entry.videoViewUrl ? (
              <a
                href={entry.videoViewUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Video aria-hidden className="size-4" />
                {t("portfolio.watchVideo")}
              </a>
            ) : null}

            {entry.images.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {entry.images.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={image.id}
                    src={image.imageViewUrl ?? image.imageUrl}
                    alt={image.caption ?? ""}
                    className="size-28 rounded-lg border border-border/60 object-cover"
                  />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReviewsTab({ profileId }: { profileId: string }) {
  const t = useTranslations("ProviderPublicProfile");
  const { summary, isLoading, refetch, isError } = useProviderRatingSummary(profileId);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (isError) {
    return (
      <ErrorState
        title={t("reviews.errorTitle")}
        subtitle={t("reviews.errorSubtitle")}
        retryLabel={t("reviews.retry")}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!summary || summary.reviewCount === 0) {
    return (
      <EmptyState
        icon={Star}
        title={t("reviews.empty.title")}
        description={t("reviews.empty.description")}
      />
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <RatingStars
            value={summary.averageRating}
            count={summary.reviewCount}
            size="lg"
          />
          <Separator orientation="vertical" className="hidden h-8 sm:block" />
          <p className="text-xs text-muted-foreground">
            {t("reviews.basedOn", { count: summary.reviewCount })}
          </p>
        </div>

        {summary.dimensionAverages ? (
          <ReviewDimensionsList dimensions={summary.dimensionAverages} />
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Reusable bits ────────────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold">
      <Icon aria-hidden className="size-4 text-primary" />
      {title}
    </p>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <Skeleton className="size-16 shrink-0 sm:size-20" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-none" />
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-8 w-24" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

// Re-exports for any component that wants the loading affordance.
export { ProfileSkeleton as ProviderProfileSkeleton };
