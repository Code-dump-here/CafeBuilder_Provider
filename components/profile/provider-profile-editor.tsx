"use client";

import * as React from "react";
import { LogOut, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { AppError } from "@/lib/http/errors";
import { useLogoutMutation } from "@/features/auth/hooks";
import { useUpdateServiceProviderProfileMutation } from "@/features/service-provider-profiles/hooks";
import type { Capability } from "@/features/service-provider-profiles/api";
import type { NormalizedAccount, ProviderCapability } from "@/lib/auth/auth-me-types";

import {
  EMPTY_PROFILE_VALUES,
  ProviderProfileForm,
} from "./provider-profile-form";
import type { ProviderProfileFormValues } from "./provider-profile-form";

// ─── Defaults ────────────────────────────────────────────────────────────────

/**
 * `auth-me-types` uses a domain vocabulary for the user's own capability
 * ("design" / "construction"), while the service-provider profile API
 * (and the marketplace) uses a role-oriented vocabulary ("designer" /
 * "constructor"). The editor renders the marketplace options and submits
 * against the API contract, so we translate when reading from `auth.me`.
 */
const PROVIDER_CAPABILITY_TO_API: Record<
  ProviderCapability,
  Capability
> = {
  design: "designer",
  construction: "constructor",
  both: "both",
};

/**
 * Translate the API-shaped profile into the form's string-based default
 * values. We always start from `EMPTY_PROFILE_VALUES` so every field has
 * a defined starting value (RHF likes that better than `undefined`).
 */
function deriveDefaults(
  account: NormalizedAccount,
): ProviderProfileFormValues {
  const sp = account.serviceProvider;
  if (!sp) return { ...EMPTY_PROFILE_VALUES };

  const yearsExperience =
    typeof sp.yearsExperience === "number" && Number.isFinite(sp.yearsExperience)
      ? String(sp.yearsExperience)
      : "";

  return {
    displayName: sp.displayName,
    providerType: sp.providerType,
    capability: PROVIDER_CAPABILITY_TO_API[sp.capability],
    bio: sp.bio ?? "",
    yearsExperience,
    portfolioHeadline: sp.portfolioHeadline ?? "",
    companyTaxCode: sp.companyTaxCode ?? "",
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ProviderProfileEditorProps {
  account: NormalizedAccount;
}

export function ProviderProfileEditor({ account }: ProviderProfileEditorProps) {
  const t = useTranslations("Profile");
  const tErrors = useTranslations("Auth.errors");
  const tSidebarNav = useTranslations("Sidebar.navUser");
  const router = useRouter();

  const sp = account.serviceProvider!;
  const defaults = React.useMemo(() => deriveDefaults(account), [account]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProviderProfileFormValues>({
    mode: "onChange",
    defaultValues: defaults,
  });

  const updateMutation = useUpdateServiceProviderProfileMutation();
  const logoutMutation = useLogoutMutation();

  // If the profile record is replaced mid-edit (e.g. cached `auth.me` is
  // refreshed between the user opening and saving the form), reconcile
  // the form so the user sees the current server values when the form is
  // pristine. We avoid clobbering local edits — `isDirty` is the gate.
  React.useEffect(() => {
    if (!isDirty) {
      reset(defaults);
    }
  }, [defaults, isDirty, reset]);

  async function onSubmit(values: ProviderProfileFormValues) {
    const trimmedBio = values.bio.trim();
    const trimmedHeadline = values.portfolioHeadline.trim();
    const trimmedTaxCode = values.companyTaxCode.trim();

    const yearsExperience = values.yearsExperience.trim()
      ? Number.parseInt(values.yearsExperience, 10)
      : null;

    const payload = {
      displayName: values.displayName.trim(),
      providerType: values.providerType,
      capability: values.capability,
      bio: trimmedBio.length > 0 ? trimmedBio : null,
      portfolioHeadline: trimmedHeadline.length > 0 ? trimmedHeadline : null,
      yearsExperience:
        yearsExperience !== null && Number.isFinite(yearsExperience)
          ? yearsExperience
          : null,
      companyTaxCode:
        values.providerType === "company" && trimmedTaxCode.length > 0
          ? trimmedTaxCode
          : null,
    };

    try {
      await updateMutation.mutateAsync({ id: sp.id, payload });
      toast.success(t("actions.saved"));
      // Mutating without changing values would leave `isDirty` true — force
      // a baseline reset so the save button greys out.
      reset({
        ...values,
        bio: payload.bio ?? "",
        portfolioHeadline: payload.portfolioHeadline ?? "",
        companyTaxCode: payload.companyTaxCode ?? "",
        yearsExperience:
          payload.yearsExperience !== null
            ? String(payload.yearsExperience)
            : "",
      });
    } catch (err) {
      const message =
        err instanceof AppError && err.message
          ? err.message
          : tErrors("unknown");
      toast.error(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-8"
    >
      {/* ── Account identity block ───────────────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Mail aria-hidden className="size-3.5" />
          {t("fields.emailLabel")}
        </div>
        <div className="text-sm font-medium text-foreground">
          {account.email}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("fields.emailHelp")}
        </p>
      </div>

      <ProviderProfileForm
        register={register}
        errors={errors}
        control={control}
        setValue={setValue}
        watch={watch}
        avgRating={sp.avgRating}
        isVerified={sp.isVerified}
      />

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/85 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/65 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="text-xs"
            onClick={() => reset(defaults)}
            disabled={!isDirty || isSubmitting || updateMutation.isPending}
          >
            {t("actions.reset")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="text-xs"
            disabled={logoutMutation.isPending}
            onClick={() =>
              logoutMutation.mutate(undefined, {
                onSuccess: () => {
                  toast.success(tSidebarNav("signOutSuccess"));
                  router.replace("/");
                },
                onError: () => {
                  toast.error(tSidebarNav("signOutError"));
                },
              })
            }
          >
            <LogOut aria-hidden className="size-3.5" />
            {t("actions.signOut")}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={!isDirty || isSubmitting || updateMutation.isPending}
            aria-label={t("actions.save")}
          >
            {updateMutation.isPending || isSubmitting
              ? t("actions.saving")
              : t("actions.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
