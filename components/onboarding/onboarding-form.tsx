"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ProgressStepper } from "./progress-stepper";
import type { Step } from "./progress-stepper";
import { VerifyEmailStep } from "./verify-email-step";
import { RoleSelector } from "./role-selector";
import type { Role } from "./role-selector";
import { RoleFields } from "./role-fields";
import { SubmitActions } from "./submit-actions";
import type { OnboardingFormValues } from "./role-fields";

const DEMO_ACCOUNT = {
  fullname: "Nguyễn Văn Minh",
  email: "minh.nguyen@email.com",
  phonenumber: "0909 123 456",
};

export function OnboardingForm() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState<Step>(1);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<OnboardingFormValues>({
    mode: "onChange",
    defaultValues: {
      selectedRole: "" as Role | "",
      designer: {
        studioName: "",
        yearsExperience: "",
        specialization: "",
        serviceTypes: [],
        portfolioLink: "",
        completedProjects: "",
        workingCity: "",
      },
      constructionCompany: {
        companyName: "",
        serviceArea: "",
        yearsOperation: "",
        teamSize: "",
        mainCapabilities: [],
        companyProfileLink: "",
        completedProjects: "",
        warrantySupport: "",
      },
    },
  });

  const selectedRole = useWatch({ control, name: "selectedRole" });

  function handleRoleChange(role: Role) {
    setValue("selectedRole", role, { shouldValidate: true });
  }

  async function onSubmit(data: OnboardingFormValues) {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setIsLoading(false);

    const roleData = data.selectedRole === "designer"
      ? { designer: data.designer }
      : data.selectedRole === "construction_company"
      ? { constructionCompany: data.constructionCompany }
      : {};

    console.log("Onboarding complete:", { account: DEMO_ACCOUNT, ...roleData });
    router.push("/");
  }

  return (
    <div className="space-y-8">
      {/* ── Progress Stepper ────────────────────────────────────────────── */}
      <div className="space-y-5">
        <ProgressStepper currentStep={currentStep} />
        <div className="h-1 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: currentStep === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>

      {/* ── Step 1: Verify Email ─────────────────────────────────────────── */}
      {currentStep === 1 && (
        <VerifyEmailStep
          email={DEMO_ACCOUNT.email}
          onVerified={() => setCurrentStep(2)}
          onBack={() => router.push("/register")}
          isVerified={false}
        />
      )}

      {/* ── Step 2: Complete Profile ─────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              {t("completeProfile.title")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("completeProfile.subtitle")}
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t("roleSelection.title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("roleSelection.subtitle")}
              </p>
            </div>
            <RoleSelector
              selected={(selectedRole as Role | "") || null}
              onChange={handleRoleChange}
              error={errors.selectedRole?.message}
            />
          </div>

          {/* Role-specific Fields (designer & construction company only) */}
          <RoleFields
            selectedRole={(selectedRole as Role | "") || ""}
            register={register}
            errors={errors}
            watch={watch}
            isLoading={isLoading}
          />

          {/* Submit Actions */}
          <SubmitActions
            selectedRole={(selectedRole as Role | "") || ""}
            isLoading={isLoading}
            onBack={() => setCurrentStep(1)}
            onSubmit={handleSubmit(onSubmit)}
            isValid={isValid}
          />
        </div>
      )}
    </div>
  );
}
