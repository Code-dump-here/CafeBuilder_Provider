"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle: string;
  onSubmit: (title: string) => void;
}

/**
 * Single-field dialog for renaming a task. Kept distinct from
 * `PhaseEditDialog` so the form stays focused — most tasks are just a
 * title line.
 */
export function TaskEditDialog({
  open,
  onOpenChange,
  initialTitle,
  onSubmit,
}: TaskEditDialogProps) {
  const t = useTranslations("MilestoneManagement.task");
  const tCommon = useTranslations("MilestoneManagement.common");
  const [title, setTitle] = React.useState(initialTitle);

  useResetOnChange(`${open}:${initialTitle}`, () => {
    if (open) setTitle(initialTitle);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("taskLabel")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                {tCommon("cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!title.trim()}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}