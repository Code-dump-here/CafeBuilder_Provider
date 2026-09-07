"use client";

import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProviderPaginationProps {
  pageNumber: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (next: number) => void;
  className?: string;
}

/**
 * Compact first/prev/numbers/next/last pagination. Mirrors the
 * marketplace pagination so owners get the same rhythm between the
 * two browse views.
 *
 * Hides itself entirely when there's only one page — same as the
 * marketplace — so the empty bottom bar doesn't render.
 */
export function ProviderPagination({
  pageNumber,
  totalPages,
  hasPrevious,
  hasNext,
  onPageChange,
  className,
}: ProviderPaginationProps) {
  const t = useTranslations("ProviderDirectory");

  if (totalPages <= 1) return null;

  // Window the visible numbers around the current page (max 5).
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, pageNumber - half);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav
      aria-label={t("pagination.label")}
      className={cn("flex flex-wrap items-center justify-center gap-1", className)}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!hasPrevious}
        onClick={() => onPageChange(1)}
        aria-label={t("pagination.first")}
      >
        <ChevronsLeft aria-hidden className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!hasPrevious}
        onClick={() => onPageChange(pageNumber - 1)}
        aria-label={t("pagination.previous")}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </Button>

      {pages.map((p) => (
        <Button
          key={p}
          type="button"
          variant={p === pageNumber ? "default" : "ghost"}
          size="sm"
          onClick={() => onPageChange(p)}
          aria-current={p === pageNumber ? "page" : undefined}
        >
          {p}
        </Button>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!hasNext}
        onClick={() => onPageChange(pageNumber + 1)}
        aria-label={t("pagination.next")}
      >
        <ChevronRight aria-hidden className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!hasNext}
        onClick={() => onPageChange(totalPages)}
        aria-label={t("pagination.last")}
      >
        <ChevronsRight aria-hidden className="size-4" />
      </Button>
    </nav>
  );
}
