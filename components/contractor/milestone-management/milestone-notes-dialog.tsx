"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2, Send } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  useCreateMilestoneNoteMutation,
  useMilestoneNotes,
} from "@/features/projects/use-milestone-notes";

interface MilestoneNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Construction item id, or null when no milestone is open. */
  milestoneId: number | null;
  /** Milestone name, shown so the thread is clearly about one milestone. */
  milestoneLabel?: string;
}

/**
 * The note thread the shop owner keeps against a milestone, and the provider's
 * side of it.
 *
 * The owner writes these from the mobile app under a "Notes" heading on each
 * milestone. Until now nothing on this side fetched them, so a provider had no
 * way to know a note existed. Same endpoint, same thread — both parties read
 * and post.
 */
export function MilestoneNotesDialog({
  open,
  onOpenChange,
  milestoneId,
  milestoneLabel,
}: MilestoneNotesDialogProps) {
  const t = useTranslations("MilestoneManagement.notes");
  const format = useFormatter();

  const { notes, isLoading, isError } = useMilestoneNotes(
    open ? milestoneId : null,
  );
  const createNote = useCreateMilestoneNoteMutation(milestoneId);

  const [draft, setDraft] = React.useState("");

  // Oldest first, so a thread reads top to bottom like a conversation. The
  // list endpoint returns newest first.
  const ordered = React.useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [notes],
  );

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || milestoneId == null || createNote.isPending) return;
    try {
      await createNote.mutateAsync(body);
      setDraft("");
    } catch {
      // The mutation already reported it; keep the draft so it isn't lost.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDraft("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {milestoneLabel
              ? t("subtitleWithPhase", { phase: milestoneLabel })
              : t("subtitle")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-72 pr-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {t("loading")}
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("error")}
            </p>
          ) : ordered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {ordered.map((note) => (
                <li
                  key={note.id}
                  className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="text-xs font-semibold text-foreground">
                      {note.createdByName ?? t("unknownAuthor")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format.dateTime(new Date(note.createdAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                    {note.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("placeholder")}
            rows={3}
            disabled={milestoneId == null}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSend()}
              disabled={!draft.trim() || createNote.isPending}
              aria-busy={createNote.isPending || undefined}
            >
              {createNote.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {t("send")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
