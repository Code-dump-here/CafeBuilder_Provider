"use client";

import { toast } from "react-toastify";

/**
 * Shared user-facing notifications.
 *
 * The mutation hooks in `features/projects/*` used to end with
 * `console.log(message); // TODO: wire to toast`, so every success *and* every
 * failure was invisible. The backend returns good, specific copy — e.g.
 * "Engagement chưa có contract 'confirmed' — ký hợp đồng trước khi tạo hạng
 * mục thi công." — and none of it ever reached a user. These helpers are the
 * one place that decides how a message is surfaced.
 *
 * `ToastContainer` is already mounted in `app/[locale]/providers.tsx`.
 *
 * The screen-reader announcement is kept from the previous
 * `projectActionToast` implementation: react-toastify does not reliably
 * announce to assistive tech, so we keep our own polite live region alongside
 * the visual toast.
 */

export function notifySuccess(message: string) {
  if (!message) return;
  toast.success(message);
  announce(message);
}

export function notifyError(message: string) {
  if (!message) return;
  toast.error(message);
  announce(message);
}

export function notifyInfo(message: string) {
  if (!message) return;
  toast.info(message);
  announce(message);
}

// ─── Screen-reader live region ───────────────────────────────────────────────

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
  if (typeof window === "undefined") return;
  try {
    const node = ensureLiveRegion();
    // Clear first so repeating the same message still re-announces.
    node.textContent = "";
    window.setTimeout(() => {
      node.textContent = message;
    }, 50);
  } catch {
    // DOM unavailable (SSR) — silently no-op.
  }
}
