"use client";

import * as React from "react";
import { Coffee } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default function OnboardingPage() {
  const t = useTranslations("Auth");
  const router = useRouter();

  function handleLogOut() {
    // TODO: integrate with your auth provider (e.g. NextAuth signOut)
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* ── Top header bar ── */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-900 text-amber-50">
            <Coffee className="size-4" />
          </div>
          <span className="font-heading text-base font-semibold tracking-tight text-foreground">
            SmartCafeBuilder
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogOut}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          {t("form.logOut")}
        </button>
      </header>

      {/* ── Main form area ── */}
      <main className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[600px]">
          <OnboardingForm />
        </div>
      </main>
    </div>
  );
}
