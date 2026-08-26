"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
}: FilePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (picked) onSelect(picked);
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
