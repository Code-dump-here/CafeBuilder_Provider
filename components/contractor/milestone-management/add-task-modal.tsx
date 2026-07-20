"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus, Upload, X } from "lucide-react";

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

interface CrewOption {
  id: string;
  name: string;
  initials: string;
}

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseLabel?: string;
  crewOptions: CrewOption[];
  onSubmit: (input: {
    title: string;
    description: string;
    assigneeId: string | null;
    dueDate: string | null;
    images: string[];
  }) => void;
}

/**
 * Modal for creating a brand-new task with full metadata — title,
 * description, assignee, due date, and any number of image attachments.
 *
 * Image upload is mocked (we keep the URL via FileReader). When the
 * backend lands this becomes a presigned upload + asset reference.
 */
export function AddTaskModal({
  open,
  onOpenChange,
  phaseLabel,
  crewOptions,
  onSubmit,
}: AddTaskModalProps) {
  const t = useTranslations("MilestoneManagement.task.addTask");
  const tFields = useTranslations("MilestoneManagement.task.detail.fields");
  const tCommon = useTranslations("MilestoneManagement.common");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState<string>("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [images, setImages] = React.useState<string[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setDueDate("");
      setImages([]);
    }
  }, [open]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({
      title: trimmed,
      description: description.trim(),
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      images,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{phaseLabel ?? t("subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label={tFields("title")}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </Field>

          <Field label={tFields("description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to happen here?"
              rows={3}
              className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label={tFields("assignee")}>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="border-input bg-transparent flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none"
              >
                <option value="">Unassigned</option>
                {crewOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label={tFields("dueDate")}>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          </div>

          <Field label={tFields("images")}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <Upload aria-hidden />
                {t("uploadCta")}
              </Button>
              {images.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((src, idx) => (
                    <div key={idx} className="group relative aspect-square overflow-hidden rounded-md border border-border/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        aria-label="Remove"
                        className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Field>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">{tCommon("cancel")}</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!title.trim()}>
              <Plus aria-hidden />
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}