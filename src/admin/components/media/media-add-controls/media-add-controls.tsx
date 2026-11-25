import { Photo } from "@medusajs/icons"
import { Button } from "@medusajs/ui"
import { useManagerFormFieldsTranslation } from "../../manager-form-fields/hooks/use-manager-form-fields-translation"
import { MediaDropzone } from "../media-dropzone"
import { formatFileSize } from "../utils/format-file-size"
import { mimeTypesLabel } from "../utils/mime-type-label"

type MediaAddControlsProps = {
  /** The MIME types the field accepts. */
  accept: string[]
  /** The largest file the media source takes, in bytes. */
  maxFileSize: number
  /** The drop zone's label. */
  label: string
  /** Whether the source can be searched; without it only the drop zone shows. */
  searchable: boolean
  disabled?: boolean
  /** Called with a file dropped or browsed, before any check. */
  onFile: (file: File | undefined) => void
  /** Opens the library. */
  onOpenLibrary: () => void
}

/**
 * How a media field takes a file: a drop zone with the accepted types and the limit, and **Choose from
 * library** when the source can be searched.
 *
 * @param props - The accepted types and limit, the label, the source's search, whether it is
 * disabled, and the two handlers.
 */
export const MediaAddControls = ({
  accept,
  maxFileSize,
  label,
  searchable,
  disabled,
  onFile,
  onOpenLibrary,
}: MediaAddControlsProps) => {
  const { t } = useManagerFormFieldsTranslation()

  return (
    <>
      <MediaDropzone
        accept={accept}
        label={label}
        hint={t("media.picker.dropzoneHint", {
          formats: mimeTypesLabel(accept),
          max: formatFileSize(maxFileSize),
        })}
        disabled={disabled}
        onFile={onFile}
      />
      {searchable && (
        <div>
          <Button
            size="small"
            variant="secondary"
            type="button"
            disabled={disabled}
            onClick={onOpenLibrary}
          >
            <Photo />
            {t("media.picker.chooseFromLibrary")}
          </Button>
        </div>
      )}
    </>
  )
}
