"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Mail, Phone, User, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountData {
  fullname: string;
  email: string;
  phonenumber: string;
}

interface AccountSummaryCardProps {
  account: AccountData;
}

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function AccountSummaryCard({ account }: AccountSummaryCardProps) {
  const t = useTranslations("Onboarding");

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card",
      "p-4 space-y-3"
    )}>
      <div className="flex items-center gap-2 pb-2.5 border-b border-border">
        <CheckCircle2 className="size-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">
          {t("accountSummary.title")}
        </p>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {t("accountSummary.completed")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <InfoRow
          icon={User}
          label={t("accountSummary.labels.fullname")}
          value={account.fullname}
        />
        <InfoRow
          icon={Mail}
          label={t("accountSummary.labels.email")}
          value={account.email}
        />
        <InfoRow
          icon={Phone}
          label={t("accountSummary.labels.phonenumber")}
          value={account.phonenumber}
        />
      </div>
    </div>
  );
}
