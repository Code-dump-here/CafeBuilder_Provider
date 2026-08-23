"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputControl } from "@/components/ui/input-control";
import {
  useRegisterMutation,
} from "@/features/auth/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  postAuthDestinationToPath,
  resolvePostAuthDestinationFromAccount,
} from "@/features/auth/post-auth-redirect";
import { fetchMe } from "@/features/auth/auth-me-api";
import { AppError } from "@/lib/http/errors";

interface RegisterFormData {
  email: string;
  password: string;
  fullname: string;
  phonenumber: string;
}

function roleHomePath(_role: string): string {
  return "/";
}

export function RegisterForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      email: "",
      password: "",
      fullname: "",
      phonenumber: "",
    },
  });

  const registerMutation = useRegisterMutation();

  const errorMessage = React.useMemo<string | null>(() => {
    if (!registerMutation.error) return null;
    const err = registerMutation.error as AppError;
    if (err.isNetworkError) return t("errors.network");
    if (err.status === 401 || err.status === 403) return t("errors.forbidden");
    if (err.status === 409) return t("errors.emailTaken");
    if (err.status === 400) return t("errors.invalidInput");
    if (err.status && err.status >= 500) return t("errors.server");
    return err.message || t("errors.unknown");
  }, [registerMutation.error, t]);

  function onSubmit(data: RegisterFormData) {
    registerMutation.mutate(
      {
        email: data.email,
        password: data.password,
        phone: data.phonenumber,
        role: "provider",
        fullName: data.fullname,
        serviceKind: undefined,
      },
      {
        onSuccess: async (session) => {
          queryClient.removeQueries({ queryKey: ["auth", "me"] });
          // Fetch through React Query so `useMe` is populated via its normal
          // path — see the comment in login-form.tsx.
          const account = await queryClient.fetchQuery({
            queryKey: ["auth", "me"],
            queryFn: () => fetchMe(),
            staleTime: 5 * 60 * 1000,
          });
          const destination = resolvePostAuthDestinationFromAccount(account);
          const path =
            destination.kind === "onboarding"
              ? postAuthDestinationToPath(destination)
              : roleHomePath(session.role);
          router.replace(path);
        },
      },
    );
  }

  const isSubmitting = registerMutation.isPending;

  return (
    <>
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {t("register.form.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("register.form.subtitle")}
        </p>
      </div>

      {/* Register form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InputControl<RegisterFormData>
          name="fullname"
          register={register}
          label={t("register.fields.fullname")}
          type="text"
          placeholder={t("register.fields.fullnamePlaceholder")}
          autoComplete="name"
          disabled={isSubmitting}
          error={errors.fullname?.message}
          rules={{ required: t("validation.fullnameRequired") }}
        />
        <InputControl<RegisterFormData>
          name="email"
          register={register}
          label={t("fields.email")}
          type="email"
          placeholder="email@example.com"
          autoComplete="email"
          disabled={isSubmitting}
          error={errors.email?.message}
          rules={{
            required: t("validation.emailRequired"),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t("validation.emailInvalid"),
            },
          }}
        />
        <InputControl<RegisterFormData>
          name="phonenumber"
          register={register}
          label={t("register.fields.phonenumber")}
          type="tel"
          placeholder={t("register.fields.phonenumberPlaceholder")}
          autoComplete="tel"
          disabled={isSubmitting}
          error={errors.phonenumber?.message}
          rules={{
            required: t("validation.phonenumberRequired"),
            pattern: {
              value: /^[0-9+\-\s()]{8,15}$/,
              message: t("validation.phonenumberInvalid"),
            },
          }}
        />
        <InputControl<RegisterFormData>
          name="password"
          register={register}
          label={t("fields.password")}
          type="password"
          placeholder={t("fields.passwordPlaceholder")}
          autoComplete="new-password"
          disabled={isSubmitting}
          error={errors.password?.message}
          rules={{
            required: t("validation.passwordRequired"),
            minLength: {
              value: 6,
              message: t("validation.passwordTooShort"),
            },
          }}
        />

        {/* Server error banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          size="xl"
          className="w-full gap-2 font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("register.form.signingUp")}
            </>
          ) : (
            <>
              {t("register.form.signUp")}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      {/* Sign in link */}
      <p className="text-center text-xs text-muted-foreground">
        {t("register.form.hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline underline-offset-2"
        >
          {t("register.form.signInNow")}
        </Link>
      </p>
    </>
  );
}
