# Construction Task API Documentation

## Overview

**Construction Task** là module quản lý các công việc con (sub-task) thuộc một hạng mục thi công (`ConstructionItem`). Mỗi công việc có thể có trạng thái, ngày dự kiến, ngày thực tế hoàn thành, hình ảnh minh chứng và ghi chú lý do (nếu chậm tiến độ).

**Base URL:** `/api/construction-tasks`  
**Authentication:** Tất cả các endpoint đều yêu cầu JWT token (`[Authorize]`)

---

## Data Models

### Entity: `ConstructionTask`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `Id` | long | ✓ | Primary key, auto-generated |
| `ConstructionItemId` | long | ✓ | FK đến `ConstructionItem` (hạng mục cha) |
| `Name` | string | ✓ | Tên công việc |
| `Description` | string? | | Mô tả chi tiết |
| `ImageUrl` | string? | | ObjectName của file ảnh trên storage bucket |
| `EstimateAt` | DateOnly? | | Ngày dự kiến hoàn thành |
| `ActualAt` | DateOnly? | | Ngày thực tế hoàn thành (auto-set khi status = completed) |
| `Reason` | string? | | Lý do chậm tiến độ / ghi chú |
| `Status` | ItemStatus | ✓ | Trạng thái (default: `pending`) |
| `CreatedBy` | long? | | FK đến `Account` (người tạo), nullable |
| `CreatedAt` | DateTime | ✓ | Thời điểm tạo (default: now) |
| `UpdatedAt` | DateTime | ✓ | Thời điểm cập nhật cuối (default: now) |

**Relationships:**
- Nhiều `ConstructionTask` thuộc một `ConstructionItem` (Many-to-One)
- Một `ConstructionTask` có thể do một `Account` tạo (Many-to-One, optional)

### Enum: `ItemStatus`

```csharp
public enum ItemStatus { pending, in_progress, completed }
```

### Response DTO: `ConstructionTaskResponse`

| Field | Type | Description |
|-------|------|-------------|
| `Id` | long | |
| `ConstructionItemId` | long | |
| `Name` | string | |
| `Description` | string? | |
| `ImageUrl` | string? | ObjectName (internal) |
| `ImageViewUrl` | string? | Public absolute URL, dùng trực tiếp cho `<img src>` |
| `EstimateAt` | DateOnly? | |
| `ActualAt` | DateOnly? | |
| `Reason` | string? | |
| `Status` | string | String enum: `pending`, `in_progress`, `completed` |
| `CreatedBy` | long? | |
| `CreatedAt` | DateTime | |
| `UpdatedAt` | DateTime | |

---

## API Endpoints

### 1. List Tasks — `GET /api/construction-tasks`

Lấy danh sách công việc với phân trang và bộ lọc.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `pageNumber` | int | | `1` | Số trang |
| `pageSize` | int | | `10` | Số item mỗi trang |
| `constructionItemId` | long | | | Lọc theo hạng mục cha |
| `status` | string | | | Lọc theo trạng thái: `pending`, `in_progress`, `completed` |

**Response:** `200 OK`

```json
{
  "pageNumber": 1,
  "pageSize": 10,
  "firstPage": 1,
  "lastPage": 1,
  "totalPages": 1,
  "totalRecords": 2,
  "nextPage": null,
  "previousPage": null,
  "data": [
    {
      "id": 1,
      "constructionItemId": 1,
      "name": "Chống thấm tường mặt tiền",
      "description": "Thi công chống thấm toàn bộ tường mặt tiền",
      "imageUrl": "task_waterproof_001.jpg",
      "imageViewUrl": "https://storage.example.com/bucket/task_waterproof_001.jpg",
      "estimateAt": "2026-08-15",
      "actualAt": "2026-08-14",
      "reason": null,
      "status": "completed",
      "createdBy": 1,
      "createdAt": "2026-07-20T10:30:00Z",
      "updatedAt": "2026-08-14T16:45:00Z"
    }
  ]
}
```

**Sắp xếp:** Theo `CreatedAt` giảm dần (mới nhất trước)

---

### 2. Get Task — `GET /api/construction-tasks/{id}`

Lấy chi tiết một công việc theo ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | long | ✓ | ID của công việc |

**Response:**
- `200 OK` — Trả về `ConstructionTaskResponse`
- `404 Not Found` — Không tìm thấy công việc

---

### 3. Create Task — `POST /api/construction-tasks`

Tạo mới một công việc.

**Request Body — `CreateConstructionTaskRequest`:**

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `constructionItemId` | long | ✓ | ID của hạng mục cha |
| `name` | string | ✓ | Tên công việc |
| `description` | string? | | Mô tả chi tiết |
| `imageUrl` | string? | | ObjectName từ response của `/api/files` |
| `estimateAt` | DateOnly? | | Ngày dự kiến hoàn thành |
| `createdBy` | long? | | ID tài khoản người tạo |

**Response:** `201 Created` + Header `Location: /api/construction-tasks/{id}`

**Business Rules:**
- Hạng mục cha (`ConstructionItem`) không được ở trạng thái `completed`
- Nếu `createdBy` được cung cấp, `Account` phải tồn tại
- Status mặc định là `pending`

