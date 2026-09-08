"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validateUploadFile } from "@/lib/upload-constraints";

export interface FilePickerProps {
  /** Ties an outer <label htmlFor> to the real input. */
  id: string;
  /** `accept` attribute, e.g. `".pdf,.doc,.docx"`. */
  accept?: string;
  /** The current pick, or null. Owned by the caller. */
  file: File | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  /** Hides the Remove button — e.g. while an upload is in flight. */
  hideClear?: boolean;
  labels: {
    choose: string;
    empty: string;
    remove: string;
  };
  className?: string;
  /**
   * Validate against the image-only endpoint (POST /api/files/images) rather
   * than the general one. Must match whichever endpoint the caller uploads to.
   */
  imageOnly?: boolean;
  /**
   * Called instead of `onSelect` when the pick fails the server's own rules,
   * with a ready translated message. Without a handler the file is still
   * rejected — the caller just says nothing about it.
   */
  onReject?: (message: string) => void;
}

/**
 * A file input that looks like the rest of the app.
 *
 * A bare `<input type="file">` renders the browser's own grey
 * "Choose File / No file chosen" widget, which ignores the design system
 * entirely and sits badly next to real buttons. The input is still there —
 * hidden, so the picker, `accept` filtering and label association all behave
 * normally — but the visible control is a Button.
 *
 * The caller owns the selected file, because every screen using this does
 * something different on selection (upload immediately, wait for submit, …).
 */
export function FilePicker({
  id,
  accept,
  file,
  onSelect,
  onClear,
  disabled,
  hideClear,
  labels,
  className,
  imageOnly = false,
  onReject,
}: FilePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const tUpload = useTranslations("Upload");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;

    // `accept` is a hint, not a gate: the OS dialog lets the user switch to
    // "All files", and a drag-and-drop never consults it at all. Without this
    // the first real check happened on the server, after the whole file had
    // been uploaded.
    const check = validateUploadFile(picked, { imageOnly });
    if (!check.ok) {
      onReject?.(
        check.reason === "too-large"
          ? tUpload("tooLarge", { sizeMb: check.sizeMb, limitMb: check.limitMb })
          : check.reason === "bad-type"
            ? tUpload("badType", { extension: check.extension, allowed: check.allowed })
            : tUpload("empty"),
      );
      // Clear it, or re-picking the same corrected file fires no change event.
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    onSelect(picked);
  };

  const handleClear = () => {
    // Reset the input's own value too. It keeps the last filename otherwise,
    // and re-picking that same file fires no `change` event at all — which
    // looks exactly like the picker silently doing nothing.
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="gap-2"
      >
        <Upload className="size-4" aria-hidden />
        {labels.choose}
      </Button>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          file ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {file ? file.name : labels.empty}
      </span>
      {file && !hideClear && (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          {labels.remove}
        </Button>
      )}
    </div>
  );
}
