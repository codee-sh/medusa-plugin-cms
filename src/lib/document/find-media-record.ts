import type { CmsMedia, CmsMediaStore } from "../media-provider/types"
import type { MediaRecords } from "./types"

/**
 * Finds the record a stored value names.
 *
 * @param records - The records a read found.
 * @param store - What the value is: an id or a URL.
 * @param value - The stored value; none for a field that holds no value.
 * @returns The record, or `undefined` when the read found none.
 */
export const findMediaRecord = (
  records: MediaRecords,
  store: CmsMediaStore,
  value: string | undefined
): CmsMedia | undefined =>
  records[store].find((record) => record[store] === value)
