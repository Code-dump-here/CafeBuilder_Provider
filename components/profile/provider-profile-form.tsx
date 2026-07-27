"use client";

import * as React from "react";
import {
  Briefcase,
  Building2,
  Hammer,
  Pencil,
  Shield,
  ShieldCheck,
  User,
  UserCircle2,
} from "lucide-react";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  useWatch,
} from "react-hook-form";
import { useTranslations } from "next-intl";

import { InputControl } from "@/components/ui/input-control";
import { TextareaControl } from "@/components/ui/textarea-control";
import { cn } from "@/lib/utils";
import type {
  Capability,
  ProviderType,
} from "@/features/service-provider-profiles/api";

// ─── Form value shape ────────────────────────────────────────────────────────

/**
 * Edits the current provider's own profile.
 *
 * Mirrors the field set editable by the user. `yearsExperience` stays a
 * string so it round-trips through react-hook-form + `InputControl` like
 * the rest of the inputs — numeric coercion happens at submit time.
 */
export interface ProviderProfileFormValues {
  displayName: string;
  providerType: ProviderType;
  capability: Capability;
  bio: string;
  yearsExperience: string;
  portfolioHeadline: string;
  companyTaxCode: string;
}

export const EMPTY_PROFILE_VALUES: ProviderProfileFormValues = {
  displayName: "",
  providerType: "individual",
  capability: "designer",
  bio: "",
  yearsExperience: "",
  portfolioHeadline: "",
  companyTaxCode: "",
};

// ─── Segmented control (mirrors role-fields.tsx for visual parity) ──────────

