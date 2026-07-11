"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CornerDownRight, Pin, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CodeBadge, OwnerAvatar } from "@/components/data-table";
import { cn } from "@/lib/utils";
import { projectActionToast } from "@/components/project-overview/project-action-toast";

import type {
  DrawingComment,
  TechnicalDrawing,
} from "@/lib/projects/technical-drawing-types";

interface CommentsPanelProps {
  drawing: TechnicalDrawing | null;
  comments: DrawingComment[];
  className?: string;
}

/**
 * Threaded comments for the currently selected drawing.
 *
 * Layout mirrors a familiar chat surface — pinned comments at the top,
 * chronological below, replies indented under their parent. The
 * composer is wired but posts go to a `comingSoon` toast until the
 * backend is connected.
 */
export function CommentsPanel({ drawing, comments, className }: CommentsPanelProps) {
  const t = useTranslations("TechnicalDrawings");
  const [draft, setDraft] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<number | null>(null);

  // Reset composer when switching drawings — otherwise old reply state
  // leaks between drawings.
  React.useEffect(() => {
    setDraft("");
    setReplyTo(null);
  }, [drawing?.id]);

  const sorted = React.useMemo(() => {
    const pinned = comments.filter((c) => c.pinned);
    const rest = comments
      .filter((c) => !c.pinned)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return [...pinned, ...rest];
  }, [comments]);

  const topLevel = sorted.filter((c) => c.parentId === null);
  const repliesByParent = React.useMemo(() => {
    const map = new Map<number, DrawingComment[]>();
    sorted
      .filter((c) => c.parentId !== null)
      .forEach((c) => {
        const list = map.get(c.parentId as number) ?? [];
        list.push(c);
        map.set(c.parentId as number, list);
      });
    return map;
  }, [sorted]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim() || !drawing) return;
    projectActionToast(t("comments.comingSoon"));
    setDraft("");
    setReplyTo(null);
  };

  return (
    <section
      aria-labelledby="comments-title"
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-border/60 bg-card",
        className,
      )}
    >
      <header className="flex flex-col gap-1 border-b border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h3 id="comments-title" className="text-xs font-semibold text-foreground">
            {t("comments.title")}
          </h3>
          {drawing ? (
            <span className="text-[10px] text-muted-foreground">
              {t("comments.viewing", { code: drawing.code })}
            </span>
          ) : null}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {t("comments.subtitle", { count: comments.length })}
        </p>
      </header>

      {!drawing ? (
        <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-xs text-muted-foreground">
          {t("tree.empty")}
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

      {drawing ? (
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
              className="min-h-9 w-full resize-none rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none dark:bg-input/30"
            />
            <Button
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={!draft.trim()}
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
  comment: DrawingComment;
  onReply?: (id: number) => void;
}

function CommentBubble({ comment, onReply }: CommentBubbleProps) {
  const t = useTranslations("TechnicalDrawings");
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