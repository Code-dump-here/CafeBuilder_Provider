"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { ContactOwnerCard } from "@/components/project-overview/contact-owner-card";
import { DownloadsCard } from "@/components/project-overview/downloads-card";
import { ProjectHealthCard } from "@/components/project-overview/project-health-card";
import { ProjectHeroBar } from "@/components/project-overview/project-hero-bar";
import { ProjectIdentityCard } from "@/components/project-overview/project-identity-card";
import { QuickFactsCard } from "@/components/project-overview/quick-facts-card";

import { useProjectsOverview } from "@/lib/projects/use-projects-overview";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";
  const project = useProjectsOverview(projectIdParam);

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeroBar project={project} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-4 md:col-span-2">
          <ProjectIdentityCard project={project} />
          <ProjectHealthCard project={project} />
        </div>

        <div className="flex flex-col gap-4 md:col-span-1">
          <QuickFactsCard project={project} />
          <ContactOwnerCard project={project} />
          <DownloadsCard project={project} />
        </div>
      </div>
    </div>
  );
}