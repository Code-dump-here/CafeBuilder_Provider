"use client";

import * as React from "react";
import { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

interface TextareaControlProps<T extends FieldValues>
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "ref"> {
  name: Path<T>;
  register: UseFormRegister<T>;
  label?: string;
  error?: string;
  rules?: Parameters<UseFormRegister<T>>[1];
}

/**
 * Form-aware wrapper around the base `<Textarea>` component. Mirrors the
 * shape of `InputControl` so the two read identically in forms.
 *
 * `rows` is the only styling override exposed — pass it to control the
 * visible height. Defaults to 4.
 */
const TextareaControl = <T extends FieldValues>({
  name,
  register,
  label,
  error,
  className,
  rules,
  rows = 4,
  ...rest
}: TextareaControlProps<T>) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs/relaxed font-medium text-foreground">
          {label}
        </label>
      )}
      <Textarea
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        className={cn(
          error && "border-destructive focus-visible:ring-destructive/30",
          className,
        )}
        {...register(name, rules)}
        {...rest}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export { TextareaControl };