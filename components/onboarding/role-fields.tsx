"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
  Control,
  useWatch,
} from "react-hook-form";
import { User, Briefcase, Hammer, Pencil, Building2, UserCircle2 } from "lucide-react";

import { InputControl } from "@/components/ui/input-control";
import { TextareaControl } from "@/components/ui/textarea-control";
import { cn } from "@/lib/utils";
import type {
  Capability,
  ProviderType,
} from "@/features/service-provider-profiles/api";

// ─── Form value shape ────────────────────────────────────────────────────────

/**
 * Subset of fields the onboarding form collects for a provider account.
 * This is intentionally NOT a 1:1 mirror of `CreateServiceProviderProfilePayload`:
 *
 *   - `accountId` is injected at submit time from the auth context.
 *   - All values are kept as strings so react-hook-form + the `InputControl`
 *     wrapper stay simple; numeric coercion happens in the submit handler.
 */
export interface OnboardingFormValues {
  displayName: string;
  providerType: ProviderType | "";
  capability: Capability | "";
  bio: string;
  yearsExperience: string;
  portfolioHeadline: string;
  companyTaxCode: string;
}

// ─── Segmented control (shared) ──────────────────────────────────────────────

interface Option<TValue extends string> {
  value: TValue;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SegmentedProps<TValue extends string> {
  name: "providerType" | "capability";
  options: Option<TValue>[];
  value: TValue | "";
  onChange: (next: TValue) => void;
  error?: string;
}

/**
 * Pill-style segmented control. Used twice — once for `providerType`,
 * once for `capability` — so we keep a single implementation that
 * accepts arbitrary string-typed values.
 */
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

// ─── Main export ─────────────────────────────────────────────────────────────

interface RoleFieldsProps {
  register: UseFormRegister<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  watch: UseFormWatch<OnboardingFormValues>;
  control: Control<OnboardingFormValues>;
  setValue: UseFormSetValue<OnboardingFormValues>;
  isLoading?: boolean;
}

const PROVIDER_TYPE_OPTIONS: Option<ProviderType>[] = [
  {
    value: "individual",
    label: "Individual",
    description: "Solo designer or contractor working under their own name.",
    icon: UserCircle2,
  },
  {
    value: "company",
    label: "Company",
    description: "Registered business with a tax code and team.",
    icon: Building2,
  },
];

const CAPABILITY_OPTIONS: Option<Capability>[] = [
  {
    value: "designer",
    label: "Designer",
    description: "Owns the design and concept phase.",
    icon: Pencil,
  },
  {
    value: "constructor",
    label: "Constructor",
    description: "Owns the build and execution phase.",
    icon: Hammer,
  },
  {
    value: "both",
    label: "Both",
    description: "Handles design and build end-to-end.",
    icon: Briefcase,
  },
];

export function RoleFields({
  register,
  errors,
  control,
  setValue,
}: RoleFieldsProps) {
  const t = useTranslations("Onboarding");
  const providerType = useWatch({ control, name: "providerType" });
  const capability = useWatch({ control, name: "capability" });

  // The tax-code field only makes sense for companies. We still register
  // the field so RHF tracks it (otherwise switching back would lose state)
  // but we hide the input visually and skip required validation by
  // omitting `rules` when the company flag is off.
  const isCompany = providerType === "company";

  return (
    <div className="space-y-7">
      {/* ── Display name ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            {t("provider.fields.displayName")}
          </h2>
        </div>
        <InputControl<OnboardingFormValues>
          name="displayName"
          register={register}
          placeholder={t("provider.fields.displayNamePlaceholder")}
          error={errors.displayName?.message}
          rules={{
            required: t("validation.displayNameRequired"),
            maxLength: {
              value: 120,
              message: t("validation.displayNameTooLong"),
            },
          }}
        />
      </div>

      {/* ── Provider type ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("provider.fields.providerType")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("provider.fields.providerTypeHint")}
          </p>
        </div>
        <Segmented<ProviderType>
          name="providerType"
          options={PROVIDER_TYPE_OPTIONS}
          value={providerType}
          onChange={(next) =>
            setValue("providerType", next, { shouldValidate: true })
          }
          error={errors.providerType?.message}
        />
      </div>

      {/* ── Capability ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("provider.fields.capability")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("provider.fields.capabilityHint")}
          </p>
        </div>
        <Segmented<Capability>
          name="capability"
          options={CAPABILITY_OPTIONS}
          value={capability}
          onChange={(next) =>
            setValue("capability", next, { shouldValidate: true })
          }
          error={errors.capability?.message}
        />
      </div>

      {/* ── Bio ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("provider.fields.bio")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("provider.fields.bioHint")}
          </p>
        </div>
        <TextareaControl<OnboardingFormValues>
          name="bio"
          register={register}
          placeholder={t("provider.fields.bioPlaceholder")}
          error={errors.bio?.message}
          rules={{
            maxLength: {
              value: 2000,
              message: t("validation.bioTooLong"),
            },
          }}
          rows={4}
        />
      </div>

      {/* ── Years experience + Portfolio headline (2 col) ─────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InputControl<OnboardingFormValues>
          name="yearsExperience"
          register={register}
          label={t("provider.fields.yearsExperience")}
          type="number"
          placeholder="0"
          error={errors.yearsExperience?.message}
          rules={{
            min: {
              value: 0,
              message: t("validation.yearsExperienceInvalid"),
            },
            max: {
              value: 80,
              message: t("validation.yearsExperienceInvalid"),
            },
          }}
        />
        <InputControl<OnboardingFormValues>
          name="portfolioHeadline"
          register={register}
          label={t("provider.fields.portfolioHeadline")}
          placeholder={t("provider.fields.portfolioHeadlinePlaceholder")}
          error={errors.portfolioHeadline?.message}
          rules={{
            maxLength: {
              value: 200,
              message: t("validation.portfolioHeadlineTooLong"),
            },
          }}
        />
      </div>

      {/* ── Company tax code (conditional) ───────────────────────────── */}
      {isCompany && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("provider.fields.companyTaxCode")}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("provider.fields.companyTaxCodeHint")}
            </p>
          </div>
          <InputControl<OnboardingFormValues>
            name="companyTaxCode"
            register={register}
            placeholder={t("provider.fields.companyTaxCodePlaceholder")}
            error={errors.companyTaxCode?.message}
            rules={{
              required: t("validation.companyTaxCodeRequired"),
              pattern: {
                value: /^[0-9-]{8,20}$/,
                message: t("validation.companyTaxCodeInvalid"),
              },
            }}
          />
        </div>
      )}
    </div>
  );
}