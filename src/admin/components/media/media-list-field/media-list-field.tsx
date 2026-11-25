import { ArrowDownMini, ArrowUpMini, Trash } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { useState } from "react"
import { useManagerFormFieldsTranslation } from "../../manager-form-fields/hooks/use-manager-form-fields-translation"
import type { MediaRecord } from "../types"
import { MediaAddControls } from "../media-add-controls"
import { MediaLibraryModal } from "../media-library-modal"
import { MediaRow } from "../media-row"
import { useMediaFileCheck } from "../hooks/use-media-file-check"

export type MediaListFieldProps = {
  value: MediaRecord[]
  /** The field's only output: the files in their new order. */
  onChange: (value: MediaRecord[]) => void
  /** The MIME types the field accepts, for both upload and library. */
  accept: string[]
  /** The largest file the media source takes, in bytes. */
  maxFileSize: number
  /** Keeps a chosen file until the form's save uploads it, and answers the record that previews it. */
  holdFile: (file: File) => MediaRecord
  /** The most files the field holds; no limit when left out. */
  max?: number
  /** Whether the source can be searched; without it the field offers upload only. */
  searchable: boolean
  /** Opens the library stacked on the route modal the field sits in; leave it out anywhere else. */
  stackedModalId?: string
  disabled?: boolean
}

/**
 * A form field that holds several files from the media source, in order: each row moves up or down
 * or is removed, and a drop zone adds a file - uploaded, or chosen in the library when the source can
 * be searched - until the field holds `max`.
 *
 * Its one output is `onChange`. It writes nothing: a chosen file is held, previewed from the browser,
 * until the form's save uploads it; removing a row deletes no file.
 *
 * @param props - The files and their handler, the accepted types, the source's limit and search, the
 * holder of chosen files, the field's `max`, the stacking id and whether it is disabled.
 */
export const MediaListField = ({
  value,
  onChange,
  accept,
  maxFileSize,
  holdFile,
  max,
  searchable,
  stackedModalId,
  disabled,
}: MediaListFieldProps) => {
  const { t } = useManagerFormFieldsTranslation()
  const [libraryOpen, setLibraryOpen] = useState(false)
  const full = max !== undefined && value.length >= max

  /**
   * Adds a file at the end of the list.
   *
   * @param media - The uploaded or picked record.
   */
  const add = (media: MediaRecord) => onChange([...value, media])

  /**
   * Moves a file to another place in the list.
   *
   * @param from - Its place now.
   * @param to - Its new place.
   */
  const move = (from: number, to: number) => {
    const next = [...value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const { handleChosen } = useMediaFileCheck(accept, maxFileSize, (file) =>
    add(holdFile(file))
  )

  return (
    <div className="flex flex-col gap-y-2">
      {value.map((media, index) => (
        <MediaRow
          key={`${media.id}-${index}`}
          media={media}
          groups={[
            {
              actions: [
                {
                  label: t("media.picker.moveUp"),
                  icon: <ArrowUpMini />,
                  disabled: disabled || index === 0,
                  onClick: () => move(index, index - 1),
                },
                {
                  label: t("media.picker.moveDown"),
                  icon: <ArrowDownMini />,
                  disabled: disabled || index === value.length - 1,
                  onClick: () => move(index, index + 1),
                },
              ],
            },
            {
              actions: [
                {
                  label: t("media.picker.remove"),
                  icon: <Trash />,
                  disabled,
                  onClick: () =>
                    onChange(value.filter((_, position) => position !== index)),
                },
              ],
            },
          ]}
        />
      ))}
      {full ? (
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {t("media.picker.full", { count: max })}
        </Text>
      ) : (
        <MediaAddControls
          accept={accept}
          maxFileSize={maxFileSize}
          label={t("media.picker.addFile")}
          searchable={searchable}
          disabled={disabled}
          onFile={handleChosen}
          onOpenLibrary={() => setLibraryOpen(true)}
        />
      )}
      {searchable && (
        <MediaLibraryModal
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          stackedModalId={stackedModalId}
          accept={accept}
          onSelect={add}
        />
      )}
    </div>
  )
}
