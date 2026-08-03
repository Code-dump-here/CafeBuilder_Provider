"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendOtpMutation, useVerifyOtpMutation } from "@/features/auth/hooks";
import { AppError } from "@/lib/http/errors";

interface VerifyEmailStepProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
  isVerified: boolean;
}

const OTP_LENGTH = 6;

export function VerifyEmailStep({ email, onVerified, onBack, isVerified }: VerifyEmailStepProps) {
  const t = useTranslations("Onboarding");
  const [digits, setDigits] = React.useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState("");
  const [countdown, setCountdown] = React.useState(0);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const sendOtpMutation = useSendOtpMutation();
  const verifyOtpMutation = useVerifyOtpMutation();

  const isCodeComplete = digits.every((d) => d !== "");
  const isSending = sendOtpMutation.isPending;
  const isVerifying = verifyOtpMutation.isPending;
  const isFormDisabled = isSending || isVerifying;

  // Countdown timer for resend
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleSendCode() {
    setError("");
    try {
      await sendOtpMutation.mutateAsync({ email });
      setSent(true);
      setCountdown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const appErr = err as AppError;
      if (appErr.status === 429) {
        setError(t("verifyEmail.errors.tooManyRequests"));
      } else if (appErr.status && appErr.status >= 500) {
        setError(t("verifyEmail.errors.serverError"));
      } else {
        setError(appErr.message || t("verifyEmail.errors.sendFailed"));
      }
    }
  }

  async function handleVerifyCode() {
    if (!isCodeComplete) return;
    setError("");
    const code = digits.join("");
    try {
      await verifyOtpMutation.mutateAsync({ email, code: digits.join("") });
      onVerified();
    } catch (err) {
      const appErr = err as AppError;
      if (appErr.status === 400) {
        setError(t("verifyEmail.errors.wrongCode"));
      } else if (appErr.status && appErr.status >= 500) {
        setError(t("verifyEmail.errors.serverError"));
      } else {
        setError(appErr.message || t("verifyEmail.errors.verifyFailed"));
      }
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  }

  function handleDigitChange(index: number, value: string) {
    // Allow only a single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError("");

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when last digit is entered
    if (digit && index === OTP_LENGTH - 1 && newDigits.every((d) => d !== "")) {
      // small delay so user sees the digit
      setTimeout(() => {
        if (!isVerifying) handleVerifyCode();
      }, 100);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index] === "" && index > 0) {
        // Move focus back and clear previous digit
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((char, i) => {
      newDigits[i] = char;
    });
    setDigits(newDigits);
    // Focus last filled or first empty
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {t("verifyEmail.title")}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("verifyEmail.subtitle")}
        </p>
      </div>

      {/* Email display card */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Mail className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("verifyEmail.labels.emailSentTo")}
          </p>
          <p className="truncate text-sm font-medium text-foreground">{email}</p>
        </div>
        {sent && (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
        )}
      </div>

      {/* Instructions */}
      {!sent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
            <div className="flex gap-3">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-primary" />
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  {t("verifyEmail.instructions.title")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("verifyEmail.instructions.description")}
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            size="2xl"
            className="w-full gap-2 font-medium"
            onClick={handleSendCode}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("verifyEmail.sending")}
              </>
            ) : (
              <>
                {t("verifyEmail.sendCode")}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      ) : isVerified ? (
        /* Verified success state */
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="size-6 text-emerald-600" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-emerald-800">{t("verifyEmail.verified.title")}</p>
            <p className="mt-1 text-xs text-emerald-600">{t("verifyEmail.verified.description")}</p>
          </div>
        </div>
      ) : (
        /* OTP entry */
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              {t("verifyEmail.codeLabel")}
            </p>

            {/* Individual OTP inputs */}
            <div className="flex gap-2" onPaste={handlePaste}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digits[i]}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`size-12 rounded-xl border-2 text-center text-xl font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                    error
                      ? "border-destructive/50 bg-destructive/5 text-foreground"
                      : digits[i]
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-foreground focus:border-primary focus:bg-primary/5"
                  }`}
                  aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                />
              ))}
            </div>

            {error && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" />
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("verifyEmail.codeHint")}
            </p>
          </div>

          {/* Demo hint */}
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t("verifyEmail.demoLabel")}:</span>{" "}
              {t("verifyEmail.demoHint")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="2xl"
              className="w-full gap-2 font-medium"
              onClick={handleVerifyCode}
              disabled={!isCodeComplete || isFormDisabled}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("verifyEmail.verifying")}
                </>
              ) : (
                <>
                  {t("verifyEmail.verifyCode")}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={isSending || countdown > 0}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {isSending ? t("verifyEmail.sending") : countdown > 0 ? `${countdown}s` : t("verifyEmail.resendCode")}
            </button>
          </div>
        </div>
      )}

      {/* Back button */}
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="w-full gap-1.5 text-muted-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        {t("actions.back")}
      </Button>
    </div>
  );
}
