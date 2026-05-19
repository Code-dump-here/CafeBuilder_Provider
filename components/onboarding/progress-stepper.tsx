"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Mail, UserCircle } from "lucide-react";

export type Step = 1 | 2;

interface ProgressStepperProps {
  currentStep: Step;
}

export function ProgressStepper({ currentStep }: ProgressStepperProps) {
  const t = useTranslations("Onboarding");

  const steps: { number: Step; label: string; icon: React.ReactNode }[] = [
    { number: 1, label: t("steps.verifyEmail.label"), icon: <Mail className="size-3.5" strokeWidth={2} /> },
    { number: 2, label: t("steps.completeProfile.label"), icon: <UserCircle className="size-3.5" strokeWidth={2} /> },
  ];

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;

        return (
          <React.Fragment key={step.number}>
            {/* Step indicator */}
            <div className="flex items-center gap-2.5">
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 ${
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="size-3.5" strokeWidth={2.5} />
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={`hidden text-xs font-medium transition-colors duration-300 sm:block ${
                  isActive
                    ? "text-foreground"
                    : isCompleted
                    ? "text-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`mx-3 h-px w-10 shrink-0 transition-colors duration-300 ${
                  isCompleted ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
