"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputControl } from "@/components/ui/input-control";

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const t = useTranslations("Auth");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    console.log("Login with:", { ...data, rememberMe });
  }

  return (
    <>
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {t("form.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("form.subtitle")}
        </p>
      </div>

      {/* Login form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InputControl<LoginFormData>
          name="email"
          register={register}
          label={t("fields.email")}
          type="email"
          placeholder="email@example.com"
          autoComplete="email"
          disabled={isLoading}
          error={errors.email?.message}
        />
        <InputControl<LoginFormData>
          name="password"
          register={register}
          label={t("fields.password")}
          type="password"
          placeholder={t("fields.passwordPlaceholder")}
          autoComplete="current-password"
          disabled={isLoading}
          error={errors.password?.message}
        />

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="size-3.5 rounded-sm border-input bg-input/20 accent-primary"
            />
            <span>{t("fields.rememberMe")}</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80 hover:underline underline-offset-2"
          >
            {t("fields.forgotPassword")}
          </Link>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="xl"
          className="w-full gap-2 font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("form.signingIn")}
            </>
          ) : (
            <>
              {t("form.signIn")}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">
            {t("form.orContinue")}
          </span>
        </div>
      </div>

      {/* Social login */}
      <Button
        type="button"
        variant="outline"
        size="xl"
        className="relative flex w-full items-center justify-center gap-2 font-medium"
      >
        <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {t("form.continueWithGoogle")}
      </Button>

      {/* Register link */}
      <p className="text-center text-xs text-muted-foreground">
        {t("form.noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline underline-offset-2"
        >
          {t("form.registerNow")}
        </Link>
      </p>
    </>
  );
}
