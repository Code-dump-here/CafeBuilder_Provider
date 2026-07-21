"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "react-toastify";

import { ProgressStepper } from "./progress-stepper";
import type { Step } from "./progress-stepper";
import { VerifyEmailStep } from "./verify-email-step";
import { RoleFields } from "./role-fields";
import type { OnboardingFormValues } from "./role-fields";
import { SubmitActions } from "./submit-actions";
import { useCurrentUser } from "@/lib/auth/user-context";
import { useCreateServiceProviderProfileMutation } from "@/features/service-provider-profiles/hooks";
import { AppError } from "@/lib/http/errors";

export function OnboardingForm() {
  const t = useTranslations("Onboarding");
  const tErrors = useTranslations("Auth.errors");
  const router = useRouter();
  const { account, isLoading: isAccountLoading } = useCurrentUser();
  const [currentStep, setCurrentStep] = React.useState<Step>(1);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<OnboardingFormValues>({
    mode: "onChange",
    defaultValues: {
      displayName: "",
      providerType: "",
      capability: "",
      bio: "",
      yearsExperience: "",
      portfolioHeadline: "",
      companyTaxCode: "",
    },
  });

  // Live-watch so the tax-code section can render conditionally without
  // forcing a full form re-render through `useWatch`.
  const providerType = watch("providerType");
  const capability = watch("capability");

  const createProfile = useCreateServiceProviderProfileMutation();

  async function onSubmit(values: OnboardingFormValues) {
    if (!account) {
      // The page-level `ProfileGuard` should have prevented this — guard
      // mounts only after /me resolves. Defensive toast anyway.
      toast.error(tErrors("unknown"));
      return;
    }

    // providerType and capability are required enums in the payload.
    // If they're empty the form validation should already have blocked
    // submission, but narrow the type anyway so the API call is sound.
    if (values.providerType === "" || values.capability === "") return;

    const yearsExperience = values.yearsExperience
      ? Number.parseInt(values.yearsExperience, 10)
      : undefined;

    try {
      await createProfile.mutateAsync({
        accountId: account.id,
        displayName: values.displayName.trim(),
        providerType: values.providerType,
        capability: values.capability,
        bio: values.bio.trim() || undefined,
        portfolioHeadline: values.portfolioHeadline.trim() || undefined,
        yearsExperience:
          yearsExperience !== undefined && Number.isFinite(yearsExperience)
            ? yearsExperience
            : undefined,
        companyTaxCode:
          values.providerType === "company"
            ? values.companyTaxCode.trim() || undefined
            : undefined,
      });
      toast.success(t("actions.submitSuccess"));
      // The mutation already invalidated `auth.me`. Push the user into
      // the protected workspace — `ProfileGuard` will see a non-null
      // serviceProvider on the next render and let them through.
      router.replace("/");
    } catch (err) {
      // Prefer server's message if we got an `AppError`; otherwise fall
      // back to the generic "unknown" key already present in
      // `Auth.errors`. Validation errors with field details would
      // surface under `err.details` — we keep it simple for now.
      const message =
        err instanceof AppError && err.message
          ? err.message
          : tErrors("unknown");
      toast.error(message);
    }
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

      {/* ── Loading gate ────────────────────────────────────────────────
          Onboarding is reached either via the post-login redirect (where
          the login form clears the `auth.me` React Query cache before
          routing here) or via a direct nav. In the first case the cache
          is empty when this component mounts, so `useCurrentUser()` is
          mid-fetch and `account.email` is briefly `""`. The user sees
          the "Verification code sent to" header but a blank email line
          underneath, which looks like a bug even though it'll resolve
          in a few hundred milliseconds.

          Instead of letting that flicker happen, we hold the form behind
          a thin skeleton until the account resolves. We also guard
          against the rare case where the fetch settles to no account
          (e.g. token expired mid-flight) — in which case the parent
          layout's auth handling will route the user away. */}
      {(!account && isAccountLoading) && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="space-y-3">
            <div className="h-3 w-64 animate-pulse rounded bg-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-muted" />
          </div>
          <span className="sr-only">Loading your account…</span>
        </div>
      )}

      {/* ── Step 1: Verify Email ─────────────────────────────────────────── */}
      {currentStep === 1 && account && (
        <VerifyEmailStep
          // `account` is guaranteed non-null above; pass `email` directly
          // so the user never sees a momentary blank.
          email={account.email}
          onVerified={() => setCurrentStep(2)}
          onBack={() => router.push("/")}
          isVerified={false}
        />
      )}

      {/* ── Step 2: Complete Profile (provider) ────────────────────────── */}
      {currentStep === 2 && account && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              {t("completeProfile.title")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("completeProfile.subtitle")}
            </p>
          </div>

          <form
            id="onboarding-provider-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-7"
            noValidate
          >
            <RoleFields
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
              watch={watch}
            />

            <SubmitActions
              // The legacy component accepts a `selectedRole` prop for
              // shop-owner gating. For the provider-only flow we treat
              // any non-empty providerType / capability as "ready" so the
              // button stays in sync with what the form requires.
              selectedRole={
                providerType && capability ? "designer" : ""
              }
              isLoading={
                isSubmitting || createProfile.isPending
              }
              isValid={
                isValid &&
                providerType !== "" &&
                capability !== ""
              }
              onBack={() => setCurrentStep(1)}
              onSubmit={() => {
                // No-op — the button is rendered inside the `<form>` so
                // its native `type="submit"` already routes through RHF's
                // `handleSubmit(onSubmit)`. Kept as a prop for symmetry
                // with the shop-owner flow which uses it directly.
              }}
            />
          </form>
        </div>
      )}
    </div>
  );
}