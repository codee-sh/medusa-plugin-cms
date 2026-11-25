import { toast } from "@medusajs/ui"
import { useManagerFormFieldsTranslation } from "../../manager-form-fields/hooks/use-manager-form-fields-translation"
import { checkUploadFile } from "../utils/check-upload-file"
import { formatFileSize } from "../utils/format-file-size"
import { mimeTypesLabel } from "../utils/mime-type-label"

/**
 * Checks the files chosen in a media field against its types and the source's limit, and explains a
 * refused one in a toast. Every way of choosing a file - the drop zone, a browse, a replacement - goes
 * through it. Nothing is uploaded here: the form uploads its chosen files when it is saved.
 *
 * @param accept - The MIME types the field accepts.
 * @param maxFileSize - The largest file the media source takes, in bytes.
 * @param onAccepted - Called with each file that passed the checks.
 * @returns The handler for a chosen file.
 */
export const useMediaFileCheck = (
  accept: string[],
  maxFileSize: number,
  onAccepted: (file: File) => void
) => {
  const { t } = useManagerFormFieldsTranslation()

  /**
   * Hands a chosen file on when it passes the checks, or explains why it was refused.
   *
   * @param file - The chosen file, if any.
   */
  const handleChosen = (file: File | undefined) => {
    if (!file) {
      return
    }

    const check = checkUploadFile(file, accept, maxFileSize)

    if (check.accepted) {
      onAccepted(file)
      return
    }

    toast.error(
      check.reason === "type"
        ? t("media.picker.wrongType", {
            formats: mimeTypesLabel(accept),
          })
        : t("media.picker.tooLarge", {
            max: formatFileSize(maxFileSize),
          })
    )
  }

  return { handleChosen }
}
