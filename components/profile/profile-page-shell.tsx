"use client";

import * as React from "react";
import {
  MapPin,
  Mail,
  Link2,
  Calendar,
  Edit3,
  Settings,
  Star,
  Shield,
  Briefcase,
  Award,
  Users,
  Grid3X3,
  List,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Camera,
  Check,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "react-toastify";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/features/auth/user-context";
import type { NormalizedAccount } from "@/features/auth/auth-me-types";
import { AppError } from "@/lib/http/errors";

import { ProviderProfileEditor } from "./provider-profile-editor";

// ─── Profile Header ───────────────────────────────────────────────────────────

interface ProfileHeaderProps {
  /** Stripped shape of `NormalizedAccount` — only the fields the header
   *  consumes. Keeps the component testable without re-mocking the whole
   *  account record. */
  account: Pick<NormalizedAccount, "email" | "serviceProvider">;
  isOwner: boolean;
}

function ProfileHeader({ account, isOwner }: ProfileHeaderProps) {
  const t = useTranslations("Profile");
  const sp = account.serviceProvider;

  // Defensive null-check — `NormalizedAccount.serviceProvider` is `null`
  // for non-provider accounts (and for providers mid-onboarding). The
  // header is provider-centric, so an empty shell would be misleading;
  // render a minimal email-only placeholder instead.
  if (!sp) {
    return (
      <div className="relative">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <p className="text-sm font-medium text-foreground">{account.email}</p>
        </div>
      </div>
    );
  }

  const initials = sp.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const capabilityLabel =
    sp.capability === "designer"
      ? t("fields.capabilityDesigner")
      : sp.capability === "constructor"
        ? t("fields.capabilityConstructor")
        : t("fields.capabilityBoth");

  const providerTypeLabel =
    sp.providerType === "individual"
      ? t("fields.providerTypeIndividual")
      : t("fields.providerTypeCompany");

  const memberSince = sp.createdAt.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-linear-to-br from-amber-600 via-amber-500 to-orange-500 sm:h-56">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="h-full w-full" viewBox="0 0 400 200">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
        
        {isOwner && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 gap-2 bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <Camera className="size-4" />
            {t("actions.changeCover")}
          </Button>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="relative px-4 sm:px-6">
        {/* Avatar */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0">
          <div className="relative">
            <Avatar className="size-32 border-4 border-background shadow-xl sm:size-36">
              <AvatarImage src="" alt={sp.displayName} />
              <AvatarFallback className="bg-linear-to-br from-amber-500 to-orange-600 text-3xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            {sp.isVerified && (
              <div className="absolute bottom-2 right-2 rounded-full bg-primary p-1.5 shadow-lg">
                <Check className="size-4 text-primary-foreground" />
              </div>
            )}
            {isOwner && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 size-8 rounded-full shadow-md"
              >
                <Edit3 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 sm:pt-6">
          {isOwner ? (
            <>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="size-4" />
                {t("actions.settings")}
              </Button>
              <Button size="sm" className="gap-2">
                <Edit3 className="size-4" />
                {t("actions.editProfile")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="gap-2">
                <MessageCircle className="size-4" />
                Message
              </Button>
              <Button size="sm" className="gap-2">
                <UserPlus className="size-4" />
                Follow
              </Button>
            </>
          )}
        </div>

        {/* Name & Username */}
        <div className="mt-6 text-center sm:mt-8 sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
              {sp.displayName}
            </h1>
            {sp.isVerified && (
              <span className="rounded-full bg-primary/10 p-1">
                <Shield className="size-5 text-primary" />
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
              {capabilityLabel}
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span>{providerTypeLabel}</span>
          </div>
        </div>

        {/* Bio */}
        {sp.bio && (
          <p className="mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-left">
            {sp.bio}
          </p>
        )}

        {/* Meta Info */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            <span>Vietnam</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link2 className="size-4" />
            <a href="#" className="hover:text-primary hover:underline">
              portfolio.com
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            <span>Joined {memberSince}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 flex items-center justify-center gap-8 border-t border-border pt-6 sm:justify-start">
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-1.5 justify-center sm:justify-start">
              <Briefcase className="size-5 text-primary" />
              <span className="text-xl font-bold text-foreground">24</span>
            </div>
            <span className="text-xs text-muted-foreground">Projects</span>
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-1.5 justify-center sm:justify-start">
              <Users className="size-5 text-primary" />
              <span className="text-xl font-bold text-foreground">1.2k</span>
            </div>
            <span className="text-xs text-muted-foreground">Followers</span>
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-1.5 justify-center sm:justify-start">
              <Star className="size-5 text-amber-500 fill-amber-500" />
              <span className="text-xl font-bold text-foreground">
                {sp.avgRating?.toFixed(1) ?? "New"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Rating</span>
          </div>
          {sp.yearsExperience !== null && sp.yearsExperience > 0 && (
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <Award className="size-5 text-primary" />
                <span className="text-xl font-bold text-foreground">
                  {sp.yearsExperience}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Years Exp.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Navigation ─────────────────────────────────────────────────────────────

type TabType = "posts" | "projects" | "reviews";

function TabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
  const t = useTranslations("Profile");
  
  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "posts", label: t("tabs.posts"), icon: Grid3X3 },
    { id: "projects", label: t("tabs.projects"), icon: Briefcase },
    { id: "reviews", label: t("tabs.reviews"), icon: Star },
  ];

  return (
    <div className="mt-8 border-b border-border">
      <nav className="flex gap-1" aria-label="Profile sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Content Grid ─────────────────────────────────────────────────────────────

function PostsGrid() {
  // Mock posts data
  const posts = [
    { id: 1, title: "Modern Cafe Design Concept", likes: 24, comments: 5 },
    { id: 2, title: "Industrial Kitchen Layout", likes: 18, comments: 3 },
    { id: 3, title: "Minimalist Space Planning", likes: 32, comments: 8 },
    { id: 4, title: "Color Theory in Cafe Design", likes: 15, comments: 2 },
    { id: 5, title: "Lighting Design Tips", likes: 28, comments: 6 },
    { id: 6, title: "Budget-Friendly Renovations", likes: 41, comments: 12 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-muted"
        >
          {/* Placeholder Image */}
          <div className="absolute inset-0 bg-linear-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <div className="text-center">
              <Briefcase className="size-8 text-amber-600/50" />
            </div>
          </div>
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex items-center gap-1 text-white">
              <Heart className="size-5" />
              <span className="font-medium">{post.likes}</span>
            </div>
            <div className="flex items-center gap-1 text-white">
              <MessageCircle className="size-5" />
              <span className="font-medium">{post.comments}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectsList() {
  const t = useTranslations("Profile");
  
  const projects = [
    { id: 1, name: "District Coffee House", status: "completed", rating: 5 },
    { id: 2, name: "Urban Beans Cafe", status: "ongoing", rating: null },
    { id: 3, name: "Morning Glory Bistro", status: "completed", rating: 4 },
  ];

  const statusColors: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    ongoing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    pending: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div
          key={project.id}
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex size-14 items-center justify-center rounded-xl bg-linear-to-br from-amber-100 to-orange-100">
            <Briefcase className="size-6 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {project.name}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", statusColors[project.status])}>
                {project.status}
              </span>
              {project.rating && (
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-3",
                        i < project.rating!
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            View
          </Button>
        </div>
      ))}
    </div>
  );
}

function ReviewsList() {
  const t = useTranslations("Profile");
  
  const reviews = [
    {
      id: 1,
      author: "Nguyen Van A",
      project: "District Coffee House",
      rating: 5,
      comment: "Outstanding design work! The team understood our vision perfectly and delivered beyond expectations.",
      date: "2 weeks ago",
    },
    {
      id: 2,
      author: "Tran Thi B",
      project: "Urban Beans Cafe",
      rating: 4,
      comment: "Great communication and professional execution. Highly recommended for cafe projects.",
      date: "1 month ago",
    },
  ];

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {review.author.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{review.author}</p>
                <p className="text-sm text-muted-foreground">{review.project}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-4",
                    i < review.rating
                      ? "text-amber-500 fill-amber-500"
                      : "text-muted-foreground/30",
                  )}
                />
              ))}
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            "{review.comment}"
          </p>
          <p className="mt-3 text-xs text-muted-foreground/60">{review.date}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page Shell ───────────────────────────────────────────────────────────

export function ProfilePageShell() {
  const t = useTranslations("Profile");

  const { account, isLoading, isAuthenticated, isError, error, refetch } =
    useCurrentUser();

  const [activeTab, setActiveTab] = React.useState<TabType>("posts");
  const [showEditor, setShowEditor] = React.useState(false);

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading && !account) {
    return <LoadingShell />;
  }

  // ── Unauthenticated ─────────────────────────────────────────────────────
  if (!isAuthenticated || !account) {
    return <UnauthenticatedState onRetry={() => void refetch()} />;
  }

  // ── API failure ─────────────────────────────────────────────────────────
  if (isError) {
    return (
      <ErrorState
        message={
          error instanceof AppError && error.message
            ? error.message
            : undefined
        }
        onRetry={() => void refetch()}
      />
    );
  }

  // ── Wrong role (admin / owner / provider-without-profile) ───────────────
  if (account.role !== "provider" || !account.serviceProvider) {
    if (account.role === "provider" && !account.serviceProvider) {
      return <MissingProviderState />;
    }
    return <WrongRoleState role={account.role} />;
  }

  // ── Edit Mode ──────────────────────────────────────────────────────────
  if (showEditor) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {t("actions.editProfile")}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowEditor(false)}>
            {t("actions.cancel")}
          </Button>
        </div>
        <ProviderProfileEditor account={account} />
      </div>
    );
  }

  // ── Render the profile ─────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <ProfileHeader account={account} isOwner={true} />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="mt-6">
        {activeTab === "posts" && <PostsGrid />}
        {activeTab === "projects" && <ProjectsList />}
        {activeTab === "reviews" && <ReviewsList />}
      </div>
    </div>
  );
}

