"use client";

import * as React from "react";

/**
 * Lightweight "toast" placeholder. Until a toast library (e.g. sonner) is
 * installed, fire a screen-reader announcement and log to console. All call
 * sites use the same `projectActionToast(message)` signature so swapping to
 * `toast.success(message)` later is a one-line change.
 */
export function projectActionToast(message: string) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.info("[project-overview action]", message);
    announce(message);
  }
}

let LIVE_REGION: HTMLDivElement | null = null;

function ensureLiveRegion(): HTMLDivElement {
  if (LIVE_REGION) return LIVE_REGION;
  const node = document.createElement("div");
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  node.setAttribute("aria-atomic", "true");
  node.className = "sr-only";
  document.body.appendChild(node);
  LIVE_REGION = node;
  return node;
}

function announce(message: string) {
  try {
    const node = ensureLiveRegion();
    node.textContent = "";
    window.setTimeout(() => {
      node.textContent = message;
    }, 50);
  } catch {
    // DOM unavailable (SSR) — silently no-op.
  }
}