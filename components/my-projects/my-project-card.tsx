"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Hammer, Layers, PenLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { interactiveCard } from "@/lib/interactive";
import { cn } from "@/lib/utils";
import type {
  MyProjectContractType,
  MyProjectStatus,
  MyProjectWorking,
} from "@/features/projects/my-projects-types";
import { Stamp, type StampTone } from "@/components/drawing-set/stamp";

import { ProjectFacts, ProjectFactsBlock } from "./project-facts";

// ─── Status / contract-type tone ────────────────────────────────────────────

const PROJECT_STAMP: Record<MyProjectStatus, StampTone> = {
  requested: "info",
  accepted: "success",
  completed: "neutral",
};

const CONTRACT_ICON: Record<
  MyProjectContractType,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  design: PenLine,
  construction: Hammer,
  // Turnkey — neither a pen nor a hammer alone reads right, so use the
  // combined-scope icon.
  both: Layers,
};

interface MyProjectCardProps {
  project: MyProjectWorking;
  className?: string;
}

/**
 * Card for a single "My Projects" row. Click anywhere on the card body
 * to navigate to the underlying project's overview page
 * (`/[locale]/projects/{projectShopOwnerId}`).
 *
 * Surfaces the name, scope and status, then `ProjectFacts` (client, address,
 * brief) and the owner's message, with value / target / progress in a title
 * block along the foot.
 */
export function MyProjectCard({ project, className }: MyProjectCardProps) {
  const t = useTranslations("MyProjects.card");

  const ContractIcon = CONTRACT_ICON[project.contractType];
  const statusLabel = t(`status.${project.status}`);
  const contractTypeLabel = t(`contractType.${project.contractType}`);

  // Built to answer "is this the job I mean?" without opening it: the client,
  // where, what was asked, what it is worth and when it is due. It showed
  // the name, a type pill and a start date, which several jobs can share.
  return (
    <Link
      href={`/projects/${project.projectShopOwnerId}`}
      className={cn(
        interactiveCard,
        "group flex h-full flex-col overflow-hidden rounded-lg border border-border/60 bg-card text-left",
        className,
      )}
      aria-label={t("viewAria", { name: project.projectName })}
    >
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            <ContractIcon className="me-1 size-3" aria-hidden />
            {contractTypeLabel}
          </Badge>
          <Stamp size="sm" tone={PROJECT_STAMP[project.status]} seed={project.projectShopOwnerId + project.status}>
            {statusLabel}
          </Stamp>
        </div>

        <h3 className="sheet-title line-clamp-2 text-xl text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
          {project.projectName || t("unnamedProject")}
        </h3>

        <ProjectFacts project={project} />

        {project.requestMessage ? (
          <p className="line-clamp-2 border-s-2 border-foreground/15 ps-2.5 text-xs italic text-muted-foreground">
            {project.requestMessage}
          </p>
        ) : null}
      </div>

      <ProjectFactsBlock project={project} className="mt-auto" />
    </Link>
  );
}
