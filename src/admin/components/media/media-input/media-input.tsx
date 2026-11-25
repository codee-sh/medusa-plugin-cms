import { useMediaFields } from "../media-fields-provider"
import { MediaListField } from "../media-list-field"
import { MediaPickerField } from "../media-picker-field"
import type { MediaRecord, MediaStore } from "../types"
import { isPendingMediaValue } from "../utils/pending-media-value"

type MediaInputProps = {
  /** The field's form path, which also names its stacked library. */
  name: string
  /** The field's value: a stored value, or a list of them with `multiple`. */
  value: unknown
  /** Called with the field's new value: a stored value, `""` when removed, or a list with `multiple`. */
  onChange: (value: string | string[]) => void
  /** What the value names a record by. */
  store: MediaStore
  /** The MIME types the field takes. */
  accept: string[]
  /** Several files, in order. */
  multiple?: boolean
  /** With `multiple`, the most files the field holds. */
  max?: number
  disabled?: boolean
}

/**
 * Finds the record a field's value names, or makes one of the value when the form has not seen it, so
 * the field still shows what it holds.
 *
 * @param get - Reads a record the form has seen.
 * @param store - What the field stores.
 * @param value - The field's value.
 * @returns The record.
 */
const recordOf = (
  get: (store: MediaStore, value: string) => MediaRecord | undefined,
  store: MediaStore,
  value: string
): MediaRecord =>
  get(store, value) ?? {
    id: value,
    url: store === "url" ? value : "",
    filename: value,
  }

/**
 * Tells the value a field holds for a record: its `id` or `url`, as the field stores, or for a chosen
 * file not uploaded yet, the file's own value.
 *
 * @param media - The record.
 * @param store - What the field stores.
 * @returns The value.
 */
const valueOf = (media: MediaRecord, store: MediaStore): string =>
  isPendingMediaValue(media.id) ? media.id : media[store]

/**
 * The input of a media field: one file through `MediaPickerField`, several through `MediaListField`.
 * The form holds the field's stored value - the record's id or URL, as `store` says, or a chosen file's
 * own value until the form's save uploads it - and the picker shows the records and previews the form
 * keeps in its `MediaFieldsProvider`.
 *
 * Renders nothing until the form knows its media source.
 *
 * @param props - The field's path, value and handler, what it stores, its types, how many files it
 * holds, and whether it is disabled.
 */
export const MediaInput = ({
  name,
  value,
  onChange,
  store,
  accept,
  multiple = false,
  max,
  disabled,
}: MediaInputProps) => {
  const { source, records, stackedModals } = useMediaFields()

  if (!source) {
    return null
  }

  const shared = {
    accept,
    maxFileSize: source.maxFileSize,
    holdFile: (file: File) => records.addPending(file, store),
    searchable: source.searchable,
    stackedModalId: stackedModals ? `media-${name}` : undefined,
    disabled,
  }

  if (multiple) {
    return (
      <MediaListField
        {...shared}
        max={max}
        value={((value as string[] | null) ?? []).map((storedValue) =>
          recordOf(records.get, store, storedValue)
        )}
        onChange={(list) => {
          list.filter(({ id }) => !isPendingMediaValue(id)).forEach(records.add)
          onChange(list.map((media) => valueOf(media, store)))
        }}
      />
    )
  }

  return (
    <MediaPickerField
      {...shared}
      value={value ? recordOf(records.get, store, value as string) : null}
      onChange={(media) => {
        if (media && !isPendingMediaValue(media.id)) {
          records.add(media)
        }
        onChange(media ? valueOf(media, store) : "")
      }}
    />
  )
}
