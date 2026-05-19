"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import type { Role } from "./role-selector";

interface SubmitActionsProps {
  selectedRole: Role | "";
  isLoading: boolean;
  onBack: () => void;
  onSubmit: () => void;
  isValid: boolean;
}

export function SubmitActions({ selectedRole, isLoading, onBack, onSubmit, isValid }: SubmitActionsProps) {
  const t = useTranslations("Onboarding");

  const isShopOwner = selectedRole === "shop_owner";
  // Shop Owner has no extra fields, so only needs a role selected
  const isDisabled = !selectedRole || (!isShopOwner && !isValid) || isLoading;

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Primary CTA */}
      <Button
        type="submit"
        size="2xl"
        className="w-full gap-2 font-medium"
        disabled={isDisabled}
        onClick={onSubmit}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("actions.submitting")}
          </>
        ) : (
          <>
            {t("actions.completeAs", {
              role: selectedRole ? t(`roles.${selectedRole}.submitLabel`) : t("actions.complete"),
            })}
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>

      {/* Back button */}
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="w-full gap-1.5 text-muted-foreground"
        onClick={onBack}
        disabled={isLoading}
      >
        <ArrowLeft className="size-4" />
        {t("actions.back")}
      </Button>
    </div>
  );
}
