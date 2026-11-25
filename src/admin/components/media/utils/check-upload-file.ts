import { matchesMimeType } from "../../../../shared/media/matches-mime-type"

/** Why a file was refused before upload: a type the field does not accept, or over the size limit. */
export type UploadRejection = "type" | "size"

/** Whether a file may be uploaded into a field, and why not when it may not. */
export type UploadFileCheck =
  { accepted: true } | { accepted: false; reason: UploadRejection }

/**
 * Checks a chosen file against a field's accepted types and the source's limit, before any request.
 *
 * @param file - The file's MIME type and size, as the browser reports them.
 * @param accept - The MIME types the field accepts, exact or `type/*`.
 * @param maxFileSize - The largest file the source takes, in bytes.
 * @returns Whether the file is accepted, and the reason when it is not.
 */
export const checkUploadFile = (
  file: { type: string; size: number },
  accept: string[],
  maxFileSize: number
): UploadFileCheck => {
  if (!matchesMimeType(file.type, accept)) {
    return { accepted: false, reason: "type" }
  }

  if (file.size > maxFileSize) {
    return { accepted: false, reason: "size" }
  }

  return { accepted: true }
}
