"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { UseFormRegister, FieldErrors, UseFormWatch } from "react-hook-form";
import { InputControl } from "@/components/ui/input-control";
import type { Role } from "./role-selector";

// ─── Shared form types ───────────────────────────────────────────────────────
export interface OnboardingFormValues {
  // Account (passed from registration)
  fullname: string;
  email: string;
  phonenumber: string;

  // Role
  selectedRole: Role | "";

  // ── Designer ─────────────────────────────────────────────────────────────────
  designer: {
    studioName: string;
    yearsExperience: string;
    specialization: string;
    portfolioLink: string;
    completedProjects: string;
    workingCity: string;
  };

  // ── Construction Company ─────────────────────────────────────────────────────
  constructionCompany: {
    companyName: string;
    serviceArea: string;
    yearsOperation: string;
    teamSize: string;
    companyProfileLink: string;
    completedProjects: string;
    warrantySupport: string;
  };
}

// ─── Field group base ─────────────────────────────────────────────────────────
interface FieldGroupProps {
  register: UseFormRegister<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  watch: UseFormWatch<OnboardingFormValues>;
  isLoading?: boolean;
}

// ─── Designer Fields ──────────────────────────────────────────────────────────
function DesignerFields({ register, errors }: FieldGroupProps) {
  const t = useTranslations("Onboarding");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InputControl<OnboardingFormValues>
          name="designer.studioName"
          register={register}
          label={t("designer.fields.studioName")}
          placeholder={t("designer.fields.studioNamePlaceholder")}
          error={errors.designer?.studioName?.message}
        />
        <InputControl<OnboardingFormValues>
          name="designer.workingCity"
          register={register}
          label={t("designer.fields.workingCity")}
          placeholder={t("designer.fields.workingCityPlaceholder")}
          error={errors.designer?.workingCity?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputControl<OnboardingFormValues>
          name="designer.yearsExperience"
          register={register}
          label={t("designer.fields.yearsExperience")}
          type="number"
          placeholder="0"
          error={errors.designer?.yearsExperience?.message}
        />
        <InputControl<OnboardingFormValues>
          name="designer.completedProjects"
          register={register}
          label={t("designer.fields.completedProjects")}
          type="number"
          placeholder="0"
          error={errors.designer?.completedProjects?.message}
        />
      </div>

      <InputControl<OnboardingFormValues>
        name="designer.specialization"
        register={register}
        label={t("designer.fields.specialization")}
        placeholder={t("designer.fields.specializationPlaceholder")}
        error={errors.designer?.specialization?.message}
      />

      <InputControl<OnboardingFormValues>
        name="designer.portfolioLink"
        register={register}
        label={t("designer.fields.portfolioLink")}
        placeholder="https://portfolio.example.com"
        error={errors.designer?.portfolioLink?.message}
        rules={{
          pattern: {
            value: /^$|^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i,
            message: t("validation.urlInvalid"),
          },
        }}
      />
    </div>
  );
}

// ─── Construction Company Fields ────────────────────────────────────────────
function ConstructionCompanyFields({ register, errors }: FieldGroupProps) {
  const t = useTranslations("Onboarding");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InputControl<OnboardingFormValues>
          name="constructionCompany.companyName"
          register={register}
          label={t("constructionCompany.fields.companyName")}
          placeholder={t("constructionCompany.fields.companyNamePlaceholder")}
          error={errors.constructionCompany?.companyName?.message}
        />
        <InputControl<OnboardingFormValues>
          name="constructionCompany.serviceArea"
          register={register}
          label={t("constructionCompany.fields.serviceArea")}
          placeholder={t("constructionCompany.fields.serviceAreaPlaceholder")}
          error={errors.constructionCompany?.serviceArea?.message}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <InputControl<OnboardingFormValues>
          name="constructionCompany.yearsOperation"
          register={register}
          label={t("constructionCompany.fields.yearsOperation")}
          type="number"
          placeholder="0"
          error={errors.constructionCompany?.yearsOperation?.message}
        />
        <InputControl<OnboardingFormValues>
          name="constructionCompany.teamSize"
          register={register}
          label={t("constructionCompany.fields.teamSize")}
          type="number"
          placeholder="0"
          error={errors.constructionCompany?.teamSize?.message}
        />
        <InputControl<OnboardingFormValues>
          name="constructionCompany.completedProjects"
          register={register}
          label={t("constructionCompany.fields.completedProjects")}
          type="number"
          placeholder="0"
          error={errors.constructionCompany?.completedProjects?.message}
        />
      </div>

      <InputControl<OnboardingFormValues>
        name="constructionCompany.companyProfileLink"
        register={register}
        label={t("constructionCompany.fields.companyProfileLink")}
        placeholder="https://company.example.com"
        error={errors.constructionCompany?.companyProfileLink?.message}
        rules={{
          pattern: {
            value: /^$|^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i,
            message: t("validation.urlInvalid"),
          },
        }}
      />

      <InputControl<OnboardingFormValues>
        name="constructionCompany.warrantySupport"
        register={register}
        label={t("constructionCompany.fields.warrantySupport")}
        placeholder={t("constructionCompany.fields.warrantySupportPlaceholder")}
        error={errors.constructionCompany?.warrantySupport?.message}
      />
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
interface RoleFieldsProps {
  selectedRole: Role | "";
  register: UseFormRegister<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  watch: UseFormWatch<OnboardingFormValues>;
  isLoading?: boolean;
}

export function RoleFields({ selectedRole, register, errors, watch, isLoading }: RoleFieldsProps) {
  const t = useTranslations("Onboarding");

  if (!selectedRole) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          {t("roleFields.selectRoleHint")}
        </p>
      </div>
    );
  }

  // Shop Owner — no extra profile fields needed
  if (selectedRole === "shop_owner") {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{t("shopOwner.noFields.title")}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("shopOwner.noFields.description")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fieldsProps = { register, errors, watch, isLoading };

  return (
    <div className="space-y-5">
      {/* Role section header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <p className="px-3 text-xs font-medium text-muted-foreground">
          {t("roleFields.sectionHeader", { role: t(`roles.${selectedRole}.name`) })}
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      {selectedRole === "designer" && <DesignerFields {...fieldsProps} />}
      {selectedRole === "construction_company" && <ConstructionCompanyFields {...fieldsProps} />}
    </div>
  );
}
