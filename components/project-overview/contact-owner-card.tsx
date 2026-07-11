"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Send } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { projectActionToast } from "./project-action-toast";
import type { ProjectSummary } from "@/lib/projects/use-projects-overview";

interface ContactOwnerCardProps {
  project: ProjectSummary;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ContactOwnerCard({ project }: ContactOwnerCardProps) {
  const t = useTranslations("ProjectsOverview.contactOwner");
  const name = project.owner?.fullName ?? "—";
  const role = t("role");

  return (
    <Card
      size="sm"
      aria-labelledby="project-contact-owner-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="project-contact-owner-title" className="text-base">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <Avatar className="size-12">
            <AvatarFallback
              style={{ backgroundColor: project.ownerAvatar, color: "#fff" }}
              aria-hidden
            >
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {name}
            </p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
        </div>
        <Button
          size="lg"
          className="mt-4 w-full font-semibold"
          onClick={() => projectActionToast(t("messageComingSoon"))}
        >
          <MessageSquare aria-hidden />
          {t("sendMessage")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="mt-2 w-full"
          onClick={() => projectActionToast(t("messageComingSoon"))}
        >
          <Send aria-hidden />
          {t("quickConsult")}
        </Button>
      </CardContent>
    </Card>
  );
}