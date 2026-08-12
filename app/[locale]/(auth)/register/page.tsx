"use client";

import * as React from "react";
import { Coffee, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  const t = useTranslations("Auth");

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left Panel — Coffee Atmosphere ── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#1c1008] p-12 lg:flex">
        {/* Warm ambient glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(180,120,40,0.18),transparent_65%)]" />
        {/* Subtle grain texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
        />
        {/* Decorative steam wisps */}
        <div className="pointer-events-none absolute -right-20 top-0 size-96 rounded-full bg-amber-900/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 size-80 rounded-full bg-amber-800/10 blur-3xl" />

        {/* Top: Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <Coffee className="size-5 text-amber-100" />
          </div>
          <span className="font-heading text-xl font-semibold tracking-tight text-amber-50">
            SmartCafeBuilder
          </span>
        </div>

        {/* Center: Coffee illustration */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="relative" aria-hidden="true">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 drop-shadow-2xl">
              {/* Cup body */}
              <path d="M40 70 L50 160 C52 172 60 180 80 180 L120 180 C140 180 148 172 150 160 L160 70 Z"
                fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5" />
              {/* Coffee surface */}
              <ellipse cx="100" cy="70" rx="60" ry="14" fill="rgba(180,100,20,0.4)" stroke="rgba(251,191,36,0.3)" strokeWidth="1" />
              {/* Latte art swirl */}
              <path d="M80 68 C85 62 95 62 100 68 C105 74 115 74 120 68"
                stroke="rgba(251,191,36,0.6)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <circle cx="100" cy="70" r="4" fill="rgba(251,191,36,0.4)" />
              {/* Handle */}
              <path d="M160 90 C178 90 185 110 178 130 C172 148 158 148 150 140"
                stroke="rgba(251,191,36,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Saucer */}
              <ellipse cx="100" cy="186" rx="72" ry="8" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.2)" strokeWidth="1" />
              {/* Steam */}
              <path d="M75 55 C72 42 80 30 76 18" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M100 50 C97 37 105 25 101 13" stroke="rgba(251,191,36,0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M125 55 C122 42 130 30 126 18" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Bean accents */}
              <ellipse cx="45" cy="120" rx="12" ry="7" fill="rgba(180,120,40,0.2)" stroke="rgba(251,191,36,0.2)" strokeWidth="1" transform="rotate(-30, 45, 120)" />
              <ellipse cx="40" cy="140" rx="10" ry="6" fill="rgba(180,120,40,0.15)" stroke="rgba(251,191,36,0.15)" strokeWidth="1" transform="rotate(15, 40, 140)" />
            </svg>
            {/* Glow behind cup */}
            <div className="pointer-events-none absolute inset-0 rounded-full bg-amber-500/10 blur-2xl" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="font-heading text-2xl font-semibold leading-snug text-amber-50">
              {t("brand.headline")}
            </h2>
            <p className="text-sm leading-relaxed text-amber-100/50">
              {t("brand.subheadline")}
            </p>
          </div>
        </div>

        {/* Bottom: Tagline */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-amber-100/30">
          <Lock className="size-3.5" />
          <span>{t("brand.secureAccess")}</span>
          <span className="opacity-40">·</span>
          <span>© {new Date().getFullYear()} SmartCafeBuilder</span>
        </div>
      </div>

      {/* ── Right Panel — Register Form ── */}
      <div className="flex w-full flex-col justify-center bg-background px-6 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Mobile logo (hidden on lg+) */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-900 text-amber-50">
            <Coffee className="size-4" />
          </div>
          <span className="font-heading text-base font-semibold tracking-tight text-foreground">
            SmartCafeBuilder
          </span>
        </div>

        {/* Form card */}
        <div className="mx-auto w-full max-w-[400px] space-y-6">
          <RegisterForm />
        </div>

        {/* Footer links removed — see the note in the login page: /terms,
            /privacy and /support have no routes and 404 on prefetch. */}
      </div>
    </div>
  );
}
