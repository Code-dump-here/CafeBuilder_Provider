"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, Ruler, HardHat, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Role = "shop_owner" | "designer" | "construction_company";

interface RoleOption {
  value: Role;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ROLES: RoleOption[] = [
  {
    value: "shop_owner",
    icon: Building2,
    color: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    value: "designer",
    icon: Ruler,
    color: "bg-sky-50 border-sky-200 text-sky-700",
  },
  {
    value: "construction_company",
    icon: HardHat,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
];

interface RoleSelectorProps {
  selected: Role | null;
  onChange: (role: Role) => void;
  error?: string;
}

export function RoleSelector({ selected, onChange, error }: RoleSelectorProps) {
  const t = useTranslations("Onboarding");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {ROLES.map((role) => {
          const isSelected = selected === role.value;
          const Icon = role.icon;

          return (
            <button
              key={role.value}
              type="button"
              onClick={() => onChange(role.value)}
              className={cn(
                "relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
              )}
            >
              {/* Selected check */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Check className="size-3" strokeWidth={3} />
                </div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  isSelected ? role.color : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
              </div>

              {/* Label */}
              <div className="space-y-0.5 text-center">
                <p className={cn(
                  "text-xs font-semibold leading-tight transition-colors",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}>
                  {t(`roles.${role.value}.name`)}
                </p>
                <p className="text-[10px] leading-tight text-muted-foreground">
                  {t(`roles.${role.value}.shortDesc`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Role detail description */}
      {selected && (
        <p className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          {t(`roles.${selected}.detailDesc`)}
        </p>
      )}
    </div>
  );
}
