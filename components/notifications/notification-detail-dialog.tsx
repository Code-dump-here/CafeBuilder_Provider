"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deriveNotificationHref,
  type NotificationItem,
} from "@/features/notifications/api";

// ─── Type label ─────────────────────────────────────────────────────────────

/**
 * Turn `engagement_completion_requested` into something readable.
 *
 * `Notifications.types` carries proper copy for the handful of lifecycle types
 * the design covers; everything else falls back to the de-underscored tag so a
 * newly-added backend type shows as "Application received" rather than a blank
 * chip nobody notices is missing.
 */
function useTypeLabel(): (type: string) => string {
  const t = useTranslations("Notifications.types");
  return React.useCallback(
    (type: string) => {
      if (!type) return "";
      if (t.has(type)) return t(type);
      const words = type.replace(/_/g, " ").trim();
      return words ? words[0].toUpperCase() + words.slice(1) : "";
    },
    [t],
  );
}

// ─── Detail dialog ──────────────────────────────────────────────────────────

export interface NotificationDetailDialogProps {
  /** The notification to show, or null when the dialog is closed. */
  item: NotificationItem | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * The full text of one notification.
 *
 * List rows truncate the title and clamp the body to two lines to keep the
 * inbox scannable, which left long notifications unreadable anywhere in the
 * app. This is where the whole thing is shown.
 */
export function NotificationDetailDialog({
  item,
  onOpenChange,
}: NotificationDetailDialogProps) {
  const t = useTranslations("Notifications.detail");
  const format = useFormatter();
  const typeLabel = useTypeLabel();

  const href = item ? deriveNotificationHref(item) : "/notifications";
  // `deriveNotificationHref` falls back to the inbox when there is nothing to
  // deep-link to — offering "open" for a link back to the page you're already
  // on is just a dead end.
  const hasTarget = href !== "/notifications";

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {item ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pb-1">
                {item.type ? (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {typeLabel(item.type)}
                  </span>
                ) : null}
                {!item.isRead ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    {t("unread")}
                  </span>
                ) : null}
              </div>
              {/* Wraps rather than truncating — the whole point of this dialog. */}
              <DialogTitle className="text-left text-base leading-snug">
                {item.title}
              </DialogTitle>
              <DialogDescription className="text-left text-xs">
                {format.dateTime(new Date(item.createdAt), "long")}
              </DialogDescription>
            </DialogHeader>

            {/* `whitespace-pre-wrap` because the backend composes multi-line
                bodies; collapsing them would run separate facts together. */}
            <div className="max-h-[50vh] overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {item.message || t("noBody")}
              </p>
            </div>

            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t("close")}
              </Button>
              {hasTarget ? (
                <Button asChild type="button" size="sm" className="gap-1.5">
                  <Link href={href}>
                    <ExternalLink aria-hidden className="size-3.5" />
                    {t("open")}
                  </Link>
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
