"use client";

import * as React from "react";

import type {
  Message,
  MessageAuthor,
  MessageAttachment,
  MessageThread,
} from "./messages-types";

import {
  getConversationsApi,
  apiConversationToThread,
} from "@/features/chat";

const T = (iso: string) => new Date(iso);

// Shared author pool (matches use-version-comments for consistency).
const HOA_MY: MessageAuthor = {
  id: 7,
  fullName: "Nguyen Hoa My",
  avatarColor: "#A07B5A",
};
const QUOC_VIET: MessageAuthor = {
  id: 8,
  fullName: "Tran Quoc Viet",
  avatarColor: "#3B5BA9",
};
const OWNER: MessageAuthor = {
  id: 12,
  fullName: "Pham Minh Anh",
  avatarColor: "#5A8F7B",
};
const CONTRACTOR: MessageAuthor = {
  id: 21,
  fullName: "Le Quang Huy",
  avatarColor: "#8E5A3B",
};
const MEP_ENGINEER: MessageAuthor = {
  id: 33,
  fullName: "Vo Thi Lan",
  avatarColor: "#7B5A9B",
};
const ACCOUNT: MessageAuthor = {
  id: 41,
  fullName: "Doan Minh Tam",
  avatarColor: "#5A7B8F",
};

// ── shared attachments ─────────────────────────────────────────────────────

const BRIEF_PDF: MessageAttachment = {
  id: 1,
  kind: "FILE",
  title: "Design Brief v3.pdf",
  subtitle: "PDF · 2.4 MB · updated Jun 28",
  fileType: "PDF",
};
const FLOORPLAN_DWG: MessageAttachment = {
  id: 2,
  kind: "FILE",
  title: "Ground Floor Plan A-101.dwg",
  subtitle: "DWG · 1.1 MB · updated Jul 1",
  fileType: "DWG",
};
const RFI_22: MessageAttachment = {
  id: 3,
  kind: "FILE",
  title: "RFI-022-MEP-Clash.pdf",
  subtitle: "PDF · 612 KB · Jul 3",
  fileType: "PDF",
};
const BOQ_XLS: MessageAttachment = {
  id: 4,
  kind: "FILE",
  title: "Bill-of-Quantities-v1.xlsx",
  subtitle: "XLSX · 89 KB · Jun 22",
  fileType: "XLS",
};
const HERO_PHOTO: MessageAttachment = {
  id: 5,
  kind: "MEDIA",
  title: "Counter render — final",
  subtitle: "PNG · 4.1 MB · Jul 2",
  fileType: "PNG",
};
const SITE_PHOTO: MessageAttachment = {
  id: 6,
  kind: "MEDIA",
  title: "Site photo — east wall",
  subtitle: "JPG · 1.7 MB · Jul 3",
  fileType: "JPG",
};
const MEP_MARKUP: MessageAttachment = {
  id: 7,
  kind: "FILE",
  title: "MEP clash markup",
  subtitle: "PDF · 1.8 MB · Jun 25",
  fileType: "PDF",
};

// ── thread 1: General project room ─────────────────────────────────────────

