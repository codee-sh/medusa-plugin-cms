/** Short labels for the MIME types the picker knows, as hints and the table show them. */
const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "image/svg+xml": "SVG",
  "image/avif": "AVIF",
  "application/pdf": "PDF",
}

/**
 * Tells the short label of a MIME type.
 *
 * @param mimeType - The MIME type, e.g. `image/jpeg`.
 * @returns Its label, e.g. `JPG`; a `type/*` shows as written, and another unknown type shows its
 * subtype in capitals.
 */
export const mimeTypeLabel = (mimeType: string): string =>
  MIME_LABELS[mimeType] ??
  (mimeType.endsWith("/*")
    ? mimeType
    : (mimeType.split("/").pop() ?? mimeType).toUpperCase())

/**
 * Tells the labels of several MIME types, as a drop zone hint lists them.
 *
 * @param mimeTypes - The accepted MIME types.
 * @returns The labels joined with commas, e.g. `JPG, PNG, WebP`.
 */
export const mimeTypesLabel = (mimeTypes: string[]): string =>
  mimeTypes.map(mimeTypeLabel).join(", ")
