import * as React from "react";
import Link from "next/link";
import { useFormatter } from "next-intl";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { resolveAdminIcon } from "@/lib/admin/admin-icons";
import type { AdminActivity } from "@/lib/admin/admin-mock-data";

interface ActivityFeedProps {
  items: AdminActivity[];
}

/**
 * Vertical timeline of recent activity. Each row renders an icon
 * bubble, an actor name + description, and a relative timestamp. Rows
 * with an `href` link through to the referenced resource.
 */
export function ActivityFeed({ items }: ActivityFeedProps) {
  const format = useFormatter();

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => {
        const Icon = resolveAdminIcon(item.icon);
        const Body = (
          <div className="flex min-w-0 items-start gap-3 rounded-md border border-transparent p-1 hover:border-border/60 hover:bg-muted/40">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/70">
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-xs leading-relaxed text-foreground/90">
                <span className="font-medium text-foreground">{item.actorName}</span> {item.text}
              </p>
              <span className="text-[10px] text-muted-foreground">
                {format.relativeTime(new Date(item.at))}
              </span>
            </div>
            {item.href ? (
              <ChevronRight className="mt-1.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            ) : null}
          </div>
        );
        return (
          <li key={item.id} className={cn("group", item.href && "cursor-pointer")}>
            {item.href ? (
              <Link href={item.href as never}>{Body}</Link>
            ) : (
              Body
            )}
          </li>
        );
      })}
    </ol>
  );
}