const GENERAL_THREAD: MessageThread = {
  id: 1,
  projectId: 1042,
  title: "Smart Cafe — General",
  snippet: "Hoa My: Counter revised, please re-review when you have a minute.",
  participants: [HOA_MY, OWNER, CONTRACTOR, MEP_ENGINEER],
  overflowParticipants: 0,
  lastActivityAt: T("2026-07-03T09:45:00Z"),
  unreadCount: 2,
  pinned: true,
  kind: "ROOM",
  channelLabel: "Project",
  isRoom: true,
  messages: [
    {
      id: 10001,
      threadId: 1,
      author: HOA_MY,
      body: "Morning all — pushing an updated Ground Floor Plan to the technical drawings tab. Counter extended 600mm per the owner's review.",
      createdAt: T("2026-05-20T08:10:00Z"),
      attachments: [FLOORPLAN_DWG, BRIEF_PDF],
    },
    {
      id: 10002,
      threadId: 1,
      author: OWNER,
      body: "Thanks Hoa My. Two quick asks: can the banquette be a touch softer (radius) and please add a wheelchair turning circle at the entrance.",
      createdAt: T("2026-05-20T08:32:00Z"),
      attachments: [],
    },
    {
      id: 10003,
      threadId: 1,
      author: HOA_MY,
      body: "Got both. The radius will land on Rev. D tomorrow, and the turning circle is already on the brief — adding a callout to the plan.",
      createdAt: T("2026-05-20T08:35:00Z"),
      attachments: [],
    },
    {
      id: 10004,
      threadId: 1,
      author: CONTRACTOR,
      body: "Heads up: ceiling grid will need to be set before we frame the banquette. Targeting Jul 14 start.",
      createdAt: T("2026-05-21T07:05:00Z"),
      attachments: [SITE_PHOTO],
    },
    {
      id: 10005,
      threadId: 1,
      author: MEP_ENGINEER,
      body: "Two clashes flagged on the bar — see attached. We need HVAC input before publishing.",
      createdAt: T("2026-05-21T09:15:00Z"),
      attachments: [RFI_22, MEP_MARKUP],
    },
    {
      id: 10006,
      threadId: 1,
      author: HOA_MY,
      body: "Counter revised, please re-review when you have a minute. Final dim are 4.6m × 0.55m × 0.42h.",
      createdAt: T("2026-05-21T09:40:00Z"),
      attachments: [HERO_PHOTO],
      pending: true,
    },
  ],
  members: [HOA_MY, OWNER, CONTRACTOR, MEP_ENGINEER, ACCOUNT],
  attachments: [
    BRIEF_PDF,
    FLOORPLAN_DWG,
    RFI_22,
    HERO_PHOTO,
    SITE_PHOTO,
    MEP_MARKUP,
  ],
};

// ── thread 2: Designer ↔ Owner ─────────────────────────────────────────────

const DESIGNER_OWNER: MessageThread = {
  id: 2,
  projectId: 1042,
  title: "Pham Minh Anh",
  snippet: "Hoa My: Banquette radius adjusted — soft call at 1:50, full plan to follow.",
  participants: [HOA_MY, OWNER],
  overflowParticipants: 0,
  lastActivityAt: T("2026-07-02T16:30:00Z"),
  unreadCount: 1,
  pinned: false,
  kind: "DIRECT",
  channelLabel: "Direct",
  isRoom: false,
  messages: [
    {
      id: 20001,
      threadId: 2,
      author: OWNER,
      body: "Are the banquette dimensions finalized for the cushion vendor?",
      createdAt: T("2026-07-02T15:30:00Z"),
      attachments: [],
    },
    {
      id: 20002,
      threadId: 2,
      author: HOA_MY,
      body: "Yes — 4.6m × 0.55m × 0.42h. Sent the spec to the vendor this morning.",
      createdAt: T("2026-07-02T16:05:00Z"),
      attachments: [],
    },
    {
      id: 20003,
      threadId: 2,
      author: HOA_MY,
      body: "Banquette radius adjusted — soft call at 1:50, full plan to follow.",
      createdAt: T("2026-07-02T16:30:00Z"),
      attachments: [],
    },
  ],
  members: [HOA_MY, OWNER],
  attachments: [],
};

// ── thread 3: MEP coordination ─────────────────────────────────────────────

const MEP_THREAD: MessageThread = {
  id: 3,
  projectId: 1042,
  title: "MEP Coordination",
  snippet: "Vo Thi Lan: HVAC input requested before publishing V2.2.",
  participants: [MEP_ENGINEER, HOA_MY, CONTRACTOR],
  overflowParticipants: 1,
  lastActivityAt: T("2026-06-25T10:00:00Z"),
  unreadCount: 0,
  pinned: false,
  kind: "ROOM",
  channelLabel: "MEP",
  isRoom: true,
  messages: [
    {
      id: 30001,
      threadId: 3,
      author: MEP_ENGINEER,
      body: "Two clashes flagged on the bar — see M-101. Need HVAC input before publishing.",
      createdAt: T("2026-06-25T10:00:00Z"),
      attachments: [RFI_22, MEP_MARKUP],
    },
    {
      id: 30002,
      threadId: 3,
      author: HOA_MY,
      body: "Acknowledged. I'll hold V2.2 until HVAC returns the duct revision.",
      createdAt: T("2026-06-25T10:42:00Z"),
      attachments: [],
    },
  ],
  members: [MEP_ENGINEER, HOA_MY, CONTRACTOR, ACCOUNT],
  attachments: [RFI_22, MEP_MARKUP],
};

// ── thread 4: Procurement / contractor ─────────────────────────────────────

