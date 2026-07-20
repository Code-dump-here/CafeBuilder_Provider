/**
 * Domain model for the project-level messages surface
 * (`/projects/{id}/messages`). Mirrors the threaded / chat
 * pattern from the design mock — top-level threads, each holding an
 * ordered message log.
 *
 * This file is intentionally decoupled from `design-version-types.ts`
 * (which only models *comments* on a single design version). Messages
 * are project-scoped, span roles (designer / owner / contractor) and
 * may have attached files — that's a different surface.
 */

import type { DesignVersionOwner } from "./design-version-types";

/** Reuse the same author shape from the design-version mock. */
export type MessageAuthor = DesignVersionOwner;

export type ThreadKind = "DIRECT" | "ROOM" | "CHANNEL";

export type MessageAttachmentKind = "FILE" | "MEDIA" | "VOICE";

export interface MessageAttachment {
  id: number;
  /** Discriminator for the right-rail filter tabs. */
  kind: MessageAttachmentKind;
  /** Human-friendly display title. */
  title: string;
  /** Optional subtitle — e.g. "PDF · 2.4 MB" or "1:24 voice note". */
  subtitle: string | null;
  /** Optional icon key — controls the doc-icon letter in the file card. */
  fileType: string | null;
}

export interface Message {
  id: number;
  threadId: number;
  author: MessageAuthor;
  body: string;
  createdAt: Date;
  /** Optional attachments surfaced inline + in the right rail. */
  attachments: MessageAttachment[];
  /** Mark a message as in-flight (shows the typing indicator on render). */
  pending?: boolean;
}

export interface MessageThread {
  id: number;
  projectId: number;
  /** Display name shown in the row + header. */
  title: string;
  /** Single-line preview shown under the title in the list. */
  snippet: string;
  /** Distinct avatar set (max 3) for the left rail row. */
  participants: MessageAuthor[];
  /** Number of additional participants beyond the row avatars. */
  overflowParticipants: number;
  /** When the last message landed (relative time on the row, absolute in detail). */
  lastActivityAt: Date;
  /** Unread count — bubble on the left rail row. */
  unreadCount: number;
  /** Owner-only? (Suppress "Leave project" affordances for now.) */
  pinned: boolean;
  /** Drive the All / Direct / Rooms tab filter. */
  kind: ThreadKind;
  /** Optional channel/role label rendered as a chip on the row. */
  channelLabel: string | null;
  /** Sub-rooms pinned on top of the list (skipped in "Direct"). */
  isRoom: boolean;
  /** Detail-page message log, oldest first. */
  messages: Message[];
  /** All members of the room (drives the right rail member stack). */
  members: MessageAuthor[];
  /** All attachments from any message — drives the Files / Media / Voice rails. */
  attachments: MessageAttachment[];
}