// ─── Sub-states ────────────────────────────────────────────────────────────

function LoadingShell() {
  const t = useTranslations("Profile");
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="h-56 w-full animate-pulse rounded-2xl bg-muted" />
      <div className="mt-6 flex items-center gap-4">
        <div className="size-36 -mt-16 rounded-full border-4 border-background bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function UnauthenticatedState({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("Profile");
  return (
    <NoticeState
      title={t("states.notAuthorizedTitle")}
      subtitle={t("states.notAuthorizedSubtitle")}
      ctaHref="/login"
      ctaLabel={t("states.notAuthorizedCta")}
      onRetry={onRetry}
    />
  );
}

function MissingProviderState() {
  const t = useTranslations("Profile");
  return (
    <NoticeState
      title={t("states.missingProviderTitle")}
      subtitle={t("states.missingProviderSubtitle")}
      ctaHref="/onboarding"
      ctaLabel={t("states.missingProviderCta")}
    />
  );
}

function WrongRoleState({ role }: { role: string }) {
  const heading = role === "owner"
    ? "Owners manage projects from the workspace."
    : role === "admin"
      ? "Admin accounts don't have a public provider profile."
      : "Profile editing is only available to provider accounts.";
  const subtitle = role === "owner"
    ? "Head to the workspace to see your projects and notifications."
    : role === "admin"
      ? "Use the admin console to manage users and projects."
      : undefined;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6 lg:px-8">
      <NoticeShell title={heading} subtitle={subtitle} />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  const t = useTranslations("Profile");
  return (
    <NoticeState
      title={t("states.loadErrorTitle")}
      subtitle={message ?? t("states.loadErrorSubtitle")}
      ctaLabel={t("states.loadErrorRetry")}
      onRetry={onRetry}
    />
  );
}

// ─── Reusable notice block ─────────────────────────────────────────────────

interface NoticeStateProps {
  title: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  onRetry?: () => void;
}

function NoticeState({
  title,
  subtitle,
  ctaHref,
  ctaLabel,
  onRetry,
}: NoticeStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6 lg:px-8">
      <NoticeShell title={title} subtitle={subtitle} />
      <div className="flex items-center gap-2">
        {onRetry ? (
          <Button type="button" variant="outline" size="lg" onClick={onRetry}>
            {ctaLabel}
          </Button>
        ) : null}
        {ctaHref && ctaLabel ? (
          <Button asChild size="lg">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface NoticeShellProps {
  title: string;
  subtitle?: string;
}

function NoticeShell({ title, subtitle }: NoticeShellProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
        <TriangleAlert aria-hidden className="size-4" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// Missing icon
function UserPlus({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
