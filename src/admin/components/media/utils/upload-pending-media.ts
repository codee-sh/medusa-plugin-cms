import { isPendingMediaValue } from "./pending-media-value"

/** A media field whose chosen files a save uploaded: its path under the document, and its new value. */
export type UploadedMediaField = {
  path: string
  value: unknown
}

/** What uploading a document's chosen files did. */
export type PendingMediaUpload = {
  /** The document's values, each uploaded file's stored value in place of its own. */
  values: Record<string, unknown>
  /** The fields that now hold uploaded values, to keep in the form so a second save does not upload them again. */
  uploaded: UploadedMediaField[]
  /** The paths of the fields still holding a file that failed to upload. */
  failed: string[]
}

/**
 * Tells whether a value is a plain object, such as a block, as opposed to a date or an array.
 *
 * @param value - The value.
 * @returns Whether it is a plain object.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype

/**
 * Uploads the chosen files of a document's media fields, its blocks' included at any depth, one after
 * another, and puts each file's stored value in place of the value it held in the form. A file that
 * fails keeps its value, and its field is reported; the others are uploaded all the same.
 *
 * A chosen file is found by its value alone, so no config is needed to find the media fields.
 *
 * @param values - The document's values, as the form holds them.
 * @param upload - Uploads the file a value holds and answers the value its field stores.
 * @returns The new values, the fields that changed, and the fields that failed.
 */
export const uploadPendingMedia = async (
  values: Record<string, unknown>,
  upload: (value: string) => Promise<string>
): Promise<PendingMediaUpload> => {
  const uploaded: UploadedMediaField[] = []
  const failed: string[] = []

  /**
   * Uploads one chosen file, keeping its value when the upload fails.
   *
   * @param value - The value its field holds.
   * @returns The stored value, and whether the upload failed.
   */
  const uploadValue = async (value: string) => {
    try {
      return { value: await upload(value), failed: false }
    } catch {
      return { value, failed: true }
    }
  }

  /**
   * Uploads the chosen files of an object's media fields and of the blocks it holds.
   *
   * @param owner - The document or a block.
   * @param path - Its path under the document.
   * @returns The object with the uploaded values.
   */
  const visit = async (
    owner: Record<string, unknown>,
    path: string[]
  ): Promise<Record<string, unknown>> => {
    const result: Record<string, unknown> = { ...owner }

    for (const [key, value] of Object.entries(owner)) {
      const fieldPath = [...path, key].join(".")

      if (isPendingMediaValue(value)) {
        const outcome = await uploadValue(value)

        result[key] = outcome.value
        if (outcome.failed) {
          failed.push(fieldPath)
        } else {
          uploaded.push({ path: fieldPath, value: outcome.value })
        }
      } else if (Array.isArray(value) && value.some(isPendingMediaValue)) {
        const outcomes = []

        for (const item of value) {
          outcomes.push(
            isPendingMediaValue(item)
              ? await uploadValue(item)
              : { value: item, failed: false }
          )
        }

        result[key] = outcomes.map((outcome) => outcome.value)
        uploaded.push({ path: fieldPath, value: result[key] })
        if (outcomes.some((outcome) => outcome.failed)) {
          failed.push(fieldPath)
        }
      } else if (Array.isArray(value)) {
        const items = []

        for (const [index, item] of value.entries()) {
          items.push(
            isPlainObject(item)
              ? await visit(item, [...path, key, String(index)])
              : item
          )
        }

        result[key] = items
      } else if (isPlainObject(value)) {
        result[key] = await visit(value, [...path, key])
      }
    }

    return result
  }

  return { values: await visit(values, []), uploaded, failed }
}