interface Option<TValue extends string> {
  value: TValue;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SegmentedProps<TValue extends string> {
  name: "providerType" | "capability";
  options: Option<TValue>[];
  value: TValue;
  onChange: (next: TValue) => void;
  error?: string;
}

function Segmented<TValue extends string>({
  name,
  options,
  value,
  onChange,
  error,
}: SegmentedProps<TValue>) {
  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label={name}
        className="grid gap-2 sm:grid-cols-3"
      >
        {options.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex flex-col items-start gap-2 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30",
              )}
            >
              <div className="flex items-center gap-2">
                {Icon && (
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg transition-colors",
                      isSelected
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                )}
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </span>
              </div>
              {option.description && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Verification pill ──────────────────────────────────────────────────────

interface VerificationPillProps {
  isVerified: boolean;
  label: string;
}

function VerificationPill({ isVerified, label }: VerificationPillProps) {
  const Icon = isVerified ? ShieldCheck : Shield;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        isVerified
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      <Icon aria-hidden className="size-3" />
      {label}
    </span>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

interface ProviderProfileFormProps {
  register: UseFormRegister<ProviderProfileFormValues>;
  errors: FieldErrors<ProviderProfileFormValues>;
  watch: UseFormWatch<ProviderProfileFormValues>;
  control: Control<ProviderProfileFormValues>;
  setValue: UseFormSetValue<ProviderProfileFormValues>;
  avgRating: number | null;
  isVerified: boolean;
}

const PROVIDER_TYPE_OPTIONS: Option<ProviderType>[] = [
  {
    value: "individual",
    label: "Individual",
    icon: UserCircle2,
  },
  {
    value: "company",
    label: "Company",
    icon: Building2,
  },
];

const CAPABILITY_OPTIONS: Option<Capability>[] = [
  {
    value: "designer",
    label: "Designer",
    icon: Pencil,
  },
  {
    value: "constructor",
    label: "Constructor",
    icon: Hammer,
  },
  {
    value: "both",
    label: "Both",
    icon: Briefcase,
  },
];

export function ProviderProfileForm({
  register,
  errors,
  control,
  setValue,
  avgRating,
  isVerified,
}: ProviderProfileFormProps) {
  const t = useTranslations("Profile");
  const providerType = useWatch({ control, name: "providerType" });
  const capability = useWatch({ control, name: "capability" });
  const isCompany = providerType === "company";

  return (
    <div className="space-y-8">
      {/* ── Section: Basics ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("sections.basics.title")}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {t("sections.basics.description")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              {t("fields.displayName")}
            </h3>
          </div>
          <InputControl<ProviderProfileFormValues>
            name="displayName"
            register={register}
            error={errors.displayName?.message}
            rules={{
              required: t("fields.displayName") + " is required",
              maxLength: { value: 120, message: "Must be 120 characters or fewer" },
            }}
          />
          <p className="text-xs text-muted-foreground">
            {t("fields.displayNameHelp")}
          </p>
        </div>

        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {t("fields.providerType")}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("fields.providerTypeHelp")}
            </p>
          </div>
          <Segmented<ProviderType>
            name="providerType"
            options={PROVIDER_TYPE_OPTIONS.map((option) => ({
              ...option,
              label:
                option.value === "individual"
                  ? t("fields.providerTypeIndividual")
                  : t("fields.providerTypeCompany"),
            }))}
            value={providerType}
            onChange={(next) =>
              setValue("providerType", next, { shouldValidate: true })
            }
            error={errors.providerType?.message}
          />
        </div>

        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {t("fields.capability")}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("fields.capabilityHelp")}
            </p>
          </div>
          <Segmented<Capability>
            name="capability"
            options={CAPABILITY_OPTIONS.map((option) => ({
              ...option,
              label:
                option.value === "designer"
                  ? t("fields.capabilityDesigner")
                  : option.value === "constructor"
                    ? t("fields.capabilityConstructor")
                    : t("fields.capabilityBoth"),
            }))}
            value={capability}
            onChange={(next) =>
              setValue("capability", next, { shouldValidate: true })
            }
            error={errors.capability?.message}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <VerificationPill
            isVerified={isVerified}
            label={
              isVerified ? t("fields.isVerifiedTrue") : t("fields.isVerifiedFalse")
            }
          />
          {typeof avgRating === "number" && avgRating > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              ★ {avgRating.toFixed(2)}
            </span>
          ) : null}
        </div>
      </section>

      {/* ── Section: About you ───────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("sections.about.title")}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {t("sections.about.description")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs/relaxed font-medium text-foreground">
            {t("fields.bio")}
          </h3>
          <TextareaControl<ProviderProfileFormValues>
            name="bio"
            register={register}
            rows={5}
            placeholder={t("fields.bioPlaceholder")}
            error={errors.bio?.message}
            rules={{
              maxLength: {
                value: 2000,
                message: "Bio must be 2000 characters or fewer",
              },
            }}
          />
          <p className="text-xs text-muted-foreground">{t("fields.bioHelp")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs/relaxed font-medium text-foreground">
              {t("fields.yearsExperience")}
            </h3>
            <InputControl<ProviderProfileFormValues>
              name="yearsExperience"
              register={register}
              type="number"
              inputMode="numeric"
              error={errors.yearsExperience?.message}
              rules={{
                validate: (raw: string | undefined) => {
                  if (raw === undefined || raw.trim() === "") return true;
                  const n = Number.parseInt(raw, 10);
                  if (!Number.isFinite(n) || n < 0) {
                    return "Must be a non-negative whole number";
                  }
                  if (n > 100) return "Must be 100 or fewer";
                  return true;
                },
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs/relaxed font-medium text-foreground">
              {t("fields.portfolioHeadline")}
            </h3>
            <InputControl<ProviderProfileFormValues>
              name="portfolioHeadline"
              register={register}
              placeholder={t("fields.portfolioHeadlinePlaceholder")}
              error={errors.portfolioHeadline?.message}
              rules={{
                maxLength: {
                  value: 200,
                  message: "Must be 200 characters or fewer",
                },
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Section: Credentials (company only) ──────────────────────── */}
      {isCompany ? (
        <section className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("sections.credentials.title")}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t("sections.credentials.description")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs/relaxed font-medium text-foreground">
              {t("fields.companyTaxCode")}
            </h3>
            <InputControl<ProviderProfileFormValues>
              name="companyTaxCode"
              register={register}
              placeholder={t("fields.companyTaxCodePlaceholder")}
              error={errors.companyTaxCode?.message}
              rules={{
                maxLength: {
                  value: 50,
                  message: "Tax code must be 50 characters or fewer",
                },
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t("fields.companyTaxCodeHelp")}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