const PROCUREMENT: MessageThread = {
  id: 4,
  projectId: 1042,
  title: "Procurement & BOQ",
  snippet: "Doan Minh Tam: BOQ v2 ready for review.",
  participants: [ACCOUNT, HOA_MY],
  overflowParticipants: 0,
  lastActivityAt: T("2026-06-22T11:00:00Z"),
  unreadCount: 0,
  pinned: false,
  kind: "ROOM",
  channelLabel: "Procurement",
  isRoom: true,
  messages: [
    {
      id: 40001,
      threadId: 4,
      author: ACCOUNT,
      body: "BOQ v2 ready for review. Three line items need your sign-off.",
      createdAt: T("2026-06-22T11:00:00Z"),
      attachments: [BOQ_XLS],
    },
  ],
  members: [ACCOUNT, HOA_MY],
  attachments: [BOQ_XLS],
};

// ── thread 5: Site updates ─────────────────────────────────────────────────

const SITE_UPDATES: MessageThread = {
  id: 5,
  projectId: 1042,
  title: "Site Updates",
  snippet: "Le Quang Huy: Site handover note for the east wall attached.",
  participants: [CONTRACTOR, HOA_MY],
  overflowParticipants: 0,
  lastActivityAt: T("2026-07-03T07:30:00Z"),
  unreadCount: 0,
  pinned: false,
  kind: "ROOM",
  channelLabel: "Site",
  isRoom: true,
  messages: [
    {
      id: 50001,
      threadId: 5,
      author: CONTRACTOR,
      body: "Site handover note for the east wall — photos and dimensions attached.",
      createdAt: T("2026-07-03T07:30:00Z"),
      attachments: [SITE_PHOTO],
    },
  ],
  members: [CONTRACTOR, HOA_MY],
  attachments: [SITE_PHOTO],
};

const THREADS: MessageThread[] = [
  GENERAL_THREAD,
  DESIGNER_OWNER,
  MEP_THREAD,
  PROCUREMENT,
  SITE_UPDATES,
];

// ── hook ───────────────────────────────────────────────────────────────────

let THREADS_OVERRIDE: null | ((projectId: string) => MessageThread[]) = null;

/** Override for the whole mock thread list. */
export const __setMessagesOverride = (
  next: (projectId: string) => MessageThread[],
) => {
  THREADS_OVERRIDE = next;
};

/**
 * Fetch real conversations from the API and map to `MessageThread[]`.
 * Returns `null` if the API call fails (let the caller fall back
 * to mock data).
 */
let CHAT_API_OVERRIDE: null | ((projectWorkingId: number) => MessageThread[] | null) = null;

/** Override that bypasses the API entirely — used in dev / demo mode. */
export const __setChatApiOverride = (
  next: (projectWorkingId: number) => MessageThread[] | null,
) => {
  CHAT_API_OVERRIDE = next;
};

/**
 * Returns the threads for a single project, scoped by `projectId`.
 *
 * Resolution order:
 * 1. `THREADS_OVERRIDE` — mock replacement (e.g. unit tests).
 * 2. `CHAT_API_OVERRIDE` — bypass API (e.g. demo / offline).
 * 3. Live API — fetches from `/api/chat/conversations?projectWorkingId=`.
 * 4. Static mock — `THREADS` as the final fallback.
 */
export function useMessageThreads(projectId: string): MessageThread[] {
  return React.useMemo(() => {
    if (!projectId) return [];
    const loader = THREADS_OVERRIDE ?? (() => THREADS);
    return loader(projectId);
  }, [projectId]);
}

/** Returns real MessageThreads from the API. Returns null on error. */
export async function fetchMessageThreadsFromApi(
  projectWorkingId: number,
): Promise<MessageThread[] | null> {
  if (CHAT_API_OVERRIDE) {
    return CHAT_API_OVERRIDE(projectWorkingId);
  }
  try {
    const result = await getConversationsApi(
      { projectWorkingId, pageNumber: 1, pageSize: 100 },
    );
    return result.items.map((conv) =>
      apiConversationToThread(conv, 0), // projectId not in API — use 0
    );
  } catch (err) {
    console.error("[use-message-threads] failed to fetch from API", err);
    return null;
  }
}

/** Pick a single thread by id. Returns `null` if not found. */
export function useMessageThread(
  projectId: string,
  threadId: number | null,
): MessageThread | null {
  const threads = useMessageThreads(projectId);
  return React.useMemo(
    () => (threadId == null ? null : threads.find((t) => t.id === threadId) ?? null),
    [threads, threadId],
  );
}