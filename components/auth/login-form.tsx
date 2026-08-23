"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { InputControl } from "@/components/ui/input-control";
import { useLoginMutation } from "@/features/auth/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  postAuthDestinationToPath,
  resolvePostAuthDestinationFromAccount,
} from "@/features/auth/post-auth-redirect";
import { fetchMe } from "@/features/auth/auth-me-api";
import { AppError } from "@/lib/http/errors";

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [rememberMe, setRememberMe] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLoginMutation();

  const errorMessage = React.useMemo<string | null>(() => {
    if (!loginMutation.error) return null;
    const err = loginMutation.error as AppError;
    if (err.isNetworkError) return t("errors.network");
    if (err.status === 401) return t("errors.invalidCredentials");
    if (err.status === 403) return t("errors.forbidden");
    if (err.status && err.status >= 500) return t("errors.server");
    return err.message || t("errors.unknown");
  }, [loginMutation.error, t]);

  function onSubmit(data: LoginFormData) {
    loginMutation.mutate(data, {
      onSuccess: async (response) => {
        toast.success(t("toast.loginSuccess"));

        // A stale profile from a previous session on this browser must not
        // decide where we land. `fetchQuery` below is given `staleTime: 0`
        // so it always goes to the network; that supersedes the old cache
        // without removing the query out from under `useMe`.
        //
        // Removing it was itself a hazard: setting the tokens (in the
        // mutation's own `onSuccess`, which runs first) flips `useMe` from
        // disabled to enabled, so by this point it may already be fetching.
        // Dropping the query mid-flight left that observer with no data and
        // nothing scheduled to refill it.

        // Direct redirect based on login response role - faster and more reliable
        let redirectPath = "/";
        if (response.role === "admin") {
          redirectPath = "/admin";
        } else {
          // Resolve the landing page from the account, fetching it *through*
          // React Query rather than beside it.
          //
          // This previously called `fetchMe()` directly and then wrote the
          // result back with `setQueryData`. That left `useMe` empty on the
          // page we landed on — the cache held the account and had an
          // observer, but the component still rendered null until a manual
          // refresh, so every screen derived from `account.serviceProvider.id`
          // (My Projects, invitation cards, the apply flow) looked empty.
          //
          // `fetchQuery` populates the cache through the normal path, so
          // observers are notified the same way a regular query would notify
          // them, and awaiting it means the data is settled before we
          // navigate. It is also one request instead of two.
          try {
            const account = await queryClient.fetchQuery({
              queryKey: ["auth", "me"],
              queryFn: () => fetchMe(),
              // Always hit the network here — a cached profile belongs to
              // whoever was signed in before.
              staleTime: 0,
            });
            redirectPath = postAuthDestinationToPath(
              resolvePostAuthDestinationFromAccount(account),
            );
          } catch (e) {
            console.error("[login-form] /auth/me failed after login", e);
            // Prefer landing somewhere over bouncing back to /login.
            redirectPath = "/";
          }
        }

        // Full page load rather than a client-side `router.replace`.
        //
        // Something in the post-login transition leaves `useMe` without an
        // account until the page is refreshed, so the app renders signed-in but
        // empty — My Projects shows "no projects", the avatar falls back to
        // "?". A hard navigation rebuilds the client from scratch, which is the
        // state a manual refresh produces and is known to work.
        //
        // This is a deliberate workaround, not a fix: the root cause is still
        // open. It costs one extra page load on login only.
        window.location.assign(`/${locale}${redirectPath === "/" ? "" : redirectPath}`);
      },
      onError: (err) => {
        console.error("[login-form] login onError", err);
      },
    });
  }

  const isSubmitting = loginMutation.isPending;

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
          disabled={isSubmitting}
          rules={{
            required: t("validation.emailRequired"),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t("validation.emailInvalid"),
            },
          }}
          error={errors.email?.message}
        />
        <InputControl<LoginFormData>
          name="password"
          register={register}
          label={t("fields.password")}
          type="password"
          placeholder={t("fields.passwordPlaceholder")}
          autoComplete="current-password"
          disabled={isSubmitting}
          rules={{
            required: t("validation.passwordRequired"),
            minLength: {
              value: 6,
              message: t("validation.passwordTooShort"),
            },
          }}
          error={errors.password?.message}
        />

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
              className="size-3.5 rounded-sm border-input bg-input/20 accent-primary"
            />
            <span>{t("fields.rememberMe")}</span>
          </label>
          {/* "Forgot password?" removed: /forgot-password has no route, so the
              link 404'd on prefetch and on click. The backend does support the
              flow (POST /auth/forgot-password + /auth/reset-password) — restore
              this link when the page exists. */}
        </div>

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