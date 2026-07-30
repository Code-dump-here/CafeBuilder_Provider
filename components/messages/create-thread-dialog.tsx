"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (topic: string) => void;
  isPending?: boolean;
}

export function CreateThreadDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: CreateThreadDialogProps) {
  const t = useTranslations("Messages");
  const [topic, setTopic] = React.useState("");

  const handleConfirm = () => {
    onConfirm(topic);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTopic("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createThread.title")}</DialogTitle>
          <DialogDescription>{t("createThread.description")}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Input
            placeholder={t("createThread.topicPlaceholder")}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isPending) {
                handleConfirm();
              }
            }}
            disabled={isPending}
            autoFocus
          />
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {t("createThread.hint")}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("createThread.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? t("createThread.creating") : t("createThread.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
