"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Briefcase, Loader2 } from "lucide-react";

import {
  MyProjectsGrid,
  MyProjectsPagination,
} from "@/components/my-projects/my-projects-grid";
import { useMyProjectWorkings } from "@/lib/projects/use-my-project-workings";

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
//   1. `useMyProjectWorkings({ pageNumber, pageSize })` reads the
//      authenticated provider's `serviceProvider.id` via `useCurrentUser`
//      and fires
//      `GET /api/project-workings?serviceProviderProfileId={id}&pageNumber={n}&pageSize={m}`.
//   2. While loading, render skeletons. On error, render the grid's
//      error block with a retry CTA. On success, render cards.
//   3. Pagination is local state — the hook's `keepPreviousData` keeps
//      the previous page visible while the next request is in flight.

const PAGE_SIZE = 10;

export default function MyProjectsPage() {
  const t = useTranslations("MyProjects");

  const [pageNumber, setPageNumber] = React.useState(1);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useMyProjectWorkings({ pageNumber, pageSize: PAGE_SIZE });

  // First-load only — `keepPreviousData` keeps prior rows visible during
  // background refreshes so we don't flash a full skeleton after the
  // initial commit.
  const showSkeleton = isLoading;
  const showPagination =
    !showSkeleton && !isError && data.totalPages > 1;

  const handlePageChange = React.useCallback((next: number) => {
    setPageNumber(next);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
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

      <MyProjectsGrid
        projects={data.items}
        isLoading={showSkeleton}
        error={isError ? error : null}
        onRetry={() => {
          void refetch();
        }}
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
          Refreshing…
        </p>
      ) : null}
    </div>
  );
}
