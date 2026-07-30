/**
 * Three-column messaging page — wired to the real Chat API.
 *
 *   ┌──────────┬─────────────────────────┬───────────┐
 *   │ Threads  │       Conversation      │  Context  │
 *   │  list    │       (header + body)   │   rail    │
 *   └──────────┴─────────────────────────┴───────────┘
 *
 * Routing:
 *   - URL is `/projects/{id}/messages` (matches the sidebar
 *     "Messages" item — `scope: "project"` resolves to this suffix).
 *   - Active thread is encoded in the `?threadId=` query param so
 *     users can bookmark / share / back-navigate to a specific
 *     conversation.
 *
 * All data flows through `ChatView` which:
 *   - Fetches conversations from `GET /api/chat/conversations`.
 *   - Fetches messages from `GET /api/chat/conversations/{id}`.
 *   - Polls for new messages every 3s via `GET /api/chat/messages`.
 *   - Sends via `POST /api/chat/messages/{id}` (multipart).
 *   - Creates threads via `POST /api/chat/conversations`.
 *   - Deletes via `DELETE /api/chat/conversations/{id}` / messages.
 */

"use client";

import { useParams } from "next/navigation";

import { ChatView } from "@/components/messages/chat-view";

export default function MessagesPage() {
  const params = useParams<{ id: string; locale?: string }>();
  const projectId = params?.id ?? "";

  return <ChatView projectId={projectId} />;
}
