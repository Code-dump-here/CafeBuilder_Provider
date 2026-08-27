"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pressable } from "@/lib/interactive";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: string;
  done: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Card for a single task inside a phase column. Click anywhere on the
 * card body to toggle done. The kebab menu hosts edit + delete.
 */
export function TaskCard({
  task,
  done,
  onToggle,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const t = useTranslations("MilestoneManagement.task");

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2 rounded-md border border-border/40 bg-card px-2 py-1.5",
        "transition-[border-color,box-shadow] duration-150 ease-out hover:border-foreground/25 hover:shadow-sm",
        done && "bg-muted/40"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? t("markUndone") : t("markDone")}
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          done
            ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "border-border bg-card text-muted-foreground hover:border-foreground/40"
        )}
      >
        {done ? (
          <CheckCircle2 className="size-3" aria-hidden />
        ) : (
          <Circle className="size-2.5" aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={onEdit}
        className={cn(
          pressable,
          // Same rule as the chip: the title is the edit affordance, the
          // circle beside it is the status toggle. Underline says which.
          "min-w-0 flex-1 rounded-sm text-left text-xs leading-snug underline-offset-2 hover:underline",
          done && "text-muted-foreground line-through"
        )}
      >
        {task}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Task actions"
            className="size-6 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100"
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil aria-hidden />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onDelete}
            variant="destructive"
          >
            <Trash2 aria-hidden />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}