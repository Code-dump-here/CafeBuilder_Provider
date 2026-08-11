"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CornerDownRight, MessageSquare, Pin, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CodeBadge, OwnerAvatar } from "@/components/data-table";
import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import { cn } from "@/lib/utils";

import type {
  DesignVersion,
  DesignVersionComment,
} from "@/features/projects/design-version-types";

interface VersionCommentsPanelProps {
  version: DesignVersion | null;
  comments: DesignVersionComment[];
  /**
   * Posts a comment. When omitted the composer keeps its old placeholder
   * behaviour, which the technical-drawings surface still relies on because
   * it has no backend behind it yet.
   */
  onAddComment?: (body: string) => Promise<void> | void;
}

/**
 * Threaded comments panel for the right rail of the design-management
 * page. Mirrors the comments surface used on the technical-drawings
 * detail page — same composer pattern, same pinned-on-top ordering,
 * same reply indentation. Only the data shape differs (`DesignVersion`
 * here vs `TechnicalDrawing` there).
 */
export function VersionCommentsPanel({
  version,
  comments,
  onAddComment,
}: VersionCommentsPanelProps) {
  const t = useTranslations("DesignManagement");
  const [draft, setDraft] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Reset composer state when switching versions — otherwise the
  // pending draft and reply target leak between versions.
  useResetOnChange(version?.id, () => {
    setDraft("");
    setReplyTo(null);
  });

  const sorted = React.useMemo(() => {
    const pinned = comments.filter((c) => c.pinned);
    const rest = comments
      .filter((c) => !c.pinned)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return [...pinned, ...rest];
  }, [comments]);

  const topLevel = sorted.filter((c) => c.parentId === null);
  const repliesByParent = React.useMemo(() => {
    const map = new Map<number, DesignVersionComment[]>();
    sorted
      .filter((c) => c.parentId !== null)
      .forEach((c) => {
        const list = map.get(c.parentId as number) ?? [];
        list.push(c);
        map.set(c.parentId as number, list);
      });
    return map;
  }, [sorted]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !version || submitting) return;

    if (!onAddComment) {
      projectActionToast(t("comments.comingSoon"));
      setDraft("");
      setReplyTo(null);
      return;
    }

    setSubmitting(true);
    try {
      await onAddComment(body);
      // Only clear on success — a failed post shouldn't silently discard
      // what the user typed.
      setDraft("");
      setReplyTo(null);
    } catch {
      // The mutation surfaces its own error toast; keep the draft intact.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="version-comments-title"
      className="flex h-full flex-col overflow-hidden rounded-lg border border-border/60 bg-card"
    >
      <header className="flex flex-col gap-1 border-b border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h3
            id="version-comments-title"
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
          >
            <MessageSquare aria-hidden className="size-3.5 text-muted-foreground" />
            {t("comments.title")}
          </h3>
          {version ? (
            <CodeBadge code={version.code} variant="muted" />
          ) : null}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {t("comments.subtitle", { count: comments.length })}
        </p>
      </header>

      {!version ? (
        <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-xs text-muted-foreground">
          {t("comments.selectVersion")}
        </p>
      ) : comments.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-xs text-muted-foreground">
          {t("comments.empty")}
        </p>
      ) : (
        <ul
          role="list"
          className="flex flex-1 flex-col gap-3 overflow-y-auto p-3"
        >
          {topLevel.map((c) => (
            <li key={c.id} className="flex flex-col gap-2">
              <CommentBubble comment={c} onReply={setReplyTo} />
              {repliesByParent.get(c.id)?.length ? (
                <ul role="list" className="ml-6 flex flex-col gap-2">
                  {repliesByParent.get(c.id)!.map((reply) => (
                    <li key={reply.id}>
                      <CommentBubble comment={reply} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {version ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 border-t border-border/60 bg-card p-3"
        >
          {replyTo !== null ? (
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CornerDownRight className="size-3" aria-hidden />
                {t("comments.reply")}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                ×
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("comments.placeholder")}
              rows={2}
              disabled={submitting}
              className="min-h-9 w-full resize-none rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-60 dark:bg-input/30"
            />
            <Button
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={!draft.trim() || submitting}
              aria-label={t("comments.post")}
            >
              <Send aria-hidden />
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bubble

interface CommentBubbleProps {
  comment: DesignVersionComment;
  onReply?: (id: number) => void;
}

function CommentBubble({ comment, onReply }: CommentBubbleProps) {
  const t = useTranslations("DesignManagement");
  const format = useFormatter();

  return (
    <article
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border/60 bg-background p-2.5",
        comment.pinned && "border-primary/40 bg-primary/5",
      )}
    >
      <OwnerAvatar
        name={comment.author.fullName}
        color={comment.author.avatarColor}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="font-semibold text-foreground">
            {comment.author.fullName}
          </span>
          <span className="text-muted-foreground">
            {format.dateTime(comment.createdAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          {comment.pinned ? (
            <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              <Pin className="size-2.5" aria-hidden />
              {t("comments.pinned")}
            </span>
          ) : null}
          {onReply && comment.parentId === null ? (
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <CornerDownRight className="size-3" aria-hidden />
              {t("comments.reply")}
            </button>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-foreground/90 wrap-break-word">
          {comment.body}
        </p>
      </div>
    </article>
  );
}