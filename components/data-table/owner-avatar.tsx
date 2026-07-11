"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface OwnerAvatarProps {
  name: string;
  color?: string | null;
  size?: "xs" | "sm" | "default";
  className?: string;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const SIZE: Record<NonNullable<OwnerAvatarProps["size"]>, string> = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  default: "size-8 text-xs",
};

/**
 * Tiny owner chip: solid coloured disc with the owner's initials. Falls
 * back to a muted background when no colour is provided.
 */
export function OwnerAvatar({
  name,
  color,
  size = "sm",
  className,
}: OwnerAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        SIZE[size],
        !color && "bg-muted text-muted-foreground",
        className,
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {initialsOf(name)}
    </span>
  );
}

export function initials(name: string): string {
  return initialsOf(name);
}