**Error Responses:**
- `400 Bad Request` — Validation lỗi
- `404 Not Found` — Hạng mục cha không tồn tại
- `422 Unprocessable Entity` — Hạng mục cha đã hoàn thành

---

### 4. Update Task — `PUT /api/construction-tasks/{id}`

Cập nhật thông tin công việc (không bao gồm trạng thái).

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | long | ✓ | ID của công việc |

**Request Body — `UpdateConstructionTaskRequest`:**

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `name` | string? | | Tên công việc mới |
| `description` | string? | | Mô tả mới |
| `imageUrl` | string? | | ObjectName ảnh mới (thay thế ảnh cũ) |
| `estimateAt` | DateOnly? | | Ngày dự kiến mới |
| `reason` | string? | | Lý do / ghi chú |

**Response:** `200 OK` — Trả về `ConstructionTaskResponse`

**Business Rules:**
- Không thể cập nhật nếu công việc đã `completed`
- Khi thay ảnh mới, ảnh cũ trên storage bucket sẽ bị xóa sau khi DB commit

**Error Responses:**
- `404 Not Found` — Không tìm thấy công việc
- `422 Unprocessable Entity` — Công việc đã hoàn thành, không thể sửa

---

### 5. Update Status — `PUT /api/construction-tasks/{id}/status`

Cập nhật trạng thái công việc.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | long | ✓ | ID của công việc |

**Request Body — `UpdateConstructionTaskStatusRequest`:**

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `status` | string | ✓ | `pending`, `in_progress`, hoặc `completed` |

**Response:** `200 OK` — Trả về `ConstructionTaskResponse`

**Allowed Transitions:**

| From | Allowed To |
|------|-----------|
| `pending` | `in_progress` |
| `in_progress` | `completed` |
| `completed` | *(none — immutable)* |

**Business Rules:**
- Trạng thái chỉ chuyển tiến, không thể lùi
- Khi chuyển sang `completed`, `actualAt` tự động set ngày hôm nay (nếu chưa có)

**Error Responses:**
- `404 Not Found` — Không tìm thấy công việc
- `422 Unprocessable Entity` — Transition không hợp lệ (ví dụ: `completed` → `in_progress`)

---

### 6. Delete Task — `DELETE /api/construction-tasks/{id}`

Xóa một công việc.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | long | ✓ | ID của công việc |

**Response:** `204 No Content`

**Business Rules:**
- Xóa record trong database (cascade delete)
- Ảnh trên storage bucket được xóa sau khi DB commit

**Error Responses:**
- `404 Not Found` — Không tìm thấy công việc

---

## Business Rules Summary

| # | Rule | Mô tả |
|---|------|-------|
| 1 | **Forward-only Status** | Trạng thái chỉ chuyển tiến: `pending → in_progress → completed`. Không thể lùi. |
| 2 | **Parent Locked** | Không thể thêm công việc vào hạng mục đã `completed`. |
| 3 | **Immutable Completed** | Công việc đã `completed` không thể sửa thông tin (name, description, image, estimate, reason). |
| 4 | **Auto ActualAt** | Khi chuyển sang `completed`, `actualAt` tự động set ngày hiện tại. |
| 5 | **Image Cleanup** | Khi thay ảnh hoặc xóa task, ảnh cũ trên storage bucket được dọn dẹp sau DB commit. |
| 6 | **Authorization** | Tất cả endpoint đều yêu cầu JWT token hợp lệ. |
| 7 | **Image Upload Flow** | Ảnh phải upload qua `/api/files` trước, lấy `objectName` trả về rồi pass vào `imageUrl`. |

---

## Entity Hierarchy

```
ProjectShopOwner (dự án)
  └── ProjectWorking (hợp đồng thi công)
       └── ConstructionItem (hạng mục, ví dụ: "Phần thô", "Hệ thống điện")
            └── ConstructionTask (công việc con, ví dụ: "Chống thấm tường mặt tiền")
                 └── Image (lưu ObjectName trong ImageUrl, public URL trong ImageViewUrl)
```

---

## File Structure

```
SmartCoffeeBuilder.API/Controllers/
  └── ConstructionTaskController.cs

SmartCoffeeBuilder.Service/Interfaces/
  └── IConstructionTaskService.cs

SmartCoffeeBuilder.Service/Implementations/
  └── ConstructionTaskService.cs

SmartCoffeeBuilder.Service/DTOs/Responses/ConstructionTask/
  └── ConstructionTaskResponse.cs

SmartCoffeeBuilder.Repository/Models/
  ├── ConstructionTask.cs
  └── ConstructionItem.cs

SmartCoffeeBuilder.Repository/DBContext/
  └── SmartCafeBuilderContext.cs

SmartCoffeeBuilder.Repository/SeedData/
  └── DbSeeder.cs
```

---

## Seed Data

Hai công việc mẫu được tạo khi chạy seeder:

| ID | Name | Status | Parent Item |
|----|------|--------|-------------|
| 1 | `taskWaterproof` | `completed` | Hạng mục chống thấm |
| 2 | `taskWiring` | `in_progress` | Hạng mục điện |
