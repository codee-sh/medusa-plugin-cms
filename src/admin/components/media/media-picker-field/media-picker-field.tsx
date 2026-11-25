import { ArrowUpTray, Photo, Trash } from "@medusajs/icons"
import { useRef, useState } from "react"
import { useManagerFormFieldsTranslation } from "../../manager-form-fields/hooks/use-manager-form-fields-translation"
import type { MediaRecord } from "../types"
import { MediaAddControls } from "../media-add-controls"
import { MediaFileInput } from "../media-file-input"
import { MediaLibraryModal } from "../media-library-modal"
import { MediaRow } from "../media-row"
import { useMediaFileCheck } from "../hooks/use-media-file-check"

export type MediaPickerFieldProps = {
  value: MediaRecord | null
  /** The field's only output: the uploaded or picked record, or `null` when it is removed. */
  onChange: (value: MediaRecord | null) => void
  /** The MIME types the field accepts, for both upload and library. */
  accept: string[]
  /** The largest file the media source takes, in bytes. */
  maxFileSize: number
  /** Keeps a chosen file until the form's save uploads it, and answers the record that previews it. */
  holdFile: (file: File) => MediaRecord
  /** Whether the source can be searched; without it the field offers upload only. */
  searchable: boolean
  /** Opens the library stacked on the route modal the field sits in; leave it out anywhere else. */
  stackedModalId?: string
  disabled?: boolean
}

/**
 * A form field that holds one file from the media source: upload it through a drop zone, or choose
 * one in the library when the source can be searched.
 *
 * Its one output is `onChange`. It writes nothing: a chosen file is held, previewed from the browser,
 * until the form's save uploads it; **Remove** clears the field and deletes no file.
 *
 * @param props - The value and its handler, the accepted types, the source's limit and search, the
 * holder of chosen files, the stacking id and whether it is disabled.
 */
export const MediaPickerField = ({
  value,
  onChange,
  accept,
  maxFileSize,
  holdFile,
  searchable,
  stackedModalId,
  disabled,
}: MediaPickerFieldProps) => {
  const { t } = useManagerFormFieldsTranslation()
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const { handleChosen } = useMediaFileCheck(accept, maxFileSize, (file) =>
    onChange(holdFile(file))
  )

  return (
    <div className="flex flex-col gap-y-2">
      {value ? (
        <>
          <MediaRow
            media={value}
            groups={[
              {
                actions: [
                  {
                    label: t("media.picker.replace"),
                    icon: <ArrowUpTray />,
                    disabled,
                    onClick: () => replaceInputRef.current?.click(),
                  },
                  ...(searchable
                    ? [
                        {
                          label: t("media.picker.chooseFromLibrary"),
                          icon: <Photo />,
                          disabled,
                          onClick: () => setLibraryOpen(true),
                        },
                      ]
                    : []),
                ],
              },
              {
                actions: [
                  {
                    label: t("media.picker.remove"),
                    icon: <Trash />,
                    disabled,
                    onClick: () => onChange(null),
                  },
                ],
              },
            ]}
          />
          <MediaFileInput
            ref={replaceInputRef}
            accept={accept}
            onFile={handleChosen}
          />
        </>
      ) : (
        <MediaAddControls
          accept={accept}
          maxFileSize={maxFileSize}
          label={t("media.picker.dropzoneLabel")}
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
          onSelect={onChange}
        />
      )}
    </div>
  )
}
