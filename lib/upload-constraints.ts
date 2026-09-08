/**
 * Mirror of what the file API actually accepts.
 *
 * Source of truth: `GcsFileStorageService.UploadAsync`
 * (SmartCoffeeBuilder.Service/Implementations/GcsFileStorageService.cs:28-87)
 *   - image endpoint  POST /api/files/images -> ImageExtensions only
 *   - general endpoint POST /api/files       -> ImageExtensions + DocumentExtensions
 *   - size cap        Gcs:MaxFileSizeMb, default 10
 *
 * TWO THINGS ABOUT THAT SERVER CHECK DRIVE THIS FILE:
 *
 * 1. It validates by FILE EXTENSION, not by MIME type. So `accept="image/*"`
 *    is not a subset of what the server takes — it is a superset. The browser
 *    happily offers .heic (every recent iPhone photo), .bmp, .svg, .avif and
 *    .tiff under that wildcard, and the server rejects all of them. The user
 *    picks a photo, waits through the upload, and gets a 400.
 *
 * 2. It rejects oversize files only AFTER the bytes have been sent. Nothing on
 *    the client checked size at all, so a 40MB file uploaded in full before
 *    failing.
 *
 * Hence: enumerate the extensions explicitly in `accept`, and check both
 * extension and size before the request is made.
 */

/** POST /api/files/images, and the image half of POST /api/files. */
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;

/** The document half of POST /api/files. Note: no video, of any kind. */
export const DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"] as const;

export const ALL_UPLOAD_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
] as const;

/** Keep in step with `Gcs:MaxFileSizeMb` (appsettings is gitignored; default 10). */
export const MAX_UPLOAD_SIZE_MB = 10;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

/**
 * Values for an `<input type="file" accept>`.
 *
 * Extensions rather than MIME wildcards, deliberately — see note 1 above. The
 * file picker then greys out what the server would refuse, instead of letting
 * the user choose it and failing afterwards.
 */
export const ACCEPT_IMAGES = IMAGE_EXTENSIONS.join(",");
export const ACCEPT_DOCUMENTS = DOCUMENT_EXTENSIONS.join(",");
export const ACCEPT_ANY_UPLOAD = ALL_UPLOAD_EXTENSIONS.join(",");

export type UploadRejection =
  | { ok: true }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "too-large"; sizeMb: string; limitMb: number }
  | { ok: false; reason: "bad-type"; extension: string; allowed: string };

/**
 * Check a file the way the server will, before spending the upload on it.
 *
 * `accept` is only a hint: a user can defeat it by choosing "All files" in the
 * OS dialog, and drag-and-drop bypasses it entirely — so this is the check
 * that actually holds.
 */
export function validateUploadFile(
  file: File,
  { imageOnly = false }: { imageOnly?: boolean } = {},
): UploadRejection {
  if (file.size === 0) return { ok: false, reason: "empty" };

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      ok: false,
      reason: "too-large",
      sizeMb: (file.size / 1024 / 1024).toFixed(1),
      limitMb: MAX_UPLOAD_SIZE_MB,
    };
  }

  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  const allowed: readonly string[] = imageOnly
    ? IMAGE_EXTENSIONS
    : ALL_UPLOAD_EXTENSIONS;

  if (!allowed.includes(extension)) {
    return {
      ok: false,
      reason: "bad-type",
      extension: extension || file.name,
      allowed: allowed.join(", "),
    };
  }

  return { ok: true };
}
