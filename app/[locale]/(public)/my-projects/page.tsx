"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Briefcase, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import {
  MyProjectsGrid,
  MyProjectsPagination,
} from "@/components/my-projects/my-projects-grid";
import { MyProjectsFilterTabs } from "@/components/my-projects/my-projects-filter-tabs";
import { useMyProjectWorkings } from "@/features/projects/use-my-project-workings";
import type { MyProjectStatus } from "@/features/projects/my-projects-types";

// ---------------------------------------------------------------------------
// Page component
//
// `/[locale]/my-projects` — provider-facing "My Projects" listing. Provider
// lands here to see every engagement they currently hold, grouped as
// one card per `project-working` row.
//
// Lives under the `(public)` route group so it inherits the marketing
// `Navbar` + `ProfileGuard` from `app/[locale]/(public)/layout.tsx`.
// (It deliberately does NOT live under `/projects/[id]`'s sidebar layout —
// that's reserved for the project-detail scope.)
//
// Data flow:
//   1. The `MyProjectsFilterTabs` mirrors the user's selection into
//      `?status=requested|accepted|completed` so the URL is bookmarkable.
//   2. `useMyProjectWorkings({ pageNumber, pageSize, status })` reads
//      the `serviceProviderProfileId` from `useCurrentUser` and fires
//      `GET /api/project-workings?serviceProviderProfileId={id}&status=…&pageNumber=n&pageSize=m`.
//   3. While loading, render skeletons. On error, render the grid's
//      error block with a retry CTA. On success, render cards.
//   4. Pagination is local state inside `MyProjectsResults` — the
//      `key={status}` on that component re-mounts it when the filter
//      changes so the page-number state resets to 1 automatically.
//
// `useSearchParams` requires a Suspense boundary in the App Router, so
// the default export wraps the body in a `<Suspense>` fallback.

const PAGE_SIZE = 10;

const STATUS_VALUES: ReadonlySet<MyProjectStatus> = new Set([
  "requested",
  "accepted",
  "completed",
]);

function parseStatusParam(raw: string | null): MyProjectStatus | undefined {
  if (raw && (STATUS_VALUES as Set<string>).has(raw)) {
    return raw as MyProjectStatus;
  }
  return undefined;
}

export default function MyProjectsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <MyProjectsPageHeader />
        </div>
      }
    >
      <MyProjectsPageContent />
    </React.Suspense>
  );
}

function MyProjectsPageHeader() {
  const t = useTranslations("MyProjects");
  return (
    <header className="flex items-start gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Briefcase className="size-4" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
    </header>
  );
}

function MyProjectsPageContent() {
  const searchParams = useSearchParams();
  const status = parseStatusParam(searchParams.get("status"));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <MyProjectsPageHeader />

      <MyProjectsFilterTabs />

      {/*
        Re-mount on filter change so the page-number state resets to 1
        without an imperative side-effect. Also pulls the mode-prop
        (`invitations` vs `default`) into the keyed subtree so the grid
        re-renders the right card variant after a filter switch.
      */}
      <MyProjectsResults key={status ?? "all"} status={status} />
    </div>
  );
}

interface MyProjectsResultsProps {
  status: MyProjectStatus | undefined;
}

function MyProjectsResults({ status }: MyProjectsResultsProps) {
  const t = useTranslations("MyProjects");

  const [pageNumber, setPageNumber] = React.useState(1);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useMyProjectWorkings({
      pageNumber,
      pageSize: PAGE_SIZE,
      status,
    });

  // First-load only — `keepPreviousData` keeps prior rows visible during
  // background refreshes so we don't flash a full skeleton after the
  // initial commit.
  const showSkeleton = isLoading;
  const showPagination =
    !showSkeleton && !isError && data.totalPages > 1;

  const handlePageChange = React.useCallback((next: number) => {
    setPageNumber(next);
  }, []);

  const mode = status === "requested" ? "invitations" : "default";

  return (
    <>
      <MyProjectsGrid
        projects={data.items}
        isLoading={showSkeleton}
        error={isError ? error : null}
        onRetry={() => {
          void refetch();
        }}
        mode={mode}
      />

      {showPagination ? (
        <MyProjectsPagination
          pageNumber={data.pageNumber}
          totalPages={data.totalPages}
          hasPrevious={data.hasPrevious}
          hasNext={data.hasNext}
          onPageChange={handlePageChange}
        />
      ) : null}

      {isFetching && !isLoading ? (
        <p
          aria-live="polite"
          className="flex items-center justify-center gap-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          <Loader2 className="size-3 animate-spin" aria-hidden />
          {t("refreshing")}
        </p>
      ) : null}
    </>
  );
}
