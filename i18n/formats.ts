import type { Formats } from "next-intl";

/**
 * Named formats for `useFormatter()` / `getFormatter()`.
 *
 * next-intl resolves `format.dateTime(date, "time")` against this table and
 * throws `MISSING_FORMAT` when the name isn't declared — it does not fall back
 * to a default. Nothing declared them before, so every named call failed at
 * render; the notification timestamps were the first to surface it.
 *
 * Declared once and shared, because the server config and the client provider
 * each need their own copy: the provider is given explicit props in the
 * layouts, and passing `locale`/`messages` explicitly means it inherits
 * nothing else from the server config.
 */
export const formats = {
  dateTime: {
    /** Clock time alone — for "just now", where the date is implied. */
    time: {
      hour: "2-digit",
      minute: "2-digit",
    },
    /** Compact date + time, for anything older than a day. */
    short: {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
    /** Date alone, no clock. */
    date: {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  },
} satisfies Formats;
