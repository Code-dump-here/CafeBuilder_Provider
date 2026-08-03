"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/user-context";

import { PlanGridContainer } from "./plan-grid";

// ─── Header / page chrome ──────────────────────────────────────────────────

export function PricingPage() {
  const t = useTranslations("Payments");
  const tCta = useTranslations("Payments.states");
  const { account, isLoading, isAuthenticated } = useCurrentUser();

  // Role gating:
  // - Guests (unauthenticated) → render the pricing as marketing content;
  //   the Subscribe CTA already nudges them to sign in.
  // - Owners (`account.role === "owner"`) → render the "wrong role"
  //   notice. The pricing is provider-only for now.
  // - Admins → same as owners; pricing isn't for them.
  // - Providers without a profile → ProfileGuard upstream redirects to
  //   `/onboarding`, so by the time we render here `serviceProvider`
  //   exists.
  // - Providers with a profile → render the grid.
  const targetRole: 0 | 1 = 1; // Provider is the only supported target today.

  const showWrongRole =
    !isLoading && isAuthenticated && account && account.role !== "provider";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-3">
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <CreditCard aria-hidden className="size-3.5 text-primary" />
          {t("header.eyebrow")}
        </span>
        <h1 className="font-heading text-3xl leading-[1.1] tracking-tight text-foreground md:text-4xl">
          {t("header.title")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {t("header.subtitle")}
        </p>
      </header>

      {showWrongRole ? (
        <WrongRoleNotice />
      ) : (
        <PlanGridContainer targetRole={targetRole} />
      )}

      {!isAuthenticated && !isLoading ? (
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {tCta("wrongRoleSubtitle")}{" "}
          <Button asChild variant="link" size="xs" className="px-0 text-xs">
            <Link href="/register">{tCta("emptyTitle")}</Link>
          </Button>
        </p>
      ) : null}
    </div>
  );
}

// ─── Wrong-role notice ──────────────────────────────────────────────────────

function WrongRoleNotice() {
  const t = useTranslations("Payments.states");
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6 text-center md:p-8">
      <h2 className="font-heading text-lg text-foreground md:text-xl">
        {t("wrongRoleTitle")}
      </h2>
      <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground md:text-sm">
        {t("wrongRoleSubtitle")}
      </p>
    </div>
  );
}