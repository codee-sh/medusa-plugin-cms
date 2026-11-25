import { useEffect, useRef } from "react"
import type { MediaRecord, MediaStore } from "../types"
import { createPendingMediaValue } from "../utils/pending-media-value"

/** A file chosen in a media field, kept until a save uploads it. */
type PendingMedia = {
  file: File
  /** What the field stores, so the save puts the uploaded record's `id` or `url` in its place. */
  store: MediaStore
  /** The record the field shows meanwhile, previewing the file from the browser. */
  preview: MediaRecord
}

/**
 * The records a form's media fields show, by what a field stores and the value it holds, and the files
 * chosen but not uploaded yet.
 */
export type MediaRecordStore = {
  /**
   * Finds the record a field's value names, or the preview of a chosen file.
   *
   * @param store - What the field stores.
   * @param value - The field's value.
   * @returns The record, or `undefined` when the form has not seen it.
   */
  get: (store: MediaStore, value: string) => MediaRecord | undefined
  /**
   * Keeps a record the editor picked, or one a save uploaded. The store does not re-render anything, so
   * a record is kept before the field's value names it: the field then re-renders and finds it.
   *
   * @param media - The record.
   */
  add: (media: MediaRecord) => void
  /**
   * Keeps a chosen file until a save uploads it.
   *
   * @param file - The file.
   * @param store - What the field stores.
   * @returns The record that previews it, whose `id` is the value the field holds meanwhile.
   */
  addPending: (file: File, store: MediaStore) => MediaRecord
  /**
   * Finds a chosen file by the value its field holds.
   *
   * @param value - The field's value.
   * @returns The file and what its field stores, or `undefined` for a value that is not a chosen file.
   */
  getPending: (value: string) => PendingMedia | undefined
  /**
   * Forgets a chosen file once a save uploaded it, and releases its preview.
   *
   * @param value - The value its field held.
   */
  dropPending: (value: string) => void
}

/**
 * Builds a form's media store once: the records the form opens with, the ones picked or uploaded later,
 * and the files chosen until a save uploads them. The form holds each field's stored value - an id or a
 * URL, or a chosen file's own value - as a save sends it, so what a picker shows is kept here. The
 * previews are released when the form closes. The form hands it to its fields through
 * `MediaFieldsProvider`.
 *
 * @param initial - The records the form opens with, as the read held them.
 * @returns The store, the same on every render.
 */
export const useMediaRecordStore = (
  initial: MediaRecord[]
): MediaRecordStore => {
  const store = useRef<MediaRecordStore & { release: () => void }>()

  if (!store.current) {
    const records = new Map<string, MediaRecord>()
    const pending = new Map<string, PendingMedia>()

    store.current = {
      get: (kind, value) =>
        pending.get(value)?.preview ?? records.get(`${kind}:${value}`),
      add: (media) => {
        records.set(`id:${media.id}`, media)
        records.set(`url:${media.url}`, media)
      },
      addPending: (file, kind) => {
        const value = createPendingMediaValue()
        const preview: MediaRecord = {
          id: value,
          url: URL.createObjectURL(file),
          filename: file.name,
          mime_type: file.type,
          size: file.size,
        }

        pending.set(value, { file, store: kind, preview })

        return preview
      },
      getPending: (value) => pending.get(value),
      dropPending: (value) => {
        const held = pending.get(value)

        if (held) {
          URL.revokeObjectURL(held.preview.url)
          pending.delete(value)
        }
      },
      release: () => {
        for (const { preview } of pending.values()) {
          URL.revokeObjectURL(preview.url)
        }
        pending.clear()
      },
    }
    initial.forEach(store.current.add)
  }

  useEffect(() => () => store.current?.release(), [])

  return store.current
}
