# Chat API — Tài liệu kỹ thuật cho Frontend

> Phiên bản: **v1**
> Base URL: `https://api.smartcoffeebuilder.vn/api`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Authentication](#2-authentication)
3. [Error Codes](#3-error-codes)
4. [Polling Strategy (Real-time)](#4-polling-strategy-real-time)
5. [Conversation APIs — `api/chat/conversations`](#5-conversation-apis--apichatconversations)
6. [Message APIs — `api/chat/messages`](#6-message-apis--apichatmessages)

---

## 1. Tổng quan

Tính năng chat hoạt động theo mô hình **thread** (kiểu Discord), nằm trong một **engagement** (`ProjectWorking`).

```
ProjectWorking (engagement)
  └── Conversation (thread)          ← Nhiều thread
        └── Message                  ← Nhiều message
              └── MessageAttachment  ← Nhiều file đính kèm
```

**Quyền truy cập:**
- Chỉ **owner** và **provider** của engagement mới được nhìn thấy/gửi message trong mọi thread thuộc engagement đó.
- **Xoá thread**: chỉ người tạo thread (`CreatedBy`).
- **Xoá message**: chỉ người gửi (`SenderId`).

**Lưu ý:** Không có bảng read-receipts ở v1 → `UnreadCount` luôn trả `0`.

---

## 2. Authentication

Mọi endpoint đều yêu cầu **JWT Bearer token** trong header:

```
Authorization: Bearer <jwt_token>
```

Token được decode tự động bởi middleware ASP.NET Core. AccountId của người dùng truyền vào service qua `User.GetAccountId()` — không cần gửi thêm trong body/query.

---

## 3. Error Codes

| HTTP Status | Exception | Khi nào |
|---|---|---|
| `400` | `ArgumentException` | Validation lỗi (thiếu body + file, Topic quá dài…) |
| `401` | — | Token không hợp lệ hoặc hết hạn |
| `403` | `UnauthorizedAccessException` | Account không thuộc engagement |
| `404` | `KeyNotFoundException` | Conversation / Message / Engagement không tồn tại |
| `413` | — | Request body vượt giới hạn Kestrel (mặc định ~51 MB) |

---

## 4. Polling Strategy (Real-time)

Backend **không dùng SignalR** — FE implement polling:

```
FE                                           BE
 │                                              │
 │  1. GET /api/chat/conversations?projectWorkingId=X  │
 │  ───────────────────────────────────────────► │
 │  ◄──────────────────────────────────────────── │
 │       List<ConversationSummary>                │
 │                                              │
 │  2. Chọn 1 conversation → lấy conversationId  │
 │                                              │
 │  3. GET /api/chat/messages?conversationId=X   │
 │     &sinceId=<last_message_id>                │
 │  ───────────────────────────────────────────► │
 │  ◄──────────────────────────────────────────── │
 │       List<MessageResponse>  (tin mới)        │
 │                                              │
 │  4. setTimeout(() => bước 3, 3000)  ← polling │
 │                                              │
 │  5. POST /api/chat/messages/X   (gửi tin)     │
 │  ───────────────────────────────────────────► │
 │  ◄──────────────────────────────────────────── │
 │       MessageResponse (tin vừa gửi)            │
```

**Recommendations:**

| Tình huống | Polling target | Khoảng |
|---|---|---|
| Mở app / focus tab | `GET ...messages` với `sinceId` mới nhất | 3–5s |
| Không có `sinceId` (lần đầu / reconnect) | `GET ...messages` không truyền `sinceId` | 3–5s |
| Background tab / minimize | Ngừng polling (hoặc tăng lên 30s) | — |
| Gửi message thành công | Gọi lại polling ngay | — |

**Fallback khi không có `sinceId`:**

Nếu FE không lưu được `lastMessageId` (ví dụ mất trạng thái), dùng `sinceSentAt` để tránh duplicate:

```
GET /api/chat/messages?conversationId=123&sinceSentAt=2026-07-28T09:00:00Z
```

---

## 5. Conversation APIs — `api/chat/conversations`

### 5.1 Danh sách thread trong 1 engagement

```
GET /api/chat/conversations
```

**Query parameters:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `projectWorkingId` | `long` (required) | — | Engagement id |
| `pageNumber` | `int` | `1` | Trang (1-based) |
| `pageSize` | `int` | `20` | Số thread/trang (max: 100) |

**Response `200 OK`**

```json5
{
  "items": [
    {
      "id": 7,
      "projectWorkingId": 42,
      "topic": "Bản vẽ thiết kế sơ bộ",
      "createdBy": {
        "accountId": 15,
        "displayName": "Nguyễn Văn A",
        "role": "owner",
        "avatarUrl": null
      },
      "createdAt": "2026-07-28T08:00:00Z",
      "updatedAt": "2026-07-28T09:15:00Z",
      "lastMessage": {
        "id": 203,
        "conversationId": 7,
        "senderId": 16,
        "sender": {
          "accountId": 16,
          "displayName": "Trần Đại Bình",
          "role": "provider",
          "avatarUrl": null
        },
        "body": "Mình gửi bản render nhé",
        "attachments": [
          {
            "id": 88,
            "messageId": 203,
            "url": "provider/16/abc123.png",
            "viewUrl": "https://storage.googleapis.com/bucket/provider/16/abc123.png",
            "fileName": "render-01.png",
            "contentType": "image/png",
            "sizeBytes": 2048576,
            "createdAt": "2026-07-28T09:15:00Z"
          }
        ],
        "sentAt": "2026-07-28T09:15:00Z"
      },
      "unreadCount": 0
    }
  ],
  "pageNumber": 1,
  "pageSize": 20,
  "totalCount": 3,
  "totalPages": 1
}
```

**Error `403`** — Account không thuộc engagement.

---

### 5.2 Chi tiết 1 thread kèm messages phân trang

```
GET /api/chat/conversations/{id}
```

**Path parameters:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | `long` | Conversation id |

**Query parameters:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `pageNumber` | `int` | `1` | Trang message (1-based) |
| `pageSize` | `int` | `50` | Số message/trang (max: 100) |

**Response `200 OK`**

```json5
{
  "id": 7,
  "projectWorkingId": 42,
  "topic": "Bản vẽ thiết kế sơ bộ",
  "createdBy": {
    "accountId": 15,
    "displayName": "Nguyễn Văn A",
    "role": "owner",
    "avatarUrl": null
  },
  "createdAt": "2026-07-28T08:00:00Z",
  "updatedAt": "2026-07-28T09:15:00Z",
  "messages": [
    {
      "id": 200,
      "conversationId": 7,
      "senderId": 15,
      "sender": {
        "accountId": 15,
        "displayName": "Nguyễn Văn A",
        "role": "owner",
        "avatarUrl": null
      },
      "body": "Chào bạn, mình cần bản vẽ layout quán",
      "attachments": [],
      "sentAt": "2026-07-28T08:00:00Z"
    },
    {
      "id": 201,
      "conversationId": 7,
      "senderId": 16,
      "sender": {
        "accountId": 16,
        "displayName": "Trần Đại Bình",
        "role": "provider",
        "avatarUrl": null
      },
      "body": "Được rồi, để mình chuẩn bị nhé",
      "attachments": [],
      "sentAt": "2026-07-28T08:05:00Z"
    },
    {
      "id": 202,
      "conversationId": 7,
      "senderId": 16,
      "sender": { "...": "..." },
      "body": null,
      "attachments": [
        {
          "id": 87,
          "messageId": 202,
          "url": "provider/16/ban-ve-layout.pdf",
          "viewUrl": "https://storage.googleapis.com/bucket/provider/16/ban-ve-layout.pdf",
          "fileName": "ban-ve-layout.pdf",
          "contentType": "application/pdf",
          "sizeBytes": 5120000,
          "createdAt": "2026-07-28T08:10:00Z"
        }
      ],
      "sentAt": "2026-07-28T08:10:00Z"
    }
  ]
}
```

Messages được sắp xếp `SentAt ASC, Id ASC` (cũ nhất → mới nhất). Để hiển thị mới nhất ở dưới, FE reverse array.

**Error `404`** — Conversation không tồn tại.

---

### 5.3 Tạo thread mới

```
POST /api/chat/conversations
Content-Type: application/json
```

**Request body**

```json5
{
  "projectWorkingId": 42,   // required, long
  "topic": "Bản vẽ thiết kế sơ bộ"  // optional, max 200 chars
}
```

> **Lưu ý:** Nếu `topic` bị bỏ trống hoặc chỉ là khoảng trắng, service tự sinh tên `"Thread #N"` (N = số thread hiện có trong engagement + 1).

**Response `201 Created`**

Header `Location: /api/chat/conversations/8`

```json5
{
  "id": 8,
  "projectWorkingId": 42,
  "topic": "Bản vẽ thiết kế sơ bộ",
  "createdBy": {
    "accountId": 15,
    "displayName": "Nguyễn Văn A",
    "role": "owner",
    "avatarUrl": null
  },
  "createdAt": "2026-07-28T10:00:00Z",
  "updatedAt": "2026-07-28T10:00:00Z",
  "messages": [],
  "unreadCount": 0
}
```

**Error `400`** — Validation lỗi (missing `projectWorkingId`).
**Error `403`** — Account không thuộc engagement.
**Error `404`** — Engagement không tồn tại.

---

### 5.4 Đổi tên thread

```
PATCH /api/chat/conversations/{id}
Content-Type: application/json
```

**Request body**

```json5
{
  "topic": "Bản vẽ thiết kế final"   // optional, max 200 chars
}
```

> Gửi `{}` rỗng hoặc `null` → topic giữ nguyên.

**Response `200 OK`**

```json5
{
  "id": 7,
  "projectWorkingId": 42,
  "topic": "Bản vẽ thiết kế final",
  "createdBy": { "...": "..." },
  "createdAt": "2026-07-28T08:00:00Z",
  "updatedAt": "2026-07-28T10:05:00Z"
}
```

**Error `404`** — Conversation không tồn tại.

---

### 5.5 Xoá thread

```
DELETE /api/chat/conversations/{id}
```

> Chỉ **người tạo** thread mới được xoá. Cascade xoá toàn bộ messages + attachments (cả DB lẫn file trên bucket).

**Response `204 No Content`**

**Error `403`** — Không phải người tạo.
**Error `404`** — Conversation không tồn tại.

---

## 6. Message APIs — `api/chat/messages`

### 6.1 Polling tin nhắn mới

```
GET /api/chat/messages
```

**Query parameters:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `conversationId` | `long` (required) | — | Thread id |
| `sinceId` | `long?` | `null` | Lấy message có `Id > sinceId` (ưu tiên, nhanh) |
| `sinceSentAt` | `DateTime?` | `null` | Fallback khi không có `sinceId` |
| `limit` | `int` | `100` | Số message tối đa trả về (max: 500) |

> **Priority:** `sinceId` > `sinceSentAt` > không truyền gì (trả tất cả, limit mặc định 100).

**Response `200 OK`**

```json5
[
  {
    "id": 204,
    "conversationId": 7,
    "senderId": 15,
    "sender": {
      "accountId": 15,
      "displayName": "Nguyễn Văn A",
      "role": "owner",
      "avatarUrl": null
    },
    "body": "OK mình đã nhận được bản vẽ",
    "attachments": [],
    "sentAt": "2026-07-28T09:30:00Z"
  }
]
```

Trả về `List<MessageResponse>` — array rỗng `[]` nếu không có tin mới.

**Error `404`** — Conversation không tồn tại.

---

### 6.2 Gửi tin nhắn (text +/ hoặc file)

```
POST /api/chat/messages/{conversationId}
Content-Type: multipart/form-data
```

**Path parameters:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `conversationId` | `long` | Thread id |

**Form data (multipart):**

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `body` | `string` | Không* | Nội dung text. Null/khoảng trắng OK nếu có file. |
| `files` | `IFormFile[]` | Không* | Một hoặc nhiều file. Bỏ trống OK nếu có body. |

> \* Ít nhất một trong hai phải có giá trị. Gửi cả hai cùng lúc hoàn toàn hợp lệ.

**Giới hạn kích thước:**
- Max request body: **`~51 MB`** (50 MB + 1 MB headroom multipart).
- Không giới hạn số file mỗi request.

**Ví dụ: Gửi text + 2 file**

```
POST /api/chat/messages/7
Content-Type: multipart/form-data; boundary=----FormBoundary7MA4YWxkTrZu0gW

------FormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="body"

Mình gửi bản render kèm bản vẽ PDF nhé
------FormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="files"; filename="render-01.png"
Content-Type: image/png

<binary data>
------FormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="files"; filename="ban-ve.pdf"
Content-Type: application/pdf

<binary data>
------FormBoundary7MA4YWxkTrZu0gW--
```

**Response `200 OK`**

```json5
{
  "id": 205,
  "conversationId": 7,
  "senderId": 16,
  "sender": {
    "accountId": 16,
    "displayName": "Trần Đại Bình",
    "role": "provider",
    "avatarUrl": null
  },
  "body": "Mình gửi bản render kèm bản vẽ PDF nhé",
  "attachments": [
    {
      "id": 89,
      "messageId": 205,
      "url": "provider/16/render-01-abc.png",
      "viewUrl": "https://storage.googleapis.com/bucket/provider/16/render-01-abc.png",
      "fileName": "render-01.png",
      "contentType": "image/png",
      "sizeBytes": 2048576,
      "createdAt": "2026-07-28T09:40:00Z"
    },
    {
      "id": 90,
      "messageId": 205,
      "url": "provider/16/ban-ve-xyz.pdf",
      "viewUrl": "https://storage.googleapis.com/bucket/provider/16/ban-ve-xyz.pdf",
      "fileName": "ban-ve.pdf",
      "contentType": "application/pdf",
      "sizeBytes": 5120000,
      "createdAt": "2026-07-28T09:40:00Z"
    }
  ],
  "sentAt": "2026-07-28T09:40:00Z"
}
```

**Error `400`** — Cả `body` và `files` đều rỗng.
**Error `413`** — Tổng kích thước request vượt giới hạn server.

---

### 6.3 Xoá tin nhắn

```
DELETE /api/chat/messages/{id}
```

> Chỉ **người gửi** message mới được xoá. Cascade xoá file đính kèm (cả DB lẫn file trên bucket).

**Response `204 No Content`**

**Error `403`** — Không phải người gửi.
**Error `404`** — Message không tồn tại.

---

## Phụ lục A: Data Models

### SenderInfo

```typescript
interface SenderInfo {
  accountId: number;        // ID tài khoản
  displayName: string;      // FullName (owner) hoặc DisplayName (provider)
  role: "owner" | "provider" | "admin";
  avatarUrl: string | null; // Luôn null ở v1
}
```

### MessageResponse

```typescript
interface MessageResponse {
  id: number;
  conversationId: number;
  senderId: number;
  sender: SenderInfo;
  body: string | null;      // null = tin chỉ chứa file
  attachments: MessageAttachmentResponse[];
  sentAt: string;           // ISO 8601 UTC, ví dụ "2026-07-28T09:40:00Z"
}
```

### MessageAttachmentResponse

```typescript
interface MessageAttachmentResponse {
  id: number;
  messageId: number;
  url: string;              // ObjectName trên GCS (nội bộ)
  viewUrl: string;          // ✅ URL public — FE DÙNG CÁI NÀY
  fileName: string;         // Tên file gốc
  contentType: string;      // MIME type
  sizeBytes: number;         // Kích thước file
  createdAt: string;        // ISO 8601 UTC
}
```

### ConversationSummary

```typescript
interface ConversationSummary {
  id: number;
  projectWorkingId: number;
  topic: string | null;     // Có thể do service sinh "Thread #N"
  createdBy: SenderInfo;
  createdAt: string;
  updatedAt: string;        // Sort "hoạt động gần nhất"
  lastMessage: MessageResponse | null;
  unreadCount: number;      // Luôn 0 ở v1
}
```

### ConversationDetailResponse

```typescript
interface ConversationDetailResponse {
  id: number;
  projectWorkingId: number;
  topic: string | null;
  createdBy: SenderInfo;
  createdAt: string;
  updatedAt: string;
  messages: MessageResponse[]; // SentAt ASC — cũ→mới
}
```

---

## Phụ lục B: Mẫu code FE (TypeScript)

### Polling hook

```typescript
// useChatPolling.ts
import { useEffect, useRef, useCallback } from "react";

const POLL_INTERVAL_MS = 3000;

export function useChatPolling(conversationId: number, onMessages: (msgs: MessageResponse[]) => void) {
  const lastIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const params = lastIdRef.current != null
        ? `conversationId=${conversationId}&sinceId=${lastIdRef.current}`
        : `conversationId=${conversationId}`;

      const res = await fetch(`/api/chat/messages?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) return;

      const messages: MessageResponse[] = await res.json();

      if (messages.length > 0) {
        lastIdRef.current = messages[messages.length - 1].id;
        onMessages(messages);
      }
    } catch (err) {
      console.error("Poll error", err);
    } finally {
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    }
  }, [conversationId, onMessages]);

  useEffect(() => {
    lastIdRef.current = null;
    poll();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [poll]);
}
```

### Gửi message (text + files)

```typescript
// chatApi.ts
export async function sendMessage(
  conversationId: number,
  body: string,
  files: File[]
): Promise<MessageResponse> {
  const form = new FormData();
  if (body.trim()) form.append("body", body);
  files.forEach(f => form.append("files", f));

  const res = await fetch(`/api/chat/messages/${conversationId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Gửi tin thất bại");
  }

  return res.json();
}
```

### Gửi chỉ file (không text)

```typescript
// Gửi ảnh chỉ có file, không có body
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
if (fileInput.files?.length) {
  const files = Array.from(fileInput.files);
  const msg = await sendMessage(conversationId, "", files);
  console.log("Tin đã gửi:", msg);
}
```

### Tạo thread mới

```typescript
const res = await fetch("/api/chat/conversations", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ projectWorkingId: 42, topic: "Bản vẽ final" }),
});
const conv: ConversationDetailResponse = await res.json();
console.log("Thread mới:", conv.id);
```

---

## Phụ lục C: MIME Types thường dùng

| Loại | Content-Type |
|---|---|
| Ảnh PNG | `image/png` |
| Ảnh JPEG | `image/jpeg` |
| Ảnh WebP | `image/webp` |
| GIF | `image/gif` |
| PDF | `application/pdf` |
| ZIP | `application/zip` |
| Word | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

> Server **không filter theo MIME type** — FE nên validate extension + MIME type ở client để UX tốt hơn.

---

*Document generated from backend code — `SmartCoffeeBuilder.API` + `SmartCoffeeBuilder.Service` + `SmartCoffeeBuilder.Repository`.*
