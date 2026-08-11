"use client";

import { notifyInfo, notifySuccess } from "@/lib/notify";

/**
 * Project-overview action feedback.
 *
 * This used to be a placeholder that only wrote to `console.info` plus an
 * `sr-only` live region, so every message it carried was invisible to sighted
 * users — despite `react-toastify` already being installed and mounted in
 * `app/[locale]/providers.tsx`. It now delegates to the shared helpers in
 * `@/lib/notify`, which keep the screen-reader announcement as well.
 */
export function projectActionToast(message: string) {
  notifySuccess(message);
}

/**
 * For "not built yet" / advisory messages, which should not look like a
 * completed action.
 */
export function projectActionInfo(message: string) {
  notifyInfo(message);
}
