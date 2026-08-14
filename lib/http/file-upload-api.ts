/**
 * File upload API — mirrors the wire contract for `api/files`.
 *
 * Endpoints:
 * - `POST /api/files` — upload any file type (returns url for use in other records)
 * - `POST /api/files/images` — upload images only
 * - `GET /api/files/view?objectName=` — view/download file
 * - `DELETE /api/files?objectName=` — delete file
 */

import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

/**
 * Response from file upload endpoints.
 */
export interface FileUploadResponse {
  objectName: string;
  url: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Upload a file to the server.
 *
 * Endpoint: `POST /api/files`
 *
 * Authorization:
 *   Bearer access token required.
 *
 * @param file - The file to upload
 * @param config - Optional request config with signal for abort
 */
export async function uploadFileApi(
  file: File,
  config?: RequestConfig,
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // The `api` instance defaults Content-Type to application/json, which
  // merges into every request. For FormData we must explicitly clear it
  // (not just omit the override) so the client sets it itself with the
  // multipart boundary — otherwise axios either ships a boundary-less
  // header or, worse, JSON-serializes the FormData instead of sending it.
  const response = await api.post<FileUploadResponse>("/api/files", formData, {
    ...config,
    headers: { ...config?.headers, "Content-Type": undefined },
  });

  return response.data;
}

/**
 * Upload an image file to the server.
 *
 * Endpoint: `POST /api/files/images`
 *
 * Authorization:
 *   Bearer access token required.
 *
 * @param file - The image file to upload (will be rejected if not an image)
 * @param config - Optional request config with signal for abort
 */
export async function uploadImageApi(
  file: File,
  config?: RequestConfig,
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // See uploadFileApi — Content-Type must be explicitly cleared.
  const response = await api.post<FileUploadResponse>("/api/files/images", formData, {
    ...config,
    headers: { ...config?.headers, "Content-Type": undefined },
  });

  return response.data;
}

/**
 * Delete a file from the server.
 *
 * Endpoint: `DELETE /api/files?objectName=`
 *
 * Authorization:
 *   Bearer access token required.
 *
 * @param objectName - The object name returned from upload
 */
export async function deleteFileApi(
  objectName: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/files?objectName=${encodeURIComponent(objectName)}`, config);
}
