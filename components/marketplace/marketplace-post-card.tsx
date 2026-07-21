"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Hammer,
  MapPin,
  PenLine,
  Ruler,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { MarketplacePost } from "@/lib/projects/marketplace-types";

// ---------------------------------------------------------------------------
// Locale-aware formatters (kept inline — no separate util file for one-off).
//
// Sample data is VND and the marketplace is Vietnam-focused, so both
// locales display VND; English speakers still see a properly-formatted
// figure with a compact fallback for narrow viewports.

const NF_VND_FULL_VI = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const NF_VND_COMPACT_VI = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const NF_VND_FULL_EN = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const NF_VND_COMPACT_EN = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const NF_DATE_EN = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const NF_DATE_VI = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatBudget(post: MarketplacePost, locale: string) {
  const isVi = locale.startsWith("vi");
  return {
    full: (isVi ? NF_VND_FULL_VI : NF_VND_FULL_EN).format(post.projectBudget),
    compact: (isVi ? NF_VND_COMPACT_VI : NF_VND_COMPACT_EN).format(
      post.projectBudget,
    ),
  };
}

function formatDate(date: Date, locale: string) {
  return (locale.startsWith("vi") ? NF_DATE_VI : NF_DATE_EN).format(date);
}

// ---------------------------------------------------------------------------
// Status / service-tone — keeps the palette restrained (3 tones max).

const STATUS_TONE: Record<
  MarketplacePost["status"],
  { dot: string; pill: string }
> = {
  open: {
    dot: "bg-emerald-500",
    pill:
      "border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  closed: {
    dot: "bg-muted-foreground/50",
    pill: "border-border bg-muted text-muted-foreground",
  },
  draft: {
    dot: "bg-amber-500",
    pill:
      "border-amber-300/50 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

const SERVICE_ICON: Record<
  MarketplacePost["serviceKind"],
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  design: PenLine,
  construction: Hammer,
  both: Building2,
};

// ---------------------------------------------------------------------------
// Component

export interface MarketplacePostCardProps {
  post: MarketplacePost;
}

export function MarketplacePostCard({ post }: MarketplacePostCardProps) {
  const t = useTranslations("Marketplace.card");
  const locale = useLocale();

  const status = STATUS_TONE[post.status];
  const ServiceIcon = SERVICE_ICON[post.serviceKind];
  const budget = formatBudget(post, locale);

  // Derive the days-to-deadline once on mount via `useSyncExternalStore`.
  // This keeps `Date.now()` out of the render path (which would trip
  // `react-hooks/purity`) and gives a stable server snapshot so the
  // first paint doesn't differ between SSR and client.
  const daysToDeadline = useStableDaysToDeadline(post.submissionDeadline);

  const deadlineUrgency =
    post.status === "closed"
      ? "muted"
      : daysToDeadline == null
        ? "muted"
        : daysToDeadline <= 3
          ? "urgent"
          : daysToDeadline <= 14
            ? "soon"
            : "ok";

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all",
        "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md",
        post.status === "closed" && "opacity-90",
      )}
    >
      {/* Top: status + service kind. */}
      <header className="flex items-start justify-between gap-3">
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide",
            status.pill,
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              status.dot,
              post.status === "open" && "animate-pulse",
            )}
          />
          {t(`status.${post.status}`)}
        </Badge>

        <Badge
          variant="secondary"
          className="gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
        >
          <ServiceIcon className="size-3" aria-hidden />
          {t(`serviceKind.${post.serviceKind}`)}
        </Badge>
      </header>

      {/* Title + project. */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground">
          {post.title}
        </h3>
        <p className="text-xs font-medium text-muted-foreground">
          {post.projectName}
        </p>
      </div>

      {/* Description. */}
      <p className="line-clamp-2 text-xs leading-relaxed text-foreground/70">
        {post.description}
      </p>

      {/* Address. */}
      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span className="line-clamp-1">{post.projectAddress}</span>
      </div>

      {/* Key facts: budget / area / deadline. */}
      <dl className="grid grid-cols-3 gap-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
        <Fact
          icon={Wallet}
          label={t("budget")}
          primary={budget.compact}
          secondary={budget.full}
        />
        <Fact
          icon={Ruler}
          label={t("area")}
          primary={`${post.projectAreaM2}`}
          secondary="m²"
        />
        <Fact
          icon={CalendarDays}
          label={t("deadline")}
          primary={formatDate(post.submissionDeadline, locale)}
          secondary={
            post.status === "closed"
              ? "—"
              : daysToDeadline == null
                ? "—"
                : daysToDeadline > 0
                  ? `${daysToDeadline}d`
                  : "Past due"
          }
          secondaryTone={deadlineUrgency}
        />
      </dl>

      {/* Footer: CTA. */}
      <footer className="mt-auto flex items-center justify-between border-t border-border/40 pt-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("submitted")}{" "}
          <time
            dateTime={post.createdAt.toISOString()}
            className="font-medium text-foreground/80"
          >
            {formatDate(post.createdAt, locale)}
          </time>
        </span>

        <Link
          href={`/projects/${post.projectShopOwnerId}`}
          aria-label={t("viewPostAria", { title: post.title })}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium text-primary",
            "transition-transform group-hover:translate-x-0.5",
          )}
        >
          {t("viewPost")}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </footer>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Fact cell — used by the dl grid above. Renders an icon, label, and a
// primary/secondary value pair (e.g. "450M VND" / "450.000.000 ₫").

type DeadlineTone = "muted" | "urgent" | "soon" | "ok";

const DEADLINE_TONE: Record<
  DeadlineTone,
  string
> = {
  muted: "text-muted-foreground",
  urgent: "font-semibold text-rose-600 dark:text-rose-400",
  soon: "font-medium text-amber-700 dark:text-amber-300",
  ok: "text-foreground/70",
};

interface FactProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  primary: string;
  secondary?: string;
  secondaryTone?: DeadlineTone;
}

function Fact({ icon: Icon, label, primary, secondary, secondaryTone = "muted" }: FactProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-2.5" aria-hidden />
        {label}
      </dt>
      <dd className="flex flex-col leading-tight">
        <span className="text-xs font-semibold tracking-tight text-foreground">
          {primary}
        </span>
        {secondary ? (
          <span className={cn("text-[10px]", DEADLINE_TONE[secondaryTone])}>
            {secondary}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// useStableDaysToDeadline
//
// Reads `Date.now()` *once* on mount and stores it in state. We can't
// read it during render (that would trip `react-hooks/purity`) and we
// can't compute it lazily either (that would diverge between SSR and
// the first client paint).
//
// The earlier implementation wrapped `Date.now()` in
// `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`
// with a `getSnapshot` that returned a *new* value on every call and a
// `subscribe` that never fired — React would call `getSnapshot` during
// render, see a different value than last time, schedule an update, and
// re-render. The next render hit the same path. The result was a
// "Maximum update depth exceeded" loop. The state-on-mount approach
// sidesteps the issue: `now` is sampled once and never changes for the
// lifetime of the card, so the deadline diff is stable for the user.
//
// Returns `null` during SSR / before mount so the card renders a neutral
// placeholder without a hydration mismatch.

function useStableDaysToDeadline(deadline: Date): number | null {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
  }, []);

  return React.useMemo(() => {
    if (now == null) return null;
    return Math.ceil((deadline.getTime() - now) / (1000 * 60 * 60 * 24));
  }, [deadline, now]);
}