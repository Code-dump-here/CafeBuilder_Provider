"use client";

import * as React from "react";
import { IdCard, Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AppError } from "@/lib/http/errors";
import { useCurrentUser } from "@/lib/auth/user-context";

import { ProviderProfileEditor } from "./provider-profile-editor";

// ─── Page chrome ────────────────────────────────────────────────────────────

/**
 * Top-level `/profile` page.
 *
 * Renders the current provider's editable profile. For non-provider roles
 * (`owner`, `admin`) or unauthenticated visitors we render state-specific
 * notices instead of the editor so we never expose a form that the API
 * can't back.
 */
export function ProfilePageShell() {
  const t = useTranslations("Profile");

  const { account, isLoading, isAuthenticated, isError, error, refetch } =
    useCurrentUser();

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
      // Provider flagged but their profile record is missing — funnel them
      // back into onboarding rather than show an empty editor.
      return <MissingProviderState />;
    }
    // Owners / admins do not have a profile to manage here. Show a generic
    // notice; deeper support lives on the role-specific pages.
    return <WrongRoleState role={account.role} />;
  }

  // ── Render the editor ───────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <IdCard aria-hidden className="size-3.5 text-primary" />
          {t("header.eyebrow")}
        </span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {t("header.title")}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t("header.subtitle")}
        </p>
      </header>

      <ProviderProfileEditor account={account} />
    </div>
  );
}

// ─── Sub-states ────────────────────────────────────────────────────────────

function LoadingShell() {
  const t = useTranslations("Profile");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-3 w-72 animate-pulse rounded bg-muted" />
      </header>
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-3">
          <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("states.loading")}</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
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
  // Owners + admins route to their workspace via the role-aware sidebar,
  // so we don't expose a CTA button here — only a labelled explanation.
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
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
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
